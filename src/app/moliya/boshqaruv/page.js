'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { api } from '@/utils/api'
import Header from '@/components/Header'
import MoliyaTopNav from '@/components/MoliyaTopNav'
import { MoliyaCardSkeleton } from '@/components/MoliyaSkeletons'
import { 
    Users, Plus, Trash2, Pencil, X, ChevronRight, 
    History, Wallet, TrendingUp, TrendingDown, 
    Clock, Search, ArrowUpRight, ArrowDownRight,
    ShoppingBag, Truck, Download, Upload, Printer, FileText, Info,
    Activity, LayoutGrid, FileSpreadsheet, Sparkles, Filter,
    CreditCard, ArrowRight, MinusCircle, AlertCircle, Calendar,
    User as UserIcon, Tag, ArrowDownToLine, PackagePlus, PackageMinus, Banknote
} from 'lucide-react'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDialog } from '@/context/DialogContext'
import { pickLocalizedName } from '@/utils/localizedName'
import {
    formatFinAmount,
    normalizeFinCurrency,
} from '@/utils/financeCurrency'
import { downloadSupplyTemplateXlsx, parseSupplySpreadsheetFile } from '@/utils/financeSupplyExcel'

const EMPTY_LINE = { item_name: '', quantity_display: '', unit_price_uzs: '', line_total_uzs: '' }

function entryTypeLabel(type) {
    if (type === 'supply') return 'Kirim (Mahsulot)'
    if (type === 'payment') return 'Chiqim (To\'lov)'
    if (type === 'payment_in') return 'Tushum (Kirish)'
    if (type === 'sale_out') return 'Sotuv (Chiqish)'
    return type
}

function entryUsesLineItems(type) {
    return type === 'supply' || type === 'sale_out'
}

function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

function getPartnerColor(id) {
    const colors = [
        'from-blue-500 to-indigo-600',
        'from-emerald-500 to-teal-600',
        'from-purple-500 to-pink-600',
        'from-amber-500 to-orange-600',
        'from-rose-500 to-red-600',
        'from-cyan-500 to-blue-600'
    ]
    const idx = parseInt(id?.toString()?.slice(-1)) % colors.length || 0
    return colors[idx]
}

