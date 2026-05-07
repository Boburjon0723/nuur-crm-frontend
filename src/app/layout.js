import { Inter } from 'next/font/google'
import { LanguageProvider } from '@/context/LanguageContext'
import { LayoutProvider } from '@/context/LayoutContext'
import { NotificationProvider } from '@/context/NotificationContext'
import { DialogProvider } from '@/context/DialogContext'
import { ThemeProvider } from '@/context/ThemeContext'
import AuthWrapper from '@/components/AuthWrapper'
import ReactQueryProvider from '@/components/ReactQueryProvider'
import ChunkErrorRecovery from '@/components/ChunkErrorRecovery'
import ResponsiveRedirect from '@/components/ResponsiveRedirect'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const viewport = {
    themeColor: '#031c24',
}

export const metadata = {
    title: 'Nuur_Home_Collection',
    manifest: '/manifest.json',
    icons: {
        icon: [{ url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' }],
        shortcut: '/favicon.svg',
        apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Nuur Home CRM',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="uz">
            <body className={`${inter.className} bg-[#02020a] selection:bg-blue-500/30 overflow-x-hidden`}>
                <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 via-[#02020a] to-purple-900/20" />
                    <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-amber-600/20 blur-[150px] rounded-full animate-pulse duration-[8s]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[900px] h-[900px] bg-purple-600/20 blur-[180px] rounded-full animate-pulse duration-[10s] delay-1000" />
                    <div className="absolute top-[20%] right-[-5%] w-[600px] h-[600px] bg-rose-500/10 blur-[130px] rounded-full animate-pulse duration-[7s] delay-700" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] bg-amber-500/15 blur-[200px] rounded-full" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-400/20 blur-[150px] rounded-full animate-pulse duration-[5s]" />
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none brightness-150 contrast-150" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
                </div>

                <ReactQueryProvider>
                    <LanguageProvider>
                        <ThemeProvider>
                            <LayoutProvider>
                                <NotificationProvider>
                                    <DialogProvider>
                                        <ChunkErrorRecovery />
                                        <ResponsiveRedirect />
                                        <AuthWrapper>
                                            <div className="relative z-10">{children}</div>
                                        </AuthWrapper>
                                    </DialogProvider>
                                </NotificationProvider>
                            </LayoutProvider>
                        </ThemeProvider>
                    </LanguageProvider>
                </ReactQueryProvider>
            </body>
        </html>
    )
}
