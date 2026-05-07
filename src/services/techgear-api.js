// ==========================================
// TechGear E-commerce API Service
// ==========================================
// Bu fayl CRM tizimidan TechGear saytini boshqarish uchun API service
// Backend API endpoint manzilini o'zgartiring

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://nuurhomebackend-production.up.railway.app/api';

// API so'rovlarini yuborish uchun yordamchi funksiya
const apiRequest = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('nuurhome_token') || localStorage.getItem('crm_token')}`, // Try mobile token first, then CRM token
                ...options.headers,
            },
            ...options,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
};

// ==========================================
// MAHSULOTLAR (Products)
// ==========================================

export const productAPI = {
    // Barcha mahsulotlarni olish
    getAll: async () => {
        return await apiRequest('/products');
    },

    // Bitta mahsulotni ID bo'yicha olish
    getById: async (id) => {
        return await apiRequest(`/products/${id}`);
    },

    // Yangi mahsulot qo'shish
    create: async (productData) => {
        return await apiRequest('/products', {
            method: 'POST',
            body: JSON.stringify(productData),
        });
    },

    // Mahsulotni yangilash
    update: async (id, productData) => {
        return await apiRequest(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(productData),
        });
    },

    // Mahsulotni o'chirish
    delete: async (id) => {
        return await apiRequest(`/products/${id}`, {
            method: 'DELETE',
        });
    },

    // Mahsulot rasmini yuklash
    uploadImage: async (id, imageFile) => {
        const formData = new FormData();
        formData.append('image', imageFile);

        return await apiRequest(`/products/${id}/image`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('crm_token')}`,
            },
            body: formData,
        });
    },
};

// ==========================================
// BUYURTMALAR (Orders)
// ==========================================

export const orderAPI = {
    // Barcha buyurtmalarni olish
    getAll: async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return await apiRequest(`/orders?${queryParams}`);
    },

    // Bitta buyurtmani ID bo'yicha olish
    getById: async (id) => {
        return await apiRequest(`/orders/${id}`);
    },

    // Buyurtma statusini yangilash
    updateStatus: async (id, status) => {
        return await apiRequest(`/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },

    // Buyurtmani o'chirish
    delete: async (id) => {
        return await apiRequest(`/orders/${id}`, {
            method: 'DELETE',
        });
    },

    // Buyurtma yaratish
    create: async (orderData) => {
        return await apiRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData),
        });
    },

    // Buyurtma statistikasi
    getStats: async (dateRange = {}) => {
        const queryParams = new URLSearchParams(dateRange).toString();
        return await apiRequest(`/orders/stats?${queryParams}`);
    },
};

// ==========================================
// FOYDALANUVCHILAR (Users)
// ==========================================

export const userAPI = {
    // Barcha foydalanuvchilarni olish
    getAll: async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return await apiRequest(`/users?${queryParams}`);
    },

    // Bitta foydalanuvchini ID bo'yicha olish
    getById: async (id) => {
        return await apiRequest(`/users/${id}`);
    },

    // Foydalanuvchi ma'lumotlarini yangilash
    update: async (id, userData) => {
        return await apiRequest(`/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(userData),
        });
    },

    // Foydalanuvchini o'chirish
    delete: async (id) => {
        return await apiRequest(`/users/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==========================================
// KATEGORIYALAR (Categories)
// ==========================================

export const categoryAPI = {
    // Barcha kategoriyalarni olish
    getAll: async () => {
        return await apiRequest('/categories');
    },

    // Bitta kategoriyani ID bo'yicha olish
    getById: async (id) => {
        return await apiRequest(`/categories/${id}`);
    },

    // Yangi kategoriya qo'shish
    create: async (categoryData) => {
        return await apiRequest('/categories', {
            method: 'POST',
            body: JSON.stringify(categoryData),
        });
    },

    // Kategoriyani yangilash
    update: async (id, categoryData) => {
        return await apiRequest(`/categories/${id}`, {
            method: 'PUT',
            body: JSON.stringify(categoryData),
        });
    },

    // Kategoriyani o'chirish
    delete: async (id) => {
        return await apiRequest(`/categories/${id}`, {
            method: 'DELETE',
        });
    },
};

// ==========================================
// STATISTIKA (Analytics)
// ==========================================

export const analyticsAPI = {
    // Umumiy statistikani olish
    getDashboardStats: async () => {
        return await apiRequest('/analytics/dashboard');
    },

    // Savdo hisobotini olish
    getSalesReport: async (dateRange = {}) => {
        const queryParams = new URLSearchParams(dateRange).toString();
        return await apiRequest(`/analytics/sales?${queryParams}`);
    },

    // Foydalanuvchilar o'sish statistikasi
    getUserGrowth: async (period = 'month') => {
        return await apiRequest(`/analytics/users?period=${period}`);
    },
};

// ==========================================
// VEBSAYT (Website Management)
// ==========================================

export const websiteAPI = {
    // Sozlamalar
    getSettings: async () => {
        return await apiRequest('/settings');
    },
    updateSetting: async (key, value) => {
        return await apiRequest('/settings', {
            method: 'POST',
            body: JSON.stringify({ key, value }),
        });
    },

    // Bannerlar
    getBanners: async () => {
        return await apiRequest('/banners');
    },
    createBanner: async (data) => {
        return await apiRequest('/banners', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    deleteBanner: async (id) => {
        return await apiRequest(`/banners/${id}`, {
            method: 'DELETE',
        });
    },

    // Afzalliklar (Benefits)
    getBenefits: async () => {
        return await apiRequest('/benefits');
    },
    createBenefit: async (data) => {
        return await apiRequest('/benefits', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    updateBenefit: async (id, data) => {
        return await apiRequest(`/benefits/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },
    deleteBenefit: async (id) => {
        return await apiRequest(`/benefits/${id}`, {
            method: 'DELETE',
        });
    },

    // Sharhlar (Reviews)
    getReviews: async () => {
        return await apiRequest('/reviews/all'); // Admin view of all reviews
    },
    updateReviewStatus: async (id, status) => {
        return await apiRequest(`/reviews/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },
    deleteReview: async (id) => {
        return await apiRequest(`/reviews/${id}`, {
            method: 'DELETE',
        });
    },

    // Albom (Gallery)
    getAlbum: async () => {
        return await apiRequest('/album');
    },
    createAlbumImage: async (data) => {
        return await apiRequest('/album', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },
    deleteAlbumImage: async (id) => {
        return await apiRequest(`/album/${id}`, {
            method: 'DELETE',
        });
    },
};

export const messageAPI = {
    getMessages: async (status = 'all') => {
        return await apiRequest(`/messages?status=${status}`);
    },
    updateMessageStatus: async (id, status) => {
        return await apiRequest(`/messages/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        });
    },
    deleteMessage: async (id) => {
        return await apiRequest(`/messages/${id}`, {
            method: 'DELETE',
        });
    },
};

export const uploadAPI = {
    uploadMultiple: async (files) => {
        const formData = new FormData();
        if (files instanceof FileList || Array.isArray(files)) {
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
        } else {
            formData.append('files', files);
        }

        const response = await fetch(`${API_BASE_URL}/upload/multiple`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('crm_token')}`,
            },
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload Error: ${response.statusText}`);
        }

        return await response.json();
    },
};
