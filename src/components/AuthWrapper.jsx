'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { useLayout } from '@/context/LayoutContext'
import { normalizeRole } from '@/lib/authRole'

export default function AuthWrapper({ children }) {
    const [user, setUser] = useState(null)
    const [role, setRole] = useState('user')
    const [loading, setLoading] = useState(true)
    const { sidebarOpen, setSidebarOpen } = useLayout()
    const router = useRouter()
    const pathname = usePathname()

    const checkAuth = useCallback(() => {
        setLoading(true)
        const storedUser = localStorage.getItem('nuurhome_user')
        const token = localStorage.getItem('nuurhome_token')

        if (storedUser && token) {
            const parsedUser = JSON.parse(storedUser)
            setUser(parsedUser)
            const resolvedRole = normalizeRole(parsedUser.role)
            setRole(resolvedRole)
            
            // Login sahifasida bo'lsa va auth bo'lsa, yo'naltirish
            if (pathname.startsWith('/login')) {
                const isMobileScreen = window.innerWidth < 768
                if (resolvedRole !== 'admin') {
                    router.replace('/mobile')
                } else {
                    router.replace(isMobileScreen ? '/mobile' : '/')
                }
            }
        } else {
            setUser(null)
            setRole('user')
            // Auth yo'q bo'lsa faqat login sahifasida bo'lmaganda redirect
            if (!pathname.startsWith('/login')) {
                router.replace('/login')
            }
        }
        setLoading(false)
    }, [pathname, router])

    useEffect(() => {
        checkAuth()
    }, [checkAuth])

    // Close sidebar on route change
    useEffect(() => {
        setSidebarOpen(false)
    }, [pathname, setSidebarOpen])

    if (loading) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3 bg-[#050515] text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                <p className="text-sm text-white/40 tracking-widest animate-pulse">YUKLANMOQDA...</p>
            </div>
        )
    }

    if (pathname.startsWith('/login')) {
        return <>{children}</>
    }

    // Role-based access check
    const isAdmin = role === 'admin'
    const isMobileRoute = pathname.startsWith('/mobile')

    if (!user) {
        return null // Will redirect in useEffect
    }

    // Admin bo'lmaganlar faqat mobil versiyaga kira oladi
    if (!isAdmin && !isMobileRoute) {
        router.replace('/mobile')
        return null
    }

    // Mobil versiya uchun toza layout (Sidebar va ortiqcha paddinglarsiz)
    if (isMobileRoute) {
        return (
            <div className="flex min-h-screen bg-[#02020a] text-white selection:bg-blue-500/30">
                <main className="flex-1 overflow-x-hidden min-h-screen relative">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] -z-10"></div>
                    <div className="min-h-screen">
                        {children}
                    </div>
                </main>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen bg-[#02020a] text-white selection:bg-blue-500/30">
            {/* Sidebar with Glass effect */}
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <main className={`flex-1 transition-all duration-300 lg:ml-64 md:ml-0 overflow-x-hidden min-h-screen relative`}>
                {/* Background ambient light */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[150px] -z-10"></div>
                
                <div className="p-4 md:p-6 lg:p-10 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    )
}
