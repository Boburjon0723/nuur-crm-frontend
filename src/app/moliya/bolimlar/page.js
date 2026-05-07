'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { api } from '@/utils/api'
import Header from '@/components/Header'
import MoliyaTopNav from '@/components/MoliyaTopNav'
import { MoliyaCardSkeleton } from '@/components/MoliyaSkeletons'
import { Building2, Plus, Trash2, Pencil, X, ChevronRight, ArrowLeft, Printer } from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDialog } from '@/context/DialogContext'
import { getEmployeesActionPin } from '@/lib/employeesSectionPin'
import { pickLocalizedName } from '@/utils/localizedName'
import {
    directDeptTotalsByCurrency,
    formatFinAmount,
    normalizeFinCurrency,
    rollupDepartmentTotals,
} from '@/utils/financeCurrency'

function deptPathLabels(stack, departments, language) {
    return stack.map((id) => {
        const d = departments.find((x) => x.id === id)
        return d ? pickLocalizedName(d, language) : ''
    })
}

function collectDepartmentSubtreeIds(rootId, allDepts) {
    const ids = new Set([rootId])
    let growing = true
    while (growing) {
        growing = false
        for (const d of allDepts) {
            if (d?.id && d.parent_id != null && ids.has(d.parent_id) && !ids.has(d.id)) {
                ids.add(d.id)
                growing = true
            }
        }
    }
    return [...ids]
}

