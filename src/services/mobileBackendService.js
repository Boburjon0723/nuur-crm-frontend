import { productAPI, orderAPI, analyticsAPI, userAPI } from './techgear-api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const mobileBackendService = {
    // Dashboard ma'lumotlarini olish
    getDashboardData: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/statistics/analytics`);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            
            // Backend qaytargan ma'lumotlarni Mobile Dashboard formatiga moslash
            // Fallback: agar backend hali yangilanmagan bo'lsa, summary mavjudligini tekshiramiz
            const summary = data.summary || {};
            
            return {
                employeesCount: summary.employeesCount || 0,
                statusStats: {
                    new: summary.newOrders || 0,
                    pending: summary.pendingOrders || 0,
                    completed: summary.completedOrders || summary.ordersCount || 0,
                    cancelled: summary.cancelledOrders || 0
                },
                recentActivities: (data.recentOrders || []).map(o => ({
                    id: o.id,
                    title: `Buyurtma #${String(o.id).slice(0, 8)}`,
                    time: o.created_at ? new Date(o.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' }) : '--:--',
                    desc: `Mijoz: ${o.customer_name || 'Noma\'lum'}`,
                    status: o.status
                }))
            };
        } catch (error) {
            console.error('Error fetching mobile dashboard data:', error);
            throw error;
        }
    },

    // Mahsulotlarni olish
    getProducts: async () => {
        return await productAPI.getAll();
    },

    // Buyurtmalarni olish
    getOrders: async (filters) => {
        return await orderAPI.getAll(filters);
    }
};
