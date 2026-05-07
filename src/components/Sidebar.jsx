'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    LayoutGrid,
    Package,
    ShoppingCart,
    Users,
    Settings,
    LogOut,
    MessageSquare,
    BarChart3,
    Layers,
    Globe,
    Briefcase,
    Zap,
    ChevronRight,
    Activity
} from 'lucide-react'

const MENU_ITEMS = [
    { name: 'Dashboard', icon: LayoutGrid, href: '/', roles: ['admin', 'erp', 'crm'] },
    { name: 'Media fayllar', icon: Layers, href: '/media', roles: ['admin', 'crm'] },
    { name: 'Mahsulotlar', icon: Package, href: '/mahsulotlar', roles: ['admin', 'erp', 'crm'] },
    { name: 'Ombor', icon: Briefcase, href: '/ombor', roles: ['admin', 'erp'] },
    { name: 'Buyurtmalar', icon: ShoppingCart, href: '/buyurtmalar', roles: ['admin', 'erp', 'crm', 'seller'] },
    { name: 'Mijozlar', icon: Users, href: '/mijozlar', roles: ['admin', 'crm'] },
    { name: 'Xabarlar', icon: MessageSquare, href: '/xabarlar', roles: ['admin', 'crm'] },
    { name: 'Xodimlar', icon: Users, href: '/xodimlar', roles: ['admin'] },
    { name: 'Moliya', icon: Zap, href: '/moliya', roles: ['admin', 'erp'] },
    { name: 'Statistika', icon: BarChart3, href: '/statistika', roles: ['admin', 'erp', 'crm'] },
    { name: 'Web Sayt', icon: Globe, href: '/vebsayt', roles: ['admin'] },
    { name: 'Sozlamalar', icon: Settings, href: '/settings', roles: ['admin'] }
]

export default function Sidebar({ isOpen, setIsOpen }) {
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = () => {
        localStorage.clear()
        router.push('/login')
    }

    return (
        <aside
            className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#08080E] border-r border-blue-500/10 transition-transform duration-500 lg:translate-x-0 ${
                isOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
        >
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-blue-600/5 to-transparent pointer-events-none" />
            
            <div className="flex flex-col h-full p-6 relative z-10">
                {/* Logo Section */}
                <div className="flex items-center gap-4 mb-12 px-2">
                    <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center p-2.5 shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                        <img src="/favicon.svg" alt="NuurHome" className="w-full h-full object-contain invert brightness-0" />
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tighter text-white uppercase italic leading-none">
                            Nuur <span className="text-blue-500">Home</span>
                        </h1>
                        <p className="text-[9px] text-blue-500/40 uppercase tracking-[0.3em] font-black mt-1">Management</p>
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar -mx-2 px-2">
                    {MENU_ITEMS.map((item) => {
                        const isActive = pathname === item.href
                        const Icon = item.icon
                        
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 group relative ${
                                    isActive 
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                                    : 'text-slate-500 hover:text-blue-400 hover:bg-white/[0.02]'
                                }`}
                            >
                                <div className={`transition-all duration-300 ${isActive ? 'text-blue-400' : 'group-hover:text-blue-400'}`}>
                                    <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                <span className={`text-[12px] font-black tracking-tight uppercase italic ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
                                    {item.name}
                                </span>
                                {isActive && (
                                    <div className="ml-auto">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]" />
                                    </div>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="mt-6 pt-6 border-t border-white/[0.05] space-y-4">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/5 transition-all group"
                    >
                        <LogOut size={20} strokeWidth={2} />
                        <span className="text-[12px] font-black tracking-tight uppercase italic">Chiqish</span>
                    </button>
                    
                    <div className="px-2">
                        <div className="bg-white/[0.02] rounded-3xl p-5 border border-white/[0.05] flex items-center gap-4">
                            <div className="relative">
                                <Activity size={18} className="text-blue-500" />
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#08080E] animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[10px] font-black text-white/80 uppercase tracking-tighter">Tizim Online</p>
                                <p className="text-[8px] font-bold text-white/20 uppercase">V 2.5.0</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    )
}