export default function MoliyaBolimlarPage() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const { showAlert, showConfirm, showToast } = useDialog()
    const deletePin = getEmployeesActionPin()

    const [departments, setDepartments] = useState([])
    const [expenseEntries, setExpenseEntries] = useState([])
    const [deptTotals, setDeptTotals] = useState({ UZS: {}, USD: {} })
    const [loading, setLoading] = useState(true)
    const [stack, setStack] = useState([])

    const [deptFormOpen, setDeptFormOpen] = useState(false)
    const [deptForm, setDeptForm] = useState({ name: '', sort_order: '0' })
    const [deptEditId, setDeptEditId] = useState(null)

    const [expenseModalOpen, setExpenseModalOpen] = useState(false)
    const [expEditId, setExpEditId] = useState(null)
    const [expForm, setExpForm] = useState({
        amount: '',
        currency: 'UZS',
        expense_date: new Date().toISOString().split('T')[0],
        note: '',
    })

    const currentDeptId = stack.length ? stack[stack.length - 1] : null

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [dRes, eRes] = await Promise.all([
                api.get('/api/finance/departments'),
                api.get('/api/finance/material-movements')
            ])
            setDepartments(dRes.data || [])
            setExpenseEntries(eRes.data || [])
        } catch (error) {
            console.error('Dept load error:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        load()
    }, [load])

    useEffect(() => {
        const uzs = directDeptTotalsByCurrency(expenseEntries, 'UZS')
        const usd = directDeptTotalsByCurrency(expenseEntries, 'USD')
        setDeptTotals({
            UZS: rollupDepartmentTotals(departments, uzs),
            USD: rollupDepartmentTotals(departments, usd)
        })
    }, [departments, expenseEntries])

    const saveDepartment = async (e) => {
        e.preventDefault()
        try {
            const payload = {
                name_uz: deptForm.name,
                sort_order: parseInt(deptForm.sort_order) || 0,
                parent_id: currentDeptId
            }
            if (deptEditId) {
                await api.put(`/api/finance/departments/${deptEditId}`, payload)
                showToast('Bo\'lim yangilandi', { type: 'success' })
            } else {
                await api.post('/api/finance/departments', payload)
                showToast('Yangi bo\'lim yaratildi', { type: 'success' })
            }
            setDeptFormOpen(false)
            setDeptEditId(null)
            load()
        } catch (err) {
            showAlert('Xatolik: ' + err.message, { variant: 'error' })
        }
    }

    const deleteDepartment = async (id) => {
        const ok = await showConfirm(t('finances.deptDeleteConfirm'), { variant: 'error' })
        if (!ok) return
        const pin = await showAlert(t('finances.enterPinToDelete'), { prompt: true, type: 'password' })
        if (pin !== deletePin) return showAlert(t('finances.wrongPin'), { variant: 'error' })

        try {
            // Note: Our Express backend might need a DELETE endpoint. 
            // For now, let's assume we can set is_active=false via PUT if DELETE is not yet implemented.
            await api.put(`/api/finance/departments/${id}`, { is_active: false })
            showToast('O\'chirildi (nofaollashtirildi)', { type: 'success' })
            load()
        } catch (err) {
            showAlert(err.message, { variant: 'error' })
        }
    }

    const saveExpense = async (e) => {
        e.preventDefault()
        if (!currentDeptId) return
        try {
            const payload = {
                department_id: currentDeptId,
                total_cost: parseFloat(expForm.amount),
                currency: expForm.currency,
                movement_date: expForm.expense_date,
                note: expForm.note
            }
            // For simplicity, we implement creation. Edit requires its own API endpoint.
            await api.post('/api/finance/material-movements', payload)
            showToast('Harajat saqlandi', { type: 'success' })
            setExpenseModalOpen(false)
            load()
        } catch (err) {
            showAlert(err.message, { variant: 'error' })
        }
    }

    const children = departments.filter((d) => d.parent_id === currentDeptId && d.is_active)
    const currentDept = departments.find((d) => d.id === currentDeptId)
    const filteredExpenses = expenseEntries.filter((e) => e.department_id === currentDeptId)

    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* CYBER BACKGROUND WITH GRID */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 bg-[#070b14]" />
                <div className="absolute inset-0 opacity-[0.08]" 
                    style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
                />
                <div className="absolute top-[-15%] right-[-10%] w-[1000px] h-[1000px] bg-emerald-500/30 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[900px] h-[900px] bg-blue-500/30 blur-[150px] rounded-full animate-pulse duration-[7s]" />
            </div>

            <div className="w-full h-screen p-4 lg:p-6 relative z-10 flex flex-col items-center">
                {/* MAIN CONTAINER WITH SOLID NEON BORDER */}
                <div className="w-full max-w-[1550px] h-full bg-[#0f172a]/70 border-[1.5px] border-emerald-500/40 rounded-3xl p-4 lg:p-6 shadow-[0_0_60px_rgba(16,185,129,0.15)] backdrop-blur-2xl flex flex-col gap-6 overflow-hidden">
                    <div className="shrink-0 flex flex-col gap-4">
                        <Header title={t('finances.financeBranchDepts')} toggleSidebar={toggleSidebar} />
                        <MoliyaTopNav />
                    </div>

                    <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 overflow-hidden">
                        
                        {/* LEFT: DEPARTMENTS NAV (LIKE FOLDERS) */}
                        <div className="lg:w-1/3 flex flex-col gap-4 min-h-0">
                            <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-4 flex flex-col gap-4 h-full shadow-inner">
                                {/* BREADCRUMBS MODIFIED FOR VERTICAL OR INLINE */}
                                <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar shrink-0 border-b border-white/10">
                                    <button
                                        onClick={() => setStack([])}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                                            stack.length === 0 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'
                                        }`}
                                    >
                                        <Building2 size={12} />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{t('finances.rootDepts')}</span>
                                    </button>
                                    {stack.map((id, idx) => (
                                        <div key={id} className="flex items-center gap-2 group shrink-0">
                                            <ChevronRight size={10} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
                                            <button
                                                onClick={() => setStack(stack.slice(0, idx + 1))}
                                                className={`px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap ${
                                                    idx === stack.length - 1 ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-white/5 border-transparent text-white/40 hover:text-white hover:bg-white/10'
                                                }`}
                                            >
                                                <span className="text-[9px] font-black uppercase tracking-widest">{deptPathLabels([id], departments, language)[0]}</span>
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                                    {children.map((d) => (
                                        <div
                                            key={d.id}
                                            className="group flex flex-col gap-3 p-3 bg-white/[0.02] border border-white/5 hover:border-emerald-500/30 rounded-xl transition-all cursor-pointer relative overflow-hidden"
                                            onClick={() => setStack([...stack, d.id])}
                                        >
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                                                        <Building2 size={16} />
                                                    </div>
                                                    <h3 className="text-[11px] font-black text-white uppercase tracking-wider leading-tight">{pickLocalizedName(d, language)}</h3>
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                    <button onClick={(e) => { e.stopPropagation(); setDeptEditId(d.id); setDeptForm({ name: d.name_uz || '', sort_order: String(d.sort_order || 0) }); setDeptFormOpen(true); }} className="p-1.5 bg-white/5 hover:bg-emerald-500/20 text-white/40 hover:text-emerald-400 rounded-lg transition-all"><Pencil size={12} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteDepartment(d.id); }} className="p-1.5 bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-400 rounded-lg transition-all"><Trash2 size={12} /></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mt-1 border-t border-white/5 pt-2">
                                                <div><p className="text-[8px] uppercase tracking-widest text-white/30 font-black mb-0.5">UZS</p><p className="text-sm font-black tracking-tight text-white">{formatFinAmount(deptTotals.UZS[d.id] || 0, 'UZS')}</p></div>
                                                {deptTotals.USD[d.id] > 0.01 && <div><p className="text-[8px] uppercase tracking-widest text-white/30 font-black mb-0.5">USD</p><p className="text-xs font-black tracking-tight text-emerald-400">{formatFinAmount(deptTotals.USD[d.id], 'USD')}</p></div>}
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        onClick={() => { setDeptEditId(null); setDeptForm({ name: '', sort_order: '0' }); setDeptFormOpen(true); }}
                                        className="w-full border border-dashed border-white/10 rounded-xl p-4 flex items-center justify-center gap-2 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                                    >
                                        <Plus size={16} className="text-white/20 group-hover:text-emerald-500 transition-colors" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 group-hover:text-emerald-400 transition-colors">{t('finances.addDept')}</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: EXPENSES DETAILS */}
                        <div className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/10 rounded-2xl p-5 overflow-hidden shadow-inner">
                            {currentDeptId ? (
                                <div className="flex flex-col h-full overflow-hidden shrink-0">
                                    <div className="flex items-center justify-between mb-6 shrink-0 border-b border-white/5 pb-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg"><Building2 size={24} className="text-black" /></div>
                                            <div>
                                                <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none">{pickLocalizedName(currentDept, language)}</h2>
                                                <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-[0.3em] mt-1.5">{t('finances.deptExpenses')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right border-r border-white/10 pr-4 hidden sm:block">
                                                <p className="text-[9px] text-white/30 uppercase tracking-widest font-black mb-1">Jami Xarajat</p>
                                                <p className="text-lg font-black text-emerald-400 tabular-nums leading-none tracking-tighter">{formatFinAmount(deptTotals.UZS[currentDeptId] || 0, 'UZS')} <span className="text-[10px] opacity-40">UZS</span></p>
                                            </div>
                                            <button
                                                onClick={() => { setExpEditId(null); setExpForm({ amount: '', currency: 'UZS', expense_date: new Date().toISOString().split('T')[0], note: '' }); setExpenseModalOpen(true); }}
                                                className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 transition-all flex items-center gap-2"
                                            >
                                                <Plus size={14} /> Xarajat
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex-1 overflow-y-auto no-scrollbar">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-white/5 text-[9px] font-black text-emerald-500/40 uppercase tracking-[0.2em] bg-white/[0.01]">
                                                    <th className="px-4 py-3 rounded-tl-xl">{t('finances.date')}</th>
                                                    <th className="px-4 py-3">{t('finances.costNote')}</th>
                                                    <th className="px-4 py-3 text-right rounded-tr-xl">{t('finances.amountWithCurrency')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {filteredExpenses.length === 0 ? (
                                                    <tr><td colSpan={3} className="px-4 py-16 text-center text-white/20 text-[10px] font-black uppercase tracking-widest">Ma'lumot topilmadi</td></tr>
                                                ) : (
                                                    filteredExpenses.map((e) => (
                                                        <tr key={e.id} className="group hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                            <td className="px-4 py-4 font-mono text-white/40 group-hover:text-white/70 transition-colors text-[10px] font-black uppercase tabular-nums">{e.movement_date}</td>
                                                            <td className="px-4 py-4 text-white/60 text-xs font-bold w-1/2 whitespace-normal group-hover:text-white transition-colors">
                                                                <div className="line-clamp-2">{e.note || '—'}</div>
                                                            </td>
                                                            <td className="px-4 py-4 text-right font-mono text-white group-hover:text-emerald-400 font-black tracking-tight tabular-nums transition-colors">
                                                                {formatFinAmount(e.total_cost, e.currency)}
                                                                <span className="text-[7px] text-white/30 ml-1 uppercase">{e.currency}</span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-center flex-col text-center opacity-20">
                                    <Building2 size={64} className="mb-6 animate-pulse" />
                                    <h2 className="text-xl font-black uppercase tracking-[0.4em]">Bo'lim Tanlanmagan</h2>
                                    <p className="mt-2 text-xs font-bold tracking-[0.1em]">Tafsilotlar uchun ro'yxatdan tanlang</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- MODALS IN DEEP AZURE STYLE --- */}
            {deptFormOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border-2 border-emerald-500/40 w-full max-w-md rounded-3xl p-8 shadow-[0_0_80px_rgba(16,185,129,0.2)] relative overflow-hidden flex flex-col">
                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none" />
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{deptEditId ? 'Bo\'limni Tahrirlash' : 'Yangi Bo\'lim'}</h2>
                            <button onClick={() => setDeptFormOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-white/40"><X size={20} /></button>
                        </div>
                        <form onSubmit={saveDepartment} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">Bo'lim Nomi</label>
                                <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-emerald-500 text-white font-bold transition-all" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">Tartib (Ixtiyoriy)</label>
                                <input type="number" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-emerald-500 text-white font-bold transition-all" value={deptForm.sort_order} onChange={(e) => setDeptForm({ ...deptForm, sort_order: e.target.value })} />
                            </div>
                            <button type="submit" className="w-full py-4 mt-4 bg-emerald-500 text-black rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] transition-all">Saqlash</button>
                        </form>
                    </div>
                </div>
            )}

            {expenseModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#0f172a] border-2 border-emerald-500/40 w-full max-w-lg rounded-3xl p-8 shadow-[0_0_80px_rgba(16,185,129,0.2)] relative overflow-hidden flex flex-col">
                        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full pointer-events-none" />
                        <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('finances.addExpense')}</h2>
                            <button onClick={() => setExpenseModalOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-white/40"><X size={20} /></button>
                        </div>
                        <form onSubmit={saveExpense} className="space-y-6">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">{t('finances.amount')}</label>
                                    <input required type="number" step="any" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-emerald-500 text-emerald-400 font-black text-2xl transition-all tabular-nums" value={expForm.amount} onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">Valyuta</label>
                                    <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-emerald-500 text-white font-black uppercase text-xs cursor-pointer appearance-none" value={expForm.currency} onChange={(e) => setExpForm({ ...expForm, currency: e.target.value })}>
                                        <option value="UZS" className="bg-[#0f172a]">UZS</option>
                                        <option value="USD" className="bg-[#0f172a]">USD</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">{t('finances.date')}</label>
                                <input required type="date" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-emerald-500 text-white font-bold transition-all" value={expForm.expense_date} onChange={(e) => setExpForm({ ...expForm, expense_date: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 ml-1">{t('finances.costNote')}</label>
                                <textarea rows="3" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-emerald-500 text-white/80 text-xs font-medium resize-none transition-all" value={expForm.note} onChange={(e) => setExpForm({ ...expForm, note: e.target.value })} placeholder="Izoh..." />
                            </div>
                            <button type="submit" className="w-full py-4 mt-4 bg-emerald-500 text-black rounded-xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_30px_rgba(16,185,129,0.2)] hover:scale-[1.02] transition-all">Tasdiqlash</button>
                        </form>
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
