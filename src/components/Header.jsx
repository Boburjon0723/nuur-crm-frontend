'use client'

import {
    Bell,
    User,
    Menu,
    X,
    ShoppingBag,
    Globe,
    ChevronDown,
    Moon,
    Sun,
    MessageSquare,
    Wallet,
    Users,
    Search
} from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useNotifications } from '@/context/NotificationContext'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Header({ title, toggleSidebar: propToggleSidebar }) {
    const router = useRouter()
    const { toggleSidebar: contextToggleSidebar } = useLayout()
    const toggleSidebar = propToggleSidebar || contextToggleSidebar
    const { unreadCount, t } = useNotifications()
    const { language } = useLanguage()
    const [user, setUser] = useState(null)

    useEffect(() => {
        const storedUser = localStorage.getItem('nuurhome_user')
        if (storedUser) setUser(JSON.parse(storedUser))
    }, [])

    return (
        <header className="sticky top-0 z-40 px-4 md:px-0 py-4 mb-4 flex justify-between items-center pointer-events-none">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="lg:hidden p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all shadow-lg pointer-events-auto"
                >
                    <Menu size={18} />
                </button>
                {title && (
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase italic pointer-events-auto">
                        {title}
                    </h2>
                )}
            </div>

            <div className="flex items-center gap-3 md:gap-4 p-2 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[1.5rem] shadow-2xl pointer-events-auto ml-auto">
                {/* Notifications */}
                <button className="relative p-2 bg-white/0 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all group">
                    <Bell size={18} className="group-hover:scale-110 transition-transform" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6] animate-pulse"></span>
                    )}
                </button>

                {/* Language */}
                <button className="flex items-center gap-2 p-2 bg-white/0 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all uppercase text-[9px] font-black tracking-widest border-l border-white/5 pl-3">
                    <Globe size={16} className="text-blue-500/50" />
                    {language || 'UZ'}
                </button>

                {/* User Profile */}
                <div className="flex items-center gap-3 pl-3 border-l border-white/5 group cursor-pointer">
                    <div className="text-right hidden sm:block">
                        <p className="text-[11px] font-black text-white/80 leading-none capitalize group-hover:text-white transition-colors">{user?.fullname || 'Admin'}</p>
                        <p className="text-[8px] text-white/20 uppercase tracking-widest mt-1.5 font-bold">{user?.role || 'Admin'}</p>
                    </div>
                    <button className="w-9 h-9 bg-gradient-to-br from-white/5 to-white/0 hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl flex items-center justify-center transition-all shadow-xl group-hover:border-white/20">
                        <User size={16} className="text-white/50 group-hover:text-white transition-all" />
                    </button>
                </div>
            </div>
        </header>
    )
}