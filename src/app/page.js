'use client'

import { useState, useEffect } from 'react'
import Header from '@/components/Header'
import StatCard from '@/components/StatCard'
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { Package, Users, ShoppingCart, DollarSign, TrendingUp, ArrowUpRight, Clock } from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { api } from '@/utils/api'
import Link from 'next/link'

function formatUsd(amount) {
    const n = Number(amount)
    if (!Number.isFinite(n)) return '0'
    return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export default function Dashboard() {
    const { toggleSidebar } = useLayout()
    const { t } = useLanguage()
    
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        mahsulotlar: 0,
        xodimlar: 0,
        buyurtmalar: 0,
        foyda: '0'
    })
    const [chartData, setChartData] = useState([])
    const [recentOrders, setRecentOrders] = useState([])

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch last 30 days analytics
                const start = new Date()
                start.setDate(start.getDate() - 30)
                const end = new Date()
                
                const [analyticsRes, ordersRes] = await Promise.all([
                    api.get(`/api/statistics/analytics?start=${start.toISOString()}&end=${end.toISOString()}`),
                    api.get('/api/orders?limit=10') // the API might not support limit directly, we'll slice it
                ])

                const data = analyticsRes.data
                
                setStats({
                    mahsulotlar: data.summary?.productsCount || 0,
                    xodimlar: data.summary?.employeesCount || 0,
                    buyurtmalar: data.summary?.ordersCount || 0,
                    foyda: formatUsd(data.summary?.totalIncome || 0) + ' $'
                })

                // Format chart data combining salesTrend and financeTrend
                const chartMap = {}
                if (data.salesTrend) {
                    data.salesTrend.forEach(t => {
                        chartMap[t.date] = { name: t.date.slice(-5), kirim: t.amount, chiqim: 0 }
                    })
                }
                if (data.financeTrend) {
                    data.financeTrend.forEach(t => {
                        if (!chartMap[t.date]) chartMap[t.date] = { name: t.date.slice(-5), kirim: t.income || 0, chiqim: t.expense || 0 }
                        else {
                            chartMap[t.date].kirim = Math.max(chartMap[t.date].kirim, t.income || 0)
                            chartMap[t.date].chiqim = t.expense || 0
                        }
                    })
                }
                setChartData(Object.values(chartMap).sort((a,b) => a.name.localeCompare(b.name)).slice(-14)) // last 14 active days

                // Set recent orders
                const ords = Array.isArray(ordersRes.data) ? ordersRes.data : (ordersRes.data?.orders || [])
                setRecentOrders(ords.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5))
            } catch (error) {
                console.error("Dashboard yuklashda xato:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboardData()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen text-white/50 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="text-xs font-black uppercase tracking-widest animate-pulse">Yuklanmoqda...</div>
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-1000">
            <Header title="Dashboard" toggleSidebar={toggleSidebar} />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard
                    icon={Package}
                    title="Jami Mahsulotlar"
                    value={stats.mahsulotlar}
                    color="bg-blue-500"
                    trend={12}
                    href="/mahsulotlar"
                />
                <StatCard
                    icon={Users}
                    title="Xodimlar"
                    value={stats.xodimlar}
                    color="bg-purple-500"
                    trend={5}
                    href="/xodimlar"
                />
                <StatCard
                    icon={ShoppingCart}
                    title="Bugungi Buyurtmalar"
                    value={stats.buyurtmalar}
                    color="bg-indigo-500"
                    trend={-2}
                    href="/buyurtmalar"
                />
                <StatCard
                    icon={DollarSign}
                    title="Oylik Foyda"
                    value={stats.foyda}
                    color="bg-emerald-500"
                    trend={24}
                    href="/moliya"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Card */}
                <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 to-transparent pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                                <TrendingUp className="text-blue-500" size={24} />
                                Moliyaviy Dinamika
                            </h3>
                            <p className="text-white/30 text-xs mt-1 uppercase tracking-widest font-bold">Oxirgi 7 kunlik tahlil</p>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60">
                                <span className="w-2 h-2 bg-blue-500 rounded-full"></span> Kirim
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60">
                                <span className="w-2 h-2 bg-red-500 rounded-full"></span> Chiqim
                            </div>
                        </div>
                    </div>

                    <div className="h-[400px] w-full relative z-10">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorKirim" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorChiqim" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis 
                                    dataKey="name" 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' }} 
                                    dy={15} 
                                />
                                <YAxis 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11, fontWeight: 'bold' }} 
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#0a0a1a', 
                                        borderRadius: '20px', 
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                                        color: '#fff'
                                    }} 
                                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                />
                                <Area type="monotone" dataKey="kirim" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorKirim)" />
                                <Area type="monotone" dataKey="chiqim" stroke="#ef4444" strokeWidth={4} fillOpacity={1} fill="url(#colorChiqim)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Side List Card */}
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
                    <h3 className="text-xl font-black text-white tracking-tight mb-8">So'nggi Buyurtmalar</h3>
                    
                    <div className="space-y-6">
                        {recentOrders.length > 0 ? recentOrders.map((ord, i) => (
                            <Link href="/buyurtmalar" key={ord.id} className="flex items-center justify-between group cursor-pointer p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/5 hover:border-white/10 hover:shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)] transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-black text-lg shadow-inner">
                                        {(ord.customer_name?.[0] || 'M').toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-white text-sm group-hover:text-blue-400 transition-colors">{ord.customer_name || 'Noma\'lum mijoz'}</p>
                                        <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold flex items-center gap-1 mt-1">
                                            <Clock size={10}/> {new Date(ord.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-white text-sm tracking-wider">{formatUsd(ord.total)} $</p>
                                    <div className={`flex items-center justify-end gap-1 text-[9px] font-bold uppercase mt-1 ${ord.status === 'completed' || ord.status === 'Tugallandi' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                        {ord.status} <ArrowUpRight size={10} />
                                    </div>
                                </div>
                            </Link>
                        )) : (
                            <div className="text-center text-white/20 text-xs font-black uppercase tracking-widest mt-10">
                                Buyurtmalar mavjud emas
                            </div>
                        )}
                    </div>

                    <Link href="/buyurtmalar" className="flex items-center justify-center w-full mt-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-black text-white/40 hover:text-white uppercase tracking-widest transition-all">
                        Barchasini ko'rish
                    </Link>
                </div>
            </div>
        </div>
    )
}