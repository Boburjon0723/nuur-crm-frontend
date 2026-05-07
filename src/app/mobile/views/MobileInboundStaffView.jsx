'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Send, Clock3, CheckCircle2, XCircle } from 'lucide-react'
import { createMobileErpPendingRequest } from '@/services/mobileErpIntakeService'

function parseQty(v) {
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return 0
    return n
}

function normalizeColors(raw) {
    if (Array.isArray(raw)) return raw.map((x) => String(x || '').trim()).filter(Boolean)
    if (raw == null) return []
    const s = String(raw).trim()
    if (!s) return []
    if ((s.startsWith('[') && s.endsWith(']')) || (s.startsWith('{') && s.endsWith('}'))) {
        try {
            const j = JSON.parse(s)
            if (Array.isArray(j)) return j.map((x) => String(x || '').trim()).filter(Boolean)
        } catch {
            return [s]
        }
    }
    return [s]
}

function statusChip(status) {
    const s = String(status || '').toLowerCase()
    if (s === 'accepted') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                <CheckCircle2 size={12} /> ACCEPTED
            </span>
        )
    }
    if (s === 'rejected') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-bold text-rose-300">
                <XCircle size={12} /> REJECTED
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">
            <Clock3 size={12} /> PENDING
        </span>
    )
}

export default function MobileInboundStaffView({
    t,
    user,
    products,
    myRequests,
    setMyRequests,
    refreshMyRequests,
    onLogout
}) {
    const [productId, setProductId] = useState('')
    const [productQuery, setProductQuery] = useState('')
    const [qty, setQty] = useState('1')
    const [color, setColor] = useState('')
    const [note, setNote] = useState('')
    const [customerName, setCustomerName] = useState('')
    const [rows, setRows] = useState([])
    useEffect(() => {
        const fallbackName = String(user?.user_metadata?.full_name || user?.email || '').trim()
        if (fallbackName && !customerName) setCustomerName(fallbackName)
    }, [user, customerName])

    const filteredProducts = useMemo(() => {
        const q = String(productQuery || '').trim().toLowerCase()
        if (!q) return products
        return products.filter((p) => {
            const name = String(p?.name || '').toLowerCase()
            const code = String(p?.size || '').toLowerCase()
            return name.includes(q) || code.includes(q)
        })
    }, [products, productQuery])

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [successBanner, setSuccessBanner] = useState('')

    const selectedProduct = useMemo(
        () => products.find((p) => String(p.id) === String(productId)) || null,
        [products, productId]
    )
    const colorOptions = useMemo(
        () => normalizeColors(selectedProduct?.colors).slice(0, 40),
        [selectedProduct]
    )

    const addRow = () => {
        setError('')
        setSuccessBanner('')
        if (!selectedProduct) {
            setError(t('mobileIntake.selectProductFirst'))
            return
        }
        const q = parseQty(qty)
        if (q <= 0) {
            setError(t('mobileIntake.qtyPositive'))
            return
        }
        setRows((prev) => [
            ...prev,
            {
                id: `r_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                product_id: selectedProduct.id,
                product_name: selectedProduct.name || selectedProduct.size || 'Mahsulot',
                quantity: q,
                color: color || null,
                unit_price_usd: Number(selectedProduct.sale_price) || 0,
                size: selectedProduct.size || null,
                image_url: selectedProduct.image_url || null
            }
        ])
        setQty('1')
    }

    const removeRow = (id) => {
        setRows((prev) => prev.filter((x) => x.id !== id))
    }

    const submitPending = async () => {
        if (!rows.length || saving) return
        setSaving(true)
        setError('')
        setSuccessBanner('')
        try {
            const request = await createMobileErpPendingRequest({
                user,
                lines: rows,
                note,
                customerName
            })
            setRows([])
            setNote('')
            setMyRequests((prev) => [request, ...prev])
            void refreshMyRequests()
            const ref = String(request?.order_number_snapshot || '').trim()
            setSuccessBanner(
                `${t('mobileIntake.successSaved')}${ref ? ` (${ref})` : ''} ${t('mobileIntake.ordersVisibilityHint')}`
            )
        } catch (e) {
            setError(e?.message || String(e))
        } finally {
            setSaving(false)
        }
    }

    const total = useMemo(
        () => Math.round(rows.reduce((s, r) => s + (Number(r.unit_price_usd) || 0) * (Number(r.quantity) || 0), 0) * 100) / 100,
        [rows]
    )

    return (
        <div className="p-5 pb-28 space-y-5">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <h1 className="text-xl font-bold text-white">{t('mobileIntake.title')}</h1>
                    <p className="mt-1 text-xs text-slate-400">{user?.email || user?.id}</p>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200"
                >
                    {t('mobileIntake.logout')}
                </button>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <h2 className="text-sm font-bold text-slate-100">{t('mobileIntake.addLine')}</h2>
                <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder={t('mobileIntake.customerName')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder={t('mobileIntake.productSearch')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                <select
                    value={productId}
                    onChange={(e) => {
                        setProductId(e.target.value)
                        setColor('')
                    }}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                    <option value="">{t('mobileIntake.selectProduct')}</option>
                    {filteredProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.size ? `${p.size} — ${p.name || 'Mahsulot'}` : (p.name || 'Mahsulot')}
                        </option>
                    ))}
                </select>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder={t('mobileIntake.qtyPlaceholder')}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                    />
                    <select
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                    >
                        <option value="">{t('mobileIntake.colorOptional')}</option>
                        {colorOptions.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
                <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white"
                >
                    <Plus size={14} /> {t('mobileIntake.add')}
                </button>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder={t('mobileIntake.noteOptional')}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
                />
                {error ? <p className="text-xs font-semibold text-rose-300">{error}</p> : null}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-100">{t('mobileIntake.pendingCart')}</h2>
                    <span className="text-xs font-semibold text-slate-400">${total.toFixed(2)}</span>
                </div>
                <div className="space-y-2">
                    {rows.length ? (
                        rows.map((r) => (
                            <div key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-100">{r.product_name}</p>
                                    <p className="text-[11px] text-slate-400">
                                        {r.quantity} × ${r.unit_price_usd} {r.color ? ` • ${r.color}` : ''}
                                    </p>
                                </div>
                                <button type="button" onClick={() => removeRow(r.id)} className="text-rose-300">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500">{t('mobileIntake.noLinesYet')}</p>
                    )}
                </div>
                <button
                    type="button"
                    disabled={!rows.length || saving}
                    onClick={submitPending}
                    className={`mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                        rows.length && !saving ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
                    }`}
                >
                    <Send size={15} />
                    {saving ? t('mobileIntake.sending') : t('mobileIntake.sendPending')}
                </button>
            </div>

            {successBanner ? (
                <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/40 px-4 py-3 text-xs leading-relaxed text-emerald-100">
                    {successBanner}
                </div>
            ) : null}

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <h2 className="mb-1 text-sm font-bold text-slate-100">{t('mobileIntake.myRequests')}</h2>
                <p className="mb-3 text-[11px] leading-relaxed text-slate-500">{t('mobileIntake.myRequestsFootnote')}</p>
                <div className="space-y-2">
                    {myRequests.length ? (
                        myRequests.map((req) => (
                            <div key={req.id} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                    <p className="truncate text-xs font-semibold text-slate-200">
                                        {req.order_number_snapshot || String(req.id).slice(0, 8)}
                                    </p>
                                    {statusChip(req.status)}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    {new Date(req.created_at).toLocaleString()}
                                </p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-500">{t('mobileIntake.noRequests')}</p>
                    )}
                </div>
            </div>
        </div>
    )
}
