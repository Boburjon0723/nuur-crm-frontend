'use client'

import { 
    LayoutGrid, 
    ArrowUpRight, 
    ArrowDownRight, 
    ShoppingCart, 
    Users, 
    Wallet, 
    Package, 
    Calendar,
    ChevronRight,
    TrendingUp,
    Clock,
    CheckCircle2,
    Clock3,
    AlertCircle,
    UserCheck
} from 'lucide-react'

export default function DashboardView({ stats = {}, activities = [] }) {
    const statsItems = [
        { label: 'Buyurtmalar', value: stats.totalOrders || stats.ordersCount || 0, icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Mijozlar', value: stats.totalCustomers || 0, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Mahsulotlar', value: stats.totalProducts || stats.productsCount || 0, icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Xodimlar', value: stats.employeesCount || 0, icon: UserCheck, color: 'text-rose-600', bg: 'bg-rose-50' },
    ]

    // Order status counts from dynamic stats
    const statusCounts = [
        { label: 'Yangi', count: stats.newOrders || 0, icon: Clock3, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Tayyor', count: stats.completedOrders || 0, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Bekor', count: stats.cancelledOrders || 0, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' }
    ]

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-[#2D241E] tracking-tight uppercase italic">Dashboard</h2>
                </div>
                <div className="w-12 h-12 bg-white border border-[#E8E2D9] rounded-2xl flex items-center justify-center text-[#2D241E]/20 shadow-sm">
                    <Calendar size={20} />
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                {statsItems.map((item, i) => (
                    <div key={i} className="bg-white border border-[#E8E2D9] rounded-[2rem] p-6 shadow-sm flex flex-col space-y-4 active:scale-95 transition-all cursor-default">
                        <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center`}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-widest">{item.label}</p>
                            <h3 className="text-xl font-black text-[#2D241E] mt-1 truncate">{item.value.toLocaleString()}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Order Statuses Row */}
            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-[0.2em] px-1">Buyurtma Statuslari</h3>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {statusCounts.map((s, i) => (
                        <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 flex items-center gap-4 min-w-[140px] shadow-sm active:scale-95 transition-all">
                            <div className={`w-10 h-10 ${s.bg} ${s.color} rounded-xl flex items-center justify-center shrink-0`}>
                                <s.icon size={18} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-tight">{s.label}</p>
                                <h4 className="text-lg font-black text-[#2D241E]">{s.count.toLocaleString()}</h4>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Order Activity */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-[0.2em]">Oxirgi buyurtmalar</h3>
                    <Clock size={14} className="text-[#2D241E]/20" />
                </div>
                <div className="space-y-3 pb-12">
                    {activities.length > 0 ? activities.map((act, i) => (
                        <div key={i} className="bg-white border border-[#E8E2D9] rounded-3xl p-5 flex items-center gap-5 shadow-sm group active:scale-[0.98] transition-all border-l-4 border-l-indigo-500">
                            <div className={`w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0`}>
                                <ShoppingCart size={22} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-[12px] font-black text-[#2D241E] truncate uppercase italic">
                                    {act.customer_name || 'Noma\'lum mijoz'}
                                </h4>
                                <p className="text-[9px] font-bold text-[#2D241E]/30 mt-1 uppercase tracking-widest">
                                    {new Date(act.created_at).toLocaleString('uz-UZ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} • #{act.id.toString().slice(-4).toUpperCase()}
                                </p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-[12px] font-black text-[#2D241E] tabular-nums">${Number(act.total).toLocaleString()}</p>
                                <span className={`inline-block px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-tighter mt-1 ${
                                    String(act.status).toLowerCase() === 'completed' || String(act.status).toLowerCase() === 'tugallandi' 
                                        ? 'bg-emerald-50 text-emerald-600' 
                                        : 'bg-indigo-50 text-indigo-600'
                                }`}>
                                    {String(act.status).toLowerCase() === 'new' ? 'Yangi' : 
                                     String(act.status).toLowerCase() === 'pending' ? 'Jarayonda' : 
                                     String(act.status).toLowerCase() === 'completed' ? 'Tayyor' : 
                                     String(act.status).toLowerCase() === 'cancelled' ? 'Bekor' : act.status}
                                </span>
                            </div>
                        </div>
                    )) : (
                        <div className="py-16 text-center opacity-10">
                            <ShoppingCart size={48} className="mx-auto mb-3" />
                            <p className="text-[10px] font-black uppercase tracking-[0.4em]">Harakatlar topilmadi</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