export default function MoliyaBoshqaruvPage() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const { showAlert, showConfirm, showToast } = useDialog()
    
    const [partners, setPartners] = useState([])
    const [partnerEntries, setPartnerEntries] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedPartnerId, setSelectedPartnerId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')

    const [entryModal, setEntryModal] = useState({ open: false, type: 'supply', id: null })
    const [supplyStep, setSupplyStep] = useState(1)
    const [entryForm, setEntryForm] = useState({
        amount: '', currency: 'UZS', entry_date: new Date().toISOString().split('T')[0],
        description: '', lines: [{ ...EMPTY_LINE }], responsible_person: '', warehouse: ''
    })
    
    const [detailsModal, setDetailsModal] = useState(false)
    const [viewEntry, setViewEntry] = useState(null)
    const excelInputRef = useRef(null)

    const loadData = useCallback(async () => {
        setLoading(true)
        try {
            const [pRes, peRes] = await Promise.all([
                api.get('/api/finance/partners'),
                api.get('/api/finance/partner-entries')
            ])
            setPartners(pRes.data || [])
            setPartnerEntries(peRes.data || [])
            if (pRes.data?.length > 0 && !selectedPartnerId) {
                setSelectedPartnerId(pRes.data[0].id)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }, [selectedPartnerId])

    useEffect(() => { loadData() }, [loadData])

    const selectedPartner = useMemo(() => partners.find(p => p.id === selectedPartnerId), [partners, selectedPartnerId])
    
    const sortedSelectedEntries = useMemo(() => {
        return partnerEntries
            .filter(e => e.partner_id === selectedPartnerId)
            .sort((a, b) => {
                // Primary: Entry Date (Business Date)
                if (b.entry_date !== a.entry_date) return b.entry_date.localeCompare(a.entry_date)
                // Secondary: Created At (Actual entry time)
                return (b.createdAt || '').localeCompare(a.createdAt || '')
            })
    }, [partnerEntries, selectedPartnerId])

    const stats = useMemo(() => {
        const pStats = {}
        let totalOurDebtUZS = 0, totalOurDebtUSD = 0, totalTheirDebtUZS = 0, totalTheirDebtUSD = 0;
        partners.forEach(p => pStats[p.id] = { uzs: 0, usd: 0 })
        partnerEntries.forEach(e => {
            if (!pStats[e.partner_id]) return
            const amt = Number(e.amount_uzs) || 0
            const cur = normalizeFinCurrency(e.currency)
            const factor = (e.entry_type === 'supply' || e.entry_type === 'payment_in') ? 1 : -1
            if (cur === 'USD') pStats[e.partner_id].usd += (amt * factor); else pStats[e.partner_id].uzs += (amt * factor)
        })
        Object.values(pStats).forEach(s => {
            if (s.uzs > 0) totalOurDebtUZS += s.uzs; else if (s.uzs < 0) totalTheirDebtUZS += Math.abs(s.uzs)
            if (s.usd > 0) totalOurDebtUSD += s.usd; else if (s.usd < 0) totalTheirDebtUSD += Math.abs(s.usd)
        })
        return { pStats, totalOurDebtUZS, totalOurDebtUSD, totalTheirDebtUZS, totalTheirDebtUSD }
    }, [partners, partnerEntries])

    const getBalanceLabel = (val) => {
        if (Math.abs(val) < 0.01) return { label: 'Yopiq', color: 'text-white/20', bg: 'bg-white/5' }
        if (val > 0) return { label: 'Biz qarzdormiz', color: 'text-rose-400', bg: 'bg-rose-500/10' }
        return { label: 'Ular qarzdor', color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
    }

    const openEntryGate = (type) => {
        setEntryModal({ open: true, type, id: null })
        setSupplyStep(1)
        setEntryForm({ amount: '', currency: 'UZS', entry_date: new Date().toISOString().split('T')[0], description: '', lines: [{ ...EMPTY_LINE }], responsible_person: '', warehouse: '' })
    }

    const saveEntry = async (e) => {
        if (e) e.preventDefault()
        try {
            const isLines = entryUsesLineItems(entryModal.type)
            // CRITICAL: Filter based on item_name OR positive totals
            const cleanedLines = isLines ? entryForm.lines.filter(l => l.item_name.trim() !== '') : []
            const sum = isLines ? cleanedLines.reduce((a, ln) => a + (parseFloat(ln.line_total_uzs) || 0), 0) : parseFloat(entryForm.amount)
            
            // BACKEND ALIGNMENT: Prisma schema uses 'responsible_person' and 'warehouse'
            const payload = {
                partner_id: selectedPartnerId,
                entry_type: entryModal.type,
                amount_uzs: sum,
                currency: entryForm.currency,
                entry_date: entryForm.entry_date,
                description: entryForm.description,
                responsible_person: entryForm.responsible_person,
                warehouse: entryForm.warehouse,
                lines: isLines ? cleanedLines : []
            }
            if (entryModal.id) await api.put(`/api/finance/partner-entries/${entryModal.id}`, payload)
            else await api.post('/api/finance/partner-entries', payload)
            
            showToast('Muvaffaqiyatli saqlandi')
            setEntryModal({ open: false, type: '', id: null })
            loadData()
        } catch (err) { showAlert(err?.response?.data?.error || err.message) }
    }

    const handleExcelImport = async (ev) => {
        const file = ev.target.files?.[0]
        if (!file) return
        try {
            const parsed = await parseSupplySpreadsheetFile(file)
            setEntryForm(f => ({ ...f, lines: [...f.lines.filter(l => l.item_name), ...parsed] }))
            setSupplyStep(2)
            showToast(`${parsed.length} ta mahsulot import qilindi`)
        } catch (err) { showAlert(err.message) }
        ev.target.value = ''
    }

    const chartData = useMemo(() => {
        if (!selectedPartnerId) return []
        const days = []
        for(let i=10; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i)
            const iso = d.toISOString().split('T')[0]
            let bal = 0
            partnerEntries.filter(e => e.partner_id === selectedPartnerId && e.entry_date <= iso).forEach(e => {
                const amt = Number(e.amount_uzs); const f = (e.entry_type==='supply'||e.entry_type==='payment_in') ? 1 : -1
                bal += (amt * f)
            })
            days.push({ day: iso.slice(8), balance: bal })
        }
        return days
    }, [partnerEntries, selectedPartnerId])

    return (
        <div className="h-screen bg-[#020817] text-slate-200 font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col relative w-full inset-0">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-emerald-600/20 blur-[120px] pointer-events-none" />

            <div className="flex-1 w-full mx-auto p-4 lg:p-8 flex flex-col gap-8 overflow-hidden max-w-[1600px] relative z-10">
                <div className="shrink-0 flex flex-col gap-4">
                    <Header title="Sotuvlar hisoboti" toggleSidebar={toggleSidebar} />
                    <MoliyaTopNav />

                    {/* STATS OVERVIEW */}
                    <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-2">
                        {[
                            { label: 'Bizning qarz (UZS)', val: stats.totalOurDebtUZS, color: 'text-rose-400' },
                            { label: 'Bizning qarz (USD)', val: stats.totalOurDebtUSD, color: 'text-rose-400' },
                            { label: 'Debitorlar (UZS)', val: stats.totalTheirDebtUZS, color: 'text-emerald-400' },
                            { label: 'Debitorlar (USD)', val: stats.totalTheirDebtUSD, color: 'text-emerald-400' },
                        ].map((s, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-xl p-6 rounded-[2rem] border border-white/10 shadow-2xl relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-[11px] text-white/40 font-black uppercase tracking-[0.2em]">{s.label}</p>
                                <div className="flex items-baseline gap-1.5 mt-2">
                                    <h3 className={`text-3xl font-black ${s.color} tracking-tighter neon-text`}>{Math.round(s.val).toLocaleString()}</h3>
                                    <span className="text-xs font-bold uppercase text-white/30">{s.label.includes('USD') ? 'USD' : 'UZS'}</span>
                                </div>
                            </div>
                        ))}
                    </section>
                </div>

                <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
                        {/* PARTNERS COLUMN */}
                        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 flex flex-col gap-5 h-full relative shadow-2xl">
                                <div className="flex justify-between items-center relative z-10">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-white">Hamkorlar</h4>
                                    <button className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/30 transition-all text-[10px] font-black uppercase tracking-widest">+ Yangi</button>
                                </div>
                                <div className="relative z-10">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                                    <input type="text" placeholder="Qidiruv..." className="w-full bg-black/20 border border-white/10 rounded-2xl py-3 pl-12 pr-4 outline-none text-sm focus:border-blue-500/50 transition-all text-white placeholder-white/20" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 pr-1 no-scrollbar relative z-10">
                                    {partners.filter(p => pickLocalizedName(p, language)?.toLowerCase().includes(searchTerm.toLowerCase())).map(p => {
                                        const active = selectedPartnerId === p.id; const s = stats.pStats[p.id] || { uzs: 0, usd: 0 }; const n = pickLocalizedName(p, language)
                                        return (
                                            <button key={p.id} onClick={() => setSelectedPartnerId(p.id)} className={`w-full flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border ${active ? 'bg-blue-500/20 border-blue-500/50' : 'bg-black/20 hover:bg-white/5 border-transparent hover:border-white/20'}`}>
                                                <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-sm font-black uppercase shadow-lg ${active ? 'bg-blue-500 text-white' : 'bg-white/10 text-white/60'}`}>{getInitials(n)}</div>
                                                <div className="flex-1 min-w-0 text-left">
                                                    <p className={`font-black text-sm uppercase tracking-wider truncate mb-1 ${active ? 'text-blue-400' : 'text-gray-300'}`}>{n}</p>
                                                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{Math.round(s.uzs).toLocaleString()} UZS</p>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* DETAIL COLUMN */}
                        <div className="lg:col-span-9 flex flex-col gap-6 min-h-0 overflow-y-auto no-scrollbar">
                            {selectedPartner ? (
                                <>
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-center justify-between shadow-2xl relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                                            <div className="w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black bg-white/10 text-white shadow-xl backdrop-blur-md border border-white/20">
                                                {getInitials(pickLocalizedName(selectedPartner, language))}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h2 className="text-2xl font-black text-white uppercase tracking-wider">{pickLocalizedName(selectedPartner, language)}</h2>
                                                    <button onClick={async () => { if (await showConfirm(`"${pickLocalizedName(selectedPartner, language)}" o'chirilsinmi?`)) { await api.delete(`/api/finance/partners/${selectedPartner.id}`); setSelectedPartnerId(null); loadData(); } }} className="p-1.5 text-white/30 hover:text-rose-500 rounded-xl hover:bg-white/5 transition-all"><Trash2 size={16} /></button>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="text-xl font-black text-emerald-400 tracking-tighter neon-text">{Math.round(stats.pStats[selectedPartner.id]?.uzs).toLocaleString()} <span className="text-xs text-white/40 uppercase tracking-widest">UZS</span></span>
                                                    {stats.pStats[selectedPartner.id]?.usd !== 0 && <span className="text-xl font-black text-emerald-400 pl-6 border-l border-white/10 tracking-tighter neon-text">{Math.round(stats.pStats[selectedPartner.id]?.usd).toLocaleString()} <span className="text-xs text-white/40 uppercase tracking-widest">USD</span></span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 relative z-10 mt-6 md:mt-0 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                                            {[
                                                { id: 'supply', l: 'Kirim', c: 'blue' },
                                                { id: 'sale_out', l: 'Sotuv', c: 'emerald' },
                                                { id: 'payment_in', l: 'Tushum', c: 'amber' },
                                                { id: 'payment', l: 'Chiqim', c: 'rose' }
                                            ].map(b => (
                                                <button key={b.id} onClick={() => openEntryGate(b.id)} className={`flex flex-col items-center justify-center px-4 py-3 bg-black/20 border border-white/10 hover:border-${b.c}-500/50 shadow-lg rounded-2xl hover:bg-${b.c}-500/10 transition-all group min-w-[70px]`}>
                                                    <Activity size={18} className={`text-white/40 group-hover:text-${b.c}-400 mb-1`} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white">{b.l}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden flex flex-col shadow-2xl relative">
                                        <div className="p-6 border-b border-white/5 flex justify-between items-center relative z-10 bg-black/20">
                                            <h2 className="text-sm font-black uppercase tracking-widest text-white">Oxirgi tranzaksiyalar</h2>
                                            <div className="flex gap-2">
                                                <button className="p-2 bg-white/5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all"><Filter size={16} /></button>
                                                <button className="p-2 bg-white/5 rounded-xl border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all"><Download size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="flex-1 overflow-auto bg-black/20 p-2 relative z-10">
                                            <table className="w-full text-left border-separate border-spacing-y-1">
                                                <thead className="bg-white/5 text-[9px] uppercase tracking-[0.2em] font-black text-white/40 sticky top-0 z-10 backdrop-blur-md">
                                                    <tr>
                                                        <th className="px-6 py-4 rounded-tl-xl rounded-bl-xl">Turi</th>
                                                        <th className="px-6 py-4">Sana</th>
                                                        <th className="px-6 py-4">Mas'ul</th>
                                                        <th className="px-6 py-4 text-right rounded-tr-xl rounded-br-xl">Summa</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {sortedSelectedEntries.map((e) => {
                                                        const isP = e.entry_type==='supply'||e.entry_type==='payment_in'; 
                                                        const c = e.entry_type==='supply'?'emerald':e.entry_type==='payment_in'?'blue':e.entry_type==='sale_out'?'amber':'rose'
                                                        return (
                                                            <tr key={e.id} onClick={() => { setViewEntry(e); setDetailsModal(true); }} className="hover:bg-white/[0.03] transition-all cursor-pointer group">
                                                                <td className="px-6 py-4">
                                                                    <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-${c}-500/10 text-${c}-400 border border-${c}-500/20`}>
                                                                        {entryTypeLabel(e.entry_type)}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4 text-xs text-white/60 font-bold uppercase tracking-widest">{e.entry_date}</td>
                                                                <td className="px-6 py-4 text-xs font-bold text-white/80">{e.responsible_person || 'Admin'}</td>
                                                                <td className={`px-6 py-4 text-sm font-black text-right ${isP ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                    {isP ? '+' : '-'}{Math.round(e.amount_uzs).toLocaleString()} <span className="text-[10px] text-white/30 font-bold ml-1 uppercase tracking-widest">UZS</span>
                                                                </td>
                                                            </tr>
                                                        )
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center opacity-20">
                                    <LayoutGrid size={64} className="mb-6 text-white" />
                                    <h2 className="text-2xl font-black text-white uppercase tracking-[0.5em]">Tizim Tayyor</h2>
                                    <p className="mt-2 text-sm text-white/50 font-bold tracking-widest uppercase">Davom etish uchun hamkorni tanlang</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

            {/* ENTRY MODAL WIZARD */}
            {entryModal.open && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-[#020817]/80 backdrop-blur-md">
                    <div className={`bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl w-full flex flex-col transition-all duration-300 relative overflow-hidden ${entryUsesLineItems(entryModal.type) && supplyStep === 2 ? 'max-w-4xl' : 'max-w-xl'}`}>
                        <div className="absolute top-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-blue-500/10 blur-[80px] pointer-events-none" />
                        
                        <div className="flex justify-between items-center p-8 border-b border-white/5 relative z-10 bg-black/20">
                            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/80">{entryTypeLabel(entryModal.type)}</h2>
                            <button onClick={() => setEntryModal({ open: false, type: '', id: null })} className="p-2 hover:bg-white/5 rounded-xl text-white/40 transition-colors"><X size={20} /></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar max-h-[85vh] relative z-10">
                            {supplyStep === 1 && entryUsesLineItems(entryModal.type) && (
                                <div className="grid grid-cols-2 gap-6">
                                    <button onClick={() => setSupplyStep(2)} className="flex flex-col items-center p-12 bg-black/20 border border-white/10 rounded-[2rem] hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                                        <div className="p-4 bg-blue-500/10 rounded-2xl mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                            <LayoutGrid size={32} className="text-blue-400" />
                                        </div>
                                        <h4 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] group-hover:text-white">Qo'lda kiritish</h4>
                                    </button>
                                    <button onClick={() => excelInputRef.current?.click()} className="flex flex-col items-center p-12 bg-black/20 border border-white/10 rounded-[2rem] hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group">
                                        <div className="p-4 bg-emerald-500/10 rounded-2xl mb-6 shadow-xl group-hover:scale-110 transition-transform">
                                            <FileSpreadsheet size={32} className="text-emerald-400" />
                                        </div>
                                        <h4 className="text-[11px] font-black text-white/60 uppercase tracking-[0.2em] group-hover:text-white">Excel Import</h4>
                                        <input type="file" ref={excelInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleExcelImport} />
                                    </button>
                                </div>
                            )}

                            {supplyStep === 2 && entryUsesLineItems(entryModal.type) && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center px-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 italic">Mahsulotlar Oqimi</h3>
                                        <button onClick={() => setEntryForm({...entryForm, lines: [...entryForm.lines, {...EMPTY_LINE}]})} className="px-5 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all">Qator qo'shish</button>
                                    </div>
                                    <div className="space-y-3">
                                        {entryForm.lines.map((ln, idx) => (
                                            <div key={idx} className="grid grid-cols-[1fr_90px_120px_120px_40px] gap-4 p-4 bg-black/20 border border-white/5 rounded-2xl items-center">
                                                <input className="bg-white/5 border border-white/10 rounded-xl outline-none text-xs px-4 py-3 text-white placeholder-white/20 focus:border-blue-500/50 transition-all font-bold" value={ln.item_name} onChange={e => { const nl = [...entryForm.lines]; nl[idx].item_name = e.target.value; setEntryForm({...entryForm, lines: nl}) }} placeholder="Mahsulot nomi" />
                                                <input className="bg-white/5 border border-white/10 rounded-xl outline-none text-xs px-3 py-3 text-center text-emerald-400 font-black focus:border-blue-500/50 transition-all" value={ln.quantity_display} onChange={e => { const nl = [...entryForm.lines]; nl[idx].quantity_display = e.target.value; const qty = parseFloat(e.target.value) || 0; const prc = parseFloat(nl[idx].unit_price_uzs) || 0; nl[idx].line_total_uzs = (qty * prc).toString(); setEntryForm({...entryForm, lines: nl}); }} placeholder="0" />
                                                <input className="bg-white/5 border border-white/10 rounded-xl outline-none text-xs px-4 py-3 text-right text-white/60 focus:border-blue-500/50 transition-all font-mono" value={ln.unit_price_uzs} onChange={e => { const nl = [...entryForm.lines]; nl[idx].unit_price_uzs = e.target.value; const qty = parseFloat(nl[idx].quantity_display) || 0; const prc = parseFloat(e.target.value) || 0; nl[idx].line_total_uzs = (qty * prc).toString(); setEntryForm({...entryForm, lines: nl}); }} placeholder="Narx" />
                                                <div className="text-xs py-3 text-right text-emerald-400 font-black bg-black/40 border border-white/5 rounded-xl px-4 font-mono">{(parseFloat(ln.line_total_uzs) || 0).toLocaleString()}</div>
                                                <button onClick={() => { const nl = entryForm.lines.filter((_, i) => i !== idx); setEntryForm({...entryForm, lines: nl}) }} className="text-white/20 hover:text-rose-500 transition-colors flex justify-center items-center"><X size={18} /></button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center p-8 bg-blue-500/5 rounded-3xl border border-blue-500/20 mt-10 shadow-inner">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-blue-500/60 uppercase tracking-[0.2em] mb-1">Jami hisob</span>
                                            <span className="text-4xl font-black text-white tracking-tighter neon-text">{entryForm.lines.reduce((a, ln) => a + (parseFloat(ln.line_total_uzs) || 0), 0).toLocaleString()} <span className="text-xs text-white/30 ml-2">UZS</span></span>
                                        </div>
                                        <button onClick={() => setSupplyStep(3)} className="px-10 py-5 bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 hover:scale-105 transition-all">DAVOM ETISH</button>
                                    </div>
                                </div>
                            )}

                            {(supplyStep === 3 || !entryUsesLineItems(entryModal.type)) && (
                                <div className="space-y-8 px-2">
                                    {!entryUsesLineItems(entryModal.type) && (
                                        <div className="flex flex-col gap-4">
                                            <label className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em] ml-1">Summa Miqdori</label>
                                            <div className="relative">
                                                <input type="number" className="w-full bg-black/40 border border-white/10 rounded-[2rem] py-8 px-10 text-5xl font-black outline-none focus:border-blue-500/50 transition-all text-white tracking-tighter shadow-inner" value={entryForm.amount} onChange={e => setEntryForm({...entryForm, amount: e.target.value})} />
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex gap-3">
                                                    {['UZS', 'USD'].map(cur => (
                                                        <button key={cur} type="button" onClick={() => setEntryForm({...entryForm, currency: cur})} className={`px-6 py-3 rounded-2xl text-[11px] font-black transition-all ${entryForm.currency === cur ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/40' : 'bg-white/5 text-white/20 border border-white/10 hover:bg-white/10'}`}>{cur}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="flex flex-col gap-3"><label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Sana</label><input type="date" className="bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white font-bold outline-none focus:border-blue-500/50 transition-all" value={entryForm.entry_date} onChange={e => setEntryForm({...entryForm, entry_date: e.target.value})} /></div>
                                        <div className="flex flex-col gap-3"><label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Mas'ul Shaxs</label><input type="text" className="bg-black/40 border border-white/10 rounded-2xl py-4 px-6 text-sm text-white font-bold outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" placeholder="Mas'ul shaxs..." value={entryForm.responsible_person} onChange={e => setEntryForm({...entryForm, responsible_person: e.target.value})} /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8">
                                        <div className="flex flex-col gap-3"><label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Qisqacha Izoh</label><textarea className="bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/60 resize-none h-32 outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" placeholder="Izoh qoldiring..." value={entryForm.description} onChange={e => setEntryForm({...entryForm, description: e.target.value})} /></div>
                                        <div className="flex flex-col gap-3"><label className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-1">Ombor Tafsiloti</label><textarea className="bg-black/40 border border-white/10 rounded-2xl p-6 text-sm text-white/60 resize-none h-32 outline-none focus:border-blue-500/50 transition-all placeholder:text-white/10" placeholder="Ombor lokatsiyasi..." value={entryForm.warehouse} onChange={e => setEntryForm({...entryForm, warehouse: e.target.value})} /></div>
                                    </div>
                                    <button onClick={saveEntry} className="w-full py-6 bg-blue-600 text-white rounded-[2rem] text-sm font-black uppercase tracking-[0.4em] shadow-2xl shadow-blue-500/40 hover:bg-blue-500 transition-all active:scale-[0.98]">SAQLASH VA TASDIQLASH</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* DETAILS MODAL */}
            {detailsModal && viewEntry && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-[#020817]/80 backdrop-blur-md">
                    <div className="bg-[#0f172a] border border-white/10 rounded-[2.5rem] w-full max-w-3xl shadow-2xl relative flex flex-col overflow-hidden transition-all duration-300">
                        <div className="absolute top-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />
                        
                        <div className="flex justify-between items-center p-8 border-b border-white/5 relative z-10 bg-black/20 shrink-0">
                            <div>
                                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-1">Tranzaksiya Tafsiloti</h2>
                                <p className="text-xs text-blue-400 font-mono tracking-widest">ID: {viewEntry.id?.toString().slice(0,18).toUpperCase()}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] ${viewEntry.entry_type === 'supply' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                    {entryTypeLabel(viewEntry.entry_type)}
                                </span>
                                <button onClick={() => setDetailsModal(false)} className="p-2 text-white/20 hover:text-white hover:bg-white/5 rounded-xl transition-all"><X size={20} /></button>
                            </div>
                        </div>

                        <div className="p-10 space-y-12 overflow-y-auto no-scrollbar max-h-[70vh] relative z-10">
                            <div className="flex justify-between items-end pb-10 border-b border-white/5">
                                <div className="space-y-3">
                                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{pickLocalizedName(selectedPartner, language)}</h3>
                                    <p className="text-xs text-white/30 font-black uppercase tracking-[0.2em]">{viewEntry.entry_date}</p>
                                </div>
                                {!entryUsesLineItems(viewEntry.entry_type) && (
                                    <div className="text-right">
                                        <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em] mb-2">Umumiy Qiymat</p>
                                        <p className="text-6xl font-black text-white tracking-tighter neon-text">
                                            {Math.round(viewEntry.amount_uzs).toLocaleString()} <span className="text-lg text-white/30 ml-2 uppercase tracking-widest">{viewEntry.currency}</span>
                                        </p>
                                    </div>
                                )}
                            </div>

                            {entryUsesLineItems(viewEntry.entry_type) ? (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end mb-4">
                                        <h4 className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Mahsulotlar Ro'yxati</h4>
                                        <div className="text-right">
                                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] mb-1">Jami Summa</p>
                                            <p className="text-4xl font-black text-emerald-400 tracking-tighter neon-text">
                                                {Math.round(viewEntry.amount_uzs).toLocaleString()} <span className="text-xs text-white/30 ml-2 uppercase tracking-widest">{viewEntry.currency}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="bg-black/40 border border-white/5 rounded-[2rem] overflow-hidden shrink-0 shadow-inner">
                                        <table className="w-full text-left">
                                            <thead className="bg-white/5 text-[9px] uppercase tracking-[0.2em] font-black text-white/40 border-b border-white/5">
                                                <tr>
                                                    <th className="px-8 py-5">Mahsulot</th>
                                                    <th className="px-8 py-5 text-center">Soni</th>
                                                    <th className="px-8 py-5 text-right">Birligi</th>
                                                    <th className="px-8 py-5 text-right">Jami</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {viewEntry.lines?.map((ln, i) => (
                                                    <tr key={i} className="hover:bg-white/[0.03] transition-colors group">
                                                        <td className="px-8 py-5 font-black text-white/80 uppercase tracking-wider text-xs">{ln.item_name}</td>
                                                        <td className="px-8 py-5 font-black text-emerald-400 text-center text-base font-mono">{ln.quantity_display}</td>
                                                        <td className="px-8 py-5 text-white/40 text-right font-mono text-xs">{Math.round(ln.unit_price_uzs).toLocaleString()}</td>
                                                        <td className="px-8 py-5 font-black text-white text-right text-base font-mono tracking-tighter">{Math.round(ln.line_total_uzs).toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 bg-black/40 rounded-[2.5rem] border border-white/5 flex flex-col items-center gap-6 shadow-inner">
                                    <p className="text-7xl font-black text-white tracking-tighter neon-text">
                                        {Math.round(viewEntry.amount_uzs).toLocaleString()} <span className="text-2xl text-white/20 uppercase ml-4 tracking-widest font-bold">{viewEntry.currency}</span>
                                    </p>
                                    {viewEntry.description && <p className="text-white/50 text-center max-w-md italic text-lg leading-relaxed">"{viewEntry.description}"</p>}
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-12 pt-8 border-t border-white/5">
                                <div className="space-y-6">
                                    <div><span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] block mb-2">Ombor / Lokatsiya</span><p className="text-sm text-white/80 font-bold uppercase tracking-widest">{viewEntry.warehouse?.trim() || '—'}</p></div>
                                    <div><span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] block mb-2">Mas'ul xodim</span><p className="text-sm text-white/80 font-bold uppercase tracking-widest">{viewEntry.responsible_person?.trim() || 'Admin'}</p></div>
                                </div>
                                {entryUsesLineItems(viewEntry.entry_type) && viewEntry.description && (
                                    <div className="border-l border-white/5 pl-12">
                                        <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] block mb-2">Izoh</span>
                                        <p className="text-sm text-white/40 italic leading-relaxed">"{viewEntry.description}"</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 bg-white/5 border-t border-white/5 flex gap-5 shrink-0 z-10">
                            <button onClick={() => { setEntryModal({ open: true, type: viewEntry.entry_type, id: viewEntry.id }); setSupplyStep(entryUsesLineItems(viewEntry.entry_type) ? 2 : 3); setEntryForm({ ...entryForm, amount: viewEntry.amount_uzs.toString(), currency: viewEntry.currency || 'UZS', entry_date: viewEntry.entry_date, description: viewEntry.description || '', responsible_person: viewEntry.responsible_person || '', warehouse: viewEntry.warehouse || '', lines: viewEntry.lines?.length ? viewEntry.lines : [{ ...EMPTY_LINE }] }); setDetailsModal(false); }} className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black text-white/60 uppercase tracking-[0.3em] hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]">Tahrirlash</button>
                            <button onClick={async () => { if(await showConfirm('Operatsiyani o\'chirasizmi?')) { await api.delete(`/api/finance/partner-entries/${viewEntry.id}`); setDetailsModal(false); loadData(); } }} className="flex-1 py-5 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-rose-500 hover:text-white transition-all active:scale-[0.98]">O'chirish</button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}
