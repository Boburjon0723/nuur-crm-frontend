'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '@/utils/api'
import Header from '@/components/Header'
import MoliyaTopNav from '@/components/MoliyaTopNav'
import { MoliyaCardSkeleton } from '@/components/MoliyaSkeletons'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import {
    Award,
    Building2,
    FileSpreadsheet,
    ShoppingBag,
    Calendar,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ChevronRight,
    Filter,
    Download,
    Users,
    Zap,
    ArrowUpRight,
    ArrowDownRight,
    Wallet
} from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { pickLocalizedName } from '@/utils/localizedName'
import {
    aggregateCompletedOrderSales,
    filterCompletedOrdersInDateRange,
} from '@/utils/completedOrderSales'
import { formatFinAmount, normalizeFinCurrency, rollupDepartmentTotals } from '@/utils/financeCurrency'

function localCalendarISODate(d) {
    const y = d.getFullYear()
    const mo = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${mo}-${day}`
}

function todayLocalISO() {
    return localCalendarISODate(new Date())
}

function startOfMonth(d = new Date()) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function endOfMonth(d = new Date()) {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    return localCalendarISODate(last)
}

function prevMonthRange() {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return { from: startOfMonth(d), to: endOfMonth(d) }
}

function thisMonthRange() {
    const d = new Date()
    return { from: startOfMonth(d), to: todayLocalISO() }
}

function thisYearRange() {
    const y = new Date().getFullYear()
    return { from: `${y}-01-01`, to: todayLocalISO() }
}

function last90DaysRange() {
    const t = new Date()
    const f = new Date(t)
    f.setDate(f.getDate() - 89)
    return { from: localCalendarISODate(f), to: todayLocalISO() }
}

function buildDeptPath(deptId, depts, lang) {
    const parts = []
    let cur = depts.find((d) => d.id === deptId)
    let guard = 0
    while (cur && guard++ < 32) {
        parts.unshift(pickLocalizedName(cur, lang))
        cur = cur.parent_id ? depts.find((d) => d.id === cur.parent_id) : null
    }
    return parts.join(' / ')
}

function findLedgerDepartmentId(departments, language) {
    if (!departments?.length) return null
    const scoreDept = (d) => {
        const labels = [d.name_uz, d.name_ru, d.name_en, pickLocalizedName(d, language)]
            .filter(Boolean)
            .map((s) => String(s).toLowerCase())
        let s = 0
        for (const L of labels) {
            if (L.includes('hisob kitob') || L.includes('hisob-kitob')) s += 4
            if (L.includes('kirim') && L.includes('chiqim')) s += 3
            if (L.includes('hisob')) s += 1
        }
        return s
    }
    let bestId = null
    let best = 0
    for (const d of departments) {
        const sc = scoreDept(d)
        if (sc > best) {
            best = sc
            bestId = d.id
        }
    }
    return best >= 3 ? bestId : null
}

function RankMedal({ place }) {
    if (place === 0) {
        return (
            <div className="w-8 h-8 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <Award size={14} className="text-yellow-500" strokeWidth={3} />
            </div>
        )
    }
    if (place === 1) {
        return (
            <div className="w-8 h-8 rounded-full bg-slate-400/20 border border-slate-400/50 flex items-center justify-center">
                <span className="text-[10px] font-black text-slate-400">02</span>
            </div>
        )
    }
    if (place === 2) {
        return (
            <div className="w-8 h-8 rounded-full bg-orange-600/20 border border-orange-600/50 flex items-center justify-center">
                <span className="text-[10px] font-black text-orange-400">03</span>
            </div>
        )
    }
    return (
        <div className="w-8 h-8 flex items-center justify-center">
            <span className="text-[10px] font-black text-white/20 tabular-nums">{(place + 1).toString().padStart(2, '0')}</span>
        </div>
    )
}

export default function MoliyaHisobotlarPage() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const [from, setFrom] = useState(() => thisMonthRange().from)
    const [to, setTo] = useState(() => thisMonthRange().to)
    const [view, setView] = useState('dept')
    const [departments, setDepartments] = useState([])
    const [partners, setPartners] = useState([])
    const [partnerEntries, setPartnerEntries] = useState([])
    const [entries, setEntries] = useState([])
    const [employeePayoutLines, setEmployeePayoutLines] = useState([])
    const [loading, setLoading] = useState(true)
    const [salesOrders, setSalesOrders] = useState([])
    const [salesLoading, setSalesLoading] = useState(false)
    const [chartCurrency, setChartCurrency] = useState('UZS')

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [dRes, enRes, pRes, peRes, payRes] = await Promise.all([
                api.get('/api/finance/departments'),
                api.get(`/api/finance/material-movements?from=${from}&to=${to}`),
                api.get('/api/finance/partners'),
                api.get(`/api/finance/partner-entries?from=${from}&to=${to}`),
                api.get(`/api/finance/payouts?from=${from}&to=${to}`)
            ])

            setDepartments(dRes.data || [])
            setPartners(pRes.data || [])
            setPartnerEntries(peRes.data || [])
            setEntries(
                (enRes.data || []).map((m) => ({
                    ...m,
                    expense_date: m.movement_date,
                    amount: Number(m.total_cost || 0),
                    currency: normalizeFinCurrency(m.currency),
                }))
            )
            setEmployeePayoutLines(payRes.data || [])
        } catch (error) {
            console.error('Finance load error:', error)
        } finally {
            setLoading(false)
        }
    }, [from, to])

    useEffect(() => {
        load()
    }, [load])

    const fetchSales = useCallback(async () => {
        setSalesLoading(true)
        try {
            const res = await api.get('/api/orders')
            setSalesOrders(res.data || [])
        } catch (err) {
            console.error('fetchSales error:', err)
            setSalesOrders([])
        } finally {
            setSalesLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchSales()
    }, [fetchSales])

    const applyRange = (range) => {
        setFrom(range.from)
        setTo(range.to)
    }

    const payrollUzsTotal = useMemo(
        () => employeePayoutLines.reduce((s, x) => s + (Number(x.amount) || 0), 0),
        [employeePayoutLines]
    )

    const salesInRange = useMemo(
        () => filterCompletedOrdersInDateRange(salesOrders, from, to),
        [salesOrders, from, to]
    )
    const salesAgg = useMemo(() => aggregateCompletedOrderSales(salesInRange), [salesInRange])

    const globalStats = useMemo(() => {
        let incomeUZS = 0
        let incomeUSD = 0
        
        for(const pe of partnerEntries) {
            if (pe.entry_type === 'payment_in') {
                const a = Number(pe.amount_uzs || 0)
                if (normalizeFinCurrency(pe.currency) === 'USD') incomeUSD += a
                else incomeUZS += a
            }
        }
        // In this CRM, salesOrders often have 'total' in UZS or USD depending on tenant.
        // We assume aggregateCompletedOrderSales returns USD based on previous tool context.
        incomeUSD += salesAgg.totalRevenue

        let expenseUZS = payrollUzsTotal
        let expenseUSD = 0
        
        for (const e of entries) {
            const a = Number(e.amount || 0)
            if (normalizeFinCurrency(e.currency) === 'USD') expenseUSD += a
            else expenseUZS += a
        }
        for (const pe of partnerEntries) {
            if (pe.entry_type === 'payment') {
                const a = Number(pe.amount_uzs || 0)
                if (normalizeFinCurrency(pe.currency) === 'USD') expenseUSD += a
                else expenseUZS += a
            }
        }

        return {
            incomeUZS, incomeUSD,
            expenseUZS, expenseUSD,
            netUZS: incomeUZS - expenseUZS,
            netUSD: incomeUSD - expenseUSD
        }
    }, [salesAgg, partnerEntries, payrollUzsTotal, entries])

    const partnerSummary = useMemo(() => {
        const stats = {}
        for (const e of partnerEntries) {
            const pid = e.partner_id
            if (!stats[pid]) stats[pid] = { pid, uzsIn: 0, uzsOut: 0, usdIn: 0, usdOut: 0 }
            const amt = Number(e.amount_uzs || 0)
            const cur = normalizeFinCurrency(e.currency)
            const type = e.entry_type
            
            if (type === 'payment') {
                if (cur === 'USD') stats[pid].usdOut += amt
                else stats[pid].uzsOut += amt
            } else if (type === 'payment_in' || type === 'supply' || type === 'sale_out') {
                if (type === 'payment_in') {
                   if (cur === 'USD') stats[pid].usdIn += amt
                   else stats[pid].uzsIn += amt
                }
            }
        }
        return Object.values(stats).map(s => {
            const p = partners.find(x => x.id === s.pid)
            return {
                ...s,
                partnerName: pickLocalizedName(p, language) || '...'
            }
        }).sort((a,b) => (b.uzsOut + b.usdOut*12500) - (a.uzsOut + a.usdOut*12500))
    }, [partnerEntries, partners, language])

    const ledgerDeptId = useMemo(() => findLedgerDepartmentId(departments, language), [departments, language])

    const deptRanking = useMemo(() => {
        const directUzs = {}
        const directUsd = {}
        for (const e of entries) {
            const id = e.department_id
            if (!id) continue
            const a = Number(e.amount || 0)
            if (normalizeFinCurrency(e.currency) === 'USD') directUsd[id] = (directUsd[id] || 0) + a
            else directUzs[id] = (directUzs[id] || 0) + a
        }
        if (ledgerDeptId && payrollUzsTotal > 0.01) {
            directUzs[ledgerDeptId] = (directUzs[ledgerDeptId] || 0) + payrollUzsTotal
        }
        const rolledUzs = rollupDepartmentTotals(departments, directUzs)
        const rolledUsd = rollupDepartmentTotals(departments, directUsd)
        const rows = departments.map((d) => ({
            id: d.id,
            path: buildDeptPath(d.id, departments, language),
            totalUZS: rolledUzs[d.id] || 0,
            totalUSD: rolledUsd[d.id] || 0,
        }))
        if (payrollUzsTotal > 0.01 && !ledgerDeptId) {
            rows.push({
                id: '__payroll__',
                path: t('finances.reportsPayrollStandaloneRow'),
                totalUZS: payrollUzsTotal,
                totalUSD: 0,
            })
        }
        return rows
            .filter((r) => r.totalUZS > 0.01 || r.totalUSD > 0.01)
            .sort((a, b) => b.totalUZS - a.totalUZS || b.totalUSD - a.totalUSD)
    }, [departments, entries, language, ledgerDeptId, payrollUzsTotal, t])

    const chartSeries = useMemo(() => {
        const day = {}
        const add = (k, incuzs, incusd, expuzs, expusd) => {
            if (!k) return
            const dk = k.slice(0, 10)
            if (!day[dk]) day[dk] = { date: dk, inc: 0, exp: 0 }
            const isUsd = chartCurrency === 'USD'
            day[dk].inc += isUsd ? incusd : incuzs
            day[dk].exp += isUsd ? expusd : expuzs
        }

        for (const e of entries) {
            const a = Number(e.amount || 0)
            if (normalizeFinCurrency(e.currency) === 'USD') add(e.expense_date, 0, 0, 0, a)
            else add(e.expense_date, 0, 0, a, 0)
        }
        for (const p of employeePayoutLines) {
            add(p.date, 0, 0, Number(p.amount || 0), 0)
        }
        for (const pe of partnerEntries) {
            const a = Number(pe.amount_uzs || 0)
            const isUsd = normalizeFinCurrency(pe.currency) === 'USD'
            if (pe.entry_type === 'payment') add(pe.entry_date, 0, 0, isUsd ? 0 : a, isUsd ? a : 0)
            if (pe.entry_type === 'payment_in') add(pe.entry_date, isUsd ? 0 : a, isUsd ? a : 0, 0, 0)
        }
        for (const o of salesInRange) {
            const a = Number(o.total || 0)
            add(o.created_at, 0, a, 0, 0)
        }
        
        return Object.values(day).sort((a, b) => a.date.localeCompare(b.date))
    }, [entries, employeePayoutLines, partnerEntries, salesInRange, chartCurrency])

    const ledgerRows = useMemo(() => {
        const material = entries.map((e) => ({
            id: e.id,
            date: e.expense_date,
            type: 'expense',
            label: buildDeptPath(e.department_id, departments, language),
            amount: Number(e.amount || 0),
            currency: normalizeFinCurrency(e.currency),
            note: e.note || '',
        }))
        const pay = employeePayoutLines.map((p) => ({
            id: p.id,
            date: p.date,
            type: 'payroll',
            label: t('finances.reportsLedgerPayrollDeptPath'),
            amount: Number(p.amount || 0),
            currency: 'UZS',
            note: `${p.kind === 'advance' ? t('finances.reportsLedgerAdvanceTag') : t('finances.reportsLedgerSalaryTag')} ${p.note || ''}`,
        }))
        const part = partnerEntries.map((pe) => {
            const p = partners.find(x => x.id === pe.partner_id)
            return {
                id: `pe-${pe.id}`,
                date: String(pe.entry_date).slice(0, 10),
                type: 'partner',
                label: `Partner: ${pickLocalizedName(p, language) || '...'}`,
                amount: Number(pe.amount_uzs || 0),
                currency: normalizeFinCurrency(pe.currency),
                note: `[${pe.entry_type.toUpperCase()}] ${pe.description || ''}`,
            }
        })
        const sales = salesInRange.map((o) => ({
            id: `sale-${o.id}`,
            date: String(o.created_at).slice(0, 10),
            type: 'sale',
            label: 'Sales Revenue',
            amount: Number(o.total || 0),
            currency: 'USD',
            note: `Order #${o.id.slice(0, 5)}`,
        }))
        return [...material, ...pay, ...part, ...sales].sort((a, b) => b.date.localeCompare(a.date) || String(a.id).localeCompare(String(b.id)))
    }, [entries, departments, language, employeePayoutLines, partnerEntries, partners, salesInRange, t])

    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* CYBER BACKGROUND WITH GRID */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 bg-[#070b14]" />
                <div className="absolute inset-0 opacity-[0.08]" 
                    style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
                />
                <div className="absolute top-[-15%] right-[-10%] w-[1000px] h-[1000px] bg-blue-500/30 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[900px] h-[900px] bg-purple-500/30 blur-[150px] rounded-full animate-pulse duration-[7s]" />
            </div>

            <div className="w-full h-screen p-4 lg:p-6 relative z-10 flex flex-col items-center">
                {/* MAIN CONTAINER WITH SOLID NEON BORDER */}
                <div className="w-full max-w-[1550px] h-full bg-[#0f172a]/70 border border-blue-500/40 rounded-3xl p-4 lg:p-6 shadow-[0_0_60px_rgba(37,99,235,0.15)] backdrop-blur-2xl flex flex-col gap-6 overflow-hidden">
                    <div className="shrink-0 flex flex-col gap-4">
                        <Header title={t('finances.financeBranchReports')} toggleSidebar={toggleSidebar} />
                        <MoliyaTopNav />
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar pb-10 space-y-8">
                        {/* --- HERO / SUMMARY CARDS --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-in fade-in duration-1000">
                            <div className="lg:col-span-2 space-y-4 flex flex-col justify-center px-4">
                                <h1 className="text-5xl lg:text-6xl font-black text-white tracking-tighter italic uppercase leading-[0.9] flex items-center gap-4">
                                    <TrendingUp size={48} className="text-blue-500" />
                                    Moliya<br/>Oqimi
                                </h1>
                                <p className="text-white/40 text-xs font-bold uppercase tracking-[0.2em] max-w-sm leading-relaxed">
                                    Tizimning umumiy moliyaviy holati va barcha bo'limlar integratsiyasi.
                                </p>
                            </div>

                            <div className="bg-white/[0.02] shadow-inner border border-emerald-500/40 rounded-3xl p-8 group transition-all duration-500 hover:shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full blur-3xl opacity-50" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/50 mb-3 flex items-center gap-2">
                                    <ArrowUpRight size={14} /> Umumiy Kirim
                                </p>
                                <div className="space-y-1">
                                    {globalStats.incomeUZS > 0.01 && <p className="text-3xl font-black text-white tracking-tighter italic">{formatFinAmount(globalStats.incomeUZS, 'UZS')}</p>}
                                    <p className="text-xl font-black text-emerald-500 tracking-tighter italic tabular-nums">${globalStats.incomeUSD.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-white/[0.02] shadow-inner border border-rose-500/40 rounded-3xl p-8 group transition-all duration-500 hover:shadow-[0_0_40px_rgba(244,63,94,0.15)] relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full blur-3xl opacity-50" />
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500/50 mb-3 flex items-center gap-2">
                                    <ArrowDownRight size={14} /> Umumiy Chiqim
                                </p>
                                <div className="space-y-1">
                                    {globalStats.expenseUZS > 0.01 && <p className="text-3xl font-black text-white tracking-tighter italic">{formatFinAmount(globalStats.expenseUZS, 'UZS')}</p>}
                                    <p className="text-xl font-black text-rose-500 tracking-tighter italic tabular-nums">${globalStats.expenseUSD.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* --- MAIN CHART SECTION --- */}
                        <div className="bg-white/[0.02] shadow-inner border border-white/10 p-8 rounded-3xl animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10 mb-8">
                               <div className="space-y-1">
                                   <h3 className="text-xl font-black text-white uppercase italic tracking-widest leading-none">Moliya Dinamikasi</h3>
                                   <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.4em]">Kirim va Chiqim nazorati</p>
                               </div>
                               
                               <div className="flex bg-white/[0.03] shadow-inner p-1.5 rounded-xl border border-white/10 backdrop-blur-xl">
                                    {['UZS', 'USD'].map((c) => (
                                        <button key={c} onClick={() => setChartCurrency(c)} className={`px-6 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all ${chartCurrency === c ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'text-white/30 hover:text-white hover:bg-white/5'}`}>
                                            {c}
                                        </button>
                                    ))}
                               </div>
                            </div>

                            <div className="h-[300px] w-full relative z-10 pr-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartSeries}>
                                        <defs>
                                            <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontWeight: 900 }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)', fontWeight: 900 }} axisLine={false} tickLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '10px' }}
                                            itemStyle={{ fontWeight: 900, textTransform: 'uppercase' }}
                                        />
                                        <Area type="monotone" dataKey="inc" name="Kirim" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInc)" />
                                        <Area type="monotone" dataKey="exp" name="Chiqim" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorExp)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* --- TABS --- */}
                        <div className="flex flex-wrap gap-3">
                            {[
                                { id: 'dept', label: t('finances.reportsByDept'), icon: Building2 },
                                { id: 'partners', label: "Hamkorlar Tahlili", icon: Users },
                                { id: 'sales', label: t('finances.reportsSalesTab'), icon: ShoppingBag },
                                { id: 'ledger', label: t('finances.reportsAllEntries'), icon: FileSpreadsheet },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setView(item.id)}
                                    className={`group px-6 py-4 rounded-2xl border transition-all duration-300 flex items-center gap-3 ${
                                        view === item.id 
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_30px_rgba(37,99,235,0.3)]' 
                                            : 'bg-white/[0.02] border-white/10 shadow-inner text-white/40 hover:border-blue-500/30 hover:bg-blue-500/5 hover:text-white'
                                    }`}
                                >
                                    <item.icon size={16} className={view === item.id ? 'text-white' : 'text-white/20 group-hover:text-blue-400 transition-colors'} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* --- DYNAMIC TABLES --- */}
                        <div className="bg-white/[0.02] shadow-inner border border-white/10 rounded-3xl overflow-hidden animate-in fade-in duration-700">
                            {loading ? (
                                <div className="p-8"><MoliyaCardSkeleton /></div>
                            ) : view === 'sales' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] bg-white/[0.01]">
                                                <th className="px-6 py-5 w-16 text-center">#</th>
                                                <th className="px-6 py-5">Mahsulot Nomi</th>
                                                <th className="px-6 py-5 text-right">Sotuv Soni</th>
                                                <th className="px-6 py-5 text-right">Tushum</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {salesAgg.byProduct.length === 0 && (
                                                <tr><td colSpan={4} className="px-6 py-20 text-center text-[10px] uppercase font-black tracking-widest text-white/20">Ma'lumot topilmadi</td></tr>
                                            )}
                                            {salesAgg.byProduct.map((r, i) => (
                                                <tr key={r.key} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                    <td className="px-6 py-4 flex justify-center"><RankMedal place={i} /></td>
                                                    <td className="px-6 py-4 font-black text-white uppercase tracking-tighter italic text-sm">{r.name}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-black text-lg italic tabular-nums">{r.qty.toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-blue-400 font-black text-lg italic tabular-nums">${r.revenue.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : view === 'partners' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] bg-white/[0.01]">
                                                <th className="px-6 py-5 w-16 text-center">#</th>
                                                <th className="px-6 py-5">Hamkor Nomlanishi</th>
                                                <th className="px-6 py-5 text-right">Kirim (Tushum)</th>
                                                <th className="px-6 py-5 text-right">Chiqim (To'lov)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {partnerSummary.length === 0 && (
                                                <tr><td colSpan={4} className="px-6 py-20 text-center text-[10px] uppercase font-black tracking-widest text-white/20">Ma'lumot topilmadi</td></tr>
                                            )}
                                            {partnerSummary.map((s, i) => (
                                                <tr key={s.pid} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                    <td className="px-6 py-4 flex justify-center"><RankMedal place={i} /></td>
                                                    <td className="px-6 py-4 font-black text-white/80 uppercase tracking-tighter italic text-sm group-hover:text-white transition-colors">{s.partnerName}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-emerald-400 font-black text-base italic tabular-nums">
                                                        {s.uzsIn > 0.01 ? formatFinAmount(s.uzsIn, 'UZS') : '—'}
                                                        {s.usdIn > 0.01 && <div className="text-[9px] text-emerald-400/60 mt-0.5">{formatFinAmount(s.usdIn, 'USD')}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-rose-400 font-black text-base italic tabular-nums">
                                                        {s.uzsOut > 0.01 ? formatFinAmount(s.uzsOut, 'UZS') : '—'}
                                                        {s.usdOut > 0.01 && <div className="text-[9px] text-rose-400/60 mt-0.5">{formatFinAmount(s.usdOut, 'USD')}</div>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : view === 'dept' ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] bg-white/[0.01]">
                                                <th className="px-6 py-5 w-16 text-center">#</th>
                                                <th className="px-6 py-5">Bo'lim Manzili</th>
                                                <th className="px-6 py-5 text-right">{t('finances.reportsTotalUzsCol')}</th>
                                                <th className="px-6 py-5 text-right">{t('finances.reportsTotalUsdCol')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {deptRanking.length === 0 && (
                                                <tr><td colSpan={4} className="px-6 py-20 text-center text-[10px] uppercase font-black tracking-widest text-white/20">Ma'lumot topilmadi</td></tr>
                                            )}
                                            {deptRanking.map((r, i) => (
                                                <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                    <td className="px-6 py-4 flex justify-center"><RankMedal place={i} /></td>
                                                    <td className="px-6 py-4 font-black text-white/80 uppercase tracking-tighter italic text-sm group-hover:text-white transition-colors">{r.path}</td>
                                                    <td className="px-6 py-4 text-right font-mono text-white font-black text-base italic tabular-nums group-hover:text-emerald-400 transition-colors">
                                                        {r.totalUZS > 0.01 ? formatFinAmount(r.totalUZS, 'UZS') : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-white font-black text-base italic tabular-nums group-hover:text-blue-400 transition-colors">
                                                        {r.totalUSD > 0.01 ? formatFinAmount(r.totalUSD, 'USD') : '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[800px] text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[9px] font-black text-white/30 uppercase tracking-[0.3em] bg-white/[0.01]">
                                                <th className="px-6 py-5 w-32">{t('finances.date')}</th>
                                                <th className="px-6 py-5">Tranzaksiya Turi</th>
                                                <th className="px-6 py-5 text-right">{t('finances.amountWithCurrency')}</th>
                                                <th className="px-6 py-5 w-1/3">Izoh/Tafsilot</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {ledgerRows.length === 0 && (
                                                <tr><td colSpan={4} className="px-6 py-20 text-center text-[10px] uppercase font-black tracking-widest text-white/20">Ma'lumot topilmadi</td></tr>
                                            )}
                                            {ledgerRows.map((r) => (
                                                <tr key={r.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                    <td className="px-6 py-4 font-mono text-white/40 group-hover:text-white/70 transition-colors text-[10px] font-black tabular-nums">{r.date}</td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-blue-500/60 uppercase tracking-widest mb-0.5">{r.type}</span>
                                                            <span className="font-black text-white/80 uppercase tracking-tight text-xs group-hover:text-white transition-all max-w-[200px] truncate" title={r.label}>{r.label}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-black text-base tabular-nums text-white group-hover:text-emerald-400 transition-colors">
                                                        {formatFinAmount(r.amount, r.currency)}
                                                        <span className="text-[7px] ml-1 uppercase text-white/30">{r.currency}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-white/50 text-[11px] font-medium group-hover:text-white/80 transition-colors max-w-xs truncate" title={r.note}>
                                                        {r.note || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
