'use client'

import { 
    Layers, 
    Users,
    PieChart,
    ChevronRight,
    Trophy,
    User,
    Package,
    ArrowUpRight
} from 'lucide-react'

export default function StatsView({ stats = {} }) {
    const categories = stats.categories || []
    const products = stats.products || []
    const customers = stats.customers || []
    const summary = stats.summary || {}

    const totalSales = Number(summary.totalSales || 1)

    return (
        <div className="p-6 space-y-12 animate-in fade-in duration-700 bg-[#FDFBF7] min-h-screen pb-24">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#2D241E] tracking-tight uppercase italic">Statistika</h2>
                    <p className="text-[10px] font-bold text-[#8B5E3C]/60 uppercase tracking-[0.2em] mt-1">Jami {categories.length} ta kategoriya</p>
                </div>
                <div className="w-12 h-12 bg-white border border-[#E8E2D9] rounded-2xl flex items-center justify-center shadow-sm text-[#2D241E]/10">
                    <PieChart size={20} />
                </div>
            </div>

            {/* Top 7 Categories */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-3">
                        <Layers size={18} className="text-[#8B5E3C]" />
                        <h3 className="text-[11px] font-black text-[#2D241E] uppercase tracking-[0.2em]">Top 7 Kategoriyalar</h3>
                    </div>
                    <div className="bg-white border border-[#E8E2D9] px-4 py-2 rounded-xl shadow-sm">
                        <p className="text-[8px] font-black text-[#2D241E]/30 uppercase tracking-widest">Jami Summa</p>
                        <p className="text-[12px] font-black text-[#2D241E] tabular-nums">${totalSales.toLocaleString()}</p>
                    </div>
                </div>
                <div className="space-y-3">
                    {categories.slice(0, 7).map((cat, i) => {
                        const share = (Number(cat.revenue || 0) / totalSales) * 100
                        return (
                            <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm active:scale-95 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black text-[#2D241E] uppercase truncate flex-1">{cat.name}</h4>
                                    <p className="text-[12px] font-black text-[#2D241E] italic tabular-nums">${Number(cat.revenue || 0).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-1.5 bg-[#F7F5F0] rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#8B5E3C] rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, share)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-black text-[#2D241E]/30 w-8 text-right">{Math.round(share)}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Top 7 Products */}
            <div className="space-y-5">
                <div className="flex items-center gap-3 px-1">
                    <Package size={18} className="text-[#8B5E3C]" />
                    <h3 className="text-[11px] font-black text-[#2D241E] uppercase tracking-[0.2em]">Top 7 Mahsulotlar</h3>
                </div>
                <div className="space-y-3">
                    {products.slice(0, 7).map((prod, i) => {
                        const share = (Number(prod.revenue || 0) / totalSales) * 100
                        return (
                            <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm active:scale-95 transition-all">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="text-xs font-black text-[#2D241E] uppercase truncate tracking-tight">{prod.name}</h4>
                                        <p className="text-[8px] font-bold text-[#8B5E3C] uppercase tracking-widest mt-1">{prod.category || 'Mahsulot'}</p>
                                    </div>
                                    <p className="text-[12px] font-black text-[#2D241E] italic tabular-nums">${Number(prod.revenue || 0).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex-1 h-1.5 bg-[#F7F5F0] rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-[#2D241E] rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(100, share)}%` }}
                                        />
                                    </div>
                                    <span className="text-[9px] font-black text-[#2D241E]/30 w-8 text-right">{Math.round(share)}%</span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Top 7 Customers */}
            <div className="space-y-5">
                <div className="flex items-center gap-3 px-1">
                    <Users size={18} className="text-[#8B5E3C]" />
                    <h3 className="text-[11px] font-black text-[#2D241E] uppercase tracking-[0.2em]">Top 7 Mijozlar</h3>
                </div>
                <div className="space-y-3">
                    {customers.slice(0, 7).map((cust, i) => (
                        <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 shadow-sm flex items-center justify-between active:scale-95 transition-all">
                            <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                                <div className="w-10 h-10 rounded-xl bg-[#2D241E]/5 flex items-center justify-center text-[#2D241E]/20">
                                    <User size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-xs font-black text-[#2D241E] uppercase truncate tracking-tight">{cust.name}</h4>
                                    <p className="text-[9px] font-bold text-[#8B5E3C] mt-1 uppercase tracking-widest">
                                        {cust.orderCount || 0} ta buyurtma
                                    </p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className="text-[12px] font-black text-[#2D241E] italic tabular-nums">${Number(cust.totalValue || 0).toLocaleString()}</p>
                                {i === 0 && (
                                    <div className="mt-1 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-full">
                                        <Trophy size={8} className="text-amber-500" />
                                        <span className="text-[7px] font-black text-amber-600 uppercase">Lider</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
