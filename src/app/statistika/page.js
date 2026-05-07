'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, Fragment } from 'react'
import { useSearchParams } from 'next/navigation'
import * as XLSX from 'xlsx'
import Header from '@/components/Header'
import {
    TrendingUp,
    TrendingDown,
    ShoppingCart,
    Package,
    Calendar,
    RefreshCcw,
    Users,
    FileDown,
    Layers,
    FolderTree,
    Printer,
    AlertCircle,
    AlertTriangle,
    Activity,
    Archive,
    X,
    FileUp,
    Trash2,
    Clock,
    Info,
} from 'lucide-react'
import {
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    Legend,
} from 'recharts'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { isDeletedAtMissingError } from '@/lib/orderTrash'
import CrmAiInsightsPanel from '@/components/CrmAiInsightsPanel'

const LS_MODE = 'crm_stat_date_mode'
const LS_DAYS = 'crm_stat_filter_days'
const LS_MONTH = 'crm_stat_month'
const LS_FROM = 'crm_stat_from'
const LS_TO = 'crm_stat_to'
const LS_STATUS = 'crm_stat_order_status'
const VALID_FILTER_RANGES = ['7', '30', '90', '365']
const TOP_N_BAR = 10

import {
    normalizeModelKey,
    fetchOrdersPageWithFallback,
    fetchOrderItemsForOrderId,
    fetchProducts,
    readOrdersImportWorkbookRows,
    groupImportedExcelRowsToOrders,
    normalizeImportedExcelRow,
    canonicalizeExcelImportRow,
    normalizeStatusForSelect,
    normalizeSourceForDb,
    generateDisplayOrderNumber,
    API_URL,
    parseOrderItemQty,
    displayProductName,
    mergeExpandedRowsForSubmit,
    mergeOrderItemPayloadsForDb,
    buildItemPayloadsFromExpandedLines
} from '../buyurtmalar/utils'

function isOrderCompletedStatus(status) {
    const s = String(status || '').toLowerCase()
    return s === 'completed' || s === 'tugallandi' || s === 'tugallangan'
}

function dateInPeriodBounds(d, start, end) {
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false
    return d >= start && d <= end
}

/** Tugallangan buyurtma uchun hisobot sanasi: `updated_at` (status o‘zgarganda), aks holda `created_at` */
function completionAnchorDate(o) {
    const raw =
        o.updated_at != null && o.updated_at !== ''
            ? o.updated_at
            : o.created_at
    return new Date(raw)
}

/** Savdo trendi: «hammasi» — yaratilgan kun; «tugallangan» — tugallangan (yangilangan) kun */
function orderTrendDayKey(o, orderStatusFilter) {
    if (orderStatusFilter === 'completed') {
        return completionAnchorDate(o).toLocaleDateString('en-CA')
    }
    return new Date(o.created_at).toLocaleDateString('en-CA')
}

function periodFileStamp(start, end) {
    return `${start.toLocaleDateString('en-CA')}_${end.toLocaleDateString('en-CA')}`
}

function csvEscape(cell) {
    const s = String(cell ?? '')
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
}

function downloadBlob(filename, blob) {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
}

function readLs(key, fallback) {
    if (typeof window === 'undefined') return fallback
    try {
        const v = localStorage.getItem(key)
        return v != null && v !== '' ? v : fallback
    } catch {
        return fallback
    }
}

function writeLs(key, value) {
    try {
        localStorage.setItem(key, value)
    } catch {
        /* ignore */
    }
}

const PRINT_CLONE_CLASS = 'crm-stat-print-clone-root'
const PRINT_STYLE_ID = 'crm-stat-print-styles'

/**
 * Chop etish: visibility:hidden butun sahifa balandligini saqlab, ko‘p bo‘sh sahifalar berardi.
 * DOM nusxasini body ga qo‘shib, @media print da faqat uni qoldiramiz.
 */
function printAnalyticsBlock(el) {
    if (typeof document === 'undefined' || !el) return

    const clone = el.cloneNode(true)
    clone.classList.add(PRINT_CLONE_CLASS)
    clone.querySelectorAll('button').forEach((b) => b.remove())

    let style = document.getElementById(PRINT_STYLE_ID)
    if (!style) {
        style = document.createElement('style')
        style.id = PRINT_STYLE_ID
        style.textContent = `
      @media print {
        body > *:not(.${PRINT_CLONE_CLASS}) {
          display: none !important;
        }
        html, body {
          height: auto !important;
          min-height: 0 !important;
          overflow: visible !important;
          background: #fff !important;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .${PRINT_CLONE_CLASS} {
          display: block !important;
          position: static !important;
          width: 100% !important;
          max-width: none !important;
          margin: 0 !important;
          padding: 12px !important;
          box-sizing: border-box !important;
          box-shadow: none !important;
        }
        .${PRINT_CLONE_CLASS} .stat-analytics-print-scroll {
          max-height: none !important;
          overflow: visible !important;
        }
        .${PRINT_CLONE_CLASS} thead {
          position: static !important;
        }
      }
    `
        document.head.appendChild(style)
    }

    document.querySelectorAll(`.${PRINT_CLONE_CLASS}`).forEach((n) => n.remove())

    document.body.appendChild(clone)

    const cleanup = () => {
        clone.remove()
        window.removeEventListener('afterprint', cleanup)
    }
    window.addEventListener('afterprint', cleanup)
    window.print()
    window.setTimeout(cleanup, 2500)
}

function startOfDay(d) {
    const x = new Date(d)
    x.setHours(0, 0, 0, 0)
    return x
}

function endOfDay(d) {
    const x = new Date(d)
    x.setHours(23, 59, 59, 999)
    return x
}

/** Joriy oy YYYY-MM */
function defaultMonthStr() {
    const n = new Date()
    const y = n.getFullYear()
    const m = String(n.getMonth() + 1).padStart(2, '0')
    return `${y}-${m}`
}

function defaultRangeStrs() {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 29)
    return {
        from: start.toLocaleDateString('en-CA'),
        to: end.toLocaleDateString('en-CA'),
    }
}

/** Buyurtmalar sahifasidagi `parseOrderItemQty` bilan mos: kg/kasr miqdorlar */
function parseItemQty(v) {
    const n = Number(v)
    if (!Number.isFinite(n) || n < 0) return 0
    return n
}

/** Mahsulot qatorlari (narx × dona) — kategoriya/mahsulot/kartochka yig‘indilari bir xil asosda */
function sumOrderLineRevenue(order) {
    let s = 0
    for (const item of order?.order_items || []) {
        const q = parseItemQty(item.quantity)
        const lineQty = q > 0 ? q : 1
        s += (Number(item.price) || 0) * lineQty
    }
    return s
}

/** Buyurtmalar sahifasidagi `resolvedOrderItemSizeRaw` bilan mos: model kodi */
function resolvedOrderItemModelCode(oi, productsList) {
    const s = oi?.size != null ? String(oi.size).trim() : ''
    if (s) return s
    const emb = oi?.products
    if (emb && typeof emb === 'object' && emb.size != null && String(emb.size).trim() !== '') {
        return String(emb.size).trim()
    }
    const p =
        oi?.product_id && productsList?.length
            ? productsList.find((x) => String(x.id) === String(oi.product_id))
            : null
    if (p?.size != null && String(p.size).trim() !== '') return String(p.size).trim()
    const nm = (oi?.product_name || oi?.products?.name || '').trim()
    return nm || '—'
}

function formatUsd(amount) {
    const n = Number(amount)
    if (!Number.isFinite(n)) return '0'
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatQtyCompact(n) {
    const v = Math.round((Number(n) || 0) * 1000) / 1000
    if (!Number.isFinite(v)) return '0'
    return Number.isInteger(v) ? String(v) : String(v)
}

function formatMixedQtyLabel(qtyPieces, qtyKg) {
    const pcs = Number(qtyPieces) || 0
    const kg = Number(qtyKg) || 0
    const hasPcs = pcs > 0
    const hasKg = kg > 0
    if (hasPcs && hasKg) return `${formatQtyCompact(pcs)} dona + ${formatQtyCompact(kg)} kg`
    if (hasKg) return `${formatQtyCompact(kg)} kg`
    return `${formatQtyCompact(pcs)} dona`
}

function getPeriodBounds(dateMode, filterRange, monthValue, dateFromStr, dateToStr) {
    const now = new Date()
    if (dateMode === 'month' && monthValue && /^\d{4}-\d{2}$/.test(monthValue)) {
        const [y, m] = monthValue.split('-').map(Number)
        const start = startOfDay(new Date(y, m - 1, 1))
        const end = endOfDay(new Date(y, m, 0))
        return { start, end }
    }
    if (dateMode === 'range' && dateFromStr && dateToStr) {
        let start = startOfDay(new Date(dateFromStr + 'T12:00:00'))
        let end = endOfDay(new Date(dateToStr + 'T12:00:00'))
        if (start > end) [start, end] = [end, start]
        return { start, end }
    }
    const days = VALID_FILTER_RANGES.includes(filterRange) ? parseInt(filterRange, 10) : 30
    const end = endOfDay(now)
    const start = startOfDay(now)
    start.setDate(start.getDate() - (days - 1))
    return { start, end }
}

function financeRowInBounds(f, start, end) {
    const raw = f.date
    if (raw == null || raw === '') return false
    const d = typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.trim())
        ? new Date(`${raw.trim()}T12:00:00`)
        : new Date(raw)
    return d >= start && d <= end
}

