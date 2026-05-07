'use client'

import Link from 'next/link'
import Header from '@/components/Header'
import { Building2, Users, Wallet, ArrowRightCircle } from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'

export default function MoliyaHubPage() {
    const { toggleSidebar } = useLayout()

    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* CYBER BACKGROUND WITH GRID */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 bg-[#02040a]" />
                <div className="absolute inset-0 opacity-[0.05]" 
                    style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
                />
                <div className="absolute top-[10%] left-[-10%] w-[1000px] h-[1000px] bg-blue-500/10 blur-[150px] rounded-full animate-pulse pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] bg-emerald-500/10 blur-[150px] rounded-full animate-pulse duration-[7s] pointer-events-none" />
            </div>

            <div className="w-full h-screen p-4 lg:p-6 relative z-10 flex flex-col items-center">
                {/* MAIN CONTAINER WITH SOLID NEON BORDER */}
                <div className="w-full max-w-[1550px] h-full bg-[#080d16]/90 border-[1.5px] border-blue-500/30 rounded-3xl p-4 lg:p-10 shadow-[0_0_50px_rgba(37,99,235,0.1)] backdrop-blur-xl flex flex-col items-center justify-center relative overflow-hidden">
                    <Header title="Moliya Markazi" toggleSidebar={toggleSidebar} className="absolute top-6 left-6 right-6" />
                    
                    <div className="w-full max-w-5xl relative z-10 mt-16">
                        <div className="text-center mb-16 space-y-4">
                            <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter uppercase italic">
                                Moliya <span className="text-blue-500">Markazi</span>
                            </h1>
                            <p className="text-white/30 text-xs uppercase tracking-[0.4em] font-bold">
                                Tizimning barcha hisob-kitoblarini boshqarish
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
                    
                            {/* SECTION 1: HAMKORLAR MOLIYASI */}
                            <Link
                                href="/moliya/boshqaruv"
                                className="group relative flex flex-col p-[2px] bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_80px_rgba(37,99,235,0.2)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 bg-[#0c0c14] rounded-[2.4rem] p-10 flex flex-col h-full space-y-8 border-2 border-transparent group-hover:border-blue-500/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-black transition-all duration-500 text-blue-500">
                                            <Users size={36} strokeWidth={2} />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h2 className="text-2xl font-black text-white tracking-tighter leading-none italic uppercase">Hamkorlar</h2>
                                        <p className="text-white/40 text-[11px] leading-relaxed font-bold tracking-wider">
                                            Yetkazib beruvchilar hisob-kitoblari
                                        </p>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between mt-auto">
                                        <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.3em]">Kirish</span>
                                        <ArrowRightCircle size={24} className="text-white/20 group-hover:text-blue-500 group-hover:translate-x-2 transition-all duration-500" />
                                    </div>
                                </div>
                            </Link>

                            {/* SECTION 2: BO'LIMLAR XARAJATLARI */}
                            <Link
                                href="/moliya/bolimlar"
                                className="group relative flex flex-col p-[2px] bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_80px_rgba(16,185,129,0.2)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 bg-[#0c0c14] rounded-[2.4rem] p-10 flex flex-col h-full space-y-8 border-2 border-transparent group-hover:border-emerald-500/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-all duration-500 text-emerald-500">
                                            <Building2 size={36} strokeWidth={2} />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h2 className="text-2xl font-black text-white tracking-tighter leading-none italic uppercase">Xarajatlar</h2>
                                        <p className="text-white/40 text-[11px] leading-relaxed font-bold tracking-wider">
                                            Ichki bo'limlar nazorati
                                        </p>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between mt-auto">
                                        <span className="text-emerald-500 font-black text-[10px] uppercase tracking-[0.3em]">Boshqaruv</span>
                                        <ArrowRightCircle size={24} className="text-white/20 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all duration-500" />
                                    </div>
                                </div>
                            </Link>

                            {/* SECTION 3: HISOBOTLAR */}
                            <Link
                                href="/moliya/hisobotlar"
                                className="group relative flex flex-col p-[2px] bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_80px_rgba(168,85,247,0.2)]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative z-10 bg-[#0c0c14] rounded-[2.4rem] p-10 flex flex-col h-full space-y-8 border-2 border-transparent group-hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 group-hover:bg-purple-500 group-hover:text-black transition-all duration-500 text-purple-500">
                                            <Wallet size={36} strokeWidth={2} />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                        <h2 className="text-2xl font-black text-white tracking-tighter leading-none italic uppercase">Hisobotlar</h2>
                                        <p className="text-white/40 text-[11px] leading-relaxed font-bold tracking-wider">
                                            Umumiy holat va moliya tahlili
                                        </p>
                                    </div>

                                    <div className="pt-6 flex items-center justify-between mt-auto">
                                        <span className="text-purple-500 font-black text-[10px] uppercase tracking-[0.3em]">Tahlil</span>
                                        <ArrowRightCircle size={24} className="text-white/20 group-hover:text-purple-500 group-hover:translate-x-2 transition-all duration-500" />
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Footer Decor */}
                        <div className="mt-20 flex justify-center opacity-10">
                            <div className="px-10 py-2 border-x border-white/30 text-[10px] font-black uppercase tracking-[0.8em] text-white">
                                Nuur Home Finance Intelligence
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
