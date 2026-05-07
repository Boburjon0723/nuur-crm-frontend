'use client'

import { useState, useEffect, useMemo } from 'react'
import { Users, CheckCircle2, AlertCircle, Clock, ChevronRight, Loader2, X, Wallet, Calendar, ArrowLeft, Phone, Tag } from 'lucide-react'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

function employeeMapKey(id) {
    if (id == null || id === '') return ''
    return String(id).trim().toLowerCase()
}

function calendarYmd(value) {
    if (value == null || value === '') return ''
    const s = String(value).trim()
    const head = s.length >= 10 ? s.slice(0, 10) : ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head
    const d = new Date(s)
    if (Number.isNaN(d.getTime())) return ''
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

function formatYmdUz(ymd) {
    if (!ymd || typeof ymd !== 'string') return ''
    const [y, m, d] = ymd.split('-')
    if (!y || !m || !d) return ymd
    return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`
}

export default function EmployeesView() {
    const [loading, setLoading] = useState(true)
    const [selectedEmployee, setSelectedEmployee] = useState(null)
    const [refreshKey, setRefreshKey] = useState(0)
    const [actionType, setActionType] = useState(null)
    const [actionAmount, setActionAmount] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [data, setData] = useState({
        employees: [],
        totalPayroll: 0
    })

    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })

    const displayMonthLabel = useMemo(() => {
        if (!selectedDate) return ''
        const [y, m] = selectedDate.split('-')
        return new Date(y, m - 1, 1).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' })
    }, [selectedDate])

    useEffect(() => {
        async function fetchEmployeeData() {
            try {
                setLoading(true)
                const token = localStorage.getItem('nuurhome_token')
                const headers = { 'Authorization': `Bearer ${token}` }

                const [yStr, mStr] = selectedDate.split('-')
                const startPrefix = `${yStr}-${mStr}`

                const empsRes = await fetch(`${API_BASE_URL}/employees`, { headers }).then(r => r.ok ? r.json() : []);
                const leavesRes = await fetch(`${API_BASE_URL}/employees/leaves`, { headers }).then(r => r.ok ? r.json() : []);

                const employees = Array.isArray(empsRes) ? empsRes : []
                const leaveRows = Array.isArray(leavesRes) ? leavesRes : []

                if (employees.length === 0) {
                    console.warn('No employees found or API error');
                }

                const approvedLeaveDatesByEmployee = {}
                for (const r of leaveRows) {
                    const k = employeeMapKey(r.employee_id)
                    if (!k) continue
                    const iso = r.resolved_at || r.createdAt
                    const ymd = calendarYmd(iso)
                    if (!ymd) continue
                    if (!approvedLeaveDatesByEmployee[k]) approvedLeaveDatesByEmployee[k] = new Set()
                    approvedLeaveDatesByEmployee[k].add(ymd)
                }

                const processed = employees.map(emp => {
                    const empKey = employeeMapKey(emp.id)
                    
                    // Filter advances and payments by the selected month
                    const advSum = (emp.advances || [])
                        .filter(a => (a.advance_date || '').startsWith(startPrefix))
                        .reduce((sum, a) => sum + (Number(a.amount) || 0), 0)
                    
                    const paySum = (emp.salaries || [])
                        .filter(p => (p.payment_date || '').startsWith(startPrefix))
                        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
                    
                    const totalPaid = advSum + paySum
                    const contract = Number(emp.monthly_salary) || 0
                    
                    let status = 'Kutilmoqda', type = 'error'
                    if (totalPaid >= contract && contract > 0) { status = 'To\'landi'; type = 'success' }
                    else if (totalPaid > 0) { status = 'Qisman'; type = 'warning' }

                    const restDaysCount = Math.max(0, Number(emp.rest_days) || 0)
                    const approvedLeaveDates = [...(approvedLeaveDatesByEmployee[empKey] || [])].sort((a, b) => b.localeCompare(a)).map(ymd => formatYmdUz(ymd))
                    const approvedVisibleDates = restDaysCount > 0 ? approvedLeaveDates.slice(0, restDaysCount) : []

                    return { 
                        ...emp,
                        restDaysCount, 
                        approvedVisibleDates, 
                        status, 
                        type, 
                        totalPaid, 
                        contract, 
                        advSum, 
                        paySum 
                    }
                })

                setData({ 
                    employees: processed, 
                    totalPayroll: processed.reduce((sum, e) => sum + e.totalPaid, 0) 
                })
            } catch (error) { 
                console.error('Error fetching employee data:', error) 
            } finally { 
                setLoading(false) 
            }
        }
        fetchEmployeeData()
    }, [selectedDate, refreshKey])

    const handleActionSubmit = async () => {
        if (!actionAmount || isNaN(actionAmount) || Number(actionAmount) <= 0) return
        setSubmitting(true)
        try {
            const token = localStorage.getItem('nuurhome_token')
            const amount = Number(actionAmount)
            const dateStr = new Date().toISOString().split('T')[0]
            
            const endpoint = actionType === 'advance' ? 'advance' : 'salary'
            const response = await fetch(`${API_BASE_URL}/employees/${endpoint}`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    employeeId: selectedEmployee.id, 
                    amount, 
                    date: dateStr, 
                    note: 'Mobil ilova' 
                })
            })

            if (!response.ok) throw new Error('To\'lovni amalga oshirib bo\'lmadi')
            
            setActionType(null)
            setActionAmount('')
            setSelectedEmployee(null)
            setRefreshKey(prev => prev + 1)
        } catch(err) { 
            alert('Xatolik: ' + err.message) 
        } finally { 
            setSubmitting(false) 
        }
    }

    const getStatusStyle = (type) => {
        switch (type) {
            case 'success': return { icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' }
            case 'warning': return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' }
            case 'error': return { icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
            default: return { icon: Clock, color: 'text-[#2D241E]/30', bg: 'bg-[#F7F5F0]' }
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

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#2D241E] tracking-tight uppercase italic">Xodimlar</h2>
                    <p className="text-[10px] font-bold text-[#8B5E3C]/60 uppercase tracking-[0.2em] mt-1">Oylik & Avanslar</p>
                </div>
                <div className="relative flex items-center justify-center bg-white border border-[#E8E2D9] rounded-2xl p-3 shadow-sm active:scale-95 transition-all cursor-pointer">
                    <Calendar size={20} className="text-[#2D241E]/20" />
                    <input 
                        type="month" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>
            </div>

            {/* Quick Summary Card */}
            <div className="bg-[#2D241E] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#8B5E3C]/20 blur-[80px] rounded-full" />
                <div className="relative z-10 space-y-2">
                    <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">Jami to'lovlar ({displayMonthLabel})</p>
                    <h3 className="text-3xl font-black italic tracking-tighter">{(data.totalPayroll || 0).toLocaleString()} <span className="text-sm font-medium uppercase ml-1 opacity-40">UZS</span></h3>
                </div>
            </div>

            {/* Employee List */}
            <div className="space-y-4">
                {data.employees.length === 0 ? (
                    <div className="py-20 text-center opacity-10">
                        <Users size={64} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Xodimlar topilmadi</p>
                    </div>
                ) : data.employees.map((emp, i) => {
                    const style = getStatusStyle(emp.type)
                    return (
                        <div 
                            key={i} 
                            onClick={() => setSelectedEmployee(emp)}
                            className="bg-white border border-[#E8E2D9] rounded-[2.5rem] p-6 flex items-center gap-5 shadow-sm active:scale-[0.98] transition-all group cursor-pointer"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-[#F7F5F0] flex items-center justify-center text-[#8B5E3C] font-black text-lg border border-[#E8E2D9]">
                                {emp.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[11px] font-black text-[#2D241E] uppercase truncate tracking-tight">{emp.name}</h4>
                                <p className="text-[9px] font-bold text-[#2D241E]/30 uppercase tracking-widest mt-1">{emp.position || 'Lavozim yo\'q'}</p>
                            </div>
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${style.bg} ${style.color}`}>
                                <style.icon size={14} />
                                <span className="text-[9px] font-black uppercase tracking-widest">{emp.status}</span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Employee Detail Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-[1000] flex flex-col justify-end items-center">
                    <div className="absolute inset-0 bg-[#2D241E]/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setSelectedEmployee(null)} />
                    <div className="relative w-full max-w-lg bg-[#FDFBF7] rounded-t-[3.5rem] p-10 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-500 overflow-y-auto">
                        <div className="w-12 h-1.5 bg-[#E8E2D9] rounded-full mx-auto mb-10 shrink-0" />
                        
                        <div className="flex items-center gap-6 mb-10">
                            <div className="w-20 h-20 rounded-[2rem] bg-white border border-[#E8E2D9] flex items-center justify-center text-[#8B5E3C] font-black text-3xl shadow-sm">
                                {selectedEmployee.name[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-2xl font-black text-[#2D241E] uppercase italic tracking-tight truncate">{selectedEmployee.name}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <Tag size={12} className="text-[#8B5E3C]" />
                                    <p className="text-[10px] font-black text-[#8B5E3C] uppercase tracking-widest">{selectedEmployee.position || 'Xodim'}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedEmployee(null)} className="w-12 h-12 bg-white border border-[#E8E2D9] rounded-2xl flex items-center justify-center text-[#2D241E]/10 active:scale-90 transition-all shadow-sm">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-5 mb-10">
                            <div className="p-6 rounded-[2.5rem] bg-white border border-[#E8E2D9] shadow-sm">
                                <p className="text-[9px] font-black text-[#2D241E]/20 uppercase tracking-widest mb-2">Belgilangan</p>
                                <p className="text-sm font-black text-[#2D241E] tabular-nums">{selectedEmployee.contract.toLocaleString()} <span className="text-[9px] opacity-30 italic">UZS</span></p>
                            </div>
                            <div className="p-6 rounded-[2.5rem] bg-emerald-50 border border-emerald-100 shadow-sm">
                                <p className="text-[9px] font-black text-emerald-600/50 uppercase tracking-widest mb-2">To'landi</p>
                                <p className="text-sm font-black text-emerald-600 tabular-nums">{selectedEmployee.totalPaid.toLocaleString()} <span className="text-[9px] opacity-30 italic">UZS</span></p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-10 bg-white border border-[#E8E2D9] rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-[#2D241E]/40 italic">Oylik To'lovi Progressi</span>
                                <span className="text-[10px] font-black text-[#2D241E]">
                                    {Math.min(100, Math.round((selectedEmployee.totalPaid / selectedEmployee.contract) * 100))}%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-[#F7F5F0] rounded-full overflow-hidden p-0.5 border border-[#E8E2D9]/50">
                                <div 
                                    className="h-full bg-[#2D241E] rounded-full transition-all duration-1000 shadow-lg"
                                    style={{ width: `${Math.min(100, (selectedEmployee.totalPaid / selectedEmployee.contract) * 100)}%` }}
                                />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <p className="text-[9px] font-black text-[#2D241E]/20 uppercase">Qoldiq</p>
                                <p className="text-lg font-black text-[#2D241E] tabular-nums">{Math.max(0, selectedEmployee.contract - selectedEmployee.totalPaid).toLocaleString()} <span className="text-[10px] font-medium opacity-20">UZS</span></p>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-[#E8E2D9]">
                            <button 
                                onClick={() => setActionType('advance')}
                                className="flex-1 py-6 bg-white border border-[#E8E2D9] rounded-3xl text-[10px] font-black text-[#2D241E] uppercase tracking-widest shadow-sm active:scale-95 transition-all"
                            >
                                AVANS
                            </button>
                            <button 
                                onClick={() => { setActionType('salary'); setActionAmount(String(Math.max(0, selectedEmployee.contract - selectedEmployee.totalPaid))) }}
                                className="flex-1 py-6 bg-[#2D241E] rounded-3xl text-[10px] font-black text-white uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                            >
                                OYLIK YOPISH
                            </button>
                        </div>

                        {actionType && (
                            <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6">
                                <div className="absolute inset-0 bg-[#2D241E]/95 backdrop-blur-md" onClick={() => setActionType(null)} />
                                <div className="relative w-full max-w-sm bg-[#FDFBF7] rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 border border-[#E8E2D9]/50">
                                    <h3 className="text-lg font-black text-[#2D241E] uppercase tracking-tight mb-8 italic text-center">
                                        {actionType === 'advance' ? "Avans To'lovi" : "Oylik To'lovi"}
                                    </h3>
                                    <div className="relative mb-8">
                                        <input 
                                            type="number"
                                            value={actionAmount}
                                            onChange={e => setActionAmount(e.target.value)}
                                            className="w-full bg-white border border-[#E8E2D9] rounded-3xl py-6 px-6 text-[#2D241E] font-black text-center outline-none text-2xl shadow-inner"
                                            placeholder="0"
                                            autoFocus
                                        />
                                        <p className="absolute -bottom-6 left-0 right-0 text-center text-[9px] font-black text-[#2D241E]/20 uppercase tracking-widest">Summani kiriting (UZS)</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => setActionType(null)} className="flex-1 py-5 bg-white border border-[#E8E2D9] text-[#2D241E]/30 font-black rounded-2xl text-[10px] uppercase tracking-widest active:scale-95 transition-all">Bekor</button>
                                        <button 
                                            onClick={handleActionSubmit}
                                            disabled={submitting}
                                            className="flex-2 py-5 bg-[#2D241E] text-white font-black rounded-2xl text-[10px] uppercase px-10 shadow-2xl tracking-widest active:scale-95 transition-all"
                                        >
                                            {submitting ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'TASDIQLASH'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
