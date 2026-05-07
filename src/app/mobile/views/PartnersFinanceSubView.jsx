'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
    Users, 
    ChevronRight, 
    ArrowUpCircle, 
    ArrowDownCircle, 
    Plus, 
    X, 
    Loader2,
    DollarSign,
    Calendar,
    FileText,
    History,
    ArrowLeft
} from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { 
    normalizeFinCurrency, 
    formatFinAmount 
} from '@/utils/financeCurrency'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function PartnersFinanceSubView() {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [partners, setPartners] = useState([])
    const [entries, setEntries] = useState([])
    const [selectedPartner, setSelectedPartner] = useState(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [formType, setFormType] = useState('payment') // 'payment' (to partner), 'payment_in' (from partner)
    
    const [form, setForm] = useState({
        amount: '',
        currency: 'UZS',
        date: new Date().toISOString().split('T')[0],
        description: ''
    })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('nuurhome_token') || localStorage.getItem('crm_token')
            const headers = { 'Authorization': `Bearer ${token}` }

            const [pRes, eRes] = await Promise.all([
                fetch(`${API_BASE_URL}/finance/partners`, { headers }).then(r => r.json()),
                fetch(`${API_BASE_URL}/finance/partner-entries`, { headers }).then(r => r.json())
            ])

            setPartners(Array.isArray(pRes) ? pRes : (pRes.data || []))
            setEntries(Array.isArray(eRes) ? eRes : (eRes.data || []))
        } catch (error) {
            console.error('Error fetching partner data:', error)
        } finally {
            setLoading(false)
        }
    }

    const partnerBalances = useMemo(() => {
        const balances = {}
        partners.forEach(p => {
            const partnerEntries = entries.filter(e => e.partner_id === p.id)
            let uzs = 0
            let usd = 0
            
            partnerEntries.forEach(e => {
                const amt = Number(e.amount_uzs) || 0
                const cur = normalizeFinCurrency(e.currency)
                
                if (e.entry_type === 'supply' || e.entry_type === 'payment_in') {
                    if (cur === 'USD') usd += amt
                    else uzs += amt
                } else {
                    if (cur === 'USD') usd -= amt
                    else uzs -= amt
                }
            })
            balances[p.id] = { UZS: uzs, USD: usd }
        })
        return balances
    }, [partners, entries])

    async function handleSaveEntry(e) {
        e.preventDefault()
        if (!selectedPartner) return
        
        const amount = Number(form.amount)
        if (!amount || amount <= 0) return

        try {
            const token = localStorage.getItem('nuurhome_token') || localStorage.getItem('crm_token')
            const response = await fetch(`${API_BASE_URL}/finance/partner-entries`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    partner_id: selectedPartner.id,
                    entry_type: formType,
                    amount_uzs: amount,
                    currency: form.currency,
                    entry_date: form.date,
                    description: form.description.trim() || null
                })
            })

            if (!response.ok) throw new Error('Saqlashda xatolik')

            setShowAddForm(false)
            setForm({
                amount: '',
                currency: 'UZS',
                date: new Date().toISOString().split('T')[0],
                description: ''
            })
            fetchData()
        } catch (error) {
            console.error('Error saving entry:', error)
            alert('Saqlashda xatolik yuz berdi')
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <Loader2 className="w-10 h-10 text-[#8B5E3C] animate-spin" />
                <p className="text-[10px] font-black text-[#2D241E]/20 uppercase tracking-widest">Yuklanmoqda...</p>
            </div>
        )
    }

    if (selectedPartner) {
        const balance = partnerBalances[selectedPartner.id] || { UZS: 0, USD: 0 }
        const partnerEntries = entries.filter(e => e.partner_id === selectedPartner.id)

        return (
            <div className="p-6 space-y-8 animate-in fade-in duration-500 bg-[#FDFBF7] min-h-screen">
                {/* Partner Detail Card */}
                <div className="p-8 rounded-[2.5rem] bg-white border border-[#E8E2D9] shadow-sm space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#8B5E3C]/5 blur-3xl rounded-full" />
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 rounded-3xl bg-[#F7F5F0] text-[#8B5E3C] flex items-center justify-center border border-[#E8E2D9]">
                            <Users size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black text-[#2D241E] uppercase italic truncate">{selectedPartner.name_uz || selectedPartner.name}</h3>
                            <p className="text-[10px] font-bold text-[#2D241E]/30 uppercase tracking-widest mt-1">{selectedPartner.phone || 'Telefon raqami yo\'q'}</p>
                        </div>
                        <button 
                            onClick={() => setSelectedPartner(null)}
                            className="w-10 h-10 flex items-center justify-center bg-[#F7F5F0] rounded-xl text-[#2D241E]/20"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-[2rem] bg-[#F7F5F0] border border-[#E8E2D9]">
                            <p className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest mb-2">UZS (So'm)</p>
                            <h4 className="text-lg font-black text-[#2D241E] tabular-nums">{Math.abs(balance.UZS).toLocaleString()}</h4>
                            <p className={`text-[8px] font-black uppercase mt-1 ${balance.UZS > 0 ? 'text-[#D44D44]' : 'text-[#44A678]'}`}>
                                {balance.UZS > 0 ? 'Qarzdormiz' : 'Qarzdor'}
                            </p>
                        </div>
                        <div className="p-5 rounded-[2rem] bg-[#F7F5F0] border border-[#E8E2D9]">
                            <p className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest mb-2">USD ($)</p>
                            <h4 className="text-lg font-black text-[#2D241E] tabular-nums">${Math.abs(balance.USD).toLocaleString()}</h4>
                            <p className={`text-[8px] font-black uppercase mt-1 ${balance.USD > 0 ? 'text-[#D44D44]' : 'text-[#44A678]'}`}>
                                {balance.USD > 0 ? 'Qarzdormiz' : 'Qarzdor'}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button 
                            onClick={() => { setFormType('payment'); setShowAddForm(true); }}
                            className="flex-1 py-5 rounded-2xl bg-[#D44D44] text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            TO'LOV
                        </button>
                        <button 
                            onClick={() => { setFormType('payment_in'); setShowAddForm(true); }}
                            className="flex-1 py-5 rounded-2xl bg-[#44A678] text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            TUSHUM
                        </button>
                    </div>
                </div>

                {/* Entries History */}
                <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-[0.2em]">Amallar tarixi</h4>
                        <History size={14} className="text-[#2D241E]/10" />
                    </div>
                    <div className="space-y-3">
                        {partnerEntries.map(e => (
                            <div key={e.id} className="p-5 rounded-[2rem] bg-white border border-[#E8E2D9] flex items-center gap-5 shadow-sm">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                    (e.entry_type === 'supply' || e.entry_type === 'payment_in') 
                                        ? 'bg-[#44A678]/10 text-[#44A678]' 
                                        : 'bg-[#D44D44]/10 text-[#D44D44]'
                                }`}>
                                    {(e.entry_type === 'supply' || e.entry_type === 'payment_in') ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[11px] font-black text-[#2D241E] truncate uppercase italic">
                                        {e.entry_type === 'supply' ? 'Xomashyo' : 
                                         e.entry_type === 'payment_in' ? 'Tushum' :
                                         e.entry_type === 'sale_out' ? 'Sotuv' : 'To\'lov'}
                                    </p>
                                    <p className="text-[9px] font-bold text-[#2D241E]/20 uppercase mt-0.5 tracking-widest">{e.entry_date}</p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-[13px] font-black tabular-nums ${
                                        (e.entry_type === 'supply' || e.entry_type === 'payment_in') ? 'text-[#44A678]' : 'text-[#D44D44]'
                                    }`}>
                                        {(e.entry_type === 'supply' || e.entry_type === 'payment_in') ? '+' : '-'}
                                        {normalizeFinCurrency(e.currency) === 'USD' ? '$' : ''}
                                        {Number(e.amount_uzs).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Form Modal */}
                {showAddForm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                        <div className="absolute inset-0 bg-[#2D241E]/40 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
                        <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                            <h3 className="text-lg font-black text-[#2D241E] uppercase tracking-tight mb-8 text-center">
                                {formType === 'payment' ? "To'lov Qilish" : "Tushum Olish"}
                            </h3>

                            <form onSubmit={handleSaveEntry} className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest ml-1">Summa</label>
                                    <input 
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({...form, amount: e.target.value})}
                                        className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-5 px-6 text-[#2D241E] font-black text-center outline-none text-xl"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest ml-1">Valyuta</label>
                                        <select 
                                            value={form.currency}
                                            onChange={e => setForm({...form, currency: e.target.value})}
                                            className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-3 text-[#2D241E] font-bold outline-none h-[58px] text-xs"
                                        >
                                            <option value="UZS">UZS</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest ml-1">Sana</label>
                                        <input 
                                            type="date"
                                            value={form.date}
                                            onChange={e => setForm({...form, date: e.target.value})}
                                            className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-3 text-[#2D241E] font-bold outline-none h-[58px] text-[10px]"
                                            required
                                        />
                                    </div>
                                </div>

                                <textarea 
                                    value={form.description}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                    className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-6 text-sm text-[#2D241E] font-medium outline-none h-24 resize-none"
                                    placeholder="Izoh..."
                                />

                                <button 
                                    type="submit"
                                    className={`w-full py-5 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all ${
                                        formType === 'payment' ? 'bg-[#D44D44]' : 'bg-[#44A678]'
                                    }`}
                                >
                                    SAQLASH
                                </button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black text-[#2D241E]/20 uppercase tracking-[0.3em]">Hamkorlar Ro'yxati</h2>
                <Users size={14} className="text-[#2D241E]/10" />
            </div>
            <div className="grid gap-4 pb-20">
                {partners.map(p => {
                    const balance = partnerBalances[p.id] || { UZS: 0, USD: 0 }
                    const ourDebt = balance.UZS > 0 || balance.USD > 0
                    const isNeutral = Math.abs(balance.UZS) < 1 && Math.abs(balance.USD) < 0.01

                    return (
                        <div 
                            key={p.id}
                            onClick={() => setSelectedPartner(p)}
                            className="bg-white border border-[#E8E2D9] rounded-[2rem] p-6 flex items-center gap-5 shadow-sm active:scale-[0.98] transition-all group"
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                                isNeutral ? 'bg-[#F7F5F0] border-[#E8E2D9] text-[#2D241E]/10' :
                                ourDebt ? 'bg-[#D44D44]/5 border-[#D44D44]/10 text-[#D44D44]' : 'bg-[#44A678]/5 border-[#44A678]/10 text-[#44A678]'
                            }`}>
                                <Users size={26} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-[13px] font-black text-[#2D241E] uppercase italic truncate">{p.name_uz || p.name}</h3>
                                <div className="flex items-center gap-3 mt-1.5 tabular-nums">
                                    <span className={`text-[10px] font-black ${balance.UZS > 0 ? 'text-[#D44D44]/60' : 'text-[#44A678]/60'}`}>
                                        {Math.abs(balance.UZS).toLocaleString()} UZS
                                    </span>
                                    <div className="w-1 h-1 rounded-full bg-[#E8E2D9]" />
                                    <span className={`text-[10px] font-black ${balance.USD > 0 ? 'text-[#D44D44]/60' : 'text-[#44A678]/60'}`}>
                                        ${Math.abs(balance.USD).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <ChevronRight size={20} className="text-[#E8E2D9] group-hover:text-[#8B5E3C] transition-colors" />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
