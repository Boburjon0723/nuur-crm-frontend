'use client'

import { supabase } from '@/lib/supabase'

function isRlsDenied(error) {
    const msg = String(error?.message || '').toLowerCase()
    const details = String(error?.details || '').toLowerCase()
    return msg.includes('row-level security policy') || details.includes('row-level security policy')
}

export async function createErpInboundPendingRequest({
    orderId,
    items,
    orderNumberSnapshot,
    customerNameSnapshot
}) {
    const { data, error } = await supabase
        .from('erp_inbound_requests')
        .insert({
            order_id: orderId,
            items,
            order_number_snapshot: String(orderNumberSnapshot || '').trim() || String(orderId),
            customer_name_snapshot: String(customerNameSnapshot || '').trim(),
            status: 'pending'
        })
        .select('id, status, order_id, created_at, order_number_snapshot')
        .single()
    if (error) {
        if (isRlsDenied(error)) {
            throw new Error(
                "RLS: `erp_inbound_requests` jadvalida `mobile_intake` uchun INSERT policy yo'q. Admin Supabase SQL Editor'da `supabase_mobile_intake_inbound_rls.sql` ni ishga tushirsin."
            )
        }
        throw error
    }
    return data
}
