'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Header from '@/components/Header'
import StatCard from '@/components/StatCard'
import {
    Plus, Edit, Trash2, Save, X, Search, Phone, MapPin, Mail,
    Users, TrendingUp, Package, BarChart3, Calendar, UserCheck, ShoppingBag, ArrowUpRight
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDialog } from '@/context/DialogContext'

export default function Mijozlar() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const { showAlert, showConfirm, showToast } = useDialog()
    const [customers, setCustomers] = useState([])
    const [registeredUsers, setRegisteredUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isAdding, setIsAdding] = useState(false)
    const [editId, setEditId] = useState(null)
    const [activeTab, setActiveTab] = useState('customers') 
    const [form, setForm] = useState({
        name: '', email: '', phone: '', country: '', address: '', notes: ''
    })

    useEffect(() => {
        loadData()
    }, [])

    async function loadData(opts = {}) {
        const silent = opts.silent === true
        try {
            if (!silent) setLoading(true)
            const { data: customersData, error: custError } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false })

            if (custError) throw custError

            const { data: registeredData } = await supabase.rpc('get_registered_users')
            setRegisteredUsers(registeredData || [])
            setCustomers(customersData || [])
        } catch (error) {
            console.error('Error loading data:', error)
        } finally {
            if (!silent) setLoading(false)
        }
    }

    const displayData = activeTab === 'customers' ? customers : registeredUsers

    const filteredData = displayData.filter(c =>
        (c.name || c.display_name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || c.email)?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const topCustomers = [...customers]
        .sort((a, b) => (b.total_spend || 0) - (a.total_spend || 0))
        .slice(0, 5)

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#02020a]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
        )
    }

    return (
        <div className="animate-in fade-in duration-700">
            <Header title="Mijozlar Bazasi" toggleSidebar={toggleSidebar} />

            {/* Premium Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                <StatCard icon={Users} title="Jami Mijozlar" value={customers.length} color="bg-blue-500" trend={8} />
                <StatCard icon={UserCheck} title="Ro'yxatdan o'tganlar" value={registeredUsers.length} color="bg-emerald-500" trend={15} />
                <StatCard icon={ShoppingBag} title="Umumiy Buyurtmalar" value={340} color="bg-purple-500" trend={3} />
                <StatCard icon={TrendingUp} title="Jami Daromad" value="0.0M" color="bg-amber-500" trend={12} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
                {/* Visual Chart Card */}
                <div className="lg:col-span-2 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl">
                    <h3 className="text-xl font-black text-white tracking-tight mb-8 flex items-center gap-3">
                        <BarChart3 className="text-blue-500" size={24} />
                        Top 5 Mijozlar (Xarajat bo'yicha)
                    </h3>
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topCustomers}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                    contentStyle={{ backgroundColor: '#0a0a1a', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                                <Bar dataKey="total_spend" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Tabs & Search Card */}
                <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl flex flex-col justify-between">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight mb-6">Filtr va Qidiruv</h3>
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setActiveTab('customers')}
                                    className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'customers' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/40'}`}
                                >
                                    CRM Baza
                                </button>
                                <button 
                                    onClick={() => setActiveTab('registered')}
                                    className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'registered' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/5 text-white/40'}`}
                                >
                                    Saytdagilar
                                </button>
                            </div>
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Ism, telefon..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all"
                                />
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsAdding(true)}
                        className="w-full mt-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        <Plus size={20} /> Mijoz Qo'shish
                    </button>
                </div>
            </div>

            {/* Unified Table Section */}
            <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.02] border-b border-white/5">
                            <tr>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Mijoz</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Aloqa</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Hisob Holati</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Buyurtmalar</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Jami Xarajat</th>
                                <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-center">Amallar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredData.map((cust) => (
                                <tr key={cust.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${activeTab === 'registered' ? 'bg-emerald-600/10 text-emerald-500' : 'bg-blue-600/10 text-blue-500'}`}>
                                                {(cust.name || cust.display_name || '?').charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white mb-0.5">{cust.name || cust.display_name}</p>
                                                <p className="text-[10px] text-white/20 uppercase tracking-widest">{cust.address || cust.email || 'Ma\'lumot yo\'q'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-white/60 font-medium">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Phone size={14} className="text-blue-500/50" />
                                                {cust.phone || 'Noma\'lum'}
                                            </div>
                                            {cust.email && (
                                                <div className="flex items-center gap-2 text-[10px] text-white/30">
                                                    <Mail size={12} />
                                                    {cust.email}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex flex-col gap-1">
                                            <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter w-fit ${cust.website_user_id || activeTab === 'registered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-white/30'}`}>
                                                {cust.website_user_id || activeTab === 'registered' ? 'Veb-Sayt' : 'Faqat CRM'}
                                            </span>
                                            {activeTab === 'registered' && (
                                                <span className="text-[10px] text-white/20 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {cust.created_at ? new Date(cust.created_at).toLocaleDateString() : 'Noma\'lum'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 font-bold text-white/40">
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <ShoppingBag size={12} className="text-blue-500/50" />
                                                <span>{cust.total_orders || 0} PCS</span>
                                            </div>
                                            {cust.last_order_date && (
                                                <span className="text-[10px] font-medium text-white/40 flex items-center gap-1">
                                                    <Clock size={10} className="text-blue-500/30" />
                                                    Oxirgi xarid: {new Date(cust.last_order_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            {activeTab === 'registered' && cust.last_sign_in_at && (
                                                <span className="text-[10px] font-medium text-white/20 flex items-center gap-1">
                                                    <Zap size={10} className="text-emerald-500/30" />
                                                    Oxirgi kirish: {new Date(cust.last_sign_in_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right font-black text-blue-500">
                                        <div className="flex flex-col items-end">
                                            <span>$ {(cust.total_spend || cust.total_spent || 0).toLocaleString()}</span>
                                            {activeTab === 'registered' && (
                                                <span className="text-[10px] font-medium text-emerald-500/50 flex items-center gap-1">
                                                    <ArrowUpRight size={10} />
                                                    Online
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {activeTab === 'customers' ? (
                                                <>
                                                    <button className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-blue-400 transition-all"><Edit size={16} /></button>
                                                    <button className="p-2.5 bg-white/5 hover:bg-red-500/10 rounded-xl text-red-400 transition-all"><Trash2 size={16} /></button>
                                                </>
                                            ) : (
                                                <button className="p-2.5 bg-white/5 hover:bg-blue-500/10 rounded-xl text-blue-400 transition-all flex items-center gap-2 text-xs font-bold px-4">
                                                    Profilni ko'rish
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}