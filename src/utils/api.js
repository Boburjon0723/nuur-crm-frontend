const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const getFullUrl = (url) => {
    if (url.startsWith('/api') && API_URL.endsWith('/api')) {
        return `${API_URL.slice(0, -4)}${url}`;
    }
    return `${API_URL}${url}`;
};

export const api = {
    async handleResponse(res, method, url) {
        if (!res.ok) {
            let errorMsg = `${method} ${url} failed: ${res.status}`;
            try {
                const errorData = await res.json();
                if (errorData.message) errorMsg = errorData.message;
            } catch (e) {
                // Not JSON
            }
            throw new Error(errorMsg);
        }
        return { data: await res.json() };
    },

    async get(url) {
        const res = await fetch(getFullUrl(url));
        return this.handleResponse(res, 'GET', url);
    },

    async post(url, data) {
        const isFormData = data instanceof FormData;
        const res = await fetch(getFullUrl(url), {
            method: 'POST',
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? data : JSON.stringify(data)
        });
        return this.handleResponse(res, 'POST', url);
    },

    async put(url, data) {
        const res = await fetch(getFullUrl(url), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return this.handleResponse(res, 'PUT', url);
    },

    async delete(url) {
        const res = await fetch(getFullUrl(url), {
            method: 'DELETE'
        });
        return this.handleResponse(res, 'DELETE', url);
    }
};
