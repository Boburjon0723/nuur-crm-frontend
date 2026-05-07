'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/context/LanguageContext'
import { canAccessMobileApp, canAccessMobileIntake, normalizeRole } from '@/lib/authRole'
import BottomNav from './components/BottomNav'
import DashboardView from './views/DashboardView'
import OrdersView from './views/OrdersView'
import StatsView from './views/StatsView'
import EmployeesView from './views/EmployeesView'
import FinanceView from './views/FinanceView'
import WarehouseView from './views/WarehouseView'
import { LogIn, ShieldCheck, Loader2, LayoutGrid, ShoppingCart, BarChart2, Users, Wallet, Package } from 'lucide-react'
import { fetchMyMobileErpRequests } from '@/services/mobileErpIntakeService'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

export default function MobilePage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [activeTab, setActiveTab] = useState('dashboard')
    const [role, setRole] = useState('user')
    const [session, setSession] = useState(null)
    const [loadingAuth, setLoadingAuth] = useState(true)
    const [authError, setAuthError] = useState('')
    const [staffEmail, setStaffEmail] = useState('')
    const [staffPassword, setStaffPassword] = useState('')
    const [staffLoginBusy, setStaffLoginBusy] = useState(false)
    const [products, setProducts] = useState([])
    const [categories, setCategories] = useState([])
    const [myRequests, setMyRequests] = useState([])
    const [ordersStatusFilter, setOrdersStatusFilter] = useState(null)
    const [ordersStatusFilterToken, setOrdersStatusFilterToken] = useState(0)

    const loadStaffData = useCallback(async (user) => {
        if (!user) return
        try {
            const token = localStorage.getItem('nuurhome_token')
            const [productsRes, categoriesRes, reqRes] = await Promise.all([
                fetch(`${API_URL}/products`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()),
                fetch(`${API_URL}/categories`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(res => res.json()),
                fetchMyMobileErpRequests(user).catch(() => [])
            ])
            
            const productData = Array.isArray(productsRes) ? productsRes : (productsRes.data || [])
            const categoryData = Array.isArray(categoriesRes) ? categoriesRes : (categoriesRes.data || [])
            setProducts(productData)
            setCategories(categoryData)
            setMyRequests(reqRes || [])
        } catch (err) {
            console.error('Error loading staff data:', err)
        }
    }, [])

    useEffect(() => {
        setLoadingAuth(true)
        setAuthError('')
        
        const storedUser = localStorage.getItem('nuurhome_user')
        const token = localStorage.getItem('nuurhome_token')

        if (storedUser && token) {
            try {
                const parsedUser = JSON.parse(storedUser)
                setSession({ user: parsedUser })
                const nextRole = normalizeRole(parsedUser.role)
                setRole(nextRole)
                if (canAccessMobileIntake(nextRole)) {
                    loadStaffData(parsedUser)
                }
            } catch (e) {
                console.error('Mobile Auth Parse Error:', e)
                setRole('user')
            }
        } else {
            setSession(null)
            setRole('user')
        }
        setLoadingAuth(false)
    }, [loadStaffData])

    const openOrdersByStatus = ({ statusKey, count }) => {
        const n = Number(count) || 0
        if (n <= 0) {
            alert('Bu status bo‘yicha buyurtma yo‘q.')
            return
        }
        setOrdersStatusFilter(statusKey || null)
        setOrdersStatusFilterToken((v) => v + 1)
        setActiveTab('orders')
    }

    const [dashboardStats, setDashboardStats] = useState(null)
    const [orders, setOrders] = useState([])
    const [loadingData, setLoadingData] = useState(false)

    const fetchDynamicData = useCallback(async () => {
        const token = localStorage.getItem('nuurhome_token')
        if (!token) return

        try {
            setLoadingData(true)
            const headers = { 'Authorization': `Bearer ${token}` }
            
            const [statsRes, ordersRes] = await Promise.all([
                fetch(`${API_URL}/statistics/analytics`, { headers }).then(r => r.json()),
                fetch(`${API_URL}/orders`, { headers }).then(r => r.json())
            ])

            setDashboardStats(statsRes)
            // Backend returns { orders: [], pagination: {} }
            const ordersList = Array.isArray(ordersRes) ? ordersRes : (ordersRes.orders || ordersRes.data || [])
            setOrders(ordersList)
        } catch (err) {
            console.error('Error fetching dynamic data:', err)
        } finally {
            setLoadingData(false)
        }
    }, [])

    useEffect(() => {
        if (session && (canAccessMobileApp(role) || canAccessMobileIntake(role))) {
            fetchDynamicData()
        }
    }, [session, role, fetchDynamicData])

    async function handleStaffLogin(e) {
        e.preventDefault()
        if (staffLoginBusy) return
        setStaffLoginBusy(true)
        setAuthError('')
        try {
            const email = String(staffEmail || '').trim()
            const password = String(staffPassword || '')
            if (!email || !password) {
                setAuthError(t('mobileIntake.loginRequired'))
                return
            }

            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const result = await response.json()
            if (!response.ok) throw new Error(result.message || t('mobileIntake.loginFailed'))

            localStorage.setItem('nuurhome_token', result.token)
            localStorage.setItem('nuurhome_user', JSON.stringify(result.user))

            const nextRole = normalizeRole(result.user.role)
            if (!canAccessMobileIntake(nextRole) && !canAccessMobileApp(nextRole)) {
                localStorage.removeItem('nuurhome_token')
                localStorage.removeItem('nuurhome_user')
                setAuthError(t('mobileIntake.loginRoleDenied'))
                return
            }
            
            setSession({ user: result.user })
            setRole(nextRole)
            await loadStaffData(result.user)
            setStaffPassword('')
        } catch (e2) {
            setAuthError(e2?.message || t('mobileIntake.loginFailed'))
        } finally {
            setStaffLoginBusy(false)
        }
    }

    async function handleLogout() {
        localStorage.removeItem('nuurhome_token')
        localStorage.removeItem('nuurhome_user')
        setSession(null)
        setRole('user')
        setProducts([])
        setMyRequests([])
        setActiveTab('dashboard')
        router.push('/login')
    }

    const renderView = () => {
        if (loadingData && !dashboardStats) {
            return (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="w-10 h-10 text-[#8B5E3C] animate-spin" />
                    <p className="text-[10px] font-black text-[#2D241E]/20 uppercase tracking-widest">Ma'lumotlar yuklanmoqda...</p>
                </div>
            )
        }

        // Calculate unique customers from orders list for more accuracy
        const uniqueCustomers = new Set()
        orders.forEach(o => {
            if (o.customer_name) uniqueCustomers.add(o.customer_name.trim().toLowerCase())
        })
        const totalCustomersCount = uniqueCustomers.size

        switch (activeTab) {
            case 'dashboard':
                return (
                    <DashboardView
                        role={role}
                        setActiveTab={setActiveTab}
                        onOpenOrdersByStatus={openOrdersByStatus}
                        stats={{
                            ...(dashboardStats?.summary || {}),
                            totalOrders: orders.length || dashboardStats?.summary?.totalOrders || 0,
                            totalCustomers: totalCustomersCount || dashboardStats?.summary?.totalCustomers || 0
                        }}
                        activities={dashboardStats?.recentOrders || []}
                    />
                )
            case 'orders':
                return (
                    <OrdersView
                        initialStatusFilter={ordersStatusFilter}
                        statusFilterToken={ordersStatusFilterToken}
                        orders={orders}
                        onRefresh={fetchDynamicData}
                    />
                )
            case 'stats':
                return <StatsView stats={dashboardStats || {}} />
            case 'employees':
                return <EmployeesView />
            case 'finance':
                return <FinanceView />
            default:
                return <DashboardView role={role} setActiveTab={setActiveTab} onOpenOrdersByStatus={openOrdersByStatus} />
        }
    }

    if (loadingAuth) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            </div>
        )
    }

    if (!session) {
        return (
            <div className="min-h-screen bg-[#FDFBF7] p-6 flex flex-col justify-center animate-in fade-in duration-700">
                <div className="mb-10 text-center space-y-2">
                    <h1 className="text-4xl font-black text-[#2D241E] tracking-tighter uppercase italic">
                        Nuur <span className="text-[#8B5E3C]">Home</span>
                    </h1>
                    <p className="text-[10px] font-bold text-[#8B5E3C]/60 uppercase tracking-[0.3em]">Boshqaruv Tizimi</p>
                </div>

                <form onSubmit={handleStaffLogin} className="bg-white border border-[#E8E2D9] rounded-[3rem] p-8 shadow-xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1.5 bg-[#8B5E3C]" />
                    
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-[0.2em] ml-1">Email</label>
                            <input
                                type="email"
                                value={staffEmail}
                                onChange={(e) => setStaffEmail(e.target.value)}
                                placeholder="example@nuurhome.uz"
                                className="w-full rounded-2xl border border-[#E8E2D9] bg-[#F7F5F0] px-6 py-5 text-sm text-[#2D241E] font-bold outline-none focus:border-[#8B5E3C]/50 transition-all shadow-inner"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2D241E]/30 uppercase tracking-[0.2em] ml-1">Parol</label>
                            <input
                                type="password"
                                value={staffPassword}
                                onChange={(e) => setStaffPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full rounded-2xl border border-[#E8E2D9] bg-[#F7F5F0] px-6 py-5 text-sm text-[#2D241E] font-bold outline-none focus:border-[#8B5E3C]/50 transition-all shadow-inner"
                            />
                        </div>
                    </div>

                    {authError ? (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3">
                            <AlertCircle size={18} className="text-rose-500 shrink-0" />
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-tight leading-snug">{authError}</p>
                        </div>
                    ) : null}

                    <button
                        type="submit"
                        disabled={staffLoginBusy}
                        className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-3 ${
                            staffLoginBusy ? 'bg-[#F7F5F0] text-[#2D241E]/20' : 'bg-[#2D241E] text-white shadow-[#2D241E]/20 active:scale-95'
                        }`}
                    >
                        {staffLoginBusy ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
                        {staffLoginBusy ? 'KIRILMOQDA...' : 'TIZIMGA KIRISH'}
                    </button>
                </form>

                <div className="mt-12 text-center">
                    <p className="text-[9px] font-black text-[#2D241E]/20 uppercase tracking-[0.5em]">Nexus ERP v2.0</p>
                </div>
            </div>
        )
    }

    if (canAccessMobileIntake(role)) {
        return (
            <WarehouseView
                t={t}
                user={session.user}
                products={products}
                categories={categories}
                myRequests={myRequests}
                setMyRequests={setMyRequests}
                refreshMyRequests={() => loadStaffData(session.user)}
                onLogout={handleLogout}
            />
        )
    }

    return (
        <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans overflow-x-hidden">
            <main className="pb-24">
                {renderView()}
            </main>

            {/* Premium Navigation - Cream Style */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[#E8E2D9] px-6 py-4">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    {[
                        { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
                        { id: 'orders', icon: ShoppingCart, label: 'Buyurtma' },
                        { id: 'employees', icon: Users, label: 'Xodimlar' },
                        { id: 'stats', icon: BarChart2, label: 'Statistika' },
                        { id: 'finance', icon: Wallet, label: 'Moliya' }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`flex flex-col items-center gap-1.5 transition-all active:scale-90 ${
                                activeTab === item.id ? 'text-[#8B5E3C]' : 'text-[#2D241E]/30'
                            }`}
                        >
                            <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                            <span className={`text-[9px] font-black uppercase tracking-widest ${
                                activeTab === item.id ? 'opacity-100' : 'opacity-40'
                            }`}>{item.label}</span>
                        </button>
                    ))}
                </div>
            </nav>
        </div>
    )
}
