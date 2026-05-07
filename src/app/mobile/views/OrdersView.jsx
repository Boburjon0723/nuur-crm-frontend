'use client'

import { useState, useMemo } from 'react'
import { 
    Search, 
    ShoppingCart, 
    Package, 
    X,
    DollarSign,
    Tag,
    ChevronRight
} from 'lucide-react'

export default function OrdersView({ orders = [] }) {
    const [searchQuery, setSearchQuery] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')
    const [selectedOrder, setSelectedOrder] = useState(null)

    const filteredOrders = useMemo(() => {
        return orders.filter(o => {
            const matchesSearch = (o.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 (o.order_number || o.id?.toString() || '').toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === 'all' || o.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [orders, searchQuery, statusFilter])

    const statuses = [
        { id: 'all', label: 'Hammasi' },
        { id: 'new', label: 'Yangi' },
        { id: 'pending', label: 'Jarayonda' },
        { id: 'completed', label: 'Tayyor' },
        { id: 'cancelled', label: 'Bekor' }
    ]

    return (
        <div className="p-6 space-y-8 bg-[#FDFBF7] min-h-screen">
            {/* Header */}
            <header className="flex flex-col space-y-6">
                <div>
                    <h2 className="text-2xl font-black text-[#2D241E] tracking-tight uppercase italic">Buyurtmalar</h2>
                    <p className="text-[10px] font-bold text-[#8B5E3C]/60 uppercase tracking-[0.2em] mt-1">Jami {orders.length} ta</p>
                </div>

                {/* Search & Filter */}
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-[#2D241E]/20" size={18} />
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Qidiruv..."
                            className="w-full bg-white border border-[#E8E2D9] rounded-2xl pl-14 pr-6 py-4 text-sm text-[#2D241E] shadow-sm outline-none font-medium"
                        />
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {statuses.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => setStatusFilter(s.id)}
                                className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                    statusFilter === s.id ? 'bg-[#2D241E] text-white' : 'bg-white text-[#2D241E]/30 border border-[#E8E2D9]'
                                }`}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Orders List */}
            <div className="space-y-4 pb-24">
                {filteredOrders.length === 0 ? (
                    <div className="py-20 text-center opacity-10">
                        <Package size={64} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Topilmadi</p>
                    </div>
                ) : filteredOrders.map(order => (
                    <div 
                        key={order.id} 
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white border border-[#E8E2D9] rounded-[2rem] p-6 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between"
                    >
                        <div className="flex-1 min-w-0 pr-4">
                            <h3 className="text-[13px] font-black text-[#2D241E] uppercase italic truncate">{order.customer_name}</h3>
                            <p className="text-[9px] font-black text-[#8B5E3C] uppercase tracking-widest mt-1">
                                {order.status === 'new' ? 'Yangi' : order.status === 'pending' ? 'Jarayonda' : order.status === 'completed' ? 'Tayyor' : 'Bekor'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[14px] font-black text-[#2D241E]">${Number(order.total || 0).toLocaleString()}</p>
                            <ChevronRight size={16} className="text-[#2D241E]/10 ml-auto mt-1" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Simple Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-[#2D241E]/60 backdrop-blur-md" onClick={() => setSelectedOrder(null)} />
                    <div className="relative w-full max-w-sm bg-[#FDFBF7] rounded-[3rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                        
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-lg font-black text-[#2D241E] uppercase italic">Buyurtma</h3>
                            <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-white border border-[#E8E2D9] rounded-xl flex items-center justify-center text-[#2D241E]/20">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            {/* Customer */}
                            <div>
                                <p className="text-[9px] font-black text-[#2D241E]/20 uppercase tracking-widest mb-1">Mijoz</p>
                                <h4 className="text-xl font-black text-[#2D241E] uppercase italic">{selectedOrder.customer_name}</h4>
                            </div>

                            {/* Products */}
                            <div className="space-y-3">
                                <p className="text-[9px] font-black text-[#2D241E]/20 uppercase tracking-widest mb-1">Mahsulotlar</p>
                                <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 scrollbar-hide">
                                    {(selectedOrder.order_items || []).map((item, i) => (
                                        <div key={i} className="flex justify-between items-center py-2 border-b border-[#E8E2D9]/30 last:border-0">
                                            <div className="flex-1 min-w-0 pr-4">
                                                <p className="text-[11px] font-black text-[#2D241E] uppercase truncate">{item.product_name}</p>
                                                <p className="text-[9px] font-bold text-[#8B5E3C] uppercase">{item.quantity} ta</p>
                                            </div>
                                            <p className="text-[11px] font-black text-[#2D241E] tabular-nums">${(Number(item.quantity) * Number(item.product_price)).toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="pt-6 border-t border-[#E8E2D9] flex items-center justify-between">
                                <p className="text-[10px] font-black text-[#2D241E]/20 uppercase tracking-widest">Jami</p>
                                <p className="text-2xl font-black text-[#2D241E] italic tabular-nums">${Number(selectedOrder.total).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
