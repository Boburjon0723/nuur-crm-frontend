'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
    Plus, Search, Edit2, Trash2, Printer, Package, 
    Layers, AlertTriangle, X, Upload, Globe, ChevronDown,
    Save, Filter, MoreHorizontal, Check, Download, Image as ImageIcon,
    Star, MessageSquare, Weight, PlusCircle, MinusCircle, Box, Palette,
    Eye, ArrowUpRight, LayoutGrid, List as ListIcon, Zap
} from 'lucide-react'
import Header from '@/components/Header'
import { useLanguage } from '@/context/LanguageContext'
import { api } from '@/utils/api'
import { useDialog } from '@/context/DialogContext'

export default function MahsulotlarPage() {
    const { t } = useLanguage()
    const { showAlert, showConfirm, showToast } = useDialog()
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const toggleSidebar = () => setSidebarOpen(!sidebarOpen)

    // Data State
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [globalColors, setGlobalColors] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadError, setLoadError] = useState(null)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategoryId, setFilterCategoryId] = useState('all')
    const [viewMode, setViewMode] = useState('table') // 'table' or 'grid'

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [isColorLibraryOpen, setIsColorLibraryOpen] = useState(false)
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
    const [isBulkColorModalOpen, setIsBulkColorModalOpen] = useState(false)
    const [isBulkContentModalOpen, setIsBulkContentModalOpen] = useState(false)
    const [bulkAction, setBulkAction] = useState('add') // 'add', 'replace', 'remove'
    const [selectedBulkColors, setSelectedBulkColors] = useState([])
    const [bulkContentForm, setBulkContentForm] = useState({
        description_uz: '', description_ru: '', description_en: '',
        features: []
    })
    const [newBulkFeature, setNewBulkFeature] = useState({ k: '', v: '' })
    const [editId, setEditId] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [activeTab, setActiveTab] = useState('main') // 'main', 'media', 'specs'
    const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false)
    const [previewImage, setPreviewImage] = useState(null)
    
    // Advanced Form State (Synced with schema.prisma)
    const [form, setForm] = useState({
        name_uz: '', name_ru: '', name_en: '',
        price: '', categoryId: '',
        description_uz: '', description_ru: '', description_en: '',
        isActive: true, showInNew: false,
        features: [], 
        images: [], 
        sku: '',
        sortOrder: '0', 
        isKg: false, 
        rating: '4.5',
        reviews: '12',
        colors: [], 
        rope_weight_kg: ''
    })

    const [newFeature, setNewFeature] = useState({ k: '', v: '' })
    const [newColorInput, setNewColorInput] = useState('')
    const [newCategoryName, setNewCategoryName] = useState('')

    // Fetch Data
    const loadData = useCallback(async () => {
        try {
            setLoading(true)
            const [prodRes, catRes, colRes] = await Promise.all([
                api.get('/api/products'),
                api.get('/api/categories'),
                api.get('/api/colors')
            ])
            setProducts(prodRes.data || [])
            setCategories(catRes.data || [])
            setGlobalColors(colRes.data || [])
            setLoadError(null)
        } catch (error) {
            console.error('Data load error:', error)
            setLoadError('Ma\'lumotlarni yuklashda xatolik yuz berdi')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadData()
    }, [loadData])

    // Rope logic detection
    const isRopeCategory = useMemo(() => {
        const cat = categories.find(c => String(c.id) === String(form.categoryId))
        const name = (cat?.name_uz || cat?.name || '').toLowerCase()
        return name.includes('arqon') || name.includes('kanat') || name.includes('rope')
    }, [categories, form.categoryId])

    // Filters Logic
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesCategory = filterCategoryId === 'all' || String(p.categoryId) === filterCategoryId
            const matchesSearch = !searchTerm || 
                [p.name_uz, p.name_ru, p.name_en, p.sku].some(val => 
                    val?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            return matchesCategory && matchesSearch
        })
    }, [products, searchTerm, filterCategoryId])

    // Handlers
    const handleSubmit = async (e) => {
        e.preventDefault()
        try {
            setUploading(true)
            
            if (!form.categoryId) {
                showAlert('Iltimos, kategoriyani tanlang', { variant: 'error' })
                return
            }

            const payload = {
                ...form,
                price: Number(form.price) || 0,
                sortOrder: Number(form.sortOrder) || 0,
                rating: Number(form.rating) || 0,
                reviews: Number(form.reviews) || 0,
                rope_weight_kg: isRopeCategory ? (Number(form.rope_weight_kg) || null) : null
            }

            if (editId) {
                await api.put(`/api/products/${editId}`, payload)
                showToast('Muvaffaqiyatli yangilandi', { type: 'success' })
            } else {
                await api.post('/api/products', payload)
                showToast('Muvaffaqiyatli qo\'shildi', { type: 'success' })
            }
            setIsModalOpen(false)
            loadData()
        } catch (error) {
            showAlert('Saqlashda xatolik: ' + error.message, { variant: 'error' })
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id) => {
        const ok = await showConfirm('Haqiqatdan ham o\'chirmoqchimisiz?', { variant: 'error' })
        if (!ok) return
        try {
            await api.delete(`/api/products/${id}`)
            showToast('O\'chirildi', { type: 'success' })
            loadData()
        } catch (error) {
            showAlert('O\'chirishda xatolik', { variant: 'error' })
        }
    }

    const handleAddGlobalColor = async () => {
        if (!newColorInput) return
        try {
            await api.post('/api/colors', { name: newColorInput })
            setNewColorInput('')
            const colRes = await api.get('/api/colors')
            setGlobalColors(colRes.data || [])
            showToast('Rang qo\'shildi', { type: 'success' })
        } catch (error) {
            showAlert('Xatolik: ' + (error.response?.data?.message || error.message), { variant: 'error' })
        }
    }

    const handleDeleteGlobalColor = async (id) => {
        const ok = await showConfirm('Haqiqatdan ham bu rangni o\'chirmoqchimisiz?', { variant: 'error' })
        if (!ok) return
        try {
            await api.delete(`/api/colors/${id}`)
            const colRes = await api.get('/api/colors')
            setGlobalColors(colRes.data || [])
            showToast('Rang o\'chirildi', { type: 'success' })
        } catch (error) {
            showAlert('Xatolik: ' + (error.response?.data?.message || error.message), { variant: 'error' })
        }
    }

    const handleAddCategory = async () => {
        if (!newCategoryName) return
        try {
            const slug = newCategoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2,7)
            await api.post('/api/categories', { name_uz: newCategoryName, slug })
            setNewCategoryName('')
            const catRes = await api.get('/api/categories')
            setCategories(catRes.data || [])
            showToast('Kategoriya qo\'shildi', { type: 'success' })
        } catch (error) {
            showAlert('Xatolik: ' + (error.response?.data?.message || error.message), { variant: 'error' })
        }
    }

    const handleDeleteCategory = async (id) => {
        const ok = await showConfirm('Haqiqatdan ham o\'chirmoqchimisiz? Agar bu kategoriyaga tegishli mahsulotlar bo\'lsa, xatolik berishi mumkin.', { variant: 'error' })
        if (!ok) return
        try {
            await api.delete(`/api/categories/${id}`)
            const catRes = await api.get('/api/categories')
            setCategories(catRes.data || [])
            showToast('Kategoriya o\'chirildi', { type: 'success' })
            if (filterCategoryId === id) setFilterCategoryId('all')
        } catch (error) {
            showAlert('Xatolik: ' + (error.response?.data?.message || error.message), { variant: 'error' })
        }
    }

    const toggleProductColor = (colorName) => {
        setForm(prev => {
            const exists = prev.colors.includes(colorName)
            return { ...prev, colors: exists ? prev.colors.filter(c => c !== colorName) : [...prev.colors, colorName] }
        })
    }

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files)
        if (!files.length) return
        try {
            setUploading(true)
            const formData = new FormData()
            files.forEach(file => formData.append('files', file))
            formData.append('type', 'image')
            const res = await api.post('/api/upload/multiple', formData)
            if (res.data?.urls) {
                setForm(prev => ({ ...prev, images: [...prev.images, ...res.data.urls] }))
            }
        } catch (error) {
            showAlert('Fayl yuklashda xatolik', { variant: 'error' })
        } finally {
            setUploading(false)
        }
    }

    const openEditModal = (p) => {
        setEditId(p.id)
        setForm({
            name_uz: p.name_uz || p.name || '', 
            name_ru: p.name_ru || '', 
            name_en: p.name_en || '',
            price: String(p.price || ''), 
            categoryId: p.categoryId || '',
            description_uz: p.description_uz || p.description || '', 
            description_ru: p.description_ru || '', 
            description_en: p.description_en || '',
            isActive: p.isActive ?? true, 
            showInNew: p.showInNew ?? false,
            features: p.features || [], 
            images: p.images || [], 
            sku: p.sku || '',
            sortOrder: String(p.sortOrder || 0), 
            isKg: p.isKg ?? false,
            rating: String(p.rating || 4.5), 
            reviews: String(p.reviews || 0),
            colors: p.colors || [], 
            rope_weight_kg: String(p.rope_weight_kg || '')
        })
        setActiveTab('main')
        setIsModalOpen(true)
    }

    const handleBulkUpdateColors = async () => {
        if (selectedBulkColors.length === 0 && bulkAction !== 'replace') {
            showAlert('Iltimos, kamida bitta rangni tanlang', { variant: 'error' })
            return
        }

        const confirmMsg = filterCategoryId === 'all' 
            ? 'Barcha mahsulotlar uchun ranglar ommaviy yangilansinmi?' 
            : `Tanlangan kategoriyadagi barcha mahsulotlar uchun ranglar ${bulkAction === 'add' ? 'qo\'shilsinmi' : bulkAction === 'replace' ? 'almashtirilsinmi' : 'o\'chirilsinmi'}?`
        
        const ok = await showConfirm(confirmMsg, { variant: bulkAction === 'remove' ? 'error' : 'info' })
        if (!ok) return

        try {
            setLoading(true)
            await api.post('/api/products/bulk-colors', {
                categoryId: filterCategoryId === 'all' ? null : filterCategoryId,
                colors: selectedBulkColors,
                action: bulkAction
            })
            showAlert('Ommaviy yangilash muvaffaqiyatli yakunlandi', { variant: 'success' })
            setIsBulkColorModalOpen(false)
            setSelectedBulkColors([])
            loadData()
        } catch (error) {
            showAlert('Xatolik: ' + (error.response?.data?.message || error.message), { variant: 'error' })
        } finally {
            setLoading(false)
        }
    }

    const handleBulkUpdateContent = async () => {
        if (filterCategoryId === 'all') {
            showAlert('Iltimos, avval kategoriyani tanlang', { variant: 'error' })
            return
        }

        const ok = await showConfirm(`Tanlangan kategoriyadagi barcha mahsulotlar uchun tavsif va xususiyatlar yangilansinmi?`, { variant: 'info' })
        if (!ok) return

        try {
            setLoading(true)
            await api.post('/api/products/bulk-content', {
                categoryId: filterCategoryId,
                ...bulkContentForm
            })
            showAlert('Ommaviy yangilash muvaffaqiyatli yakunlandi', { variant: 'success' })
            setIsBulkContentModalOpen(false)
            setBulkContentForm({ description_uz: '', description_ru: '', description_en: '', features: [] })
            loadData()
        } catch (error) {
            showAlert('Xatolik: ' + (error.response?.data?.message || error.message), { variant: 'error' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen">
            <Header title="Mahsulotlar Katalogi" toggleSidebar={toggleSidebar} />

            <main className="relative z-10 p-4 lg:p-8 max-w-[1700px] mx-auto">
                
                {/* Stats Summary Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Jami Mahsulot', value: products.length, icon: Box, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                        { label: 'Kategoriyalar', value: categories.length, icon: Layers, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: 'Yangi Mahsulotlar', value: products.filter(p=>p.showInNew).length, icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                        { label: 'Sotuvda Yo\'q', value: products.filter(p=>!p.isActive).length, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    ].map((st, i) => (
                        <div key={i} className="bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-3xl p-6 hover:bg-white/[0.05] transition-all group">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-2">{st.label}</p>
                                    <h3 className="text-3xl font-black tracking-tighter">{st.value}</h3>
                                </div>
                                <div className={`p-4 ${st.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                                    <st.icon className={st.color} size={24} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Toolbar Section */}
                <div className="flex flex-col xl:flex-row gap-6 mb-10">
                    <div className="flex-1 flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input 
                                type="text" placeholder="Mahsulot nomi yoki SKU bo'yicha qidirish..."
                                className="w-full bg-white/[0.03] border border-white/5 focus:border-blue-500/50 rounded-3xl py-4 pl-14 pr-6 outline-none transition-all placeholder:text-white/10 font-medium"
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-4">
                            <div className="relative">
                                <button 
                                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                                    className="bg-white/[0.03] border border-white/5 rounded-3xl px-8 py-4 outline-none cursor-pointer font-bold text-sm hover:bg-white/10 transition-all flex items-center justify-between min-w-[240px] text-white/80"
                                >
                                    {filterCategoryId === 'all' ? 'Barcha Kategoriyalar' : categories.find(c => c.id === filterCategoryId)?.name_uz || 'Topilmadi'}
                                    <ChevronDown size={18} className={`transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isCategoryDropdownOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)} />
                                        <div className="absolute top-full mt-2 left-0 right-0 max-h-[300px] bg-[#0c0c14] border border-white/10 rounded-3xl shadow-4xl overflow-y-auto z-50 custom-scrollbar animate-in slide-in-from-top-2 duration-200">
                                            <button 
                                                onClick={() => { setFilterCategoryId('all'); setIsCategoryDropdownOpen(false) }}
                                                className={`w-full text-left px-6 py-4 text-sm font-bold transition-all ${filterCategoryId === 'all' ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                            >
                                                Barcha Kategoriyalar
                                            </button>
                                            {categories.map(cat => (
                                                <button 
                                                    key={cat.id}
                                                    onClick={() => { setFilterCategoryId(cat.id); setIsCategoryDropdownOpen(false) }}
                                                    className={`w-full text-left px-6 py-4 text-sm font-bold transition-all border-t border-white/5 ${filterCategoryId === cat.id ? 'bg-blue-600/20 text-blue-400' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                                                >
                                                    {cat.name_uz || cat.name}
                                                </button>
                                            ))}
                                            <div className="border-t border-white/10 p-2">
                                                <button 
                                                    onClick={() => { setIsCategoryDropdownOpen(false); setIsCategoryModalOpen(true) }}
                                                    className="w-full bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white rounded-2xl p-3 flex justify-center items-center gap-2 text-xs font-black uppercase tracking-widest transition-all"
                                                >
                                                    <Layers size={16} /> Boshqarish
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex bg-white/[0.03] rounded-3xl p-1 border border-white/5">
                                <button onClick={()=>setViewMode('table')} className={`p-3 rounded-2xl transition-all ${viewMode === 'table' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-white/30 hover:text-white'}`}><ListIcon size={20}/></button>
                                <button onClick={()=>setViewMode('grid')} className={`p-3 rounded-2xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'text-white/30 hover:text-white'}`}><LayoutGrid size={20}/></button>
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsColorLibraryOpen(true)}
                        className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-[#02020a] border border-emerald-500/20 px-8 py-4.5 rounded-3xl flex items-center justify-center gap-3 font-black shadow-2xl transition-all active:scale-95 group"
                    >
                        <Palette size={24} className="group-hover:rotate-12 transition-transform" />
                        <span className="tracking-tighter">RANGLAR</span>
                    </button>
                    {filterCategoryId !== 'all' && (
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setIsBulkColorModalOpen(true)}
                                className="bg-purple-600/10 hover:bg-purple-600 text-purple-500 hover:text-white border border-purple-500/20 px-8 py-4.5 rounded-3xl flex items-center justify-center gap-3 font-black shadow-2xl transition-all active:scale-95 group whitespace-nowrap"
                            >
                                <Palette size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="tracking-tighter uppercase">Ranglar</span>
                            </button>
                            <button 
                                onClick={() => setIsBulkContentModalOpen(true)}
                                className="bg-blue-600/10 hover:bg-blue-600 text-blue-500 hover:text-white border border-blue-500/20 px-8 py-4.5 rounded-3xl flex items-center justify-center gap-3 font-black shadow-2xl transition-all active:scale-95 group whitespace-nowrap"
                            >
                                <Layers size={24} className="group-hover:scale-110 transition-transform" />
                                <span className="tracking-tighter uppercase">Tavsif & Xususiyat</span>
                            </button>
                        </div>
                    )}
                    <button 
                        onClick={() => {
                            setEditId(null)
                            setForm({
                                name_uz: '', name_ru: '', name_en: '', price: '', categoryId: '',
                                description_uz: '', description_ru: '', description_en: '',
                                isActive: true, showInNew: false, features: [], images: [], sku: '',
                                sortOrder: '0', isKg: false, rating: '4.5', reviews: '12',
                                colors: [], rope_weight_kg: ''
                            })
                            setIsModalOpen(true)
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4.5 rounded-3xl flex items-center justify-center gap-3 font-black shadow-2xl shadow-blue-600/40 transition-all active:scale-95 group"
                    >
                        <Plus size={24} className="group-hover:rotate-90 transition-transform" />
                        <span className="tracking-tighter">YANGI MAHSULOT</span>
                    </button>
                </div>

                {/* Main Content Grid/Table */}
                {loading ? (
                    <div className="h-[400px] flex flex-col items-center justify-center gap-6 animate-pulse">
                        <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        <p className="text-white/30 font-black uppercase tracking-[0.3em]">Yuklanmoqda...</p>
                    </div>
                ) : filteredProducts.length > 0 ? (
                    viewMode === 'table' ? (
                        <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[3rem] border border-white/5 shadow-3xl overflow-hidden animate-in fade-in duration-700">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-white/5 text-[9px] font-black uppercase tracking-[0.4em] text-white/20 bg-white/[0.01]">
                                        <th className="p-10">Vizual</th>
                                        <th className="p-10">Asosiy Ma'lumot</th>
                                        <th className="p-10">Narxi</th>
                                        <th className="p-10">Ranglar</th>
                                        <th className="p-10 text-right">Boshqaruv</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredProducts.map(p => (
                                        <tr key={p.id} className="hover:bg-white/[0.02] transition-all group">
                                            <td className="p-8">
                                                <div onClick={() => p.images?.[0] && setPreviewImage(p.images[0])} className="cursor-pointer relative w-20 h-20 rounded-[1.8rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-1 group-hover:scale-110 transition-all shadow-xl group-hover:border-blue-500/40">
                                                    {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover rounded-[1.4rem]" alt={p.name_uz} /> : <ImageIcon size={28} className="text-white/5 m-auto mt-4" />}
                                                    {p.showInNew && <div className="absolute -top-2 -right-2 bg-amber-500 text-[#02020a] p-1.5 rounded-xl shadow-lg ring-4 ring-[#05050f]"><Zap size={14} fill="currentColor"/></div>}
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="text-xl font-bold text-white tracking-tighter mb-1.5 group-hover:text-blue-400 transition-colors">
                                                    {(p.name_uz || p.name || p.name_ru || p.name_en) || (p.sku ? `Mahsulot (${p.sku})` : 'Nomsiz Mahsulot')}
                                                </div>
                                                <div className="flex gap-2 items-center">
                                                    <span className="px-3 py-0.5 bg-white/5 rounded-lg border border-white/5 text-[10px] font-mono text-white/40 uppercase tracking-widest">{p.sku || 'KODSIZ'}</span>
                                                    <span className="text-[10px] text-white/10 font-black">•</span>
                                                    <span className="text-[10px] text-white/30 uppercase font-black tracking-widest">{(categories.find(c=>c.id===p.categoryId)?.name_uz || 'Turbo')}</span>
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="text-2xl font-black text-white tracking-widest mb-1">{Number(p.price).toLocaleString()} $</div>
                                                <div className="flex items-center gap-1.5 text-emerald-400/60 font-bold text-[10px] uppercase">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                                    Mavjud
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex flex-wrap gap-2 max-w-[200px]">
                                                    {p.colors?.slice(0, 4).map((c, i) => (
                                                        <div key={i} className="px-3 py-1 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black text-white/50 uppercase group/color hover:bg-blue-500/10 hover:text-blue-400 transition-all cursor-default">{c}</div>
                                                    ))}
                                                    {p.colors?.length > 4 && <div className="text-[10px] font-black text-white/10 mt-1">+{p.colors.length - 4}</div>}
                                                </div>
                                            </td>
                                            <td className="p-8">
                                                <div className="flex gap-3 justify-end opacity-40 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openEditModal(p)} className="p-4 bg-white/5 hover:bg-blue-500/20 text-white/40 hover:text-blue-400 rounded-2xl transition-all border border-white/5 active:scale-90"><Edit2 size={20} /></button>
                                                    <button onClick={() => handleDelete(p.id)} className="p-4 bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 rounded-2xl transition-all border border-white/5 active:scale-90"><Trash2 size={20} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 animate-in slide-in-from-bottom-6 duration-700">
                            {filteredProducts.map(p => (
                                <div key={p.id} className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] overflow-hidden hover:translate-y-[-10px] transition-all duration-500 shadow-2xl group relative">
                                    <div onClick={() => p.images?.[0] && setPreviewImage(p.images[0])} className="cursor-pointer aspect-[4/5] relative overflow-hidden bg-white/[0.01]">
                                        {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={p.name_uz} /> : <div className="w-full h-full flex items-center justify-center text-white/5 opacity-50"><ImageIcon size={64}/></div>}
                                        <div className="absolute top-6 left-6 flex flex-col gap-2">
                                            {p.showInNew && <span className="bg-amber-500 text-[#02020a] px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-1.5"><Zap size={10} fill="currentColor"/> Yangi</span>}
                                            <span className="bg-[#05050f]/80 backdrop-blur-md text-white/60 px-3 py-1 rounded-xl text-[10px] font-mono tracking-widest border border-white/5">{p.sku || 'KODSIZ'}</span>
                                        </div>
                                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#05050f] via-[#05050f]/80 to-transparent">
                                            <div className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-1.5">{(categories.find(c=>c.id===p.categoryId)?.name_uz || 'Element')}</div>
                                            <h4 className="text-xl font-bold text-white tracking-tighter leading-tight">
                                                {(p.name_uz || p.name || p.name_ru || p.name_en) || (p.sku ? `Mahsulot (${p.sku})` : 'Nomsiz')}
                                            </h4>
                                        </div>
                                        <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                            <button onClick={() => openEditModal(p)} className="p-5 bg-white text-[#02020a] rounded-full shadow-2xl hover:scale-110 transition-all"><Edit2 size={24}/></button>
                                            <button onClick={() => handleDelete(p.id)} className="p-5 bg-white text-red-600 rounded-full shadow-2xl hover:scale-110 transition-all"><Trash2 size={24}/></button>
                                        </div>
                                    </div>
                                    <div className="p-8 pt-0 flex justify-between items-center bg-[#05050f]">
                                        <div className="text-2xl font-black text-blue-400 tracking-tighter">{Number(p.price).toLocaleString()} $</div>
                                        <div className="flex items-center gap-1">
                                            <Star size={12} className="text-amber-500 fill-amber-500" />
                                            <span className="text-[11px] font-black text-white/60 uppercase">{p.rating || '4.5'}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="h-[400px] border-2 border-dashed border-white/5 rounded-[3rem] flex flex-col items-center justify-center text-white/10 uppercase font-black tracking-[0.5em] gap-6 animate-pulse">
                        <Box size={80} strokeWidth={1} />
                        Mahsulot topilmadi
                    </div>
                )}
            </main>

            {/* COLORS LIBRARY MODAL */}
            {isColorLibraryOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
                    <div className="absolute inset-0 bg-[#02020a]/90 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsColorLibraryOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-[#0c0c14] border border-emerald-500/10 rounded-[3.5rem] shadow-4xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-emerald-500/10 rounded-[1.5rem] text-emerald-500">
                                    <Palette size={28}/>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">RANGLAR KUTUBXONASI</h2>
                                    <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-[0.4em] mt-1">Barcha mahsulotlar uchun global ro'yxat</p>
                                </div>
                            </div>
                            <button onClick={() => setIsColorLibraryOpen(false)} className="p-4 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white"><X size={32}/></button>
                        </div>
                        
                        <div className="p-10 bg-emerald-500/5">
                            <div className="flex gap-4 w-full mb-8">
                                <input type="text" placeholder="Yangi rang nomi..." className="flex-1 bg-[#02020a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-emerald-500 text-white" value={newColorInput} onChange={e => setNewColorInput(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter') handleAddGlobalColor()}} />
                                <button type="button" onClick={handleAddGlobalColor} className="bg-emerald-600 hover:bg-emerald-500 text-[#02020a] px-8 rounded-2xl font-black shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest">QO'SHISH</button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                {globalColors.map((color) => (
                                    <div key={color.id} className="group relative p-6 rounded-[2rem] border-2 bg-white/[0.03] border-white/5 hover:border-emerald-500/30 transition-all flex flex-col items-center justify-center gap-3">
                                        <Palette size={20} className="text-emerald-500/50 group-hover:text-emerald-500 transition-colors" />
                                        <span className="text-xs font-black text-white uppercase tracking-widest text-center">{color.name}</span>
                                        <button onClick={() => handleDeleteGlobalColor(color.id)} className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transform scale-50 group-hover:scale-100 transition-all shadow-xl hover:bg-red-600">
                                            <MinusCircle size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CATEGORY LIBRARY MODAL */}
            {isCategoryModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 lg:p-8">
                    <div className="absolute inset-0 bg-[#02020a]/90 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsCategoryModalOpen(false)} />
                    <div className="relative w-full max-w-4xl bg-[#0c0c14] border border-blue-500/10 rounded-[3.5rem] shadow-4xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-500/10 rounded-[1.5rem] text-blue-500">
                                    <Layers size={28}/>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">KATEGORIYALAR KUTUBXONASI</h2>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.4em] mt-1">Barcha mahsulotlar uchun global ro'yxat</p>
                                </div>
                            </div>
                            <button onClick={() => setIsCategoryModalOpen(false)} className="p-4 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white"><X size={32}/></button>
                        </div>
                        
                        <div className="p-10 bg-blue-500/5">
                            <div className="flex gap-4 w-full mb-8">
                                <input type="text" placeholder="Yangi kategoriya nomi..." className="flex-1 bg-[#02020a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500 text-white" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={(e) => {if(e.key === 'Enter') handleAddCategory()}} />
                                <button type="button" onClick={handleAddCategory} className="bg-blue-600 hover:bg-blue-500 text-white px-8 rounded-2xl font-black shadow-xl active:scale-95 transition-all text-xs uppercase tracking-widest">QO'SHISH</button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                {categories.map((cat) => (
                                    <div key={cat.id} className="group relative p-6 rounded-[2rem] border border-white/5 bg-white/[0.03] hover:border-blue-500/30 transition-all flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center text-blue-500/50 group-hover:text-blue-500 transition-colors">
                                                <Layers size={18} />
                                            </div>
                                            <span className="text-sm font-bold text-white tracking-widest">{cat.name_uz || cat.name}</span>
                                        </div>
                                        <button onClick={() => handleDeleteCategory(cat.id)} className="p-2 bg-red-500 text-white rounded-full opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transform scale-50 group-hover:scale-100 transition-all shadow-xl hover:bg-red-600">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL-FEATURED ULTRA MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 lg:p-8">
                    <div className="absolute inset-0 bg-[#02020a]/90 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsModalOpen(false)} />
                    <div className="relative w-full max-w-6xl max-h-[92vh] bg-[#0c0c14] border border-white/10 rounded-[3.5rem] shadow-4xl flex flex-col overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
                        
                        {/* Header */}
                        <div className="px-10 py-10 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
                            <div className="flex items-center gap-8">
                                <div className="p-5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-[2.2rem] shadow-2xl shadow-blue-600/40">
                                    {editId ? <Edit2 size={32} className="text-white"/> : <Plus size={32} className="text-white"/>}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{editId ? 'MAHSULOTNI TAHRIRLASH' : 'YANGI MAHSULOT YARATISH'}</h2>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.4em] mt-1">Smart Inventory Management System</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${form.isActive ? 'bg-emerald-500 text-[#02020a]' : 'bg-rose-500 text-white'}`}>
                                    {form.isActive ? 'Aktiv' : 'Nofaol'}
                                </span>
                                <button onClick={() => setIsModalOpen(false)} className="p-4 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white"><X size={36}/></button>
                            </div>
                        </div>

                        {/* Navigation Tabs */}
                        <div className="px-10 py-6 flex gap-10 border-b border-white/5 bg-white/[0.01]">
                            {[
                                { id: 'main', label: 'Asosiy Ma\'lumot', icon: LayoutGrid },
                                { id: 'colors', label: 'Ranglar Kutubxonasi', icon: Palette },
                                { id: 'media', label: 'Media Galereya', icon: ImageIcon },
                                { id: 'specs', label: 'Xarakteristikalar', icon: ListIcon }
                            ].map(tab => (
                                <button 
                                    key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2.5 pb-4 transition-all relative ${activeTab === tab.id ? 'text-blue-500' : 'text-white/20 hover:text-white/60'}`}
                                >
                                    <tab.icon size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">{tab.label}</span>
                                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]" />}
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 overflow-y-auto custom-scrollbar flex-1 space-y-12">
                            
                            {/* TAB 1: MAIN INFO */}
                            {activeTab === 'main' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { lang: 'UZ', label: 'Nomi', key: 'name_uz' },
                                            { lang: 'RU', label: 'Название', key: 'name_ru' },
                                            { lang: 'EN', label: 'Name', key: 'name_en' }
                                        ].map(f => (
                                            <div key={f.key} className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4 group-focus-within:text-blue-500 transition-colors">{f.label} ({f.lang})</label>
                                                <input required={f.key==='name_uz'} type="text" className="w-full bg-white/[0.03] border border-white/5 rounded-[1.8rem] px-8 py-5 focus:border-blue-500/50 outline-none text-white font-bold transition-all hover:bg-white/[0.05]" value={form[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})} />
                                            </div>
                                        ))}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-10 bg-white/[0.01] rounded-[3rem] border border-white/5">
                                        <div className="md:col-span-2 space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">Kategoriya</label>
                                            <select className="w-full bg-blue-600/10 border border-blue-600/20 rounded-[1.8rem] px-8 py-5 focus:border-blue-500 outline-none font-black text-white text-lg appearance-none cursor-pointer" value={form.categoryId} onChange={e => setForm({...form, categoryId: e.target.value})} required>
                                                <option value="" className="bg-[#0c0c14]">Tanlang</option>
                                                {categories.map(cat => <option key={cat.id} value={cat.id} className="bg-[#0c0c14]">{cat.name_uz || cat.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">Narxi ($)</label>
                                            <input type="number" step="any" required className="w-full bg-white/[0.03] border border-white/5 rounded-[1.8rem] px-8 py-5 focus:border-blue-500 outline-none font-mono font-black text-blue-400 text-2xl shadow-inner" value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">SKU / KOD</label>
                                            <input type="text" className="w-full bg-white/[0.03] border border-white/5 rounded-[1.8rem] px-8 py-5 focus:border-blue-500 outline-none text-white font-mono font-bold text-lg" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-10 bg-white/[0.01] rounded-[3rem] border border-white/5">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">Reyting (0-5)</label>
                                            <input type="number" step="0.1" min="0" max="5" className="w-full bg-white/[0.03] border border-white/5 rounded-[1.8rem] px-8 py-5 focus:border-blue-500 outline-none text-white font-bold" value={form.rating} onChange={e => setForm({...form, rating: e.target.value})} />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">Sharhlar soni</label>
                                            <input type="number" className="w-full bg-white/[0.03] border border-white/5 rounded-[1.8rem] px-8 py-5 focus:border-blue-500 outline-none text-white font-bold" value={form.reviews} onChange={e => setForm({...form, reviews: e.target.value})} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        <div className="space-y-4">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-4">O'lchov Birligi</span>
                                            <div className="flex bg-white/[0.03] p-1.5 rounded-[1.8rem] border border-white/5">
                                                <button type="button" onClick={()=>setForm({...form, isKg:false})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${!form.isKg ? 'bg-blue-600 text-white shadow-xl' : 'text-white/20 hover:text-white/40'}`}>Dona</button>
                                                <button type="button" onClick={()=>setForm({...form, isKg:true})} className={`flex-1 py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${form.isKg ? 'bg-blue-600 text-white shadow-xl' : 'text-white/20 hover:text-white/40'}`}>Kilogramm</button>
                                            </div>
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-2 gap-4 pt-8">
                                            <label className="flex items-center gap-4 cursor-pointer group bg-white/[0.02] border border-white/5 p-4 rounded-[1.8rem] hover:bg-white/[0.05] transition-all">
                                                <div className={`w-12 h-6 rounded-full relative transition-all ${form.isActive ? 'bg-emerald-600' : 'bg-white/10'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.isActive ? 'left-7' : 'left-1'}`} />
                                                </div>
                                                <input type="checkbox" hidden checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Sotuvda Mavjud</span>
                                            </label>
                                            <label className="flex items-center gap-4 cursor-pointer group bg-white/[0.02] border border-white/5 p-4 rounded-[1.8rem] hover:bg-white/[0.05] transition-all">
                                                <div className={`w-12 h-6 rounded-full relative transition-all ${form.showInNew ? 'bg-amber-600' : 'bg-white/10'}`}>
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.showInNew ? 'left-7' : 'left-1'}`} />
                                                </div>
                                                <input type="checkbox" hidden checked={form.showInNew} onChange={e => setForm({...form, showInNew: e.target.checked})} />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Yangi Mahsulot</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: COLORS */}
                            {activeTab === 'colors' && (
                                <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-500">
                                    <div className="bg-emerald-500/5 p-12 rounded-[4rem] border border-emerald-500/10 shadow-3xl">
                                        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
                                            <div>
                                                <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Ranglar Ta'mirlash</h3>
                                                <p className="text-xs text-white/30 uppercase font-black tracking-widest mt-1">Global kutubxonadan tanlang yoki yangi qo'shing</p>
                                            </div>
                                            <div className="flex gap-4 w-full md:w-auto">
                                                <input type="text" placeholder="Yangi rang..." className="flex-1 md:min-w-[300px] bg-[#02020a] border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-emerald-500" value={newColorInput} onChange={e => setNewColorInput(e.target.value)} />
                                                <button type="button" onClick={handleAddGlobalColor} className="bg-emerald-600 hover:bg-emerald-500 text-[#02020a] p-4 rounded-2xl shadow-xl active:scale-95 transition-all"><PlusCircle size={32} /></button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                            {globalColors.map((color) => (
                                                <button 
                                                    key={color.id} type="button" onClick={() => toggleProductColor(color.name)}
                                                    className={`group relative p-6 rounded-[2rem] border-2 transition-all flex flex-col items-center justify-center gap-3 ${form.colors.includes(color.name) ? 'bg-emerald-600 border-emerald-400 shadow-2xl scale-105' : 'bg-white/[0.03] border-white/5 hover:border-white/20'}`}
                                                >
                                                    <Palette size={20} className={form.colors.includes(color.name) ? 'text-white' : 'text-white/20'} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest text-center ${form.colors.includes(color.name) ? 'text-white' : 'text-white/40'}`}>{color.name}</span>
                                                    {form.colors.includes(color.name) && <div className="absolute top-3 right-3 bg-white text-emerald-600 rounded-full p-0.5"><Check size={10} strokeWidth={4}/></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: MEDIA */}
                            {activeTab === 'media' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="p-10 bg-white/[0.02] rounded-[3.5rem] border border-white/5">
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="flex items-center gap-4">
                                                <ImageIcon size={28} className="text-blue-500" />
                                                <h4 className="text-lg font-black uppercase tracking-tight">Galereya (Maks 10 ta rasm)</h4>
                                            </div>
                                            <label className="bg-blue-600 hover:bg-blue-500 text-white px-10 py-4 rounded-[1.5rem] text-xs font-black tracking-[0.2em] cursor-pointer shadow-xl transition-all uppercase active:scale-95">
                                                RASMLARNI YUKLASH
                                                <input type="file" multiple hidden onChange={e => handleFileUpload(e)} accept="image/*"/>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 2xl:grid-cols-6 gap-6">
                                            {form.images.map((img, idx) => (
                                                <div key={idx} className="relative group aspect-square rounded-[2rem] overflow-hidden bg-white/5 border border-white/10 shadow-2xl animate-in zoom-in">
                                                    <img src={img} className="w-full h-full object-cover transition-transform group-hover:scale-125" alt={`Product image ${idx}`} />
                                                    <div className="absolute inset-0 bg-red-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                                        <button type="button" onClick={() => setForm({...form, images: form.images.filter((_, i) => i !== idx)})} className="p-4 bg-white text-red-600 rounded-full shadow-2xl"><Trash2 size={24} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {form.images.length === 0 && Array.from({length:3}).map((_,i)=>(
                                                <div key={i} className="aspect-square border-2 border-dashed border-white/5 rounded-[2rem] flex items-center justify-center text-white/5"><Plus size={32}/></div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: SPECS */}
                            {activeTab === 'specs' && (
                                <div className="space-y-12 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                        <div className="space-y-8 p-10 bg-white/[0.02] rounded-[3.5rem] border border-white/5">
                                            <div className="flex items-center gap-4 mb-4">
                                                <Package size={24} className="text-blue-500" />
                                                <span className="text-xs font-black uppercase tracking-widest text-white/40">Xususiyat Qo'shish</span>
                                            </div>
                                            <div className="space-y-5">
                                                <input type="text" placeholder="Kalit (masalan: Material)" className="w-full bg-[#02020a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500" value={newFeature.k} onChange={e => setNewFeature({...newFeature, k: e.target.value})} />
                                                <textarea rows="3" placeholder="Qiymati..." className="w-full bg-[#02020a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-blue-500" value={newFeature.v} onChange={e => setNewFeature({...newFeature, v: e.target.value})} />
                                                <button type="button" onClick={() => { if(newFeature.k && newFeature.v) { setForm({...form, features: [...form.features, { k: newFeature.k, v: newFeature.v }]}); setNewFeature({k:'', v:''}); } }} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">RO'YXATGA QO'SHISH</button>
                                            </div>
                                        </div>
                                        <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-4">
                                            {form.features.map((f, i) => (
                                                <div key={i} className="flex justify-between items-center p-6 bg-white/[0.03] rounded-[2rem] border border-white/5 group hover:border-blue-500/20 transition-all">
                                                    <div>
                                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-1">{f.k}</span>
                                                        <span className="text-sm font-bold text-white uppercase">{f.v}</span>
                                                    </div>
                                                    <button type="button" onClick={() => setForm({...form, features: form.features.filter((_, idx) => idx !== i)})} className="p-3 bg-red-500/10 text-red-500 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"><X size={18} /></button>
                                                </div>
                                            ))}
                                            {form.features.length === 0 && <div className="h-[200px] flex items-center justify-center text-white/5 font-black uppercase text-[10px] tracking-widest border border-dashed border-white/5 rounded-[2rem]">Hali xususiyatlar yo'q</div>}
                                        </div>
                                    </div>

                                    {/* Multilingual Descriptions Section */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                        {[
                                            { lang: 'UZ', key: 'description_uz', label: 'Batafsil Tavsif' },
                                            { lang: 'RU', key: 'description_ru', label: 'Подробное описание' },
                                            { lang: 'EN', key: 'description_en', label: 'Full Description' }
                                        ].map(d => (
                                            <div key={d.key} className="space-y-4">
                                                <div className="flex items-center gap-3 ml-4">
                                                    <MessageSquare size={16} className="text-white/20" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20">{d.label} ({d.lang})</span>
                                                </div>
                                                <textarea rows="6" className="w-full bg-white/[0.03] border border-white/5 rounded-[2rem] px-8 py-6 text-sm font-medium outline-none focus:border-blue-500 transition-all" value={form[d.key]} onChange={e => setForm({...form, [d.key]: e.target.value})} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Sticky Footer */}
                            <div className="sticky bottom-0 bg-[#0c0c14] pt-10 pb-2 mt-auto border-t border-white/5 flex justify-end gap-6 shadow-[0_-30px_60px_-15px_rgba(0,0,0,0.8)]">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-14 py-5 rounded-[2rem] font-black text-white/20 hover:text-white hover:bg-white/5 transition-all text-sm uppercase tracking-[0.4em] active:scale-95">BEKOR QILISH</button>
                                <button type="submit" disabled={uploading} className="px-24 py-5 rounded-[2.5rem] bg-blue-600 hover:bg-blue-500 text-white font-black shadow-4xl shadow-blue-600/50 disabled:opacity-50 transition-all flex items-center gap-5 uppercase tracking-tighter text-xl active:scale-95 group">
                                    {uploading ? (
                                        <div className="flex items-center gap-3">
                                            <div className="animate-spin rounded-full h-6 w-6 border-4 border-white/20 border-t-white" />
                                            <span className="text-sm">SAQLANMOQDA...</span>
                                        </div>
                                    ) : (
                                        <>
                                            <Save size={28} className="group-hover:-translate-y-1 transition-transform" />
                                            TASDIQLASH VA SAQLASH
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* BULK COLOR MANAGEMENT MODAL */}
            {isBulkColorModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#02020a]/95 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsBulkColorModalOpen(false)} />
                    <div className="relative w-full max-w-2xl max-h-[85vh] bg-[#0c0c14] border border-blue-500/20 rounded-[2.5rem] shadow-4xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
                        
                        {/* Compact Header */}
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                                    <Palette size={22}/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-black uppercase tracking-tight text-white">Ommaviy Ranglar</h2>
                                    <p className="text-[9px] text-purple-400/60 font-black uppercase tracking-[0.2em]">
                                        Kategoriya: <span className="text-white ml-1">{categories.find(c => String(c.id) === String(filterCategoryId))?.name_uz || 'Barchasi'}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsBulkColorModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            {/* Action Selector - Modern Chips style */}
                            <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border border-white/5 gap-1">
                                {[
                                    { id: 'add', label: 'Qo\'shish', color: 'bg-emerald-600', hover: 'hover:text-emerald-400' },
                                    { id: 'replace', label: 'Almashtirish', color: 'bg-blue-600', hover: 'hover:text-blue-400' },
                                    { id: 'remove', label: 'O\'chirish', color: 'bg-rose-600', hover: 'hover:text-rose-400' }
                                ].map(action => (
                                    <button 
                                        key={action.id}
                                        type="button"
                                        onClick={() => setBulkAction(action.id)}
                                        className={`flex-1 py-3 items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bulkAction === action.id ? `${action.color} text-white shadow-xl scale-[1.02]` : `text-white/20 ${action.hover} hover:bg-white/5`}`}
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>

                            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center">
                                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                                    {bulkAction === 'add' ? 'Har bir mahsulotga yangi ranglarni qo\'shadi (mavjudlari qoladi)' : 
                                     bulkAction === 'replace' ? 'Mavjud barcha ranglarni o\'chirib, yangilarini qo\'yadi' : 
                                     'Tanlangan ranglarni barcha mahsulotlardan o\'chirib tashlaydi'}
                                </p>
                            </div>

                            {/* Colors Grid - More Compact & High Contrast */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {globalColors.map((color) => {
                                    const isSel = selectedBulkColors.includes(color.name)
                                    return (
                                        <button 
                                            key={color.id}
                                            type="button"
                                            onClick={() => {
                                                const exists = selectedBulkColors.includes(color.name)
                                                setSelectedBulkColors(exists ? selectedBulkColors.filter(c => c !== color.name) : [...selectedBulkColors, color.name])
                                            }}
                                            className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${isSel ? 'bg-purple-600 border-purple-400 shadow-lg' : 'bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.05]'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isSel ? 'bg-white' : 'bg-purple-500/40'}`} />
                                            <span className={`text-[11px] font-black uppercase tracking-wide truncate ${isSel ? 'text-white' : 'text-white/50'}`}>
                                                {color.name}
                                            </span>
                                            {isSel && (
                                                <div className="ml-auto bg-white/20 p-1 rounded-md">
                                                    <Check size={10} strokeWidth={4} className="text-white"/>
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Sticky Footer Action */}
                        <div className="p-8 border-t border-white/5 bg-white/[0.01]">
                            <button 
                                onClick={handleBulkUpdateColors}
                                className="w-full py-5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.4em] shadow-4xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                            >
                                <Save size={20} className="group-hover:translate-x-1 transition-transform" />
                                Tasdiqlash va Saqlash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK CONTENT MANAGEMENT MODAL */}
            {isBulkContentModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#02020a]/95 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setIsBulkContentModalOpen(false)} />
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0c0c14] border border-blue-500/20 rounded-[3rem] shadow-4xl flex flex-col overflow-hidden animate-in zoom-in duration-500">
                        
                        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-blue-500/20 rounded-2xl text-blue-400">
                                    <Layers size={28}/>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Ommaviy Tavsif & Xususiyat</h2>
                                    <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.4em] mt-1">
                                        Kategoriya: <span className="text-white ml-1">{categories.find(c => String(c.id) === String(filterCategoryId))?.name_uz || 'Barchasi'}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setIsBulkContentModalOpen(false)} className="p-4 hover:bg-white/5 rounded-full transition-all text-white/20 hover:text-white"><X size={32}/></button>
                        </div>
                        
                        <div className="p-10 space-y-10 overflow-y-auto custom-scrollbar flex-1">
                            {/* Multilingual Descriptions */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {[
                                    { lang: 'UZ', key: 'description_uz', label: 'Batafsil Tavsif' },
                                    { lang: 'RU', key: 'description_ru', label: 'Описание' },
                                    { lang: 'EN', key: 'description_en', label: 'Description' }
                                ].map(d => (
                                    <div key={d.key} className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-white/20 ml-2">{d.label} ({d.lang})</label>
                                        <textarea 
                                            rows="8" 
                                            className="w-full bg-white/[0.03] border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-blue-500 transition-all text-white" 
                                            placeholder="..."
                                            value={bulkContentForm[d.key]} 
                                            onChange={e => setBulkContentForm({...bulkContentForm, [d.key]: e.target.value})} 
                                        />
                                    </div>
                                ))}
                            </div>

                            {/* Features Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 p-10 bg-white/[0.01] rounded-[3rem] border border-white/5">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 mb-2">
                                        <Package size={20} className="text-blue-500" />
                                        <span className="text-xs font-black uppercase tracking-widest text-white/40">Xususiyat Qo'shish</span>
                                    </div>
                                    <input 
                                        type="text" placeholder="Kalit (masalan: Material)" 
                                        className="w-full bg-[#02020a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-500 text-white" 
                                        value={newBulkFeature.k} onChange={e => setNewBulkFeature({...newBulkFeature, k: e.target.value})} 
                                    />
                                    <textarea 
                                        rows="2" placeholder="Qiymati..." 
                                        className="w-full bg-[#02020a] border border-white/5 rounded-2xl px-6 py-4 text-sm font-medium outline-none focus:border-blue-500 text-white" 
                                        value={newBulkFeature.v} onChange={e => setNewBulkFeature({...newBulkFeature, v: e.target.value})} 
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => { if(newBulkFeature.k && newBulkFeature.v) { setBulkContentForm({...bulkContentForm, features: [...bulkContentForm.features, { k: newBulkFeature.k, v: newBulkFeature.v }]}); setNewBulkFeature({k:'', v:''}); } }} 
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all"
                                    >
                                        QO'SHISH
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                                    {bulkContentForm.features.map((f, i) => (
                                        <div key={i} className="flex justify-between items-center p-4 bg-white/[0.03] rounded-2xl border border-white/5 group hover:border-blue-500/20 transition-all">
                                            <div>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/20 block mb-0.5">{f.k}</span>
                                                <span className="text-xs font-bold text-white uppercase">{f.v}</span>
                                            </div>
                                            <button type="button" onClick={() => setBulkContentForm({...bulkContentForm, features: bulkContentForm.features.filter((_, idx) => idx !== i)})} className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><X size={16} /></button>
                                        </div>
                                    ))}
                                    {bulkContentForm.features.length === 0 && <div className="h-[150px] flex items-center justify-center text-white/5 font-black uppercase text-[10px] tracking-widest border border-dashed border-white/5 rounded-2xl text-center p-4">Ommaviy xususiyatlar ro'yxati bo'sh</div>}
                                </div>
                            </div>

                            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                <p className="text-[11px] text-amber-400 font-bold uppercase tracking-widest text-center leading-relaxed">
                                    DIQQAT: Ushbu amallarni bajargandan so'ng, tanlangan kategoriyadagi BARCHA mahsulotlarning tavsiflari va xususiyatlari yuqoridagilarga O'ZGARTIRILADI. Bu amalni ortga qaytarib bo'lmaydi.
                                </p>
                            </div>
                        </div>

                        <div className="p-10 border-t border-white/5 bg-white/[0.01]">
                            <button 
                                onClick={handleBulkUpdateContent}
                                className="w-full py-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.4em] shadow-4xl shadow-blue-600/20 transition-all active:scale-95 flex items-center justify-center gap-4 group"
                            >
                                <Save size={24} className="group-hover:translate-x-1 transition-transform" />
                                Barchasini Yangilash
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN IMAGE PREVIEW MODAL */}
            {previewImage && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-[#02020a]/95 backdrop-blur-3xl" onClick={() => setPreviewImage(null)} />
                    <div className="relative max-w-5xl max-h-full flex items-center justify-center">
                        <img src={previewImage} className="max-w-full max-h-[90vh] object-contain rounded-3xl shadow-4xl animate-in zoom-in duration-500" alt="Full Preview" />
                        <button onClick={() => setPreviewImage(null)} className="absolute -top-12 right-0 md:-top-5 md:-right-12 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all">
                            <X size={32} />
                        </button>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 20px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(37, 99, 235, 0.2); }
                .animate-pulse { animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
                @keyframes pulse { 0%, 100% { opacity: 0.1; } 50% { opacity: 0.3; } }
                .shadow-4xl { shadow-box: 0 40px 100px -20px rgba(0, 0, 0, 0.7); }
            `}</style>
        </div>
    )
}
