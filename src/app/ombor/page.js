'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { api } from '@/utils/api'
import Header from '@/components/Header'
import {
    Package,
    RefreshCcw,
    Search,
    Filter,
    Download,
    Printer,
    X,
    Palette,
    ClipboardList,
    Plus,
} from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDialog } from '@/context/DialogContext'
import * as XLSX from 'xlsx'
import {
    numStock,
    listProductColors,
    parseStockByColor,
    sumStockByColor,
    buildStockByColorMap,
} from '@/lib/stockByColor'
import {
    mergeProductInventoryRow,
    deriveInventoryStatusFromQty,
} from '@/lib/productInventoryMerge'

const ALL_CATEGORIES = '__all__'
const OUTFLOW_ALL_PRODUCTS = '__all__'
const OUTFLOW_RANGE_ALL = 'all'
const OUTFLOW_RANGE_TODAY = 'today'
const OUTFLOW_RANGE_7D = '7d'
const OUTFLOW_RANGE_30D = '30d'

/** Katalog: asosan `sale_price`, eski qatorlar uchun `price` */
function unitPriceUzs(p) {
    const sp = Number(p?.sale_price)
    if (Number.isFinite(sp) && sp >= 0) return sp
    const pr = Number(p?.price)
    return Number.isFinite(pr) && pr >= 0 ? pr : 0
}

/** Modal uchun: har bir rang va dona */
function getColorBreakdownRows(product) {
    if (!product) return []
    const map = buildStockByColorMap(product)
    return listProductColors(product).map((c) => ({
        color: c,
        qty: Math.max(0, Math.floor(Number(map[c]) || 0)),
    }))
}

/** `size` maydoni = katalogdagi mahsulot kodi (SKU) */
function findProductByCode(products, raw) {
    const q = String(raw || '').trim().toLowerCase()
    if (!q) return null
    const matches = products.filter((p) => String(p.size || '').trim().toLowerCase() === q)
    if (matches.length >= 1) return matches[0]
    return null
}

