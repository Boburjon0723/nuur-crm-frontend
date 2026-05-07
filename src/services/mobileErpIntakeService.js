'use client'

import { supabase } from '@/lib/supabase'
import { orderAPI } from './techgear-api'

function parseQty(v) {
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return 0
    return n
}

function buildOrderNote(user, note) {
    const marker = `[mobile_staff:${String(user?.id || '').trim()}]`
    const noteTrim = String(note || '').trim()
    return noteTrim ? `${marker}\n${noteTrim}` : marker
}

export async function createMobileErpPendingRequest({ user, lines, note, customerName }) {
    if (!user?.id) throw new Error('Foydalanuvchi sessiyasi topilmadi.')
    
    const items = (lines || [])
        .map((x) => ({
            product_id: x?.product_id,
            product_name: x?.product_name,
            color: x?.color ?? null,
            quantity: parseQty(x?.quantity),
            product_price: Number(x?.unit_price_usd) || 0,
            size: x?.size ?? null,
            image_url: x?.image_url ?? null,
            sku: x?.sku || x?.size || null
        }))
        .filter((x) => x.product_id && x.quantity > 0)
        
    if (!items.length) throw new Error('Yuborish uchun mahsulot qatori yo‘q.')

    const total = Math.round(items.reduce((s, x) => s + x.product_price * x.quantity, 0) * 100) / 100
    const resolvedCustomerName = String(customerName || user.fullname || user.email || 'Mobile staff').trim()
    
    const payload = {
        customer_name: resolvedCustomerName,
        total,
        status: 'new',
        note: buildOrderNote(user, note),
        source: 'mobile_staff',
        created_by: user.id,
        items: items 
    }

    try {
        const order = await orderAPI.create(payload)
        return order
    } catch (err) {
        console.error('Error creating order via Backend:', err)
        throw err
    }
}

export async function fetchMyMobileErpRequests(user) {
    if (!user?.id) return []
    try {
        // Backenddan foydalanuvchining o'z buyurtmalarini olamiz
        const res = await orderAPI.getAll({ created_by: user.id })
        const orders = res.orders || res || []
        
        return orders.map(o => ({
            id: o.id,
            status: o.status,
            created_at: o.created_at,
            order_number_snapshot: o.order_number,
            customer_name_snapshot: o.customer_name
        }))
    } catch (e) {
        console.warn('Backend orders fetch failed:', e)
        return []
    }
}
