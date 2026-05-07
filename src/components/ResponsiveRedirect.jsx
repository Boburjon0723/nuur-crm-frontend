'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

export default function ResponsiveRedirect() {
    const router = useRouter()
    const pathname = usePathname()

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth
            const isMobilePath = pathname.startsWith('/mobile')
            // Login sahifasi yoki auth bilan bog'liq sahifalarni tekshiramiz
            const isAuthPath = pathname.includes('/login') || pathname.includes('/auth')

            // Agar login sahifasida bo'lsak, hech qanday yo'naltirish qilmaymiz
            // Chunki login sahifasining o'zi ham desktop, ham mobil uchun moslashuvchan (responsive) bo'lishi kerak.
            if (isAuthPath) return 

            // Faqat asosiy sahifalarda yo'naltirish qilamiz
            if (width < 768 && !isMobilePath) {
                router.push('/mobile')
            } 
            else if (width >= 1024 && isMobilePath) {
                router.push('/')
            }
        }

        handleResize()
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [pathname, router])

    return null
}
