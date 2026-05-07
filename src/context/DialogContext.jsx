'use client'

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react'
import { createPortal } from 'react-dom'

const DIALOG_ROOT_ID = 'crm-dialog-portal-root'

function getDialogPortalNode() {
    if (typeof document === 'undefined') return null
    let el = document.getElementById(DIALOG_ROOT_ID)
    if (!el) {
        el = document.createElement('div')
        el.id = DIALOG_ROOT_ID
        el.setAttribute('data-portal', 'dialog')
        el.style.cssText = 'position:relative;z-index:2147483647;isolation:isolate;'
        document.body.appendChild(el)
    }
    return el
}
import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'

const DialogContext = createContext(null)

function ModalLayer({ modal }) {
    const { t } = useLanguage()

    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = prev
        }
    }, [])

    const isConfirm = modal.type === 'confirm'
    const variant = modal.variant || (isConfirm ? 'default' : 'info')

    const iconWrap =
        variant === 'error' ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20">
                <XCircle className="h-6 w-6" strokeWidth={2} />
            </div>
        ) : variant === 'warning' ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                <AlertTriangle className="h-6 w-6" strokeWidth={2} />
            </div>
        ) : variant === 'success' ? (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="h-6 w-6" strokeWidth={2} />
            </div>
        ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Info className="h-6 w-6" strokeWidth={2} />
            </div>
        )

    const confirmBtnClass =
        variant === 'warning' || variant === 'error'
            ? 'bg-amber-500/20 hover:bg-amber-500 border border-amber-500/30 text-amber-500 hover:text-white shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)]'
            : 'bg-blue-500/20 hover:bg-blue-500 border border-blue-500/30 text-blue-400 hover:text-white shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)]'

    const alertOkBtnClass =
        variant === 'error'
            ? 'bg-red-500/20 hover:bg-red-500 border border-red-500/30 text-red-500 hover:text-white shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]'
            : variant === 'warning'
              ? 'bg-white/5 hover:bg-white/10 border border-white/5 text-white shadow-sm'
              : variant === 'success'
                ? 'bg-emerald-500/20 hover:bg-emerald-500 border border-emerald-500/30 text-emerald-400 hover:text-white shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]'
                : 'bg-white/5 hover:bg-white/10 border border-white/5 text-white shadow-sm'

    const titleText =
        modal.title ||
        (isConfirm ? t('common.dialogConfirmTitle') : t('common.dialogAlertTitle'))

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md"
            style={{ zIndex: 2147483647 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-dialog-title"
        >
            <button
                type="button"
                className="absolute inset-0 cursor-default"
                aria-label={t('common.close')}
                onClick={() => (isConfirm ? modal.onCancel() : modal.onClose())}
            />
            <div
                className="relative z-10 mx-auto flex flex-col overflow-hidden rounded-[2.5rem] border border-white/10 glass shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] max-h-[90vh]"
                style={{ width: 'min(32rem, calc(100vw - 2rem))' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500/0 via-white/10 to-blue-500/0"></div>
                <div className="flex items-start gap-4 p-6 sm:p-8 pb-4 sm:pb-6 relative">
                    {iconWrap}
                    <div className="min-w-0 flex-1 pt-0.5 flex flex-col max-h-[65vh]">
                        <h2
                            id="app-dialog-title"
                            className="text-lg font-black leading-snug text-white tracking-widest uppercase shrink-0"
                        >
                            {titleText}
                        </h2>
                        <div className="mt-3 overflow-y-auto pr-2 custom-scrollbar">
                            <p className="whitespace-pre-wrap break-words text-[11px] font-bold uppercase tracking-widest leading-relaxed text-white/50">
                                {modal.message}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-stretch sm:items-center justify-end gap-3 px-6 sm:px-8 py-5 sm:py-6 relative border-t border-white/5 bg-black/40">
                    {isConfirm ? (
                        <>
                            <button
                                type="button"
                                className="rounded-[1.5rem] bg-white/5 border border-transparent px-6 py-3.5 text-[11px] font-black uppercase tracking-widest text-white/50 shadow-sm hover:bg-white/10 hover:text-white transition-all min-h-[44px]"
                                onClick={modal.onCancel}
                            >
                                {modal.cancelLabel || t('common.no')}
                            </button>
                            <button
                                type="button"
                                className={`rounded-[1.5rem] px-8 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all min-h-[44px] ${confirmBtnClass}`}
                                onClick={modal.onConfirm}
                            >
                                {modal.confirmLabel || t('common.yes')}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            className={`w-full rounded-[1.5rem] px-8 py-3.5 text-[11px] font-black uppercase tracking-widest transition-all min-h-[44px] ${alertOkBtnClass}`}
                            onClick={modal.onClose}
                        >
                            {t('common.ok')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

function ToastStack({ items, onDismiss }) {
    return (
        <div
            className="pointer-events-none fixed top-4 right-4 flex max-w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
            style={{ zIndex: 2147483646 }}
            aria-live="polite"
        >
            {items.map((toast) => {
                const bar =
                    toast.type === 'error'
                        ? 'border-red-500/20 bg-red-950/80 text-red-400 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.3)]'
                        : toast.type === 'success'
                          ? 'border-emerald-500/20 bg-emerald-950/80 text-emerald-400 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.3)]'
                          : 'border-white/10 bg-black/80 text-white/90 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.5)]'
                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 rounded-2xl border px-4 py-3 text-xs glass transition-all ${bar}`}
                    >
                        <p className="min-w-0 flex-1 leading-relaxed font-bold uppercase tracking-widest text-[9px] pt-1">{toast.message}</p>
                        <button
                            type="button"
                            className="shrink-0 rounded-xl p-1.5 opacity-50 hover:opacity-100 hover:bg-white/10 transition-all text-white"
                            onClick={() => onDismiss(toast.id)}
                            aria-label="×"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

export function DialogProvider({ children }) {
    const [modal, setModal] = useState(null)
    const [toasts, setToasts] = useState([])

    const showAlert = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setModal({
                type: 'alert',
                title: options.title ?? null,
                message: String(message ?? ''),
                variant: options.variant ?? 'info',
                onClose: () => {
                    setModal(null)
                    resolve()
                },
            })
        })
    }, [])

    const showConfirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setModal({
                type: 'confirm',
                title: options.title ?? null,
                message: String(message ?? ''),
                variant: options.variant ?? 'default',
                confirmLabel: options.confirmLabel,
                cancelLabel: options.cancelLabel,
                onConfirm: () => {
                    setModal(null)
                    resolve(true)
                },
                onCancel: () => {
                    setModal(null)
                    resolve(false)
                },
            })
        })
    }, [])

    const showToast = useCallback((message, options = {}) => {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
        const duration = options.duration ?? 4500
        setToasts((prev) => [
            ...prev,
            { id, message: String(message ?? ''), type: options.type ?? 'info' },
        ])
        if (duration > 0) {
            window.setTimeout(() => {
                setToasts((prev) => prev.filter((x) => x.id !== id))
            }, duration)
        }
        return id
    }, [])

    useEffect(() => {
        if (!modal) return
        const onKey = (e) => {
            if (e.key === 'Escape') {
                if (modal.type === 'confirm') modal.onCancel()
                else modal.onClose()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [modal])

    const [portalEl, setPortalEl] = useState(null)
    useLayoutEffect(() => {
        setPortalEl(getDialogPortalNode())
    }, [])

    return (
        <DialogContext.Provider value={{ showAlert, showConfirm, showToast }}>
            {children}
            {portalEl && modal && createPortal(<ModalLayer modal={modal} />, portalEl)}
            {portalEl &&
                toasts.length > 0 &&
                createPortal(
                    <ToastStack
                        items={toasts}
                        onDismiss={(id) =>
                            setToasts((prev) => prev.filter((x) => x.id !== id))
                        }
                    />,
                    portalEl
                )}
        </DialogContext.Provider>
    )
}

export function useDialog() {
    const ctx = useContext(DialogContext)
    if (!ctx) {
        throw new Error('useDialog must be used within DialogProvider')
    }
    return ctx
}
