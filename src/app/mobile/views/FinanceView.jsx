'use client'

import { useState } from 'react'
import { Users, Building2, ChevronLeft, Wallet, ArrowRight } from 'lucide-react'
import PartnersFinanceSubView from './PartnersFinanceSubView'
import DepartmentsSubView from './DepartmentsSubView'
import { useLanguage } from '@/context/LanguageContext'

export default function FinanceView() {
    const { t } = useLanguage()
    const [currentSubView, setCurrentSubView] = useState(null) // null, 'partners', 'departments'

    if (currentSubView === 'partners') {
        return (
            <div className="animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-[#E8E2D9] flex items-center bg-white/80 backdrop-blur-xl sticky top-0 z-20">
                    <button 
                        onClick={() => setCurrentSubView(null)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7F5F0] text-[#2D241E] active:scale-95 transition-all"
                    >
                        <ChevronLeft size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ortga</span>
                    </button>
                    <div className="ml-4">
                        <h2 className="text-sm font-black text-[#2D241E] uppercase italic">Hamkorlar</h2>
                    </div>
                </div>
                <PartnersFinanceSubView />
            </div>
        )
    }

    if (currentSubView === 'departments') {
        return (
            <div className="animate-in slide-in-from-right duration-300">
                <div className="p-4 border-b border-[#E8E2D9] flex items-center bg-white/80 backdrop-blur-xl sticky top-0 z-20">
                    <button 
                        onClick={() => setCurrentSubView(null)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F7F5F0] text-[#2D241E] active:scale-95 transition-all"
                    >
                        <ChevronLeft size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Ortga</span>
                    </button>
                    <div className="ml-4">
                        <h2 className="text-sm font-black text-[#2D241E] uppercase italic">Bo'limlar</h2>
                    </div>
                </div>
                <DepartmentsSubView />
            </div>
        )
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <section>
                <h2 className="text-2xl font-black text-[#2D241E] tracking-tight uppercase italic">Moliya</h2>
                <p className="text-[10px] font-bold text-[#8B5E3C]/60 uppercase tracking-[0.2em] mt-1">Tahlil & Hisobot</p>
            </section>

            {/* Main Navigation Hub */}
            <div className="grid gap-6">
                <button 
                    onClick={() => setCurrentSubView('partners')}
                    className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-[#2D241E] border border-[#E8E2D9] shadow-2xl shadow-[#2D241E]/10 active:scale-[0.98] transition-all text-left"
                >
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-white/5 blur-3xl rounded-full" />
                    <div className="relative z-10 space-y-6">
                        <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center text-white border border-white/10">
                            <Users size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">Hamkorlar</h3>
                            <p className="text-white/40 text-[10px] mt-1 font-bold uppercase tracking-widest">Qarzlar & To'lovlar</p>
                        </div>
                        <div className="flex items-center gap-2 text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">
                            Kirish <ArrowRight size={14} />
                        </div>
                    </div>
                </button>

                <button 
                    onClick={() => setCurrentSubView('departments')}
                    className="group relative overflow-hidden p-8 rounded-[2.5rem] bg-white border border-[#E8E2D9] shadow-sm active:scale-[0.98] transition-all text-left"
                >
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 bg-[#8B5E3C]/5 blur-3xl rounded-full" />
                    <div className="relative z-10 space-y-6">
                        <div className="w-14 h-14 bg-[#F7F5F0] rounded-2xl flex items-center justify-center text-[#8B5E3C] border border-[#E8E2D9]">
                            <Building2 size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-[#2D241E] uppercase italic tracking-tight">Bo'limlar</h3>
                            <p className="text-[#2D241E]/30 text-[10px] mt-1 font-bold uppercase tracking-widest">Xarajatlar & Harakatlar</p>
                        </div>
                        <div className="flex items-center gap-2 text-[#8B5E3C] text-[10px] font-black uppercase tracking-[0.2em]">
                            Kirish <ArrowRight size={14} />
                        </div>
                    </div>
                </button>
            </div>

            {/* Summary Tip */}
            <div className="p-6 rounded-3xl bg-white border border-[#E8E2D9] shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#F7F5F0] flex items-center justify-center text-[#8B5E3C] shrink-0">
                        <Wallet size={20} />
                    </div>
                    <p className="text-[10px] font-bold text-[#2D241E]/40 uppercase leading-relaxed tracking-tight">
                        Real vaqt rejimida hamkorlar bilan hisob-kitoblarni va bo'limlar xarajatlarini kuzatib boring.
                    </p>
                </div>
            </div>
        </div>
    )
}
