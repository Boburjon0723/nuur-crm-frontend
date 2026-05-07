'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { Users, Building2, PieChart } from 'lucide-react'

export default function MoliyaTopNav() {
    const pathname = usePathname()
    const { t } = useLanguage()

    const items = [
        { href: '/moliya/boshqaruv', labelKey: 'finances.financeBranchPartners', icon: Users },
        { href: '/moliya/bolimlar', labelKey: 'finances.financeBranchDepartments', icon: Building2 },
        { href: '/moliya/hisobotlar', labelKey: 'finances.financeBranchReports', icon: PieChart },
    ]

    return (
        <nav className="relative z-30 flex gap-2 overflow-x-auto p-1.5 bg-white/[0.04] border border-white/10 rounded-xl backdrop-blur-xl no-scrollbar shadow-lg">
            {items.map(({ href, labelKey, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(`${href}/`)
                return (
                    <Link
                        key={href}
                        href={href}
                        className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300 outline-none relative group ${
                            active
                                ? 'bg-blue-600 text-white shadow-[0_5px_15px_rgba(37,99,235,0.4)] scale-[1.02]'
                                : 'text-white/30 hover:text-white/60 hover:bg-white/5'
                        }`}
                    >
                        <Icon size={14} className={active ? 'text-white' : 'text-white/20 group-hover:text-blue-400 Transition-colors'} />
                        {t(labelKey)}
                        {active && (
                            <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_white]" />
                        )}
                    </Link>
                )
            })}
        </nav>
    )
}
