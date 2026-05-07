'use client'

import { useEffect, useMemo, useState } from 'react'
import { 
    Plus, Trash2, Send, Clock3, CheckCircle2, XCircle, 
    PackagePlus, PackageMinus, Search, History, Loader2, 
    User, ShoppingCart, X, Package, Filter, ChevronRight,
    LayoutGrid, ArrowLeft
} from 'lucide-react'
import { createMobileErpPendingRequest } from '@/services/mobileErpIntakeService'

function parseQty(v) {
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return 0
    return n
}

function normalizeColors(raw) {
    if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean)
    if (raw == null) return []
    const s = String(raw).trim()
    if (!s) return []
    try {
        if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
            const j = JSON.parse(s)
            if (Array.isArray(j)) return j.map((x) => String(x || '').trim()).filter(Boolean)
        }
    } catch {
        // ignore
    }
    return [s]
}

function getProductImage(images) {
    if (Array.isArray(images) && images.length > 0) return images[0]
    if (typeof images === 'string' && images.startsWith('http')) return images
    try {
        if (typeof images === 'string' && images.startsWith('[')) {
            const parsed = JSON.parse(images)
            if (Array.isArray(parsed) && parsed.length > 0) return parsed[0]
        }
    } catch (e) {}
    return null
}

export default function WarehouseView({ t, user, products, categories, myRequests, setMyRequests, refreshMyRequests, onLogout }) {
    const [mode, setMode] = useState('OUT') // 'IN' or 'OUT'
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategoryId, setSelectedCategoryId] = useState(null)
    const [cart, setCart] = useState([])
    const [selectedProductForModal, setSelectedProductForModal] = useState(null)
    const [tempQty, setTempQty] = useState('1')
    const [tempColor, setTempColor] = useState('')
    const [note, setNote] = useState('')
    const [receiverName, setReceiverName] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successBanner, setSuccessBanner] = useState('')
    const [showHistory, setShowHistory] = useState(false)
    const [showCart, setShowCart] = useState(false)

    // Filter products
    const filteredProducts = useMemo(() => {
        let list = products
        
        if (selectedCategoryId) {
            list = list.filter(p => p.categoryId === selectedCategoryId)
        }
        
        const q = searchQuery.trim().toLowerCase()
        if (q) {
            list = list.filter(p => 
                (p.name || '').toLowerCase().includes(q) || 
                (p.sku || '').toLowerCase().includes(q)
            )
        }
        
        return list.slice(0, 500)
    }, [products, searchQuery, selectedCategoryId])

    const addToCart = () => {
        if (!selectedProductForModal) return
        const q = parseQty(tempQty)
        if (q <= 0) {
            alert('Miqdorni kiriting')
            return
        }

        const newItem = {
            id: `item_${Date.now()}`,
            product_id: selectedProductForModal.id,
            product_name: selectedProductForModal.name || selectedProductForModal.sku || 'Mahsulot',
            quantity: q,
            color: tempColor || null,
            unit_price_usd: Number(selectedProductForModal.price) || 0,
            sku: selectedProductForModal.sku || null,
            image_url: getProductImage(selectedProductForModal.images)
        }

        setCart(prev => [...prev, newItem])
        setSelectedProductForModal(null)
        setTempQty('1')
        setTempColor('')
    }

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(x => x.id !== id))
    }

    const submitOrder = async () => {
        if (!cart.length || saving) return
        setSaving(true)
        setError('')
        try {
            const finalNote = `[${mode === 'IN' ? 'KIRIM' : 'CHIQIM'}] ${mode === 'OUT' ? 'Qabul qiluvchi: ' + receiverName : ''} \n ${note}`
            
            const request = await createMobileErpPendingRequest({
                user,
                lines: cart,
                note: finalNote,
                customerName: receiverName || user?.fullname || user?.email
            })
            
            setCart([])
            setNote('')
            setReceiverName('')
            setShowCart(false)
            
            const newHistoryItem = {
                id: request.id,
                status: request.status,
                created_at: request.created_at,
                order_number_snapshot: request.order_number,
                customer_name_snapshot: request.customer_name
            }
            setMyRequests(prev => [newHistoryItem, ...prev])
            setSuccessBanner("Muvaffaqiyatli saqlandi")
            setTimeout(() => setSuccessBanner(''), 5000)
        } catch (e) {
            setError(e?.message || String(e))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="relative min-h-screen bg-[#FDFBF7] text-[#1A1A1A] overflow-x-hidden font-sans">
            <div className="relative z-10 p-6 pb-32 animate-in fade-in duration-700">
                {/* Clean Header */}
                <header className="flex items-center justify-between mb-8">
                    <div className="space-y-0.5">
                        <h1 className="text-2xl font-black text-[#2D241E] tracking-tight uppercase">
                            Nuur <span className="text-[#8B5E3C]">Home</span>
                        </h1>
                        <p className="text-[10px] font-bold text-[#8B5E3C]/60 uppercase tracking-[0.2em]">Ombor Boshqaruvi</p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowHistory(true)} 
                            className="w-12 h-12 bg-white border border-[#E8E2D9] rounded-2xl flex items-center justify-center text-[#2D241E]/40 shadow-sm active:scale-90 transition-all"
                        >
                            <History size={20} />
                        </button>
                        <button 
                            onClick={() => setShowCart(true)}
                            className="relative w-12 h-12 bg-[#2D241E] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-[#2D241E]/20 active:scale-90 transition-all"
                        >
                            <ShoppingCart size={20} />
                            {cart.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#D44D44] border-2 border-[#FDFBF7] rounded-full flex items-center justify-center text-[10px] font-black text-white">
                                    {cart.length}
                                </span>
                            )}
                        </button>
                    </div>
                </header>

                {/* Soft Search */}
                <div className="relative mb-8">
                    <div className="relative flex items-center bg-white border border-[#E8E2D9] rounded-2xl shadow-sm focus-within:border-[#8B5E3C]/50 transition-all">
                        <div className="w-12 h-12 flex items-center justify-center text-[#2D241E]/20">
                            <Search size={20} />
                        </div>
                        <input 
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Mahsulot qidirish..."
                            className="flex-1 bg-transparent border-none py-4 px-1 text-sm text-[#2D241E] placeholder:text-[#2D241E]/20 outline-none font-medium"
                        />
                    </div>
                </div>

                {/* Categories Slider */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                !selectedCategoryId 
                                    ? 'bg-[#2D241E] text-white shadow-lg' 
                                    : 'bg-white text-[#2D241E]/40 border border-[#E8E2D9]'
                            }`}
                        >
                            Barchasi
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                                    selectedCategoryId === cat.id 
                                        ? 'bg-[#2D241E] text-white shadow-lg' 
                                        : 'bg-white text-[#2D241E]/40 border border-[#E8E2D9]'
                                }`}
                            >
                                {cat.name_uz || cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid - Cream Style */}
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map(p => {
                        const img = getProductImage(p.images)
                        return (
                            <div 
                                key={p.id}
                                onClick={() => setSelectedProductForModal(p)}
                                className="bg-white border border-[#E8E2D9] rounded-[2rem] p-3 flex flex-col space-y-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all"
                            >
                                <div className="aspect-square bg-[#F7F5F0] rounded-[1.5rem] overflow-hidden relative">
                                    {img ? (
                                        <img src={img} alt={p.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[#2D241E]/5">
                                            <Package size={40} />
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 right-2">
                                        <div className="w-9 h-9 bg-white shadow-sm rounded-xl flex items-center justify-center text-[#2D241E]">
                                            <Plus size={18} />
                                        </div>
                                    </div>
                                </div>
                                <div className="px-1 pb-1">
                                    <h3 className="text-[11px] font-bold text-[#2D241E] truncate uppercase tracking-tight">
                                        {p.name || p.sku}
                                    </h3>
                                    <p className="text-[9px] font-bold text-[#2D241E]/30 uppercase tracking-widest mt-0.5">
                                        {p.sku || 'Standard'}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Cream Style Modal */}
            {selectedProductForModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-[#2D241E]/40 backdrop-blur-sm" onClick={() => setSelectedProductForModal(null)} />
                    <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                        <button onClick={() => setSelectedProductForModal(null)} className="absolute top-6 right-6 p-2 text-[#2D241E]/20">
                            <X size={20} />
                        </button>
                        
                        <div className="flex flex-col items-center text-center">
                            <div className="w-32 h-32 bg-[#F7F5F0] rounded-3xl overflow-hidden mb-6 shadow-inner">
                                {getProductImage(selectedProductForModal.images) && (
                                    <img src={getProductImage(selectedProductForModal.images)} className="w-full h-full object-cover" />
                                )}
                            </div>
                            
                            <h3 className="text-lg font-black text-[#2D241E] uppercase tracking-tight mb-1">
                                {selectedProductForModal.name}
                            </h3>
                            <p className="text-[10px] font-bold text-[#8B5E3C] uppercase tracking-[0.2em] mb-8">
                                {selectedProductForModal.sku}
                            </p>

                            <div className="w-full grid grid-cols-2 gap-4 mb-8">
                                <div className="space-y-1 text-left">
                                    <label className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest ml-1">Soni</label>
                                    <input 
                                        type="number" 
                                        value={tempQty}
                                        onChange={(e) => setTempQty(e.target.value)}
                                        className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-4 text-[#2D241E] font-black text-center outline-none"
                                    />
                                </div>
                                <div className="space-y-1 text-left">
                                    <label className="text-[9px] font-black text-[#2D241E]/30 uppercase tracking-widest ml-1">Rangi</label>
                                    <select 
                                        value={tempColor}
                                        onChange={(e) => setTempColor(e.target.value)}
                                        className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-3 text-[#2D241E] font-bold outline-none text-[10px] h-[58px]"
                                    >
                                        <option value="">Tanlang</option>
                                        {normalizeColors(selectedProductForModal.colors).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button 
                                onClick={addToCart}
                                className="w-full py-5 bg-[#2D241E] rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all"
                            >
                                SAVATCHAGA QO'SHISH
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cream Style Cart Bottom Sheet */}
            {showCart && (
                <div className="fixed inset-0 z-[1000] flex flex-col justify-end items-center">
                    <div className="absolute inset-0 bg-[#2D241E]/40 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="relative w-full max-w-lg bg-white rounded-t-[3rem] p-8 shadow-2xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-400">
                        <div className="w-12 h-1 bg-[#E8E2D9] rounded-full mx-auto mb-8" />
                        
                        <div className="flex items-center justify-between mb-8 px-2">
                            <h2 className="text-xl font-black text-[#2D241E] uppercase tracking-tight">Savatcha</h2>
                            <button onClick={() => setShowCart(false)} className="w-10 h-10 flex items-center justify-center text-[#2D241E]/20">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Removed Mode Selector as requested */}

                        <div className="flex-1 overflow-y-auto space-y-4 mb-8 scrollbar-hide">
                            {cart.length === 0 ? (
                                <p className="text-center py-12 text-[#2D241E]/20 font-bold uppercase tracking-widest text-[10px]">Savatcha bo'sh</p>
                            ) : cart.map(item => (
                                <div key={item.id} className="flex items-center gap-4 bg-[#F7F5F0] p-4 rounded-2xl border border-[#E8E2D9]">
                                    <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 border border-[#E8E2D9]">
                                        {item.image_url && <img src={item.image_url} className="w-full h-full object-cover" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-[11px] font-bold text-[#2D241E] truncate uppercase">{item.product_name}</h4>
                                        <p className="text-[9px] font-bold text-[#2D241E]/40 uppercase mt-0.5">{item.quantity} ta • {item.color || 'Rangli'}</p>
                                    </div>
                                    <button onClick={() => removeFromCart(item.id)} className="text-[#D44D44] p-2">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {cart.length > 0 && (
                            <div className="space-y-6">
                                {mode === 'OUT' && (
                                    <input 
                                        value={receiverName}
                                        onChange={(e) => setReceiverName(e.target.value)}
                                        className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-6 text-sm text-[#2D241E] font-bold outline-none"
                                        placeholder="Qabul qiluvchi..."
                                    />
                                )}
                                <textarea 
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                    placeholder="Izoh..."
                                    className="w-full bg-[#F7F5F0] border border-[#E8E2D9] rounded-2xl py-4 px-6 text-sm text-[#2D241E] font-medium outline-none h-20 resize-none"
                                />
                                <button 
                                    onClick={submitOrder}
                                    disabled={saving}
                                    className={`w-full py-5 rounded-2xl text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                        mode === 'IN' ? 'bg-[#44A678]' : 'bg-[#D44D44]'
                                    }`}
                                >
                                    {saving ? <Loader2 className="animate-spin" /> : 'TASDIQLASH'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* History - Cream Style */}
            {showHistory && (
                <div className="fixed inset-0 z-[1000] flex flex-col bg-[#FDFBF7] animate-in slide-in-from-right duration-400">
                    <header className="px-6 py-8 flex items-center justify-between border-b border-[#E8E2D9] bg-white">
                        <button onClick={() => setShowHistory(false)} className="w-10 h-10 bg-[#F7F5F0] rounded-xl flex items-center justify-center text-[#2D241E]">
                            <ArrowLeft size={20} />
                        </button>
                        <h2 className="text-lg font-black text-[#2D241E] uppercase tracking-tight">Tarix</h2>
                        <div className="w-10" />
                    </header>
                    <div className="flex-1 overflow-y-auto space-y-4 p-6 pb-12 scrollbar-hide">
                        {myRequests.map(req => (
                            <div key={req.id} className="bg-white border border-[#E8E2D9] rounded-2xl p-5 flex flex-col gap-3 shadow-sm">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-[#2D241E] uppercase">#{req.order_number_snapshot || req.id.slice(0, 8)}</span>
                                    <span className="text-[9px] text-[#2D241E]/30 font-bold">{new Date(req.created_at).toLocaleDateString()}</span>
                                </div>
                                <p className="text-[10px] text-[#8B5E3C] font-bold uppercase tracking-widest">{req.customer_name_snapshot}</p>
                                <div className="flex justify-between items-center pt-2 border-t border-[#F7F5F0]">
                                    <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                                        req.status === 'completed' || req.status === 'new' ? 'bg-[#44A678]/10 text-[#44A678]' : 'bg-[#8B5E3C]/10 text-[#8B5E3C]'
                                    }`}>
                                        {req.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Banners */}
            {successBanner && (
                <div className="fixed top-8 left-6 right-6 bg-[#44A678] text-white p-5 rounded-2xl shadow-xl animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 z-[2000]">
                    <CheckCircle2 size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{successBanner}</p>
                </div>
            )}
            {error && (
                <div className="fixed top-8 left-6 right-6 bg-[#D44D44] text-white p-5 rounded-2xl shadow-xl animate-in slide-in-from-top-10 duration-500 flex items-center gap-4 z-[2000]">
                    <XCircle size={24} />
                    <p className="text-[10px] font-black uppercase tracking-widest">{error}</p>
                </div>
            )}

            <div className="p-8 pt-0">
                <button 
                    onClick={onLogout}
                    className="w-full py-4 bg-white border border-[#E8E2D9] rounded-2xl text-[10px] font-black text-[#2D241E]/20 uppercase tracking-[0.3em]"
                >
                    Tizimdan Chiqish
                </button>
            </div>
        </div>
    )
}
