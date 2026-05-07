'use client'

import { useState, useEffect } from 'react'
import { Shield, User, Mail, Calendar, Edit, Trash2, Save, X, Loader2, CheckCircle, AlertTriangle, Users, UserPlus, Lock, Key, Settings as SettingsIcon } from 'lucide-react'
import { useDialog } from '@/context/DialogContext'
import Header from '@/components/Header'

const ROLES = [
    { value: 'ADMIN', label: 'Admin', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
    { value: 'CRM', label: 'CRM Menejer', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { value: 'ERP', label: 'ERP Menejer', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
    { value: 'SELLER', label: 'Sotuvchi', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
    { value: 'MOBILE_INTAKE', label: 'Omborxona', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
    { value: 'USER', label: 'Foydalanuvchi', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
]

export default function SettingsPage() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editRole, setEditRole] = useState('')
    const [saving, setSaving] = useState(false)
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [newUserForm, setNewUserForm] = useState({
        fullname: '',
        email: '',
        password: '',
        role: 'USER'
    })
    const { showAlert, showConfirm } = useDialog()

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('nuurhome_token')
            const response = await fetch(`${apiUrl}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            if (!response.ok) throw new Error('Foydalanuvchilarni yuklab bo\'lmadi')
            const data = await response.json()
            setUsers(data)
        } catch (error) {
            console.error(error)
            showAlert('Xatolik yuz berdi: ' + error.message, { variant: 'error' })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleAddUser = async (e) => {
        e.preventDefault()
        try {
            setSaving(true)
            const response = await fetch(`${apiUrl}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newUserForm)
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.message || 'Foydalanuvchini qo\'shib bo\'lmadi')
            }
            
            await showAlert('Foydalanuvchi muvaffaqiyatli qo\'shildi', { variant: 'success' })
            setIsAddModalOpen(false)
            setNewUserForm({ fullname: '', email: '', password: '', role: 'USER' })
            fetchUsers()
        } catch (error) {
            showAlert(error.message, { variant: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateRole = async (userId) => {
        try {
            setSaving(true)
            const token = localStorage.getItem('nuurhome_token')
            const response = await fetch(`${apiUrl}/users/${userId}/role`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ role: editRole })
            })

            if (!response.ok) throw new Error('Rolni yangilab bo\'lmadi')
            
            await showAlert('Foydalanuvchi roli muvaffaqiyatli o\'zgartirildi', { variant: 'success' })
            setEditingId(null)
            fetchUsers()
        } catch (error) {
            showAlert(error.message, { variant: 'error' })
        } finally {
            setSaving(false)
        }
    }

    const handleDeleteUser = async (userId, name) => {
        if (!(await showConfirm(`${name} foydalanuvchisini tizimdan butunlay o'chirib tashlamoqchimisiz?`, { variant: 'warning' }))) return

        try {
            const token = localStorage.getItem('nuurhome_token')
            const response = await fetch(`${apiUrl}/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) throw new Error('Foydalanuvchini o\'chirib bo\'lmadi')
            
            showAlert('Foydalanuvchi tizimdan o\'chirildi', { variant: 'success' })
            fetchUsers()
        } catch (error) {
            showAlert(error.message, { variant: 'error' })
        }
    }

    const getRoleLabel = (roleValue) => {
        const role = ROLES.find(r => r.value === roleValue)
        return role ? role.label : roleValue
    }

    const getRoleColor = (roleValue) => {
        const role = ROLES.find(r => r.value === roleValue)
        return role ? role.color : 'text-slate-400 bg-slate-500/10'
    }

    return (
        <div className="min-h-screen pb-20 animate-in fade-in duration-1000">
            <Header title="Sozlamalar" />

            <div className="max-w-[1400px] mx-auto px-4 md:px-0 mt-8 space-y-10">
                {/* Top Section: Info & Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[100px] -z-10 group-hover:scale-125 transition-transform duration-1000"></div>
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-600/40">
                                <Shield size={40} />
                            </div>
                            <div className="text-center md:text-left">
                                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2 uppercase italic">Rolni Boshqarish Markazi</h2>
                                <p className="text-white/40 text-sm md:text-base font-medium max-w-xl">
                                    Tizim xavfsizligini ta'minlash uchun har bir xodimga tegishli rollarni biriktiring. Har bir rol tizimning ma'lum qismlariga kirish huquqini beradi.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-center items-center text-center">
                        <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-500 mb-4">
                            <Users size={32} />
                        </div>
                        <p className="text-3xl font-black text-white mb-1 tracking-tighter">{users.length}</p>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">Jami Foydalanuvchilar</p>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
                    <div className="p-8 md:p-10 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40">
                                <SettingsIcon size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Foydalanuvchilar Ro'yxati</h3>
                                <p className="text-xs font-bold text-white/20 uppercase tracking-widest mt-1">Tizim xodimlari va huquqlari</p>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsAddModalOpen(true)}
                            className="group flex items-center gap-3 px-6 py-4 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-2xl transition-all shadow-xl shadow-blue-600/20 active:scale-95 uppercase tracking-widest"
                        >
                            <UserPlus size={20} className="group-hover:scale-110 transition-transform" />
                            Qo'shish
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/[0.01]">
                                    <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Xodim Ma'lumotlari</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Tizimdagi Roli</th>
                                    <th className="px-10 py-6 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] text-right">Boshqaruv</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {loading ? (
                                    <tr>
                                        <td colSpan="3" className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-6">
                                                <div className="relative">
                                                    <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                                                    <Loader2 className="absolute inset-0 m-auto text-blue-600 animate-pulse" size={24} />
                                                </div>
                                                <p className="text-xs text-white/20 font-black uppercase tracking-[0.3em]">Ma'lumotlar yuklanmoqda...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-10 py-32 text-center">
                                            <div className="flex flex-col items-center gap-4 text-white/10">
                                                <User size={64} strokeWidth={1} />
                                                <p className="text-sm font-black uppercase tracking-[0.2em]">Hali foydalanuvchilar yo'q</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : users.map((user) => (
                                    <tr key={user.id} className="group hover:bg-white/[0.02] transition-all duration-500">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-slate-800 to-slate-900 border border-white/5 flex items-center justify-center text-white/20 group-hover:from-blue-600 group-hover:to-indigo-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-blue-600/20 transition-all duration-700">
                                                    <User size={24} />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tight text-lg">{user.fullname}</p>
                                                    <div className="flex items-center gap-2 mt-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
                                                        <Mail size={12} className="text-blue-500" />
                                                        <p className="text-xs font-bold text-white/60">{user.email}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            {editingId === user.id ? (
                                                <div className="relative w-48">
                                                    <select
                                                        value={editRole}
                                                        onChange={(e) => setEditRole(e.target.value)}
                                                        className="w-full bg-slate-900 border-2 border-blue-600/50 rounded-2xl px-4 py-3 text-sm text-white font-bold focus:outline-none focus:border-blue-500 transition-all appearance-none"
                                                    >
                                                        {ROLES.map(r => (
                                                            <option key={r.value} value={r.value} className="bg-slate-900">{r.label}</option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none" size={16} />
                                                </div>
                                            ) : (
                                                <span className={`inline-flex items-center px-4 py-2 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest shadow-xl ${getRoleColor(user.role)}`}>
                                                    {getRoleLabel(user.role)}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0">
                                                {editingId === user.id ? (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateRole(user.id)}
                                                            disabled={saving}
                                                            className="p-3 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-2xl transition-all shadow-xl shadow-emerald-500/10"
                                                        >
                                                            {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingId(null)}
                                                            className="p-3 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white border border-white/10 rounded-2xl transition-all"
                                                        >
                                                            <X size={20} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(user.id)
                                                                setEditRole(user.role)
                                                            }}
                                                            className="p-3 bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20 rounded-2xl transition-all shadow-xl shadow-blue-600/10"
                                                        >
                                                            <Edit size={20} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteUser(user.id, user.fullname)}
                                                            className="p-3 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white border border-rose-500/20 rounded-2xl transition-all shadow-xl shadow-rose-600/10"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </>
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

            {/* Add User Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <div 
                        className="absolute inset-0 bg-[#02020a]/90 backdrop-blur-xl transition-opacity duration-700" 
                        onClick={() => setIsAddModalOpen(false)}
                    />
                    <div className="relative w-full max-w-lg bg-[#0a0a1a] border border-white/10 rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 fade-in duration-500 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 blur-3xl -z-10"></div>
                        
                        <div className="flex items-center justify-between mb-10">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-blue-600/20">
                                    <UserPlus size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight italic uppercase">Yangi Xodim</h3>
                                    <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mt-1">Tizimga kirish huquqini yaratish</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsAddModalOpen(false)}
                                className="p-3 bg-white/5 text-white/40 hover:text-white rounded-2xl transition-all hover:bg-white/10"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleAddUser} className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">To'liq Ism (F.I.SH)</label>
                                <div className="relative group">
                                    <User className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input 
                                        type="text" 
                                        required
                                        value={newUserForm.fullname}
                                        onChange={e => setNewUserForm({...newUserForm, fullname: e.target.value})}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-3xl pl-14 pr-6 py-5 text-white placeholder-white/10 focus:outline-none focus:border-blue-600/50 focus:bg-white/5 transition-all text-lg font-bold"
                                        placeholder="Ism Familiya"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Email yoki Login</label>
                                <div className="relative group">
                                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input 
                                        type="email" 
                                        required
                                        value={newUserForm.email}
                                        onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-3xl pl-14 pr-6 py-5 text-white placeholder-white/10 focus:outline-none focus:border-blue-600/50 focus:bg-white/5 transition-all text-lg font-bold"
                                        placeholder="email@nuurhome.uz"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Parol (Kamida 6 ta belgi)</label>
                                <div className="relative group">
                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <input 
                                        type="password" 
                                        required
                                        minLength={6}
                                        value={newUserForm.password}
                                        onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-3xl pl-14 pr-6 py-5 text-white placeholder-white/10 focus:outline-none focus:border-blue-600/50 focus:bg-white/5 transition-all text-lg font-bold"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">Biriktiriladigan Rol</label>
                                <div className="relative group">
                                    <Shield className="absolute left-5 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={20} />
                                    <select 
                                        value={newUserForm.role}
                                        onChange={e => setNewUserForm({...newUserForm, role: e.target.value})}
                                        className="w-full bg-white/[0.03] border border-white/5 rounded-3xl pl-14 pr-6 py-5 text-white focus:outline-none focus:border-blue-600/50 focus:bg-white/5 transition-all text-lg font-bold appearance-none cursor-pointer"
                                    >
                                        {ROLES.map(r => (
                                            <option key={r.value} value={r.value} className="bg-slate-950">{r.label}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none" size={20} />
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={saving}
                                className="w-full py-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-[0.3em] rounded-[1.5rem] shadow-2xl shadow-blue-600/40 transition-all mt-6 active:scale-95 flex items-center justify-center gap-3"
                            >
                                {saving ? <Loader2 className="animate-spin" size={24} /> : (
                                    <>
                                        <CheckCircle size={24} />
                                        Tizimga Qo'shish
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

function ChevronDown({ className, size }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="m6 9 6 6 6-6"/>
        </svg>
    )
}
