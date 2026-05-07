'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useDialog } from '@/context/DialogContext'
import { normalizeRole } from '@/lib/authRole'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()
    const { showAlert } = useDialog()

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleLogin = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
            const response = await fetch(`${apiUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Kirishda xato')
            }

            localStorage.setItem('nuurhome_token', result.token)
            localStorage.setItem('nuurhome_user', JSON.stringify(result.user))

            const role = normalizeRole(result.user.role)
            const isMobileScreen = window.innerWidth < 768
            let target = '/'
            
            if (role !== 'admin') {
                // Admin bo'lmaganlar har doim mobil versiyaga
                target = '/mobile'
            } else {
                // Adminlar ekran o'lchamiga qarab yo'naltiriladi
                if (isMobileScreen) {
                    target = '/mobile'
                } else {
                    target = '/'
                }
            }
            
            router.push(target)
            setTimeout(() => {
                window.location.reload()
            }, 500)
        } catch (error) {
            await showAlert(String(error.message), {
                title: 'Kirishda xatolik',
                variant: 'error',
            })
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050515] overflow-hidden relative">
            {/* Animated Background Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-[30%] right-[20%] w-[100px] h-[100px] bg-purple-500/10 rounded-full blur-[40px]"></div>

            <div className={`w-full max-w-[420px] transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                {/* Main Card */}
                <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-10 overflow-hidden group">
                    {/* Top Glow Edge */}
                    <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                    <div className="text-center mb-10">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                            <div className="relative w-20 h-20 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-[1px] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                                <div className="w-full h-full bg-[#050515] rounded-2xl flex items-center justify-center">
                                    <img src="/favicon.svg" alt="NuurHome" className="w-12 h-12 object-contain" />
                                </div>
                            </div>
                        </div>
                        <h1 className="text-4xl font-black text-white mb-3 tracking-tight">NUUR <span className="text-blue-500 font-medium">HOME</span></h1>
                        <p className="text-white/40 text-sm font-light tracking-widest uppercase">Boshqaruv Tizimi</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/50 ml-4 uppercase tracking-wider">Email Manzil</label>
                            <div className="relative group/field">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within/field:text-blue-400 transition-colors">
                                    <Mail size={18} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-white/20 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all duration-300"
                                    placeholder="manager@nuurhome.uz"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-white/50 ml-4 uppercase tracking-wider">Parol</label>
                            <div className="relative group/field">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30 group-focus-within/field:text-blue-400 transition-colors">
                                    <Lock size={18} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-white/[0.05] border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-white/20 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all duration-300"
                                    placeholder="••••••••"
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-white/20 hover:text-white/40 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group/btn mt-4 relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl transition-all duration-300 group-hover/btn:scale-110"></div>
                            <div className="relative flex items-center justify-center py-4 text-white font-bold tracking-wide transition-all group-active/btn:scale-95 disabled:opacity-50">
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        Tizimga Kirish <ArrowRight size={18} className="translate-x-0 group-hover/btn:translate-x-1 transition-transform" />
                                    </span>
                                )}
                            </div>
                        </button>
                    </form>

                    <div className="mt-10 flex items-center justify-center gap-4">
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                        <span className="text-[10px] text-white/20 uppercase tracking-[0.2em]">&copy; 2026 NuurHome</span>
                        <div className="h-[1px] flex-1 bg-white/5"></div>
                    </div>
                </div>

                {/* Footer Hint */}
                <div className="mt-6 text-center">
                    <p className="text-white/30 text-xs font-light">
                        Qurilmangiz orqali xavfsiz boshqaruv. <br/> 
                        <span className="text-blue-500/50">Version 2.0 (Custom Backend)</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