export default function StatistikaPageWithSuspense() {
    return (
        <Suspense fallback={<div className="p-10 text-center text-white/50">Yuklanmoqda...</div>}>
            <StatistikaPage />
        </Suspense>
    )
}

function StatistikaPage() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [hydrated, setHydrated] = useState(false)
    const [data, setData] = useState({
        orders: [],
        finance: [],
        products: [],
    })
    const [loadError, setLoadError] = useState(null)
    const [partialWarning, setPartialWarning] = useState(null)

    const [dateMode, setDateMode] = useState('preset')
    const [filterRange, setFilterRange] = useState('30')
    const [monthValue, setMonthValue] = useState(defaultMonthStr)
    const [rangeFrom, setRangeFrom] = useState(defaultRangeStrs().from)
    const [rangeTo, setRangeTo] = useState(defaultRangeStrs().to)
    const [orderStatusFilter, setOrderStatusFilter] = useState('completed')
    const [reconciliationData, setReconciliationData] = useState(null)
    const [excelFileName, setExcelFileName] = useState('')
    const [reconciling, setReconciling] = useState(false)
    const [excelImportBusy, setExcelImportBusy] = useState(false)
    const [importPreview, setImportPreview] = useState(null)
    const [rawExcelItems, setRawExcelItems] = useState(null)
    const [viewMode, setViewMode] = useState('dashboard') // 'dashboard' or 'reconciliation'
    const [selectedRecCustomerId, setSelectedRecCustomerId] = useState('')
    const [selectedRecOrderId, setSelectedRecOrderId] = useState('')
    const [customerOrders, setCustomerOrders] = useState([])
    const [orderSearch, setOrderSearch] = useState('')
    const [importHistory, setImportHistory] = useState([])
    const [selectedBatchIds, setSelectedBatchIds] = useState([])
    const [isSavingHistory, setIsSavingHistory] = useState(false)
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
    const fileInputRef = useRef(null)
    const reconTableRef = useRef(null)
    const searchParams = useSearchParams()

    // Handle URL params on mount
    useEffect(() => {
        const cId = searchParams.get('customerId')
        const oId = searchParams.get('orderId')
        if (cId) setSelectedRecCustomerId(cId)
        if (oId) setSelectedRecOrderId(oId)
    }, [searchParams])

    // Fetch orders for reconciliation dropdown using backend API (consistent with Orders page)
    useEffect(() => {
        async function fetchInitialData() {
            const { data: ords, error } = await fetchOrdersPageWithFallback()
            if (!error && ords) {
                setCustomerOrders(ords)
            }
            fetchImportHistory()
        }
        fetchInitialData()
    }, [])

    const fetchImportHistory = async () => {
        try {
            console.log('Fetching history from:', `${API_URL}/excel-import/history`)
            const res = await fetch(`${API_URL}/excel-import/history`)
            if (res.ok) {
                const data = await res.json()
                console.log('History data:', data)
                setImportHistory(data)
            } else {
                console.error('History fetch failed with status:', res.status)
            }
        } catch (e) {
            console.error('History fetch error:', e)
        }
    }

    const deleteHistoryItem = async (id) => {
        if (!confirm('Ushbu hisobotni o\'chirmoqchimisiz?')) return
        try {
            const res = await fetch(`${API_URL}/excel-import/${id}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                fetchImportHistory()
                setSelectedBatchIds(prev => prev.filter(bid => bid !== id))
            }
        } catch (e) {
            alert('O\'chirishda xatolik')
        }
    }

    // Handle Batch Merging Effect
    useEffect(() => {
        if (selectedBatchIds.length > 0 && importHistory.length > 0) {
            let combinedItems = []
            let fileNames = []
            
            selectedBatchIds.forEach(id => {
                const hist = importHistory.find(h => h.id === id)
                if (hist) {
                    combinedItems = [...combinedItems, ...hist.items]
                    fileNames.push(hist.fileName)
                }
            })

            if (combinedItems.length > 0) {
                // Sort combined history items similarly
                combinedItems.sort((a,b) => {
                    const nameA = String(a.product_name || '').trim()
                    const nameB = String(b.product_name || '').trim()
                    if (nameA !== nameB) return nameA.localeCompare(nameB)
                    return String(a.model_code || '').localeCompare(String(b.model_code || ''))
                })
                setRawExcelItems(combinedItems)
                setExcelFileName(fileNames.join(' + '))
            }
        } else if (selectedBatchIds.length === 0 && !excelImportBusy) {
            // Only reset if we aren't currently uploading a new file manually
            if (rawExcelItems && !fileInputRef.current?.value) {
                setRawExcelItems(null)
                setExcelFileName('')
            }
        }
    }, [selectedBatchIds, importHistory, excelImportBusy])

    const saveCurrentToHistory = async () => {
        if (!rawExcelItems || !excelFileName) return
        setIsSavingHistory(true)
        console.log('Saving to history:', { fileName: excelFileName, itemCount: rawExcelItems.length })
        try {
            const res = await fetch(`${API_URL}/excel-import/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: excelFileName,
                    items: rawExcelItems
                })
            })
            if (res.ok) {
                console.log('Save success')
                await fetchImportHistory()
                alert('Muvaffaqiyatli saqlandi!')
            } else {
                const errData = await res.json().catch(() => ({}))
                console.error('Save failed status:', res.status, errData)
                alert(`Saqlashda xatolik: ${res.status} ${errData.message || ''}`)
            }
        } catch (e) {
            console.error('Save error:', e)
            alert('Saqlashda xatolik: ' + e.message)
        } finally {
            setIsSavingHistory(false)
        }
    }

    const handleExcelUpload = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        setReconciling(true)
        setExcelFileName(file.name)

        const reader = new FileReader()
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result
                const wb = XLSX.read(bstr, { type: 'binary' })
                const wsname = wb.SheetNames[0]
                const ws = wb.Sheets[wsname]
                const rawExcelData = XLSX.utils.sheet_to_json(ws)
                
                // Normalize using core utils to handle various headers (Artikul, Kodi, Rangi, Color, etc.)
                const excelDataRaw = rawExcelData.map(r => canonicalizeExcelImportRow(normalizeImportedExcelRow(r)))
                
                // Agregatsiya: bir xil model_code va ranglilarni bitta qilib hisoblash
                const excelDataAgg = {}
                excelDataRaw.forEach(item => {
                    const code = String(item.model_code || '').trim() || '—'
                    const color = String(item.color || '').trim() || '—'
                    const key = `${code}|${color}`
                    if (!excelDataAgg[key]) {
                        excelDataAgg[key] = { ...item, quantity: 0 }
                    }
                    excelDataAgg[key].quantity += Number(item.quantity) || 0
                })
                const excelData = Object.values(excelDataAgg).sort((a,b) => {
                    const nameA = String(a.product_name || '').trim()
                    const nameB = String(b.product_name || '').trim()
                    if (nameA !== nameB) return nameA.localeCompare(nameB)
                    return String(a.model_code || '').localeCompare(String(b.model_code || ''))
                })
                setRawExcelItems(excelData)

                // runReconciliation will be triggered by useEffect
            } catch (err) {
                console.error('Excel upload error:', err)
                alert('Excel faylni oʻqishda xatolik yuz berdi')
            } finally {
                setReconciling(false)
            }
        }
        reader.onerror = () => {
             setReconciling(false)
             alert('Faylni yuklashda xatolik yuz berdi')
        }
        reader.readAsBinaryString(file)
    }



    const resetReconciliation = () => {
        setReconciliationData(null)
        setRawExcelItems(null)
        setExcelFileName('')
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    // --- Order Import Logic (Cloned from Buyurtmalar Page) ---
    const excelImportInputRef = useRef(null)

    const persistImportedExcelOrderGroup = async (group) => {
        const first = group[0]
        const linesForMerge = []
        
        // Fetch products for matching from backend
        const { data: allProds } = await fetchProducts()
        
        function getProductsByModelCode(code) {
            const low = String(code).trim().toLowerCase()
            const matches = (allProds || []).filter(p => 
                String(p.sku || '').toLowerCase().includes(low) || 
                String(p.size || '').toLowerCase().includes(low) ||
                String(p.name || '').toLowerCase().includes(low)
            )
            return { list: matches, reason: matches.length > 5 ? 'ambiguous' : null }
        }

        function resolveProductForExcelImportRow(row) {
            const pid = row.product_id
            if (pid != null && String(pid).trim() !== '') {
                const p = allProds.find((x) => String(x.id) === String(pid).trim())
                if (p) return { list: [p], reason: null }
            }
            const code = String(row.model_code || '').trim() || String(row.product_name || '').trim()
            if (!code) return { list: [], reason: 'empty' }
            return getProductsByModelCode(code)
        }

        for (const row of group) {
            const res = resolveProductForExcelImportRow(row)
            if (!res.list?.length) throw new Error(`Mahsulot topilmadi: ${row.model_code || row.product_name}`)
            
            const product = res.list[0]
            const qty = parseOrderItemQty(row.quantity)
            const up = Number(row.unit_price)
            const price = Number.isFinite(up) && up >= 0 ? up : Number(product.sale_price) || 0

            linesForMerge.push({
                product_id: product.id,
                product_name: String(row.product_name || '').trim() || displayProductName(product),
                product_price: price,
                quantity: String(qty),
                color: String(row.color || '').trim(),
                codeInput: String(row.model_code || '').trim() || (product.size ? String(product.size) : ''),
                line_note: String(row.line_note || '').trim()
            })
        }

        const expandedRows = mergeExpandedRowsForSubmit(linesForMerge, allProds)
        const itemPayloads = mergeOrderItemPayloadsForDb(
            buildItemPayloadsFromExpandedLines('new', expandedRows, allProds),
            allProds
        )
        const totalSum = itemPayloads.reduce((s, p) => s + (Number(p.subtotal) || 0), 0)

        const st = normalizeStatusForSelect(first.order_status || 'completed')
        const payload = {
            customer_name: (first.customer_name || '').trim() || 'Mijoz (Import)',
            customer_phone: (first.customer_phone || '').trim(),
            total: totalSum,
            status: st === 'completed' ? 'completed' : st,
            note: (first.order_note || '').trim() || 'Statistika sahifasidan import qilindi',
            source: normalizeSourceForDb(first.order_source || 'import'),
            order_items: itemPayloads.map((p, idx) => ({
                ...p,
                line_index: idx
            }))
        }

        const res = await fetch(`${API_URL}/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        if (!res.ok) throw new Error(`Backend error: ${res.statusText}`)
    }

    const handleExcelImportFileChange = async (e) => {
        const file = e.target.files?.[0]
        if (e.target) e.target.value = ''
        if (!file || excelImportBusy) return
        
        setExcelImportBusy(true)
        try {
            const buf = await file.arrayBuffer()
            const rawRows = readOrdersImportWorkbookRows(buf)
            if (!rawRows.length) return alert('Excel bo‘sh yoki noto‘g‘ri formatda')
            
            const groups = groupImportedExcelRowsToOrders(rawRows)
            const validGroups = groups.filter((g) => g.length)
            if (!validGroups.length) return alert('Buyurtmalar topilmadi')

            const ok = confirm(`${validGroups.length} ta buyurtmani import qilmoqchimisiz?`)
            if (!ok) return

            let okCount = 0
            for (const group of validGroups) {
                try {
                    await persistImportedExcelOrderGroup(group)
                    okCount++
                } catch (err) {
                    console.error('Import error for group:', err)
                }
            }
            
            alert(`${okCount} ta buyurtma muvaffaqiyatli import qilindi`)
            setImportPreview(validGroups)
            loadData() // Stats ni yangilaymiz
        } catch (err) {
            console.error(err)
            alert('Importda xatolik yuz berdi: ' + err.message)
        } finally {
            setExcelImportBusy(false)
        }
    }

    useEffect(() => {
        const mode = readLs(LS_MODE, 'preset')
        if (['preset', 'month', 'range'].includes(mode)) setDateMode(mode)
        const d = readLs(LS_DAYS, '30')
        if (VALID_FILTER_RANGES.includes(d)) setFilterRange(d)
        const mo = readLs(LS_MONTH, defaultMonthStr())
        if (/^\d{4}-\d{2}$/.test(mo)) setMonthValue(mo)
        const df = readLs(LS_FROM, defaultRangeStrs().from)
        const dt = readLs(LS_TO, defaultRangeStrs().to)
        setRangeFrom(df)
        setRangeTo(dt)
        setOrderStatusFilter('completed')
        setHydrated(true)
    }, [])

    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            setLoadError(null)
            setPartialWarning(null)

            const { start, end } = getPeriodBounds(dateMode, filterRange, monthValue, rangeFrom, rangeTo)
            
            // Backend API orqali hisob-kitoblarni olish
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
            const response = await fetch(`${apiUrl}/statistics/analytics?start=${start.toISOString()}&end=${end.toISOString()}`)
            
            if (!response.ok) {
                throw new Error('Backenddan maʼlumot olishda xatolik yuz berdi')
            }

            const result = await response.json()

            setData({
                summary: result.summary,
                categories: result.categories,
                products: result.products,
                customers: result.customers,
                salesTrend: result.salesTrend,
                orders: [], // Legacy compat
                finance: [], // Legacy compat
            })
        } catch (error) {
            console.error('Error loading statistika from backend:', error)
            const detail = error?.message ? ` — ${error.message}` : ''
            setLoadError(`${t('statistics.loadErrorGeneric')}${detail}`)
        } finally {
            setLoading(false)
        }
    }, [dateMode, filterRange, monthValue, rangeFrom, rangeTo, t])

    useEffect(() => {
        loadData()
    }, [loadData])

    const { start: periodStart, end: periodEnd } = useMemo(
        () => getPeriodBounds(dateMode, filterRange, monthValue, rangeFrom, rangeTo),
        [dateMode, filterRange, monthValue, rangeFrom, rangeTo]
    )

    const locale =
        language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ'

    const periodLabel = useMemo(() => {
        const a = periodStart.toLocaleDateString(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        const b = periodEnd.toLocaleDateString(locale, {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        })
        return `${a} — ${b}`
    }, [periodStart, periodEnd, locale])

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

    /** Backenddan kelgan hisob-kitoblar */
    const totalSales = data.summary?.totalSales || 0
    const totalExpense = data.summary?.totalExpense || 0
    const totalIncomeFromCompletedOrders = data.summary?.totalIncome || 0
    const filteredOrdersCount = data.summary?.ordersCount || 0

    const salesChartData = data.salesTrend || []
    const financeChartData = data.financeTrend || []
    const categoryAnalyticsRows = useMemo(() => {
        return (data.categories || []).map(r => ({
            ...r,
            qtyDisplay: formatMixedQtyLabel(r.qtyPieces || 0, r.qtyKg || 0)
        }))
    }, [data.categories])

    const productAnalyticsRows = useMemo(() => {
        return (data.products || []).map(r => ({
            ...r,
            qty: r.qty || 0,
            revenue: r.revenue || 0
        }))
    }, [data.products])

    const customerAnalyticsRows = data.customers || []
    const customerModelAnalyticsRows = data.customerModels || []

    const unsoldCount = productAnalyticsRows.filter((r) => (Number(r.qty) || 0) === 0).length
    const categoryData = useMemo(() => categoryAnalyticsRows.map((r) => ({ name: r.name, value: r.revenue || 0 })), [categoryAnalyticsRows])
    const revenueFromOrderLines = totalIncomeFromCompletedOrders
    
    const categoryTotals = useMemo(() => 
        categoryAnalyticsRows.reduce((acc, r) => {
            acc.qtyPieces += Number(r.qtyPieces) || 0
            acc.qtyKg += Number(r.qtyKg) || 0
            return acc
        }, { qtyPieces: 0, qtyKg: 0 }), 
    [categoryAnalyticsRows])

    const topProductsBarData = useMemo(() => 
        productAnalyticsRows
            .filter((r) => r.qty > 0)
            .slice(0, TOP_N_BAR)
            .map((r) => ({
                label: r.name.length > 26 ? `${r.name.slice(0, 24)}…` : r.name,
                qty: r.qty,
                full: r.name,
            })),
    [productAnalyticsRows])

    const topCustomersBarData = useMemo(() => 
        customerAnalyticsRows.slice(0, TOP_N_BAR).map((r) => ({
            label: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
            total: Math.round(Number(r.total) * 100) / 100,
            full: r.name,
        })),
    [customerAnalyticsRows])

    const printContextLine = useMemo(() => {
        const statusLabel = t('statistics.orderStatusCompleted')
        return `${t('statistics.activePeriod')}: ${periodLabel} · ${t('statistics.orderStatusFilter')}: ${statusLabel}`
    }, [periodLabel, t])

    const printRefCategories = useRef(null)
    const printRefProducts = useRef(null)
    const printRefCustomers = useRef(null)
    const printRefCustomerModels = useRef(null)
    
    // Solishtirish Markazi uchun jami hisob-kitoblar
    const rawExcelTotals = useMemo(() => {
        if (!rawExcelItems) return { qty: 0 }
        return rawExcelItems.reduce((acc, item) => ({
            qty: acc.qty + (Number(item.quantity) || 0)
        }), { qty: 0 })
    }, [rawExcelItems])

    const reconciliationTotals = useMemo(() => {
        if (!reconciliationData) return { crm: 0, excel: 0, diff: 0 }
        return reconciliationData.reduce((acc, item) => ({
            crm: acc.crm + (Number(item.crmQty) || 0),
            excel: acc.excel + (Number(item.excelQty) || 0),
            diff: acc.diff + (Number(item.remaining) || 0)
        }), { crm: 0, excel: 0, diff: 0 })
    }, [reconciliationData])

    const runReconciliation = useCallback(async (excelItems, orderId) => {
        if (!excelItems) return
        
        // Smart normalization for matching (strips IDs in parentheses, ignores case/non-alnum)
        const smartNorm = (s) => String(s || '').toLowerCase().replace(/\(\d+\)/g, '').replace(/[^a-z0-9]/g, '').trim()

        setReconciling(true)
        try {
            let crmItemsAgg = {}
            if (orderId) {
                const { data: items, error } = await fetchOrderItemsForOrderId(orderId)
                if (error) throw error

                items.forEach(it => {
                    const p = it.products
                    const modelCode = it.size || (p?.sku) || '—'
                    const color = it.color || '—'
                    const key = `${smartNorm(modelCode)}|${smartNorm(color)}`

                    const name = (p?.name || it.product_name || 'Noma\'lum')
                    if (!crmItemsAgg[key]) {
                        crmItemsAgg[key] = { 
                            name: name, 
                            sku: modelCode, 
                            color: color, 
                            category: (p?.categories?.name || p?.categories?.name_uz || 'Boshqa').trim(),
                            qty: 0,
                            matchKey: key
                        }
                    }
                    crmItemsAgg[key].qty += Number(it.quantity) || 0
                })
            }

            // Fetch all products to match Excel-only items to categories
            const { data: allProds } = await fetchProducts()
            const unifiedCatMap = {} 
            if (allProds) {
                allProds.forEach(p => {
                    const catName = String(p?.categories?.name || p?.categories?.name_uz || 'Boshqa').trim()
                    unifiedCatMap[smartNorm(p.sku)] = catName
                    unifiedCatMap[smartNorm(p.name)] = catName
                })
            }

            // Consolidate Excel items too
            const excelItemsAgg = {}
            excelItems.forEach(ex => {
                const sku = String(ex.model_code || '').trim()
                const color = String(ex.color || '').trim()
                const key = `${smartNorm(sku)}|${smartNorm(color)}`
                
                if (!excelItemsAgg[key]) {
                    const name = ex.product_name || 'Excel mahsuloti'
                    excelItemsAgg[key] = {
                        name: name,
                        sku: sku,
                        color: color,
                        category: unifiedCatMap[smartNorm(sku)] || unifiedCatMap[smartNorm(name)] || 'Boshqa',
                        qty: 0,
                        matchKey: key
                    }
                }
                excelItemsAgg[key].qty += Number(ex.quantity) || 0
            })

            const reconciled = []
            const processedExcelKeys = new Set()

            // 1. Process CRM items and find matches in Excel
            Object.values(crmItemsAgg).forEach(crm => {
                const excelMatch = excelItemsAgg[crm.matchKey]
                const excelQty = excelMatch ? excelMatch.qty : 0
                const diff = excelQty - crm.qty
                
                reconciled.push({
                    name: crm.name,
                    sku: crm.sku,
                    color: crm.color,
                    category: crm.category || 'Boshqa',
                    crmQty: crm.qty,
                    excelQty: excelQty,
                    remaining: diff,
                    status: diff === 0 ? 'MATCHED' : 'DISCREPANCY',
                    type: 'crm'
                })
                
                if (excelMatch) processedExcelKeys.add(crm.matchKey)
            })

            // 2. Add Excel items that were NOT in CRM
            Object.values(excelItemsAgg).forEach(ex => {
                if (!processedExcelKeys.has(ex.matchKey)) {
                    reconciled.push({
                        name: ex.name,
                        sku: ex.sku,
                        color: ex.color,
                        category: ex.category || 'Boshqa',
                        crmQty: 0,
                        excelQty: ex.qty,
                        remaining: ex.qty,
                        status: 'EXTRA',
                        type: 'excel',
                        matchKey: ex.matchKey
                    })
                }
            })

            // STEP 3: Unified Category Alignment (The 'Arqon' & 'Smoladan' Fix)
            const nameToMainCat = {}
            reconciled.forEach(row => {
                const normName = smartNorm(row.name)
                if (!nameToMainCat[normName] || nameToMainCat[normName] === 'Boshqa') {
                    if (row.category && row.category !== 'Boshqa') nameToMainCat[normName] = row.category
                    else if (!nameToMainCat[normName]) nameToMainCat[normName] = 'Boshqa'
                }
            })

            const finalReconciled = reconciled.map(row => ({
                ...row,
                category: nameToMainCat[smartNorm(row.name)] || row.category
            }))

            setReconciliationData(finalReconciled.sort((a, b) => {
                // PRIMARY: Category
                const catA = String(a.category).trim(); const catB = String(b.category).trim()
                if (catA !== catB) return catA.localeCompare(catB)
                // SECONDARY: Unified Name
                return a.name.localeCompare(b.name)
            }))
        } catch (err) {
            console.error('Reconciliation error:', err)
            alert('Solishtirishda xatolik: ' + err.message)
        } finally {
            setReconciling(false)
        }
    }, [])

    // Trigger reconciliation when order or excel data changes
    useEffect(() => {
        if (rawExcelItems && selectedRecOrderId) {
            runReconciliation(rawExcelItems, selectedRecOrderId)
        }
    }, [selectedRecOrderId, rawExcelItems, runReconciliation])

    const exportFileBase = useMemo(
        () => `stat-${periodFileStamp(periodStart, periodEnd)}-${orderStatusFilter}`,
        [periodStart, periodEnd, orderStatusFilter]
    )

    const exportProductsCsv = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colProduct'),
            t('statistics.colQtySold'),
            t('statistics.colRevenue'),
        ]
        const lines = [
            hdr.map(csvEscape).join(','),
            ...productAnalyticsRows.map((row, i) =>
                [i + 1, row.name, row.qty, formatUsd(row.revenue)].map(csvEscape).join(',')
            ),
        ]
        const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
        downloadBlob(`${exportFileBase}-mahsulotlar.csv`, blob)
    }, [exportFileBase, productAnalyticsRows, t])

    const exportProductsXlsx = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colProduct'),
            t('statistics.colQtySold'),
            t('statistics.colRevenue'),
        ]
        const aoa = [
            hdr,
            ...productAnalyticsRows.map((row, i) => [i + 1, row.name, row.qty, Number(row.revenue) || 0]),
        ]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Products')
        XLSX.writeFile(wb, `${exportFileBase}-mahsulotlar.xlsx`)
    }, [exportFileBase, productAnalyticsRows, t])

    const exportCategoriesCsv = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colCategory'),
            t('statistics.colQtySold'),
            t('statistics.colRevenue'),
        ]
        const lines = [
            hdr.map(csvEscape).join(','),
            ...categoryAnalyticsRows.map((row, i) =>
                [i + 1, row.name, row.qtyDisplay, formatUsd(row.revenue)].map(csvEscape).join(',')
            ),
        ]
        const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
        downloadBlob(`${exportFileBase}-kategoriyalar.csv`, blob)
    }, [categoryAnalyticsRows, exportFileBase, t])

    const exportCategoriesXlsx = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colCategory'),
            t('statistics.colQtySold'),
            t('statistics.colRevenue'),
        ]
        const aoa = [
            hdr,
            ...categoryAnalyticsRows.map((row, i) => [i + 1, row.name, row.qtyDisplay, Number(row.revenue) || 0]),
        ]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Categories')
        XLSX.writeFile(wb, `${exportFileBase}-kategoriyalar.xlsx`)
    }, [categoryAnalyticsRows, exportFileBase, t])

    const exportCustomersCsv = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colCustomer'),
            t('statistics.colPhone'),
            t('statistics.colOrdersCount'),
            t('statistics.colItemsQty'),
            t('statistics.colTotalSpent'),
        ]
        const lines = [
            hdr.map(csvEscape).join(','),
            ...customerAnalyticsRows.map((row, i) =>
                [i + 1, row.name, row.phone, row.orders, row.itemQty, formatUsd(row.total)]
                    .map(csvEscape)
                    .join(',')
            ),
        ]
        const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
        downloadBlob(`${exportFileBase}-mijozlar.csv`, blob)
    }, [customerAnalyticsRows, exportFileBase, t])

    const exportCustomersXlsx = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colCustomer'),
            t('statistics.colPhone'),
            t('statistics.colOrdersCount'),
            t('statistics.colItemsQty'),
            t('statistics.colTotalSpent'),
        ]
        const aoa = [
            hdr,
            ...customerAnalyticsRows.map((row, i) => [
                i + 1,
                row.name,
                row.phone,
                row.orders,
                row.itemQty,
                Number(row.total) || 0,
            ]),
        ]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Customers')
        XLSX.writeFile(wb, `${exportFileBase}-mijozlar.xlsx`)
    }, [customerAnalyticsRows, exportFileBase, t])

    const exportCustomerModelsCsv = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colCustomer'),
            t('statistics.colPhone'),
            t('statistics.colModelCode'),
            t('statistics.colQtySold'),
            t('statistics.colRevenue'),
        ]
        const lines = [
            hdr.map(csvEscape).join(','),
            ...customerModelAnalyticsRows.map((row, i) =>
                [i + 1, row.name, row.phone, row.modelCode, row.qty, formatUsd(row.revenue)]
                    .map(csvEscape)
                    .join(',')
            ),
        ]
        const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
        downloadBlob(`${exportFileBase}-mijoz-model.csv`, blob)
    }, [customerModelAnalyticsRows, exportFileBase, t])

    const exportCustomerModelsXlsx = useCallback(() => {
        const hdr = [
            t('statistics.colRank'),
            t('statistics.colCustomer'),
            t('statistics.colPhone'),
            t('statistics.colModelCode'),
            t('statistics.colQtySold'),
            t('statistics.colRevenue'),
        ]
        const aoa = [
            hdr,
            ...customerModelAnalyticsRows.map((row, i) => [
                i + 1,
                row.name,
                row.phone,
                row.modelCode,
                row.qty,
                Number(row.revenue) || 0,
            ]),
        ]
        const ws = XLSX.utils.aoa_to_sheet(aoa)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'CustModels')
        XLSX.writeFile(wb, `${exportFileBase}-mijoz-model.xlsx`)
    }, [customerModelAnalyticsRows, exportFileBase, t])

    function onDateModeChange(next) {
        setDateMode(next)
        writeLs(LS_MODE, next)
    }

    function onFilterRangeChange(next) {
        setFilterRange(next)
        writeLs(LS_DAYS, next)
    }

    function onMonthChange(next) {
        setMonthValue(next)
        writeLs(LS_MONTH, next)
    }

    function onRangeFromChange(next) {
        setRangeFrom(next)
        writeLs(LS_FROM, next)
    }

    function onRangeToChange(next) {
        setRangeTo(next)
        writeLs(LS_TO, next)
    }

    function onOrderStatusFilterChange(next) {
        setOrderStatusFilter(next)
        writeLs(LS_STATUS, next)
    }

    if (!hydrated || loading) {
        return (
            <div className="p-8">
                <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
                    <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600" />
                    <span className="font-medium text-gray-600">{t('statistics.loading')}</span>
                </div>
            </div>
        )
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-10">
            <Header title={t('common.statistics')} toggleSidebar={toggleSidebar} />

            <p className="text-xs text-gray-500 mb-4">{t('statistics.hintBuyurtmalar')}</p>

            <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between mb-6">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setViewMode('dashboard')}
                        className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                            viewMode === 'dashboard'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        Statistika
                    </button>
                    <button
                        onClick={() => setViewMode('reconciliation')}
                        className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                            viewMode === 'reconciliation'
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        <RefreshCcw size={14} />
                        Solishtirish Markazi
                    </button>

                    <div className="w-px h-6 bg-gray-200 mx-2 self-center" />

                    {[
                        { id: 'preset', label: t('statistics.dateModePreset') },
                        { id: 'month', label: t('statistics.dateModeMonth') },
                        { id: 'range', label: t('statistics.dateModeRange') },
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={() => onDateModeChange(btn.id)}
                            className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                                dateMode === btn.id
                                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {dateMode === 'preset' ? (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                            <Calendar size={18} className="text-gray-500 shrink-0" />
                            <select
                                value={filterRange}
                                onChange={(e) => onFilterRangeChange(e.target.value)}
                                className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700 outline-none cursor-pointer"
                            >
                                <option value="7">{t('statistics.last7Days')}</option>
                                <option value="30">{t('statistics.last30Days')}</option>
                                <option value="90">{t('statistics.last3Months')}</option>
                                <option value="365">{t('statistics.last1Year')}</option>
                            </select>
                        </div>
                    ) : null}
                    {dateMode === 'month' ? (
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                            <Calendar size={18} className="text-gray-500" />
                            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
                                {t('statistics.pickMonth')}
                            </label>
                            <input
                                type="month"
                                value={monthValue}
                                onChange={(e) => onMonthChange(e.target.value)}
                                className="border-0 bg-transparent text-sm font-bold text-gray-800 outline-none"
                            />
                        </div>
                    ) : null}
                    {dateMode === 'range' ? (
                        <div className="flex flex-wrap items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                            <span className="text-xs font-semibold text-gray-500">{t('statistics.dateFrom')}</span>
                            <input
                                type="date"
                                value={rangeFrom}
                                onChange={(e) => onRangeFromChange(e.target.value)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-mono"
                            />
                            <span className="text-xs font-semibold text-gray-500">{t('statistics.dateTo')}</span>
                            <input
                                type="date"
                                value={rangeTo}
                                onChange={(e) => onRangeToChange(e.target.value)}
                                className="rounded-lg border border-gray-200 px-2 py-1 text-sm font-mono"
                            />
                        </div>
                    ) : null}

                    <div className="flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-xl shadow-sm border border-blue-100">
                        <Package size={18} className="text-blue-600 shrink-0" />
                        <span className="text-sm font-bold text-blue-800 whitespace-nowrap">
                            {t('statistics.orderStatusCompleted')}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => loadData()}
                        className="p-2.5 bg-white hover:bg-gray-50 rounded-xl shadow-sm border border-gray-200 transition-all text-gray-600 hover:text-blue-600"
                        title={t('statistics.refreshData')}
                    >
                        <RefreshCcw size={20} />
                    </button>
                </div>
            </div>

            {loadError ? (
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950">
                    <div className="flex gap-2 min-w-0">
                        <AlertCircle size={20} className="shrink-0 mt-0.5" aria-hidden />
                        <p className="min-w-0 break-words">{loadError}</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => loadData()}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-800 hover:bg-red-100"
                    >
                        <RefreshCcw size={14} />
                        {t('dashboard.retryLoad')}
                    </button>
                </div>
            ) : null}

            {!loadError && partialWarning ? (
                <div className="mb-4 flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    <AlertTriangle size={20} className="shrink-0 mt-0.5" aria-hidden />
                    <p className="min-w-0 break-words">{partialWarning}</p>
                </div>
            ) : null}

            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-5 py-4 text-sm text-gray-200">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                        <Calendar size={18} className="text-blue-400" />
                    </div>
                    <div>
                        <span className="font-bold text-gray-100">{t('statistics.activePeriod')}:</span>{' '}
                        <span className="font-mono tabular-nums text-blue-300 ml-1">{periodLabel}</span>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                            {t('statistics.ordersInPeriod')}: <span className="text-white font-medium">{filteredOrdersCount}</span> · {t('statistics.orderStatusCompleted')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="relative overflow-hidden group bg-gradient-to-br from-blue-600/90 to-blue-800/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl shadow-blue-900/20">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10">
                            <ShoppingCart size={26} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-blue-100/70 uppercase tracking-wider">{t('statistics.totalSalesPeriod')}</p>
                            <p className="text-2xl font-black mt-1 font-mono tracking-tight text-white">${formatUsd(totalSales)}</p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden group bg-gradient-to-br from-emerald-500/90 to-emerald-700/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl shadow-emerald-900/20">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10">
                            <TrendingUp size={26} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-emerald-100/70 uppercase tracking-wider">{t('statistics.totalIncome')}</p>
                            <p className="text-2xl font-black mt-1 font-mono tracking-tight text-white">
                                +${formatUsd(totalIncomeFromCompletedOrders)}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="relative overflow-hidden group bg-gradient-to-br from-rose-500/90 to-rose-700/90 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-2xl shadow-rose-900/20">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-md border border-white/10">
                            <TrendingDown size={26} className="text-white" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-rose-100/70 uppercase tracking-wider">{t('statistics.totalExpense')}</p>
                            <p className="text-2xl font-black mt-1 font-mono tracking-tight text-white">-${formatUsd(totalExpense)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl overflow-hidden">
                    <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                         <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                         {t('statistics.topProductsBar')}
                    </h3>
                    <div className="h-[320px]">
                        {topProductsBarData.length === 0 ? (
                            <p className="text-sm text-gray-400 py-12 text-center italic">{t('statistics.noData')}</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={topProductsBarData}
                                    margin={{ top: 8, right: 30, left: 0, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: '#e2e8f0' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        formatter={(v) => [v, t('statistics.chartQtyShort')]}
                                        labelFormatter={(_, p) => (p?.[0]?.payload?.full ? String(p[0].payload.full) : '')}
                                    />
                                    <Bar dataKey="qty" fill="url(#blueGradient)" radius={[0, 6, 6, 0]} barSize={20} />
                                    <defs>
                                        <linearGradient id="blueGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#3b82f6" />
                                            <stop offset="100%" stopColor="#60a5fa" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="bg-white/10 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-xl">
                    <h3 className="text-lg font-bold mb-6 text-white flex items-center gap-2">
                         <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                         {t('statistics.topCustomersBar')}
                    </h3>
                    <div className="h-[320px]">
                        {topCustomersBarData.length === 0 ? (
                            <p className="text-sm text-gray-400 py-12 text-center italic">{t('statistics.noData')}</p>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={topCustomersBarData}
                                    margin={{ top: 8, right: 30, left: 0, bottom: 8 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#ffffff10" />
                                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => `$${v}`} axisLine={false} tickLine={false} />
                                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 10, fill: '#e2e8f0' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                        itemStyle={{ color: '#f8fafc' }}
                                        formatter={(v) => [`$${formatUsd(v)}`, t('statistics.colTotalSpent')]}
                                        labelFormatter={(_, p) => (p?.[0]?.payload?.full ? String(p[0].payload.full) : '')}
                                    />
                                    <Bar dataKey="total" fill="url(#emeraldGradient)" radius={[0, 6, 6, 0]} barSize={20} />
                                    <defs>
                                        <linearGradient id="emeraldGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#10b981" />
                                            <stop offset="100%" stopColor="#34d399" />
                                        </linearGradient>
                                    </defs>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>
            {/* Excel Import Summary Table */}
            {importPreview && (
                <div className="mb-8 bg-white/5 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-emerald-400 flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/20 rounded-xl">
                                <ShoppingCart size={20} />
                            </div>
                            Muvaffaqiyatli Import Qilindi
                        </h2>
                        <button
                            onClick={() => setImportPreview(null)}
                            className="bg-white/5 hover:bg-white/10 p-2 rounded-xl text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    
                    <div className="overflow-auto rounded-2xl border border-white/5 bg-black/20 max-h-[400px]">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-white/5 sticky top-0 z-20 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider">Mijoz / Telefon</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider">Mahsulotlar soni</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider">Jami Summa</th>
                                    <th className="px-6 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {importPreview.map((group, idx) => {
                                    const first = group[0]
                                    const total = group.reduce((sum, row) => sum + (Number(row.unit_price || 0) * Number(row.quantity || 1)), 0)
                                    return (
                                        <tr key={idx} className="hover:bg-white/[0.03] transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-100">{first.customer_name || 'Noma\'lum'}</div>
                                                <div className="text-[10px] font-mono text-gray-500 mt-0.5">{first.customer_phone || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center font-mono text-blue-400 font-bold">{group.length} ta pozitsiya</td>
                                            <td className="px-6 py-4 text-center font-mono text-emerald-400 font-bold">${total.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[9px] uppercase font-black px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-widest leading-none">
                                                    {first.order_status || 'Yangi'}
                                                </span>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                        </div>
                    </div>
                )}

            {viewMode === 'dashboard' ? (
                <>


                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                        <div ref={printRefCategories} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col h-[520px]">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
                                <h3 className="text-lg font-extrabold flex items-center gap-3 text-white">
                                    <div className="p-2 bg-amber-500/20 rounded-xl">
                                        <FolderTree size={20} className="text-amber-400" />
                                    </div>
                                    {t('statistics.categoryAnalytics')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={exportCategoriesCsv}
                                        className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-gray-300 hover:bg-white/10 transition-all"
                                    >
                                        CSV
                                    </button>
                                    <button
                                        type="button"
                                        onClick={exportCategoriesXlsx}
                                        className="px-2.5 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-[10px] font-bold text-amber-400 hover:bg-amber-500/20 transition-all"
                                    >
                                        Excel
                                    </button>
                                </div>
                            </div>

                            <div className="h-[180px] mb-4 relative shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={5}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '11px' }}
                                            itemStyle={{ color: '#f8fafc' }}
                                            formatter={(val) => `$${formatUsd(val)}`} 
                                        />
                                        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: 9, paddingTop: 10, color: '#94a3b8' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <div className="stat-analytics-print-scroll flex-1 overflow-auto rounded-2xl border border-white/5 bg-black/20">
                                    <table className="w-full text-[13px] text-left border-collapse">
                                        <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">№</th>
                                                <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colCategory')}</th>
                                                <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colQtySold')}</th>
                                                <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colRevenue')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {categoryAnalyticsRows.map((row, idx) => (
                                                <tr key={row.name + idx} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-4 py-2.5 font-mono text-gray-500 text-[10px]">{idx + 1}</td>
                                                    <td className="px-4 py-2.5 font-bold text-gray-200 group-hover:text-white leading-tight">{row.name}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-amber-400/90 whitespace-nowrap">{row.qtyDisplay}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-white whitespace-nowrap">${formatUsd(row.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div ref={printRefProducts} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl flex flex-col h-[520px]">
                            <div className="flex flex-wrap items-center justify-between gap-4 mb-4 shrink-0">
                                <h3 className="text-lg font-extrabold flex items-center gap-3 text-white">
                                    <div className="p-2 bg-indigo-500/20 rounded-xl">
                                        <Package size={20} className="text-indigo-400" />
                                    </div>
                                    {t('statistics.productAnalytics')}
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={exportProductsCsv} className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-gray-300 hover:bg-white/10 transition-all">
                                        CSV
                                    </button>
                                    <button onClick={exportProductsXlsx} className="px-2.5 py-1 rounded-lg border border-indigo-500/20 bg-indigo-500/10 text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all">
                                        Excel
                                    </button>
                                </div>
                            </div>

                            <p className="text-[10px] text-gray-400 mb-3 px-1 italic shrink-0">
                                {t('statistics.colUnsold')}: <span className="text-white font-bold not-italic">{unsoldCount}</span>
                            </p>

                            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                                <div className="stat-analytics-print-scroll flex-1 overflow-auto rounded-2xl border border-white/5 bg-black/20">
                                    <table className="w-full text-[13px] text-left border-collapse">
                                        <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                            <tr>
                                                <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">№</th>
                                                <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colProduct')}</th>
                                                <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">Artikul</th>
                                                <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colQtySold')}</th>
                                                <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colRevenue')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {productAnalyticsRows.map((row, idx) => (
                                                <tr key={row.name + idx} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-4 py-2.5 font-mono text-gray-500 text-[10px]">{idx + 1}</td>
                                                    <td className="px-4 py-2.5 font-bold text-gray-200 group-hover:text-white max-w-[10rem] truncate leading-tight">{row.name}</td>
                                                    <td className="px-4 py-2.5 font-mono text-[9px] text-gray-500">{row.sku}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono text-indigo-400/90 whitespace-nowrap">{formatQtyCompact(row.qty)}</td>
                                                    <td className="px-4 py-2.5 text-right font-mono font-bold text-white whitespace-nowrap">${formatUsd(row.revenue)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div ref={printRefCustomers} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl mb-8 flex flex-col h-[520px]">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 shrink-0">
                            <h3 className="text-lg font-extrabold flex items-center gap-3 text-white">
                                <div className="p-2 bg-emerald-500/20 rounded-xl">
                                    <Users size={20} className="text-emerald-400" />
                                </div>
                                {t('statistics.customerAnalytics')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={exportCustomersCsv} className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-gray-300 hover:bg-white/10 transition-all">
                                    CSV
                                </button>
                                <button onClick={exportCustomersXlsx} className="px-2.5 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all">
                                    Excel
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <div className="stat-analytics-print-scroll flex-1 overflow-auto rounded-2xl border border-white/5 bg-black/20">
                                <table className="w-full text-[13px] text-left border-collapse">
                                    <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">№</th>
                                            <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colCustomer')}</th>
                                            <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colPhone')}</th>
                                            <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colOrdersCount')}</th>
                                            <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colItemsQty')}</th>
                                            <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colTotalSpent')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {customerAnalyticsRows.map((row, idx) => (
                                            <tr key={row.name + idx} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-4 py-2.5 font-mono text-gray-500 text-[10px]">{idx + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-gray-200 group-hover:text-white leading-tight">{row.name}</td>
                                                <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 whitespace-nowrap">{row.phone}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-gray-400 whitespace-nowrap">{row.ordersCount}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-gray-400 whitespace-nowrap">{row.itemQty}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">${formatUsd(row.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <div ref={printRefCustomerModels} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl mb-8 flex flex-col h-[520px]">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-2 shrink-0">
                            <h3 className="text-lg font-extrabold flex items-center gap-3 text-white">
                                <div className="p-2 bg-violet-500/20 rounded-xl">
                                    <Layers size={20} className="text-violet-400" />
                                </div>
                                {t('statistics.customerModelAnalytics')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                <button onClick={exportCustomerModelsCsv} className="px-2.5 py-1 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-gray-300 hover:bg-white/10 transition-all">
                                    CSV
                                </button>
                                <button onClick={exportCustomerModelsXlsx} className="px-2.5 py-1 rounded-lg border border-violet-500/20 bg-violet-500/10 text-[10px] font-bold text-violet-400 hover:bg-violet-500/20 transition-all">
                                    Excel
                                </button>
                            </div>
                        </div>
                        <p className="text-[10px] text-gray-400 mb-4 italic shrink-0">{t('statistics.customerModelHint')}</p>

                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
                            <div className="stat-analytics-print-scroll flex-1 overflow-auto rounded-2xl border border-white/5 bg-black/20">
                                <table className="w-full text-[13px] text-left border-collapse">
                                    <thead className="bg-white/5 sticky top-0 z-10 backdrop-blur-md">
                                        <tr>
                                            <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">№</th>
                                            <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colCustomer')}</th>
                                            <th className="px-4 py-2.5 text-[9px] uppercase tracking-wider text-gray-400 font-black">Model/Artikul</th>
                                            <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colQtySold')}</th>
                                            <th className="px-4 py-2.5 text-right text-[9px] uppercase tracking-wider text-gray-400 font-black">{t('statistics.colRevenue')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {customerModelAnalyticsRows.map((row, idx) => (
                                            <tr key={row.name + idx} className="hover:bg-white/[0.02] transition-colors group">
                                                <td className="px-4 py-2.5 font-mono text-gray-500 text-[10px]">{idx + 1}</td>
                                                <td className="px-4 py-2.5 font-bold text-gray-200 group-hover:text-white leading-tight">{row.name}</td>
                                                <td className="px-4 py-2.5 font-mono text-[10px] text-violet-300/80 leading-tight">{row.modelCode}</td>
                                                <td className="px-4 py-2.5 text-right font-mono text-gray-400 whitespace-nowrap">{row.qty}</td>
                                                <td className="px-4 py-2.5 text-right font-mono font-bold text-white whitespace-nowrap">${formatUsd(row.revenue)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                /* Excel Reconciliation Section (Restored & Enhanced as separate page) */
                <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="mb-6 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden group min-h-[400px]">
                        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 relative z-10 mb-6 pb-6 border-b border-white/10">
                            <div className="flex-1">
                                <h1 className="text-xl font-black text-white flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-xl shadow-inner">
                                        <RefreshCcw size={20} className="text-amber-400" />
                                    </div>
                                    Solishtirish Markazi
                                </h1>
                                <p className="text-gray-400 text-xs mt-1 max-w-lg leading-relaxed font-medium">
                                    Hamkor hisobotini CRM dagi yuborilgan buyurtmalar bilan artikul va rang bo'yicha solishtiring.
                                </p>
                            </div>


                            <div className="flex flex-wrap items-center gap-4">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-3 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10 focus-within:border-amber-500/50 transition-all shadow-inner group-hover:border-white/20">
                                        <Users size={18} className="text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Buyurtmani qidirish..."
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white outline-none min-w-[200px]"
                                        />
                                        <Archive size={18} className="text-gray-500 ml-2" />
                                        <select
                                            value={selectedRecOrderId}
                                            onChange={(e) => setSelectedRecOrderId(e.target.value)}
                                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white outline-none cursor-pointer max-w-[300px]"
                                        >
                                            <option value="" className="text-gray-800">Buyurtmani tanlang</option>
                                            {customerOrders
                                                .filter(o => {
                                                    const s = orderSearch.toLowerCase()
                                                    return (
                                                        String(o.order_number || '').toLowerCase().includes(s) ||
                                                        String(o.customer_name || '').toLowerCase().includes(s) ||
                                                        String(o.customer_phone || '').toLowerCase().includes(s)
                                                    )
                                                })
                                                .slice(0, 50)
                                                .map(o => (
                                                    <option key={o.id} value={o.id} className="text-gray-800">
                                                        № {o.order_number || String(o.id).slice(0, 8)} — {o.customer_name || 'Noma\'lum'}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <p className="text-[9px] text-gray-500 ml-2">Oxirgi 50 ta mos keladigan buyurtma</p>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10 focus-within:border-amber-500/50 transition-all shadow-inner group-hover:border-white/20">
                                        <Layers size={18} className="text-gray-500" />
                                        <select
                                            value=""
                                            onChange={(e) => {
                                                const id = e.target.value
                                                if (id && !selectedBatchIds.includes(id)) {
                                                    setSelectedBatchIds(prev => [...prev, id])
                                                }
                                            }}
                                            className="bg-transparent border-none focus:ring-0 text-sm font-bold text-white outline-none cursor-pointer min-w-[200px]"
                                        >
                                            <option value="" className="text-gray-800">Hisobot qo'shish (Birlashtirish)</option>
                                            {importHistory.map(h => (
                                                <option key={h.id} value={h.id} className="text-gray-800" disabled={selectedBatchIds.includes(h.id)}>
                                                    {h.fileName} ({new Date(h.importDate).toLocaleDateString()})
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => setIsHistoryModalOpen(true)}
                                            className="text-[10px] font-black uppercase text-rose-400 hover:text-rose-300 transition-colors border-l border-white/10 pl-4 flex items-center gap-2"
                                            title="Tarixni boshqarish"
                                        >
                                            <Trash2 size={14} />
                                            O'chirish
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="text-[10px] font-black uppercase text-amber-400 hover:text-amber-300 transition-colors border-l border-white/10 pl-4"
                                        >
                                            Yangi Fayl
                                        </button>
                                    </div>
                                    <p className="text-[9px] text-gray-400 ml-2">Bir nechta hisobotlarni tanlab birlashtirishingiz mumkin</p>
                                </div>
                            </div>
                        </div>

                        {selectedBatchIds.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2 px-2 pb-4">
                                {selectedBatchIds.map(id => {
                                    const hist = importHistory.find(h => h.id === id)
                                    if (!hist) return null
                                    return (
                                        <div key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[10px] font-black uppercase shadow-lg shadow-blue-500/5 animate-in zoom-in-50 duration-300">
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                            {hist.fileName}
                                            <button 
                                                onClick={() => setSelectedBatchIds(prev => prev.filter(bid => bid !== id))}
                                                className="ml-1 hover:text-rose-400 transition-colors bg-white/5 p-1 rounded-md"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    )
                                })}
                                {selectedBatchIds.length > 1 && (
                                    <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-500/5">
                                        <Layers size={14} />
                                        BIRLASHTIRILDI
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 1: Raw Excel Contents */}
                        {rawExcelItems && (
                            <div className="relative z-10 animate-in fade-in slide-in-from-top-6 duration-500 mb-12">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                                        <span className="w-2 h-8 bg-blue-500 rounded-full" />
                                        1. Excel Fayl Tarkibi 
                                        <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-xl ml-2 border border-blue-500/20">{excelFileName}</span>
                                        {selectedBatchIds.length > 0 && (
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold border border-blue-500/20 ml-2">
                                                TARIXDAN ({selectedBatchIds.length})
                                            </span>
                                        )}
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        {selectedBatchIds.length === 0 && (
                                            <button
                                                onClick={saveCurrentToHistory}
                                                disabled={isSavingHistory}
                                                className="text-[10px] font-black uppercase text-emerald-400 hover:text-white hover:bg-emerald-500/20 px-4 py-2 rounded-[1rem] border border-emerald-500/20 transition-all disabled:opacity-50"
                                            >
                                                {isSavingHistory ? 'Saqlanmoqda...' : 'Tarixga saqlash'}
                                            </button>
                                        )}
                                        <button
                                            onClick={resetReconciliation}
                                            className="text-xs font-black uppercase text-rose-400 hover:text-white hover:bg-rose-500/20 px-4 py-2 rounded-[1rem] border border-rose-500/20 transition-all flex items-center gap-2"
                                        >
                                            <X size={16} />
                                            Tozalash
                                        </button>
                                    </div>
                                </div>
                                <div className="overflow-auto rounded-3xl border border-white/10 bg-black/60 max-h-[500px] shadow-2xl custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#12121a] sticky top-0 z-20 backdrop-blur-2xl border-b border-white/10">
                                            <tr>
                                                <th className="px-5 py-3 text-[9px] uppercase font-black text-gray-500 tracking-wider">Mahsulot</th>
                                                <th className="px-5 py-3 text-[9px] uppercase font-black text-gray-500 tracking-wider">Kod (Artikul)</th>
                                                <th className="px-5 py-3 text-[9px] uppercase font-black text-gray-500 tracking-wider">Rang</th>
                                                <th className="px-5 py-3 text-right text-[9px] uppercase font-black text-gray-500 tracking-wider">Miqdor (Excel)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5 text-[11px]">
                                            {rawExcelItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white/[0.04] transition-colors border-l-2 border-transparent hover:border-amber-500/50">
                                                    <td className="px-4 py-2 font-bold text-gray-200">{item.product_name || '—'}</td>
                                                    <td className="px-4 py-2 font-mono text-blue-400">{item.model_code || '—'}</td>
                                                    <td className="px-4 py-2 text-gray-400 font-bold uppercase tracking-wider">{item.color || '—'}</td>
                                                    <td className="px-4 py-2 text-right font-mono font-black text-emerald-400 text-sm">{item.quantity}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot className="bg-white/5 sticky bottom-0 z-20 backdrop-blur-md border-t border-white/10">
                                            <tr className="font-black text-white uppercase tracking-widest text-[9px]">
                                                <td colSpan={3} className="px-5 py-3 text-right text-gray-400">Jami (Excel):</td>
                                                <td className="px-5 py-3 text-right font-mono text-emerald-400 text-base">{rawExcelTotals.qty}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                                {!selectedRecOrderId && (
                                     <div className="mt-6 p-6 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 text-amber-400 text-sm font-bold flex items-center gap-4 animate-pulse shadow-lg">
                                        <AlertCircle size={24} />
                                        Solishtirishni boshlash uchun yuqoridan mijoz va buyurtmani tanlang.
                                     </div>
                                )}
                            </div>
                        )}

                        {!rawExcelItems && (
                            <div className="flex flex-col items-center justify-center py-32 border-2 border-dashed border-white/10 rounded-[4rem] bg-white/[0.01] group/upload transition-all hover:bg-white/[0.03] hover:border-blue-500/20">
                                <div className="p-10 bg-amber-500/10 rounded-[3rem] mb-10 group-hover/upload:scale-110 transition-transform duration-700 shadow-2xl relative">
                                    <FileUp size={64} className="text-amber-400" />
                                    <div className="absolute inset-0 bg-amber-400/20 blur-[60px] opacity-0 group-hover/upload:opacity-100 transition-opacity" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleExcelUpload}
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={reconciling}
                                    className="px-16 py-6 rounded-[2rem] bg-amber-500 text-white font-black uppercase tracking-[0.2em] text-sm hover:bg-amber-400 shadow-3xl shadow-amber-500/40 transition-all flex items-center gap-4 active:scale-95 active:shadow-inner"
                                >
                                    {reconciling ? <div className="h-6 w-6 border-3 border-white/30 border-t-white animate-spin rounded-full" /> : <FileUp size={24} />}
                                    Excel faylni Solishtirish
                                </button>
                                <p className="text-gray-500 text-[11px] mt-10 font-black tracking-[0.3em] uppercase opacity-40">
                                    .XLSX, .XLS, .CSV formatlari
                                </p>
                            </div>
                        )}

                        {/* Step 2: Comparison Result */}
                        {reconciliationData && (
                            <div className="relative z-10 mt-16 pt-16 border-t border-white/10 animate-in fade-in slide-in-from-bottom-8 duration-700">
                                <div className="flex items-center justify-between mb-8 px-2">
                                     <h3 className="text-xl font-black text-white flex items-center gap-4">
                                        <div className="p-3 bg-emerald-500/20 rounded-2xl shadow-lg shadow-emerald-500/10">
                                            <Archive size={20} className="text-emerald-400" />
                                        </div>
                                        Solishtirish Natijasi
                                    </h3>
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => printAnalyticsBlock(reconTableRef.current)}
                                            className="px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-black uppercase tracking-widest text-[10px] hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 active:scale-95"
                                        >
                                            <Printer size={16} />
                                            Chop Etish
                                        </button>
                                        <button
                                            onClick={() => printAnalyticsBlock(reconTableRef.current)}
                                            className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                                        >
                                            <FileDown size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div ref={reconTableRef} className="overflow-auto rounded-3xl border border-white/15 bg-black/60 shadow-3xl max-h-[650px] custom-scrollbar">
                                    <style>{`
                                        @media print {
                                            .print-only-header { display: block !important; margin-bottom: 20px; }
                                            .recon-item-unmatched { background-color: #fef2f2 !important; color: #991b1b !important; }
                                            .recon-item-mismatch { background-color: #fffbeb !important; }
                                        }
                                    `}</style>
                                    <div className="hidden print-only-header p-4 border-b border-gray-200">
                                        <h2 className="text-2xl font-bold text-gray-800">Solishtirish Hisoboti</h2>
                                        <p className="text-sm text-gray-600">Buyurtma: {customerOrders.find(o => String(o.id) === String(selectedRecOrderId))?.customer_name || 'Noma\'lum'}</p>
                                        <p className="text-sm text-gray-600">Sana: {new Date().toLocaleDateString()}</p>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-[#12121a] sticky top-0 z-20 backdrop-blur-3xl border-b border-white/15">
                                            <tr>
                                                <th className="px-5 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider">Mahsulot / Artikul</th>
                                                <th className="px-5 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider text-center">Rang</th>
                                                <th className="px-5 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider text-right bg-blue-500/5">CRM</th>
                                                <th className="px-5 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider text-right bg-amber-500/5">Excel</th>
                                                <th className="px-5 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider text-right">Tafovut</th>
                                                <th className="px-5 py-4 text-[10px] uppercase font-black text-gray-400 tracking-wider text-center">Holat</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.05]">
                                            {reconciliationData.map((row, idx) => {
                                                const diff = row.remaining
                                                const isPerfect = row.status === 'MATCHED'
                                                const isExtra = row.status === 'EXTRA'
                                                const isMissingInExcel = row.crmQty > 0 && row.excelQty === 0
                                                
                                                const showCategory = idx === 0 || reconciliationData[idx - 1].category !== row.category

                                                let statusColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                let statusLabel = 'MOS KELDI'
                                                
                                                if (isExtra) {
                                                    statusColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                                    statusLabel = 'ORTIQCHA'
                                                } else if (isMissingInExcel) {
                                                    statusColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                    statusLabel = 'YETISHMAYDI'
                                                } else if (!isPerfect) {
                                                    statusColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    statusLabel = 'FARQLI'
                                                }

                                                return (
                                                    <React.Fragment key={idx}>
                                                        {showCategory && (
                                                            <tr className="bg-white/[0.02]">
                                                                <td colSpan={6} className="px-5 py-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1 h-4 bg-amber-500 rounded-full" />
                                                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/80">
                                                                            {row.category}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                        <tr className={`group hover:bg-white/[0.08] transition-all duration-300 border-b border-white/[0.02] ${isPerfect ? 'opacity-30' : ''}`}>
                                                            <td className="px-5 py-3 min-w-[200px]">
                                                                <div className="font-bold text-white text-sm group-hover:text-amber-400 transition-colors uppercase tracking-tight">{row.name}</div>
                                                                <div className="text-[10px] font-mono text-gray-500 mt-1 uppercase tracking-widest opacity-60">{row.sku}</div>
                                                            </td>
                                                            <td className="px-5 py-3 text-center min-w-[120px]">
                                                                <span className="text-[10px] font-black text-white px-3 py-1 bg-white/5 rounded-full border border-white/10 uppercase tracking-widest group-hover:bg-white/10 transition-all">
                                                                    {row.color}
                                                                </span>
                                                            </td>
                                                            <td className="px-5 py-3 text-right font-mono font-bold text-base text-blue-400 opacity-80">{row.crmQty}</td>
                                                            <td className="px-5 py-3 text-right font-mono font-bold text-base text-amber-300">{row.excelQty}</td>
                                                            <td className={`px-5 py-3 text-right font-mono font-black text-lg ${diff === 0 ? 'text-gray-700' : diff > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                                                            </td>
                                                            <td className="px-5 py-3 text-center min-w-[150px]">
                                                                <span className={`px-4 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest transition-all group-hover:scale-105 active:scale-95 ${statusColor}`}>
                                                                    {statusLabel}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    </React.Fragment>
                                                )
                                            })}
                                        </tbody>
                                        <tfoot className="bg-white/5 sticky bottom-0 z-20 backdrop-blur-md border-t border-white/10">
                                            <tr className="font-black text-white uppercase tracking-widest text-[9px]">
                                                <td colSpan={2} className="px-5 py-4 text-right text-gray-400">Jami Natija:</td>
                                                <td className="px-5 py-4 text-center font-mono text-blue-400 text-xl">{reconciliationTotals.crm}</td>
                                                <td className="px-5 py-4 text-center font-mono text-amber-400 text-xl">{reconciliationTotals.excel}</td>
                                                <td className={`px-5 py-4 text-center font-mono text-xl ${reconciliationTotals.diff < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {reconciliationTotals.diff}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* History Management Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-[#0a0a0f] border border-white/10 rounded-[3rem] shadow-4xl overflow-hidden flex flex-col max-h-[80vh]">
                        <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-4">
                                    <Trash2 size={28} className="text-rose-400" />
                                    Saqlangan Hisobotlar
                                </h3>
                                <p className="text-gray-500 text-xs mt-1 font-bold uppercase tracking-widest leading-loose">Ortiqcha yoki noto'g'ri hisobotlarni o'chirib yuboring</p>
                            </div>
                            <button 
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="p-4 rounded-2xl hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                            <div className="grid gap-4">
                                {importHistory.length === 0 ? (
                                    <div className="py-20 text-center text-gray-600 font-bold uppercase tracking-widest text-sm opacity-50">
                                        Saqlangan hisobotlar mavjud emas
                                    </div>
                                ) : (
                                    importHistory.map(h => (
                                        <div key={h.id} className="group flex items-center justify-between p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:border-rose-500/30 hover:bg-rose-500/[0.02] transition-all">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-rose-400 transition-colors">
                                                    <FileUp size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-black text-white text-base group-hover:text-rose-100 transition-colors">{h.fileName}</div>
                                                    <div className="text-[10px] text-gray-500 font-bold mt-1 uppercase tracking-widest flex items-center gap-2">
                                                        <Clock size={12} />
                                                        {new Date(h.importDate).toLocaleString()}
                                                        <span className="mx-2">•</span>
                                                        {h.items?.length || 0} ta qator
                                                    </div>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => deleteHistoryItem(h.id)}
                                                className="p-4 rounded-2xl bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-lg active:scale-90"
                                                title="O'chirish"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                        <div className="p-8 border-t border-white/10 bg-white/[0.01] flex justify-end">
                            <button 
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="px-10 py-4 rounded-2xl bg-white/10 text-white font-black text-xs uppercase tracking-widest hover:bg-white/20 transition-all"
                            >
                                Yopish
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