export default function Ombor() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const { showAlert, showToast } = useDialog()
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategory, setFilterCategory] = useState(ALL_CATEGORIES)
    /** Ranglar bo'yicha miqdor — modal oynada */
    const [colorBreakdownProduct, setColorBreakdownProduct] = useState(null)
    const [showFullImage, setShowFullImage] = useState(false)

    /** Omborga qo'shish: kod orqali */
    const [addWarehouseOpen, setAddWarehouseOpen] = useState(false)
    const [addCodeInput, setAddCodeInput] = useState('')
    const [addWarehouseProduct, setAddWarehouseProduct] = useState(null)
    const [addWarehouseDraft, setAddWarehouseDraft] = useState({})
    const [addWarehouseSingleQty, setAddWarehouseSingleQty] = useState(0)
    const [addWarehouseError, setAddWarehouseError] = useState(null)
    const [addWarehouseSaving, setAddWarehouseSaving] = useState(false)
    /** So'nggi buyurtma chiqimlari (stock_movements: type=sale) */
    const [orderOutflows, setOrderOutflows] = useState([])
    const [orderOutflowsLoading, setOrderOutflowsLoading] = useState(false)
    const [orderOutflowsError, setOrderOutflowsError] = useState(null)
    const [outflowSearchTerm, setOutflowSearchTerm] = useState('')
    const [outflowProductFilter, setOutflowProductFilter] = useState(OUTFLOW_ALL_PRODUCTS)
    const [outflowRange, setOutflowRange] = useState(OUTFLOW_RANGE_30D)

    const [isEditingStock, setIsEditingStock] = useState(false)
    const [editStockDraft, setEditStockDraft] = useState({})
    const [isSavingStock, setIsSavingStock] = useState(false)

    const locale = language === 'uz' ? 'uz-UZ' : language === 'ru' ? 'ru-RU' : 'en-US'

    useEffect(() => {
        loadData()
    }, [])

    async function loadRecentOrderOutflows() {
        setOrderOutflowsError(null)
        setOrderOutflowsLoading(true)
        try {
            // Using backend API for movements
            const response = await api.get('/api/warehouse/movements')
            const rows = response.data || []

            setOrderOutflows(
                rows.map((r) => ({
                    id: r.id,
                    created_at: r.createdAt,
                    product_id: r.productId,
                    order_id: r.orderId || null,
                    order_number: r.orderNumber || null,
                    customer_name: r.customerName || null,
                    qty: Math.abs(Number(r.qty) || 0),
                    color_key: r.colorKey || null,
                    type: r.type,
                }))
            )
        } catch (error) {
            console.error('loadRecentOrderOutflows:', error)
            setOrderOutflows([])
            setOrderOutflowsError(error?.response?.data?.message || error?.message || String(error))
        } finally {
            setOrderOutflowsLoading(false)
        }
    }

    async function loadData() {
        setLoadError(null)
        try {
            setLoading(true)
            // Using generic products endpoint for better stability
            const response = await api.get('/api/products')
            const rows = (response.data || []).map(mergeProductInventoryRow)

            setProducts(rows)
            await loadRecentOrderOutflows()
        } catch (error) {
            console.error('Error loading inventory:', error)
            setLoadError(error?.response?.data?.message || error?.message || String(error))
        } finally {
            setLoading(false)
        }
    }

    async function saveStockByColor(product, draftMap) {
        const colors = listProductColors(product)

        // Handle single-item stock (no colors)
        if (!colors.length) {
            const next = draftMap['__default__']
            if (next === undefined) return false
            return await saveAbsoluteStock(product, next)
        }

        const clean = {}
        for (const c of colors) {
            const v = draftMap[c]
            clean[c] = Math.max(0, Math.floor(Number(v) || 0))
        }

        const reasonLine = colors.map((c) => `${c}: ${clean[c]}`).join('; ')

        try {
            await api.post('/api/warehouse/bulk-update', {
                productId: product.id,
                colorsMap: clean,
                reason: `Ombor (ranglar): ${reasonLine}`
            })

            showToast(t('warehouse.saveSuccess'))
            void loadData()
            return true
        } catch (error) {
            console.error('saveStockByColor:', error)
            showAlert(t('common.error'), error?.response?.data?.message || error?.message)
            return false
        }
    }

    async function saveAbsoluteStock(product, nextTotalRaw) {
        const next = Math.max(0, Math.floor(Number(nextTotalRaw) || 0))
        try {
            await api.post('/api/warehouse/add', {
                productId: product.id,
                qty: next,
                type: 'in' // Or handle as adjustment? For now 'in' is simple.
            })

            showToast(t('warehouse.updateSuccess'))
            void loadData()
            return true
        } catch (error) {
            console.error('saveAbsoluteStock:', error)
            showAlert(t('common.error'), error?.response?.data?.message || error?.message)
            return false
        }
    }

    const resolveAddWarehouseProduct = useCallback(() => {
        setAddWarehouseError(null)
        const found = findProductByCode(products, addCodeInput)
        if (!found) {
            setAddWarehouseProduct(null)
            setAddWarehouseDraft({})
            setAddWarehouseSingleQty(0)
            setAddWarehouseError(t('warehouse.addNotFound'))
            return
        }
        setAddWarehouseProduct(found)
        const cols = listProductColors(found)
        if (cols.length > 0) {
            setAddWarehouseDraft(buildStockByColorMap(found))
        } else {
            setAddWarehouseSingleQty(numStock(found.stock))
        }
    }, [products, addCodeInput, t])

    const handleAddWarehouseSave = useCallback(async () => {
        if (!addWarehouseProduct) return
        const latest = products.find((p) => p.id === addWarehouseProduct.id) || addWarehouseProduct
        setAddWarehouseSaving(true)
        try {
            const cols = listProductColors(latest)
            let ok = false
            if (cols.length > 0) {
                ok = await saveStockByColor(latest, addWarehouseDraft)
            } else {
                ok = await saveAbsoluteStock(latest, addWarehouseSingleQty)
            }
            if (!ok) return
            setAddWarehouseOpen(false)
            setAddWarehouseProduct(null)
            setAddCodeInput('')
            setAddWarehouseDraft({})
            setAddWarehouseSingleQty(0)
            setAddWarehouseError(null)
        } finally {
            setAddWarehouseSaving(false)
        }
    }, [
        addWarehouseProduct,
        products,
        addWarehouseDraft,
        addWarehouseSingleQty,
    ])

    const categoryOptions = useMemo(() => {
        const uniq = [
            ...new Set(
                products
                    .map((m) => {
                        const catObj = m.category || m.categories
                        if (typeof catObj === 'object' && catObj) {
                            return catObj.name_uz || catObj.name
                        }
                        return typeof m.category === 'string' ? m.category : null
                    })
                    .filter(Boolean)
            ),
        ]
        return [
            { value: ALL_CATEGORIES, label: t('warehouse.allCategories') },
            ...uniq.map((c) => ({ value: c, label: c })),
        ]
    }, [products, t])
    const productById = useMemo(
        () => Object.fromEntries(products.map((p) => [String(p.id), p])),
        [products]
    )
    const outflowProductOptions = useMemo(() => {
        const ids = [...new Set(orderOutflows.map((x) => String(x.product_id || '')).filter(Boolean))]
        return ids
            .map((id) => ({
                value: id,
                label: productById[id]?.name || `${t('common.unknown')} (${id})`,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'uz', { sensitivity: 'base' }))
    }, [orderOutflows, productById, t])
    const physicalStockFiltered = useMemo(() => {
        const q = searchTerm.toLowerCase()
        return products
            .filter((m) => {
                const matchesSearch = (m.name_uz || m.name || '').toLowerCase().includes(q)
                const catObj = m.category || m.categories
                const catName = (typeof catObj === 'object' && catObj) ? (catObj.name_uz || catObj.name) : (typeof m.category === 'string' ? m.category : '')
                const matchesCategory = filterCategory === ALL_CATEGORIES || catName === filterCategory
                const hasStock = numStock(m.stock) > 0
                return matchesSearch && matchesCategory && hasStock
            })
            .sort((a, b) => {
                const getCat = (m) => {
                    const catObj = m.category || m.categories
                    if (typeof catObj === 'object' && catObj) return catObj.name_uz || catObj.name
                    return typeof m.category === 'string' ? m.category : ''
                }
                const ca = String(getCat(a)).localeCompare(String(getCat(b)), 'uz', { sensitivity: 'base' })
                if (ca !== 0) return ca
                return String(a.name || '').localeCompare(String(b.name || ''), 'uz', { sensitivity: 'base' })
            })
    }, [products, searchTerm, filterCategory])

    const outOfStockFiltered = useMemo(() => {
        const q = searchTerm.toLowerCase()
        return products
            .filter((m) => {
                const matchesSearch = (m.name_uz || m.name || '').toLowerCase().includes(q)
                const catObj = m.category || m.categories
                const catName = (typeof catObj === 'object' && catObj) ? (catObj.name_uz || catObj.name) : (typeof m.category === 'string' ? m.category : '')
                const matchesCategory = filterCategory === ALL_CATEGORIES || catName === filterCategory
                const noStock = numStock(m.stock) === 0
                return matchesSearch && matchesCategory && noStock
            })
            .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uz', { sensitivity: 'base' }))
    }, [products, searchTerm, filterCategory])


    const physicalTotals = useMemo(() => {
        let units = 0
        let value = 0
        for (const m of physicalStockFiltered) {
            const q = numStock(m.stock)
            units += q
            value += q * unitPriceUzs(m)
        }
        return { units, value: Math.round(value * 100) / 100 }
    }, [physicalStockFiltered])

    /**
     * Fizik ombor jadvali: mahsulot qatorlari + har kategoriya oxirida oraliq jami
     */
    const physicalRowsFlat = useMemo(() => {
        const list = physicalStockFiltered
        if (!list.length) return []
        const getCatName = (m) => {
            const catObj = m.category || m.categories
            if (typeof catObj === 'object' && catObj) return catObj.name_uz || catObj.name
            return typeof m.category === 'string' ? m.category : '—'
        }
        const catKey = (m) => String(getCatName(m)).trim() || '—'
        const out = []
        let displayIdx = 0
        let i = 0
        while (i < list.length) {
            const firstCat = catKey(list[i])
            let subUnits = 0
            let subVal = 0
            const start = i
            while (i < list.length && catKey(list[i]) === firstCat) {
                const p = list[i]
                const q = numStock(p.stock)
                const price = unitPriceUzs(p)
                const line = Math.round(q * price * 100) / 100
                subUnits += q
                subVal += line
                displayIdx += 1
                out.push({
                    kind: 'product',
                    key: String(p.id),
                    product: p,
                    displayIndex: displayIdx,
                    q,
                    price,
                    line,
                })
                i++
            }
            out.push({
                kind: 'subtotal',
                key: `sub-${firstCat}-${start}`,
                category: firstCat,
                units: subUnits,
                value: Math.round(subVal * 100) / 100,
            })
        }
        return out
    }, [physicalStockFiltered])

    const colorBreakdownRows = useMemo(
        () => (colorBreakdownProduct ? getColorBreakdownRows(colorBreakdownProduct) : []),
        [colorBreakdownProduct]
    )

    const exportToExcel = useCallback(() => {
        const buildFullRow = (p) => {
            const cols = listProductColors(p)
            const byColor = parseStockByColor(p)
            const jsonCol =
                cols.length > 0
                    ? JSON.stringify(
                        cols.reduce((acc, c) => {
                            acc[c] = byColor[c] != null ? byColor[c] : 0
                            return acc
                        }, {})
                    )
                    : ''
            return {
                Nomi: p.name_uz || p.name || '—',
                Kategoriya: (p.category?.name_uz || p.category?.name || p.categories?.name || '—'),
                'Mavjud (dona)': numStock(p.stock),
                [t('warehouse.exportStockByColorCol')]: jsonCol,
                'Min. Zaxira': p.min_stock || 10,
                'Sotuv narxi': unitPriceUzs(p),
                Holati:
                    numStock(p.stock) === 0
                        ? 'Tugagan'
                        : numStock(p.stock) < (p.min_stock || 10)
                            ? 'Kam qolgan'
                            : 'Yetarli',
            }
        }

        const buildPhysicalRow = (p) => {
            const q = numStock(p.stock)
            const price = unitPriceUzs(p)
            return {
                [t('warehouse.excelColName')]: p.name_uz || p.name || '—',
                [t('warehouse.excelColCategory')]: (p.category?.name_uz || p.category?.name || p.categories?.name || '—'),
                [t('warehouse.excelColQty')]: q,
                [t('warehouse.excelColUnitPrice')]: price,
                [t('warehouse.excelColLineValue')]: Math.round(q * price * 100) / 100,
            }
        }

        const allFiltered = [...physicalStockFiltered, ...outOfStockFiltered]
        const wb = XLSX.utils.book_new()
        const wsAll = XLSX.utils.json_to_sheet(allFiltered.map(buildFullRow))
        XLSX.utils.book_append_sheet(wb, wsAll, t('warehouse.excelSheetAll'))

        const physData = []
        for (const r of physicalRowsFlat) {
            if (r.kind === 'product') {
                physData.push(buildPhysicalRow(r.product))
            } else {
                physData.push({
                    [t('warehouse.excelColName')]: t('warehouse.excelCategorySubtotalLabel').replace(
                        '{cat}',
                        r.category
                    ),
                    [t('warehouse.excelColCategory')]: '',
                    [t('warehouse.excelColQty')]: r.units,
                    [t('warehouse.excelColUnitPrice')]: '—',
                    [t('warehouse.excelColLineValue')]: r.value,
                })
            }
        }
        if (physData.length > 0) {
            physData.push({
                [t('warehouse.excelColName')]: t('warehouse.excelGrandTotalLabel'),
                [t('warehouse.excelColCategory')]: '',
                [t('warehouse.excelColQty')]: physicalTotals.units,
                [t('warehouse.excelColUnitPrice')]: '—',
                [t('warehouse.excelColLineValue')]: physicalTotals.value,
            })
        }
        const wsPhys = XLSX.utils.json_to_sheet(
            physData.length > 0
                ? physData
                : [{ [t('warehouse.excelColName')]: t('warehouse.physicalEmptyExport') }]
        )
        XLSX.utils.book_append_sheet(wb, wsPhys, t('warehouse.excelSheetPhysical'))

        XLSX.writeFile(wb, `Ombor_Hisoboti_${new Date().toISOString().slice(0, 10)}.xlsx`)
    }, [physicalStockFiltered, outOfStockFiltered, physicalRowsFlat, physicalTotals, t])

    const printPhysicalTable = useCallback(() => {
        if (physicalStockFiltered.length === 0) {
            void showToast(t('warehouse.printEmpty'), { type: 'warning' })
            return
        }
        window.print()
    }, [physicalStockFiltered.length, showToast, t])

    if (loading) {
        return (
            <div className="h-screen bg-[#020817] flex items-center justify-center">
                <div className="relative">
                    <div className="w-20 h-20 border-2 border-blue-500/20 rounded-full animate-ping" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 border-t-2 border-blue-500 rounded-full animate-spin" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="min-h-screen bg-transparent text-white font-sans selection:bg-blue-500/30 overflow-x-hidden flex flex-col relative w-full inset-0">
                <div className="flex-1 w-full mx-auto p-2 lg:p-4 flex flex-col gap-6 overflow-y-auto no-scrollbar max-w-[1600px] relative z-10 print:max-w-none print:p-2">

                    {/* HEADER */}
                    <div className="no-print flex flex-col md:flex-row justify-between items-center gap-6">
                        <Header title={t('warehouse.title')} toggleSidebar={toggleSidebar} />
                        <div className="flex items-center gap-4">
                            <Link
                                href="/mahsulotlar"
                                className="text-[10px] font-black text-blue-400/60 hover:text-blue-400 uppercase tracking-widest transition-all"
                            >
                                {t('dashboard.crossLinkToProducts')} →
                            </Link>
                            <button
                                type="button"
                                onClick={() => {
                                    setAddWarehouseOpen(true)
                                    setAddCodeInput('')
                                    setAddWarehouseProduct(null)
                                    setAddWarehouseDraft({})
                                    setAddWarehouseSingleQty(0)
                                    setAddWarehouseError(null)
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-[10px] font-black text-white uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30 transition-all hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus size={16} />
                                {t('warehouse.addToWarehouseButton')}
                            </button>
                        </div>
                    </div>

                    {/* ERROR ALERT */}
                    {loadError && (
                        <div className="no-print p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-black uppercase tracking-widest flex items-center justify-between gap-4">
                            <p>{t('dashboard.loadErrorTitle')} {loadError}</p>
                            <button onClick={() => loadData()} className="px-6 py-2 bg-rose-500/20 rounded-xl hover:bg-rose-500/40 transition-all">Retry</button>
                        </div>
                    )}

                    {/* SECTION 1: PHYSICAL STOCK (PRIORITY) */}
                    <section className="warehouse-print-section print:break-inside-auto">
                        <div className="flex flex-col gap-8 mb-8 no-print">
                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 backdrop-blur-md">
                                <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
                                    <div className="relative group w-full sm:w-80">
                                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-400 transition-colors" size={20} />
                                        <input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={t('warehouse.searchPlaceholder')}
                                            className="w-full pl-14 pr-6 py-4 bg-black/40 border border-white/5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white placeholder:text-white/10 focus:outline-none focus:border-blue-500/30 transition-all shadow-inner"
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 bg-black/40 border border-white/5 rounded-2xl p-1.5 shadow-inner">
                                        {categoryOptions.map((opt) => (
                                            <button
                                                key={opt.value}
                                                onClick={() => setFilterCategory(opt.value)}
                                                className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${filterCategory === opt.value
                                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                                    : 'text-white/20 hover:text-white/60 hover:bg-white/5'
                                                    }`}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end xl:self-center">
                                    <button
                                        type="button"
                                        onClick={() => void loadData()}
                                        className="p-4 bg-white/5 hover:bg-white/10 text-white/20 hover:text-white rounded-2xl transition-all border border-white/5 shadow-lg"
                                        title={t('warehouse.refresh')}
                                    >
                                        <RefreshCcw size={18} />
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            const printWindow = window.open('', '_blank')
                                            if (!printWindow) return
                                            const rowsHtml = []
                                            const groupedByCategory = physicalRowsFlat.filter(r => r.kind === 'product').reduce((acc, r) => {
                                                const p = r.product
                                                const catObj = p.category || p.categories
                                                const catName = (typeof catObj === 'object' && catObj) 
                                                    ? (catObj.name_uz || catObj.name) 
                                                    : (typeof p.category === 'string' ? p.category : '—')
                                                const finalCat = catName || '—'
                                                if (!acc[finalCat]) acc[finalCat] = []
                                                acc[finalCat].push(r)
                                                return acc
                                            }, {})
                                            
                                            let globalIdx = 1
                                            let reportTotalUnits = 0
                                            let reportTotalValueUsd = 0

                                            Object.keys(groupedByCategory).forEach(cat => {
                                                const filteredItems = groupedByCategory[cat].filter(row => row.q > 0)

                                                if (filteredItems.length === 0) return

                                                // Category header row
                                                rowsHtml.push(`
                                                    <tr class="cat-header-row">
                                                        <td colspan="8">Kategoriya: ${cat}</td>
                                                    </tr>
                                                `)

                                                filteredItems.forEach(row => {
                                                    const stockMap = buildStockByColorMap(row.product)
                                                    const colors = Object.keys(stockMap)
                                                    
                                                    const priceUsd = row.price
                                                    const imgUrl = (row.product.images && row.product.images[0]) || row.product.image_url || ''
                                                    const imgHtml = imgUrl ? `<div class="prod-thumb-wrap"><img src="${imgUrl}" class="prod-thumb" /></div>` : '-'

                                                    let colorsHtml = ''
                                                    let qtysHtml = ''
                                                    let rowTotalQty = 0

                                                    if (colors.length === 0) {
                                                        const q = row.q
                                                        colorsHtml = '<div class="stack-line">-</div>'
                                                        qtysHtml = `<div class="stack-line">${q}</div>`
                                                        rowTotalQty = q
                                                    } else {
                                                        colors.forEach(color => {
                                                            const q = stockMap[color] || 0
                                                            if (q > 0) {
                                                                colorsHtml += `<div class="stack-line">${color}</div>`
                                                                qtysHtml += `<div class="stack-line">${q}</div>`
                                                                rowTotalQty += q
                                                            }
                                                        })
                                                    }

                                                    // If for some reason rowTotalQty became 0 during variant filtering (edge case)
                                                    if (rowTotalQty === 0) return

                                                    reportTotalUnits += rowTotalQty
                                                    reportTotalValueUsd += (rowTotalQty * priceUsd)

                                                    rowsHtml.push(`
                                                        <tr>
                                                            <td style="text-align: center;">${globalIdx++}</td>
                                                            <td class="prod-img-cell">${imgHtml}</td>
                                                            <td style="font-weight: bold;">${row.product.name_uz || row.product.name}</td>
                                                            <td class="colors-stack">${colorsHtml}</td>
                                                            <td class="qty-stack mono">${qtysHtml}</td>
                                                            <td style="text-align: center; font-weight: bold;">${rowTotalQty}</td>
                                                            <td class="mono" style="text-align: right;">$${priceUsd.toFixed(2)}</td>
                                                            <td class="mono" style="text-align: right; font-weight: bold;">$${(rowTotalQty * priceUsd).toFixed(2)}</td>
                                                        </tr>
                                                    `)
                                                })
                                            })

                                            const html = `
                                                <!DOCTYPE html>
                                                <html>
                                                <head>
                                                    <meta charset="utf-8">
                                                    <title>Ombor Hisoboti - ${new Date().toLocaleDateString('uz-UZ')}</title>
                                                    <style>
                                                        body { font-family: sans-serif; padding: 40px; color: #333; }
                                                        .header { margin-bottom: 24px; border-bottom: 2px solid #eee; padding-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
                                                        .header h1 { margin: 0; color: #1a1a1a; font-size: 1.25rem; font-weight: 900; }
                                                        .header .date { font-size: 0.85rem; color: #666; }
                                                        table.items-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; border: 1px solid #8c8c8c; box-shadow: 0 1px 2px rgba(0,0,0,.06); }
                                                        table.items-table thead { display: table-header-group; }
                                                        table.items-table th { background: #ffeb9c; color: #1a1a1a; text-align: left; padding: 8px 6px; border: 1px solid #c9a227; font-size: 0.82rem; font-weight: 700; text-transform: uppercase; }
                                                        table.items-table th.th-rang { background: #fff2cc; }
                                                        table.items-table th.th-miqdor { background: #e2efda; }
                                                        table.items-table td { padding: 8px 6px; border: 1px solid #b4b4b4; vertical-align: middle; font-size: 0.85rem; }
                                                        table.items-table tbody tr:nth-child(odd) td { background: #fffef7; }
                                                        table.items-table tbody tr:nth-child(even) td { background: #e7f3ff; }
                                                        tr.cat-header-row td { background: #e2efda !important; border: 1px solid #92c47c !important; font-weight: 700; padding: 8px 12px !important; }
                                                        .mono { font-variant-numeric: tabular-nums; font-family: monospace; }
                                                        .prod-img-cell { width: 70px; text-align: center; padding: 4px !important; background: #fff !important; }
                                                        .prod-thumb-wrap { width: 60px; height: 60px; margin: 0 auto; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fff; }
                                                        .prod-thumb { max-width: 55px; max-height: 55px; width: auto; height: auto; object-fit: contain; border-radius: 4px; }
                                                        .colors-stack { min-width: 6.5rem; vertical-align: top; font-size: 0.88rem; line-height: 1.35; }
                                                        .qty-stack { min-width: 3rem; text-align: center; vertical-align: top; font-size: 0.88rem; line-height: 1.35; }
                                                        .stack-line { padding: 2px 0; line-height: 1.35; min-height: 1.25em; border-bottom: 1px solid #eee; }
                                                        .stack-line:last-child { border-bottom: none; }
                                                        .footer { margin-top: 32px; text-align: center; color: #666; font-size: 0.8em; border-top: 1px solid #eee; padding-top: 16px; }
                                                        @media print {
                                                            body { padding: 16px 24px; }
                                                            table.items-table th, table.items-table td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                                                        }
                                                    </style>
                                                </head>
                                                <body>
                                                    <div class="header">
                                                        <h1>NUUR_HOME_COLLECTION <span style="font-size: 0.8rem; font-weight: 400; margin-left: 10px; color: #999;">OMBOR HISOBOTI</span></h1>
                                                        <div class="date">${new Date().toLocaleDateString('uz-UZ')} ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                    <table class="items-table">
                                                        <thead>
                                                            <tr>
                                                                <th style="width: 30px; text-align: center;">#</th>
                                                                <th class="prod-img-cell">Rasm</th>
                                                                <th>Kod</th>
                                                                <th class="th-rang">Rang</th>
                                                                <th class="th-miqdor" style="text-align: center;">Miqdor</th>
                                                                <th style="text-align: center;">Jami par</th>
                                                                <th style="text-align: right;">1 par</th>
                                                                <th style="text-align: right;">Qator</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            ${rowsHtml.join('')}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr style="background: #ffeb9c; font-weight: 900; font-size: 12px;">
                                                                <td colspan="4" style="padding: 12px; text-align: right;">UMUMIY JAMI:</td>
                                                                <td style="padding: 12px; text-align: center;">${reportTotalUnits}</td>
                                                                <td style="padding: 12px; text-align: center;">${reportTotalUnits}</td>
                                                                <td style="padding: 12px;"></td>
                                                                <td style="padding: 12px; text-align: right; border-left: 2px solid #000;">$${reportTotalValueUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                    <div class="footer">Nuur_Home_Collection — Avtomatik hisobot</div>
                                                    <script>window.onload = () => { window.print(); }</script>
                                                </body>
                                                </html>
                                            `
                                            printWindow.document.write(html)
                                            printWindow.document.close()
                                        }}
                                        className="flex items-center gap-3 px-6 py-4 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all border border-blue-500/20 shadow-lg"
                                    >
                                        <Printer size={18} />
                                        CHOP ETISH
                                    </button>

                                    <button
                                        type="button"
                                        onClick={exportToExcel}
                                        className="flex items-center gap-3 px-6 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl transition-all border border-emerald-500/20 shadow-lg"
                                    >
                                        <Download size={18} />
                                        {t('common.export')}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)]" />
                                        <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">{t('warehouse.physicalStockTitle')}</h2>
                                    </div>
                                    <p className="text-[9px] text-white/30 uppercase tracking-[0.3em] font-black ml-1">
                                        {t('warehouse.physicalStockSubtitle')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/[0.04] backdrop-blur-3xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative">
                            <div className="overflow-x-auto no-scrollbar relative z-10">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 border-b border-white/5">
                                        <tr className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">
                                            <th className="px-6 py-4">#</th>
                                            <th className="px-6 py-4">{t('warehouse.tableImage')}</th>
                                            <th className="px-6 py-4">{t('warehouse.tableName')}</th>
                                            <th className="px-6 py-4">{t('warehouse.tableCategory')}</th>
                                            <th className="px-6 py-4 text-right">{t('warehouse.tableQty')}</th>
                                            <th className="px-6 py-4 text-right">{t('warehouse.tablePrice')}</th>
                                            <th className="px-6 py-4 text-right">{t('warehouse.tableLineValue')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {physicalRowsFlat.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-12 py-40 text-center">
                                                    <div className="flex flex-col items-center gap-6 opacity-20">
                                                        <Package size={64} />
                                                        <p className="text-sm font-black uppercase tracking-[0.4em]">{t('warehouse.physicalEmpty')}</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            physicalRowsFlat.map((row) => {
                                                if (row.kind === 'product') {
                                                    const p = row.product
                                                    return (
                                                        <tr key={row.key} className="group hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setColorBreakdownProduct(p)}>
                                                            <td className="px-6 py-4 text-[10px] text-white/20 font-mono">{row.displayIndex}</td>
                                                            <td className="px-6 py-4">
                                                                <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center group-hover:border-blue-500/50 transition-colors shadow-lg">
                                                                    {(p.images && Array.isArray(p.images) && p.images[0]) ? (
                                                                        <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                                                    ) : p.image_url ? (
                                                                        <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <Package size={16} className="text-white/10" />
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <p className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-blue-400 transition-colors">{p.name_uz || p.name || '—'}</p>
                                                                <p className="text-[8px] text-white/20 font-bold uppercase tracking-[0.2em] mt-1">{p.sku || p.size || '-'}</p>
                                                            </td>
                                                            <td className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                                {p.category?.name_uz || p.category?.name || p.categories?.name || '—'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${row.q < (p.min_stock || 10) ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                    }`}>
                                                                    {row.q}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-mono text-[10px] text-white/40">
                                                                {row.price.toLocaleString()}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-black text-blue-400 neon-text text-base tracking-tighter">
                                                                {row.line.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                                return (
                                                    <tr key={row.key} className="bg-amber-400/[0.04] border-y border-amber-400/20 relative z-20">
                                                        <td colSpan={4} className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-1 h-4 bg-amber-400 rounded-full shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
                                                                <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em] italic">
                                                                    {row.category} — {t('warehouse.subtotal')}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-black text-amber-400/70 text-[12px] tabular-nums">{row.units}</td>
                                                        <td className="px-6 py-4 text-right"></td>
                                                        <td className="px-6 py-4 text-right font-black text-amber-400 text-lg tracking-tighter tabular-nums drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                                                            {row.value.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        )}
                                    </tbody>
                                    <tfoot className="bg-emerald-500/10 border-t border-emerald-500/30">
                                        <tr>
                                            <th colSpan={4} className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.7)]" />
                                                    <span className="text-[12px] font-black text-white uppercase tracking-[0.3em]">{t('warehouse.grandTotal')}</span>
                                                </div>
                                            </th>
                                            <th className="px-6 py-5 text-right font-black text-emerald-400 text-xl tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{physicalTotals.units}</th>
                                            <th className="px-6 py-5 text-right"></th>
                                            <th className="px-6 py-5 text-right font-black text-emerald-500 text-2xl tracking-tighter neon-text tabular-nums drop-shadow-[0_0_20px_rgba(16,185,129,0.6)]">
                                                {physicalTotals.value.toLocaleString()}
                                                <span className="text-[9px] text-white/20 ml-2 uppercase tracking-[0.3em] font-black">USD</span>
                                            </th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </section>
                    {/* SECTION 2: OUT OF STOCK (TUGAGANLAR) */}
                    <section className="no-print">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-1.5 h-6 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.6)]" />
                            <h2 className="text-xl font-black text-white uppercase tracking-[0.3em]">OMBORDAN TUGAGANLAR</h2>
                        </div>

                        <div className="bg-white/10 backdrop-blur-3xl rounded-[2rem] border border-white/10 overflow-hidden shadow-2xl relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                            <div className="overflow-x-auto no-scrollbar relative z-10">
                                <table className="w-full text-left">
                                    <thead className="bg-black/40 border-b border-white/10">
                                        <tr className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
                                            <th className="px-6 py-4">#</th>
                                            <th className="px-6 py-4">{t('warehouse.tableImage')}</th>
                                            <th className="px-6 py-4">{t('warehouse.tableName')}</th>
                                            <th className="px-6 py-4">{t('warehouse.tableCategory')}</th>
                                            <th className="px-6 py-4 text-right">{t('warehouse.tablePrice')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {outOfStockFiltered.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-[10px] text-white/20 uppercase tracking-widest font-black italic">
                                                    Tugagan mahsulotlar topilmadi.
                                                </td>
                                            </tr>
                                        ) : (
                                            outOfStockFiltered.map((p, idx) => (
                                                <tr key={p.id} className="group hover:bg-white/[0.04] transition-colors cursor-pointer" onClick={() => setColorBreakdownProduct(p)}>
                                                    <td className="px-6 py-4 text-[10px] text-white/30 font-mono">{idx + 1}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                                                            {(p.images && Array.isArray(p.images) && p.images[0]) ? (
                                                                <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                                                            ) : p.image_url ? (
                                                                <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <Package size={16} className="text-white/20" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-[11px] font-black text-white uppercase tracking-wider group-hover:text-rose-400 transition-colors">{p.name_uz || p.name || '—'}</p>
                                                        <p className="text-[8px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1">{p.sku || p.size || '-'}</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                        {p.category?.name_uz || p.category?.name || p.categories?.name || '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-[10px] text-white/40">
                                                        {unitPriceUzs(p).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 0;
                    }
                    body {
                        background: white !important;
                        margin: 0;
                        padding: 0;
                    }
                    .no-print {
                        display: none !important;
                    }
                    /* Remove number spinners */
                    input::-webkit-outer-spin-button,
                    input::-webkit-inner-spin-button {
                        -webkit-appearance: none;
                        margin: 0;
                    }
                    input[type=number] {
                        -moz-appearance: textfield;
                    }
                }
                /* Globally remove number spinners */
                input::-webkit-outer-spin-button,
                input::-webkit-inner-spin-button {
                    -webkit-appearance: none;
                    margin: 0;
                }
                input[type=number] {
                    -moz-appearance: textfield;
                }
            `}</style>

            {colorBreakdownProduct && (
                <div className="no-print fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#020817]/80 backdrop-blur-md">
                    <div
                        className="relative w-full max-w-[420px] bg-[#0f172a] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {showFullImage && (
                            <div
                                className="absolute inset-0 z-50 bg-black flex items-center justify-center cursor-zoom-out animate-in fade-in zoom-in-95 duration-300"
                                onClick={() => setShowFullImage(false)}
                            >
                                <img
                                    src={(Array.isArray(colorBreakdownProduct.images) && colorBreakdownProduct.images[0]) || colorBreakdownProduct.image_url}
                                    alt=""
                                    className="w-full h-full object-contain"
                                />
                                <button className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-md transition-all">
                                    <X size={20} />
                                </button>
                            </div>
                        )}
                        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />

                        <div className="flex items-center gap-5 p-5 border-b border-white/5 bg-black/20 relative z-10">
                            <div
                                className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow-xl flex items-center justify-center cursor-zoom-in group/img relative"
                                onClick={() => setShowFullImage(true)}
                            >
                                {Array.isArray(colorBreakdownProduct.images) && colorBreakdownProduct.images[0] ? (
                                    <img
                                        src={colorBreakdownProduct.images[0]}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                    />
                                ) : colorBreakdownProduct.image_url ? (
                                    <img
                                        src={colorBreakdownProduct.image_url}
                                        alt=""
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-110"
                                    />
                                ) : (
                                    <Package className="text-white/20" size={32} />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                    <Search size={20} className="text-white" />
                                </div>
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-[9px] font-black text-white/20 uppercase tracking-[0.4em] mb-1">
                                    {t('warehouse.colorBreakdownModalTitle')}
                                </h3>
                                <p className="text-base font-black text-white uppercase tracking-wider leading-tight truncate">
                                    {colorBreakdownProduct.name_uz || colorBreakdownProduct.name || '—'}
                                </p>
                                <p className="text-[10px] text-blue-400 font-black uppercase tracking-widest mt-1.5">{colorBreakdownProduct.sku || colorBreakdownProduct.size || '-'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setColorBreakdownProduct(null)
                                    setShowFullImage(false)
                                }}
                                className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="px-5 py-3 border-b border-white/5 bg-white/[0.01] flex items-center justify-center no-print">
                            {!isEditingStock ? (
                                <div className="flex items-center gap-4">
                                    <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.2em]">{t('warehouse.physicalReconciliationTitle')}</span>
                                    <button
                                        onClick={() => {
                                            setIsEditingStock(true)
                                            const map = buildStockByColorMap(colorBreakdownProduct)
                                            setEditStockDraft(map)
                                        }}
                                        className="px-6 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-500/20 transition-all shadow-lg shadow-blue-500/5"
                                    >
                                        {t('common.edit')}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        disabled={isSavingStock}
                                        onClick={async () => {
                                            setIsSavingStock(true)
                                            const success = await saveStockByColor(colorBreakdownProduct, editStockDraft)
                                            setIsSavingStock(false)
                                            if (success) {
                                                setIsEditingStock(false)
                                                setColorBreakdownProduct(null)
                                            }
                                        }}
                                        className="px-8 py-2 bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-xl shadow-emerald-500/20 hover:bg-emerald-400 transition-all hover:scale-105 active:scale-95"
                                    >
                                        {isSavingStock ? '...' : t('common.save')}
                                    </button>
                                    <button
                                        onClick={() => setIsEditingStock(false)}
                                        className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white/30 text-[10px] font-black uppercase tracking-widest rounded-lg border border-white/10 transition-all"
                                    >
                                        {t('common.cancel')}
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="p-5 relative z-10">
                            {colorBreakdownRows.length > 0 ? (
                                <div className="space-y-4">
                                    <div className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden shadow-inner">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-white/5 text-[8px] uppercase tracking-[0.2em] text-white/20 font-black border-b border-white/5">
                                                    <th className="text-left px-6 py-3">RANG VARIANTI</th>
                                                    <th className="text-right px-6 py-3">ZAXIRA</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {colorBreakdownRows.map(({ color, qty }) => (
                                                    <tr key={color} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-3 text-[11px] font-black text-white/80 uppercase tracking-wider">{color}</td>
                                                        <td className="px-6 py-3 text-right font-mono">
                                                            {isEditingStock ? (
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    value={editStockDraft[color] === 0 ? '' : (editStockDraft[color] || '')}
                                                                    placeholder="0"
                                                                    onChange={(e) => {
                                                                        const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0)
                                                                        setEditStockDraft(p => ({ ...p, [color]: val }))
                                                                    }}
                                                                    className="w-24 bg-blue-500/10 border border-blue-500/40 rounded-xl px-4 py-2 text-right text-blue-400 font-mono text-base focus:bg-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-inner"
                                                                />
                                                            ) : (
                                                                qty
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-[2rem] border border-white/5 bg-black/40 p-10 text-center shadow-inner">
                                    <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em] mb-4">
                                        VARIANTLAR YO'Q
                                    </p>
                                    {isEditingStock ? (
                                        <input
                                            type="number"
                                            min={0}
                                            value={editStockDraft['__default__'] === 0 ? '' : (editStockDraft['__default__'] ?? '')}
                                            placeholder="0"
                                            onChange={(e) => {
                                                const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value) || 0)
                                                setEditStockDraft({ '__default__': val })
                                            }}
                                            className="w-48 bg-blue-500/10 border border-blue-500/40 rounded-2xl px-8 py-6 text-center text-5xl text-white font-black tracking-tighter focus:border-blue-500 outline-none shadow-2xl transition-all"
                                            autoFocus
                                        />
                                    ) : (
                                        <p className="text-6xl font-black tabular-nums text-white tracking-tighter neon-text">
                                            {numStock(colorBreakdownProduct.stock)}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {addWarehouseOpen && (
                <div className="no-print fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-[#020817]/80 backdrop-blur-md">
                    <div
                        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto no-scrollbar bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

                        <div className="flex items-start justify-between gap-4 p-8 border-b border-white/5 bg-black/20 relative z-10">
                            <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.3em]">{t('warehouse.addModalTitle')}</h3>
                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">{t('warehouse.addModalLead')}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setAddWarehouseOpen(false)
                                    setAddWarehouseProduct(null)
                                    setAddWarehouseError(null)
                                }}
                                className="p-2 rounded-xl hover:bg-white/5 text-white/20 hover:text-white transition-all"
                            >
                                <X size={22} />
                            </button>
                        </div>
                        <div className="p-8 space-y-8 relative z-10">
                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">
                                    {t('warehouse.addCodeLabel')}
                                </label>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        type="text"
                                        value={addCodeInput}
                                        onChange={(e) => setAddCodeInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                resolveAddWarehouseProduct()
                                            }
                                        }}
                                        placeholder={t('warehouse.addCodePlaceholder')}
                                        className="flex-1 px-6 py-4 rounded-2xl border border-white/5 bg-white/5 text-white outline-none focus:border-emerald-500/50 font-black uppercase tracking-widest placeholder:text-white/10 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => resolveAddWarehouseProduct()}
                                        className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white/10 text-white font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all border border-white/5"
                                    >
                                        <Search size={18} />
                                        {t('warehouse.addSearchButton')}
                                    </button>
                                </div>
                                <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] px-1">{t('warehouse.addCodeHint')}</p>
                            </div>

                            {addWarehouseError && (
                                <p className="text-xs font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-6 py-4">
                                    {addWarehouseError}
                                </p>
                            )}

                            {addWarehouseProduct && (
                                <div className="rounded-[2.5rem] border border-white/5 bg-black/40 p-8 space-y-8 shadow-inner">
                                    <div className="flex gap-6">
                                        {addWarehouseProduct.image_url ? (
                                            <img
                                                src={addWarehouseProduct.image_url}
                                                alt=""
                                                className="w-24 h-24 rounded-[2rem] object-cover border border-white/10 bg-white/5 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-24 h-24 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                                <Package className="text-white/10" size={36} />
                                            </div>
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-black text-white uppercase tracking-wider">{addWarehouseProduct.name}</p>
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-2">
                                                {t('warehouse.addResolvedCode').replace(
                                                    '{code}',
                                                    String(addWarehouseProduct.size || '—')
                                                )}
                                            </p>
                                            <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">
                                                {addWarehouseProduct.categories?.name ||
                                                    addWarehouseProduct.category ||
                                                    '—'}
                                            </p>
                                        </div>
                                    </div>

                                    {listProductColors(addWarehouseProduct).length > 0 ? (
                                        <div className="space-y-6">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Palette size={16} />
                                                {t('warehouse.stockByColor')}
                                            </p>
                                            <div className="grid sm:grid-cols-2 gap-4">
                                                {listProductColors(addWarehouseProduct).map((cn) => (
                                                    <div
                                                        key={cn}
                                                        className="flex flex-col gap-2 bg-white/5 rounded-2xl border border-white/5 p-4"
                                                    >
                                                        <span className="text-[9px] font-black uppercase text-white/30 tracking-widest">
                                                            {cn}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            step={1}
                                                            value={addWarehouseDraft[cn] ?? 0}
                                                            onChange={(e) => {
                                                                const v = Math.max(
                                                                    0,
                                                                    Math.floor(Number(e.target.value) || 0)
                                                                )
                                                                setAddWarehouseDraft((prev) => ({
                                                                    ...prev,
                                                                    [cn]: v,
                                                                }))
                                                            }}
                                                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 font-mono font-black text-white text-base outline-none focus:border-blue-500/50"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center p-6 bg-blue-500/5 rounded-2xl border border-blue-500/10">
                                                <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{t('warehouse.stockTotalFromColors')}</span>
                                                <span className="text-2xl font-black text-white tracking-tighter neon-text">
                                                    {sumStockByColor(addWarehouseDraft)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="block text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">{t('warehouse.stock')}</label>
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                value={addWarehouseSingleQty}
                                                onChange={(e) =>
                                                    setAddWarehouseSingleQty(
                                                        Math.max(0, Math.floor(Number(e.target.value) || 0))
                                                    )
                                                }
                                                className="w-full bg-black/40 border border-white/10 rounded-[2rem] px-8 py-6 font-black text-4xl text-white outline-none focus:border-emerald-500/50 tracking-tighter shadow-inner"
                                            />
                                        </div>
                                    )}

                                    <div className="flex flex-wrap gap-4 pt-4">
                                        <button
                                            type="button"
                                            disabled={addWarehouseSaving}
                                            onClick={() => void handleAddWarehouseSave()}
                                            className="flex-1 py-5 rounded-[2rem] bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-emerald-500 shadow-xl shadow-emerald-600/20 active:scale-[0.98] transition-all disabled:opacity-40"
                                        >
                                            {addWarehouseSaving ? '…' : t('warehouse.addSaveButton')}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setAddWarehouseOpen(false)
                                                setAddWarehouseProduct(null)
                                                setAddWarehouseError(null)
                                            }}
                                            className="px-8 py-5 rounded-[2rem] bg-white/5 border border-white/10 font-black text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-all"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
