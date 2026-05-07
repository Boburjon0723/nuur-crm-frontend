'use client'

import { useState, useEffect } from 'react'
import { Building2, ChevronRight, ArrowRightLeft, Clock, Loader2, ArrowLeft, Layers, History } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function DepartmentsSubView() {
    const { t } = useLanguage()
    const [loading, setLoading] = useState(true)
    const [departments, setDepartments] = useState([])
    const [movements, setMovements] = useState([])
    const [selectedDept, setSelectedDept] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        try {
            setLoading(true)
            const token = localStorage.getItem('nuurhome_token') || localStorage.getItem('crm_token')
            const headers = { 'Authorization': `Bearer ${token}` }

            const [dRes, mRes] = await Promise.all([
                fetch(`${API_BASE_URL}/finance/departments`, { headers }).then(r => r.json()),
                fetch(`${API_BASE_URL}/finance/material-movements`, { headers }).then(r => r.json())
            ])

            setDepartments(Array.isArray(dRes) ? dRes : (dRes.data || []))
            setMovements(Array.isArray(mRes) ? mRes : (mRes.data || []))
        } catch (error) {
            console.error('Error fetching department data:', error)
        } finally {
            setLoading(false)
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

    if (selectedDept) {
        const deptMovements = movements.filter(m => m.from_department_id === selectedDept.id || m.to_department_id === selectedDept.id)

        return (
            <div className="p-6 space-y-8 animate-in fade-in duration-500 bg-[#FDFBF7] min-h-screen">
                {/* Dept Header */}
                <div className="p-8 rounded-[2.5rem] bg-[#2D241E] text-white space-y-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#8B5E3C]/20 blur-[60px] rounded-full" />
                    
                    <div className="flex items-center gap-5 relative z-10">
                        <div className="w-16 h-16 rounded-3xl bg-white/10 flex items-center justify-center border border-white/10 backdrop-blur-md">
                            <Building2 size={32} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-black uppercase italic truncate">{selectedDept.name_uz || selectedDept.name}</h3>
                            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mt-1">Material harakatlari</p>
                        </div>
                        <button 
                            onClick={() => setSelectedDept(null)}
                            className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-white/40"
                        >
                            <ArrowLeft size={24} />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-5 rounded-[2rem] bg-white/5 border border-white/5">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Amallar</p>
                            <h4 className="text-xl font-black italic">{deptMovements.length}</h4>
                        </div>
                        <div className="p-5 rounded-[2rem] bg-white/5 border border-white/5">
                            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Status</p>
                            <h4 className="text-xl font-black italic text-emerald-400">Faol</h4>
                        </div>
                    </div>
                </div>

                {/* Movements List */}
                <div className="space-y-4 pb-20">
                    <div className="flex items-center justify-between px-2">
                        <h4 className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-[0.2em]">Harakatlar tarixi</h4>
                        <History size={14} className="text-[#2D241E]/10" />
                    </div>
                    <div className="space-y-3">
                        {deptMovements.length === 0 ? (
                            <p className="text-center py-12 text-[#2D241E]/20 text-[10px] font-black uppercase tracking-widest">Harakatlar yo'q</p>
                        ) : deptMovements.map(m => (
                            <div key={m.id} className="p-5 rounded-[2rem] bg-white border border-[#E8E2D9] flex flex-col gap-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        m.from_department_id === selectedDept.id ? 'bg-[#D44D44]/10 text-[#D44D44]' : 'bg-[#44A678]/10 text-[#44A678]'
                                    }`}>
                                        <ArrowRightLeft size={20} />
                                    </div>
                                    <span className="text-[9px] font-black text-[#2D241E]/30 tabular-nums">{new Date(m.movement_date).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <p className="text-[11px] font-black text-[#2D241E] uppercase italic mb-1">{m.material_name}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[10px] font-bold text-[#8B5E3C] uppercase tracking-widest">{m.quantity} {m.unit || 'ta'}</p>
                                        <span className="text-[#E8E2D9]">|</span>
                                        <p className="text-[9px] font-black text-[#2D241E]/40 uppercase">
                                            {m.from_department_id === selectedDept.id ? 'CHIQIM' : 'KIRIM'}
                                        </p>
                                    </div>
                                </div>
                                <p className="text-[9px] text-[#2D241E]/40 italic border-t border-[#F7F5F0] pt-3">{m.note || 'Izohsiz'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-[10px] font-black text-[#2D241E]/20 uppercase tracking-[0.3em]">Bo'limlar Ro'yxati</h2>
                <Layers size={14} className="text-[#2D241E]/10" />
            </div>
            <div className="grid gap-4 pb-20">
                {departments.map(d => (
                    <div 
                        key={d.id}
                        onClick={() => setSelectedDept(d)}
                        className="bg-white border border-[#E8E2D9] rounded-[2rem] p-6 flex items-center gap-5 shadow-sm active:scale-[0.98] transition-all group"
                    >
                        <div className="w-14 h-14 rounded-2xl bg-[#F7F5F0] text-[#8B5E3C] flex items-center justify-center border border-[#E8E2D9]">
                            <Building2 size={26} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[13px] font-black text-[#2D241E] uppercase italic truncate">{d.name_uz || d.name}</h3>
                            <p className="text-[9px] font-bold text-[#2D241E]/30 uppercase tracking-widest mt-1">Material tahlili</p>
                        </div>
                        <ChevronRight size={20} className="text-[#E8E2D9] group-hover:text-[#8B5E3C] transition-colors" />
                    </div>
                ))}
            </div>
        </div>
    )
}
