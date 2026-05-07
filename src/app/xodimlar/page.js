'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { API_URL } from '@/app/buyurtmalar/utils'
import Header from '@/components/Header'
import {
    UserPlus,
    Edit,
    Trash2,
    Save,
    X,
    Search,
    Users,
    Banknote,
    Wallet,
    Lock,
    Unlock,
    CheckCircle2,
    Printer
} from 'lucide-react'
import { useLayout } from '@/context/LayoutContext'
import { useLanguage } from '@/context/LanguageContext'
import { useDialog } from '@/context/DialogContext'
import { normalizeUzbekPhone } from '@/lib/phoneNormalize'

const REPORT_PERIOD_STORAGE_KEY = 'crm_employees_report_ym'
const MONTHLY_REST_DAYS_LIMIT = 2

function getCurrentYm() {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** periodYm: "YYYY-MM" */
function monthRangeFromYm(periodYm) {
    const s = String(periodYm || '').trim()
    const m = /^(\d{4})-(\d{2})$/.exec(s)
    if (!m) {
        const d = new Date()
        const y = d.getFullYear()
        const mo = d.getMonth() + 1
        const pad = (n) => String(n).padStart(2, '0')
        const from = `${y}-${pad(mo)}-01`
        const lastDay = new Date(y, mo, 0).getDate()
        return { from, to: `${y}-${pad(mo)}-${pad(lastDay)}` }
    }
    const y = Number(m[1])
    const mo = Number(m[2])
    if (mo < 1 || mo > 12) {
        return monthRangeFromYm(getCurrentYm())
    }
    const pad = (n) => String(n).padStart(2, '0')
    const from = `${y}-${pad(mo)}-01`
    const lastDay = new Date(y, mo, 0).getDate()
    const to = `${y}-${pad(mo)}-${pad(lastDay)}`
    return { from, to }
}

function activityDateInReportMonth(dateStr, periodYm) {
    const head = String(dateStr || '').trim().slice(0, 7)
    return head === String(periodYm || '').trim()
}

/** Supabase UUID ba’zan turli registrda qaytadi — map kalitlari bir xil bo‘lsin */
function employeeMapKey(id) {
    if (id == null || id === '') return ''
    return String(id).trim().toLowerCase()
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export default function Xodimlar() {
    const { toggleSidebar } = useLayout()
    const { t, language } = useLanguage()
    const { showAlert, showConfirm } = useDialog()
    const [employees, setEmployees] = useState([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [editId, setEditId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [form, setForm] = useState({
        name: '',
        position: '',
        monthly_salary: '',
        bonus_percent: '0',
        worked_days: '0',
        rest_days: '0',
        phone: ''
    })
    const [reportPeriodYm, setReportPeriodYm] = useState(() => {
        if (typeof window === 'undefined') return getCurrentYm()
        try {
            const saved = localStorage.getItem(REPORT_PERIOD_STORAGE_KEY)
            if (saved && /^\d{4}-\d{2}$/.test(saved)) return saved
        } catch (_) {
            /* ignore */
        }
        return getCurrentYm()
    })
    const [advancesRaw, setAdvancesRaw] = useState([])
    const [salaryRaw, setSalaryRaw] = useState([])
    const [closedPeriodYms, setClosedPeriodYms] = useState([])
    const [payrollClosuresTableMissing, setPayrollClosuresTableMissing] = useState(false)
    const [salaryPaymentsTableMissing, setSalaryPaymentsTableMissing] = useState(false)
    /** { employeeId, name } | null — PIN dan keyin: avans/oylik ro‘yxati */
    const [salaryOverviewModal, setSalaryOverviewModal] = useState(null)
    const [salaryForm, setSalaryForm] = useState({ payment_date: '', note: '' })
    const [salarySaving, setSalarySaving] = useState(false)
    /** Tez ikki marta «Saqlash» — setState kechikishi sababli ikkala insert ketmasin */
    const salaryPaymentSubmitLockRef = useRef(false)
    const [advancesTableMissing, setAdvancesTableMissing] = useState(false)
    const [advancesLoadError, setAdvancesLoadError] = useState(null)
    const [advanceModal, setAdvanceModal] = useState(null)
    const [advanceForm, setAdvanceForm] = useState({ amount: '', advance_date: '', note: '' })
    const [advanceSaving, setAdvanceSaving] = useState(false)
    /** employee_id (normalize) → tasdiqlangan dam olish sanalari DD.MM.YYYY (yangisi birinchi) */
    const [approvedLeaveDatesByEmployee, setApprovedLeaveDatesByEmployee] = useState({})
    function formatUzs(n) {
        const v = Number(n) || 0
        return `${v.toLocaleString('uz-UZ')} so'm`
    }

    /** Shartnoma bo‘yicha qolgan: avans va oylik to‘lov alohida, jami chiqim = ikkalasi yig‘indisi. */
    function payoutRemainingVsContract(contractTotal, advSum, salSum) {
        const exp = Number(contractTotal) || 0
        const adv = Number(advSum) || 0
        const sal = Number(salSum) || 0
        const totalOut = adv + sal
        const remaining = Math.max(0, exp - totalOut)
        const overpaid = totalOut > exp + 0.01 ? totalOut - exp : 0
        return { remaining, totalOut, overpaid }
    }

    function formatAdvanceDate(iso) {
        if (!iso) return ''
        const part = String(iso).split('T')[0]
        const [y, m, d] = part.split('-')
        if (!d || !m || !y) return part
        return `${d}.${m}.${y}`
    }

    /** YYYY-MM-DD → DD.MM.YYYY */
    function formatYmdUz(ymd) {
        if (!ymd || typeof ymd !== 'string') return ''
        const [y, m, d] = ymd.split('-')
        if (!y || !m || !d) return ymd
        return `${d.padStart(2, '0')}.${m.padStart(2, '0')}.${y}`
    }

    /**
     * Oy filtri uchun YYYY-MM-DD. `advance_date` jadvalda DATE — PostgREST ko‘pincha "YYYY-MM-DD..." qaytaradi.
     * `new Date("...Z")` ba’zi vaqt zonalarida oy chegarasini siljitadi; shuning uchun boshidagi 10 belgi ustuvor.
     */
    function calendarYmdForFilter(value) {
        if (value == null || value === '') return ''
        const s = String(value).trim()
        const head = s.length >= 10 ? s.slice(0, 10) : ''
        if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head
        const d = new Date(s)
        if (Number.isNaN(d.getTime())) return ''
        const y = d.getFullYear()
        const m = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${y}-${m}-${day}`
    }

    /** Avans va oylik yozuvlarini sana bo‘yicha ketma-ket (xronologiya) birlashtirish. */
    function mergeEmployeePayoutsTimeline(advList, salList) {
        const items = []
        for (const r of advList || []) {
            const sortKey = calendarYmdForFilter(r.advance_date) || '9999-12-31'
            items.push({
                kind: 'advance',
                sortKey,
                id: r.id,
                amount: r.amount,
                note: r.note,
                raw: r,
                displayDate: r.advance_date
            })
        }
        for (const r of salList || []) {
            const sortKey = calendarYmdForFilter(r.payment_date) || '9999-12-31'
            items.push({
                kind: 'salary',
                sortKey,
                id: r.id,
                amount: r.amount,
                note: r.note,
                raw: r,
                displayDate: r.payment_date
            })
        }
        items.sort((a, b) => {
            const cmp = String(a.sortKey).localeCompare(String(b.sortKey))
            if (cmp !== 0) return cmp
            if (a.kind !== b.kind) return a.kind === 'advance' ? -1 : 1
            return String(a.id ?? '').localeCompare(String(b.id ?? ''))
        })
        return items
    }

    function rowInMonthRange(ymdLocal, from, to) {
        return ymdLocal.length === 10 && ymdLocal >= from && ymdLocal <= to
    }

    function todayIsoLocal() {
        const d = new Date()
        const y = d.getFullYear()
        const mo = d.getMonth() + 1
        const day = d.getDate()
        const pad = (n) => String(n).padStart(2, '0')
        return `${y}-${pad(mo)}-${pad(day)}`
    }

    function defaultActivityDateForReportPeriod(periodYm) {
        const { from, to } = monthRangeFromYm(periodYm)
        const today = todayIsoLocal()
        if (today < from) return from
        if (today > to) return to
        return today
    }

    useEffect(() => {
        try {
            localStorage.setItem(REPORT_PERIOD_STORAGE_KEY, reportPeriodYm)
        } catch (_) {
            /* ignore */
        }
    }, [reportPeriodYm])

    const advancesByEmployee = useMemo(() => {
        const { from, to } = monthRangeFromYm(reportPeriodYm)
        const byEmp = {}
        for (const a of advancesRaw) {
            const ymd = calendarYmdForFilter(a.advance_date)
            if (!rowInMonthRange(ymd, from, to)) continue
            const id = employeeMapKey(a.employee_id)
            if (!id) continue
            if (!byEmp[id]) byEmp[id] = []
            byEmp[id].push({
                id: a.id,
                advance_date: a.advance_date,
                amount: Number(a.amount || 0),
                note: a.note ? String(a.note).trim() : ''
            })
        }
        for (const k of Object.keys(byEmp)) {
            byEmp[k].sort((a, b) => String(b.advance_date).localeCompare(String(a.advance_date)))
        }
        return byEmp
    }, [advancesRaw, reportPeriodYm])

    const salaryPaymentsByEmployee = useMemo(() => {
        const { from, to } = monthRangeFromYm(reportPeriodYm)
        const salBy = {}
        for (const r of salaryRaw) {
            const ymd = calendarYmdForFilter(r.payment_date)
            if (!rowInMonthRange(ymd, from, to)) continue
            const id = employeeMapKey(r.employee_id)
            if (!id) continue
            if (!salBy[id]) salBy[id] = []
            salBy[id].push({
                id: r.id,
                payment_date: r.payment_date,
                amount: Number(r.amount || 0),
                note: r.note ? String(r.note).trim() : ''
            })
        }
        for (const k of Object.keys(salBy)) {
            salBy[k].sort((a, b) => String(b.payment_date).localeCompare(String(a.payment_date)))
        }
        return salBy
    }, [salaryRaw, reportPeriodYm])

    const loadEmployees = useCallback(async (opts) => {
        const silent = opts?.silent === true
        try {
            if (!silent) setLoading(true)
            
            // Backend API orqali xodimlarni olish
            const res = await fetch(`${API_URL}/employees`)
            if (!res.ok) throw new Error('Xodimlarni yuklab boʻlmadi')
            const data = await res.json()
            const rows = data || []
            setEmployees(rows)

            // Avanslar (Backend xodim bilan birga include qilib qaytarishi ham mumkin, 
            // lekin bu yerda alohida massivlarga yoyamiz)
            const allAdvances = []
            const allSalaries = []
            rows.forEach(emp => {
                if (emp.advances) allAdvances.push(...emp.advances)
                if (emp.salaries) allSalaries.push(...emp.salaries)
            })

            setAdvancesRaw(allAdvances)
            setSalaryRaw(allSalaries)
            setAdvancesTableMissing(false)
            setSalaryPaymentsTableMissing(false)
            
            // Payroll closures va boshqalar (Legacy logic)
            setClosedPeriodYms([]) 
            setPayrollClosuresTableMissing(false)
            setApprovedLeaveDatesByEmployee({})

            // Fetch closures and leaves
            const [closuresRes, leavesRes] = await Promise.all([
                fetch(`${API_URL}/employees/closures`).catch(() => null),
                fetch(`${API_URL}/employees/leaves`).catch(() => null)
            ])
            
            const closeRows = closuresRes?.ok ? await closuresRes.json() : []
            const leaveRows = leavesRes?.ok ? await leavesRes.json() : []

            setClosedPeriodYms((closeRows || []).map((r) => r.period_ym).filter(Boolean))

            const byKey = {}
            for (const r of leaveRows || []) {
                const k = employeeMapKey(r.employee_id)
                if (!k) continue
                const iso = r.resolved_at || r.createdAt
                const ymd = calendarYmdForFilter(iso)
                if (!ymd) continue
                if (!byKey[k]) byKey[k] = new Set()
                byKey[k].add(ymd)
            }
            const out = {}
            for (const k of Object.keys(byKey)) {
                const days = [...byKey[k]].sort((a, b) => b.localeCompare(a))
                out[k] = days.map((ymd) => formatYmdUz(ymd))
            }
            setApprovedLeaveDatesByEmployee(out)
        } catch (error) {
            console.error('Error loading employees:', error)
        } finally {
            if (!silent) setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadEmployees()
    }, [loadEmployees])

    async function executeCloseMonth(periodYm) {
        try {
            const res = await fetch(`${API_URL}/employees/closures`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ period_ym: periodYm, source: 'crm' })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                const dup = String(data.code) === 'P2002' || String(data.message || '').toLowerCase().includes('unique')
                if (dup) {
                    await showAlert(t('employees.payrollMonthAlreadyClosed'), { variant: 'warning' })
                } else {
                    throw new Error(data.message || 'Xatolik')
                }
            } else {
                await showAlert(t('employees.payrollMonthClosedOk'), { variant: 'success' })
            }
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.payrollMonthCloseError'), { variant: 'error' })
        }
    }

    async function executeReopenMonth(periodYm) {
        try {
            const res = await fetch(`${API_URL}/employees/closures/${periodYm}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Ochishda xatolik')
            await showAlert(t('employees.payrollMonthReopenedOk'), { variant: 'success' })
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.payrollMonthReopenError'), { variant: 'error' })
        }
    }

    async function openDeleteAdvance(row, employeeName) {
        if (!row?.id) {
            void showAlert(t('employees.advanceDeleteNoId'), { variant: 'warning' })
            return
        }
        const line = `${employeeName} — ${formatAdvanceDate(row.advance_date)} · ${formatUzs(row.amount)}`
        if (!(await showConfirm(`${t('employees.deleteOneAdvance')}?\n${line}`, { variant: 'warning' }))) return
        try {
            const res = await fetch(`${API_URL}/employees/advance/${row.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Xatolik')
            await showAlert(t('employees.advanceDeletedOk'), { variant: 'success' })
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.advanceDeleteError'), { variant: 'error' })
        }
    }

    async function openDeleteAllAdvancesPeriod(xodim, advList) {
        const ids = (advList || []).map((r) => r.id).filter(Boolean)
        if (!ids.length) return
        if (
            !(await showConfirm(
                `${t('employees.deleteAllAdvancesThisMonth')}?\n${xodim.name} · ${ids.length}`,
                { variant: 'warning' }
            ))
        )
            return
        try {
            const res = await fetch(`${API_URL}/employees/advance/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            })
            if (!res.ok) throw new Error('Xatolik')
            await showAlert(t('employees.advancesBulkDeletedOk'), { variant: 'success' })
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.advanceDeleteError'), { variant: 'error' })
        }
    }

    async function openDeleteSalaryPayment(row, employeeName) {
        if (!row?.id) {
            void showAlert(t('employees.salaryPaymentDeleteNoId'), { variant: 'warning' })
            return
        }
        const line = `${employeeName} — ${formatAdvanceDate(row.payment_date)} · ${formatUzs(row.amount)}`
        if (!(await showConfirm(`${t('employees.deleteOneSalaryPayment')}?\n${line}`, { variant: 'warning' }))) return
        try {
            const res = await fetch(`${API_URL}/employees/salary/${row.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Xatolik')
            await showAlert(t('employees.salaryPaymentDeletedOk'), { variant: 'success' })
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.salaryPaymentDeleteError'), { variant: 'error' })
        }
    }

    async function openDeleteAllSalaryPaymentsPeriod(xodim, salList) {
        const ids = (salList || []).map((r) => r.id).filter(Boolean)
        if (!ids.length) return
        if (
            !(await showConfirm(
                `${t('employees.deleteAllSalaryPaymentsThisMonth')}?\n${xodim.name} · ${ids.length}`,
                { variant: 'warning' }
            ))
        )
            return
        try {
            const res = await fetch(`${API_URL}/employees/salary/bulk-delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids })
            })
            if (!res.ok) throw new Error('Xatolik')
            await showAlert(t('employees.salaryPaymentsBulkDeletedOk'), { variant: 'success' })
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.salaryPaymentDeleteError'), { variant: 'error' })
        }
    }

    function scheduleDaysCap() {
        const m = /^(\d{4})-(\d{2})$/.exec(String(reportPeriodYm || ''))
        if (!m) return 30
        const y = Number(m[1])
        const mo = Number(m[2])
        if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) return 30
        return new Date(y, mo, 0).getDate()
    }

    function onRestDaysChange(raw) {
        const W = scheduleDaysCap()
        const r = Math.max(0, parseInt(String(raw).replace(/\D/g, ''), 10) || 0)
        const rr = Math.min(MONTHLY_REST_DAYS_LIMIT, r)
        const w = Math.max(0, W - rr)
        setForm((f) => ({ ...f, rest_days: String(rr), worked_days: String(w) }))
    }

    function onWorkedDaysChange(raw) {
        const W = scheduleDaysCap()
        const w0 = Math.max(0, parseInt(String(raw).replace(/\D/g, ''), 10) || 0)
        const ww = Math.min(W, w0)
        const r = Math.max(0, W - ww)
        const rr = Math.min(MONTHLY_REST_DAYS_LIMIT, r)
        const workedNormalized = Math.max(0, W - rr)
        setForm((f) => ({ ...f, worked_days: String(workedNormalized), rest_days: String(rr) }))
    }

    async function persistEmployee() {
        if (!form.name || !form.position || !form.monthly_salary) {
            alert(t('employees.requiredError'))
            return
        }
        const phoneTrim = String(form.phone || '').trim()
        if (phoneTrim) {
            const n = normalizeUzbekPhone(phoneTrim)
            if (!n) {
                void showAlert(t('employees.phoneInvalidWarn'), { variant: 'warning' })
                return
            }
        }
        const restDaysRaw = parseInt(form.rest_days, 10) || 0
        if (restDaysRaw > MONTHLY_REST_DAYS_LIMIT) {
            void showAlert(
                t('employees.restDaysLimitWarn').replace('{{n}}', String(MONTHLY_REST_DAYS_LIMIT)),
                { variant: 'warning' }
            )
            return
        }
        try {
            const W = scheduleDaysCap()
            const restDaysFinal = Math.min(MONTHLY_REST_DAYS_LIMIT, Math.max(0, restDaysRaw))
            const workedDaysFinal = Math.max(0, W - restDaysFinal)
            const employeeData = {
                name: form.name,
                position: form.position,
                monthly_salary: parseFloat(form.monthly_salary),
                bonus_percent: parseFloat(form.bonus_percent) || 0,
                worked_days: workedDaysFinal,
                rest_days: restDaysFinal,
                phone: phoneTrim ? normalizeUzbekPhone(phoneTrim) : null
            }

            if (editId) {
                const res = await fetch(`${API_URL}/employees/${editId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                })
                if (!res.ok) throw new Error('Saqlashda xatolik')
                setEditId(null)
            } else {
                const res = await fetch(`${API_URL}/employees`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                })
                if (!res.ok) throw new Error('Qoʻshishda xatolik')
            }

            setForm({
                name: '',
                position: '',
                monthly_salary: '',
                bonus_percent: '0',
                worked_days: '0',
                rest_days: '0',
                phone: ''
            })
            setIsAdding(false)
            await loadEmployees({ silent: true })
        } catch (error) {
            console.error('Error saving employee:', error)
            const detail = error?.message || error?.error_description || String(error?.code || '')
            await showAlert(
                detail ? `${t('common.saveError')}\n\n${detail}` : t('common.saveError'),
                { variant: 'error' }
            )
        }
    }

    function handleSubmit(e) {
        e.preventDefault()
        if (!form.name || !form.position || !form.monthly_salary) {
            alert(t('employees.requiredError'))
            return
        }
        void persistEmployee()
    }

    async function handleDelete(id) {
        if (!(await showConfirm(t('employees.deleteConfirm'), { variant: 'warning' }))) return
        try {
            const res = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Oʻchirishda xatolik')
            await loadEmployees({ silent: true })
        } catch (error) {
            console.error('Error deleting employee:', error)
            await showAlert(t('employees.deleteError'), { variant: 'error' })
        }
    }

    function handleEdit(item) {
        setForm({
            name: item.name,
            position: item.position,
            monthly_salary: item.monthly_salary.toString(),
            bonus_percent: item.bonus_percent?.toString() || '0',
            worked_days: item.worked_days?.toString() || '0',
            rest_days: item.rest_days?.toString() || '0',
            phone: item.phone ? String(item.phone) : ''
        })
        setEditId(item.id)
        setIsAdding(true)
    }

    function handleCancel() {
        setForm({
            name: '',
            position: '',
            monthly_salary: '',
            bonus_percent: '0',
            worked_days: '0',
            rest_days: '0',
            phone: ''
        })
        setEditId(null)
        setIsAdding(false)
    }

    function salaryCloseAutoAmountForEmployee(xodim) {
        const contractTotal = (Number(xodim.monthly_salary) || 0) + (Number(xodim.bonus_percent) || 0)
        const k = employeeMapKey(xodim.id)
        const advList = advancesByEmployee[k] || []
        const salList = salaryPaymentsByEmployee[k] || []
        const advSum = advList.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        const salSum = salList.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        const { remaining } = payoutRemainingVsContract(contractTotal, advSum, salSum)
        const remainingNum = Number(remaining) || 0
        const unsettledAdvance = Math.max(0, advSum - salSum)
        return remainingNum >= 0.01 ? remainingNum : unsettledAdvance >= 0.01 ? unsettledAdvance : 0
    }

    async function openSalaryModal(xodim) {
        if (salaryPaymentsTableMissing) {
            await showAlert(t('employees.salaryPaymentsTableMissing'), { variant: 'warning' })
            return
        }
        if (closedPeriodYms.includes(reportPeriodYm)) {
            await showAlert(t('employees.payrollMonthClosedNoNewRows'), { variant: 'warning' })
            return
        }
        if (salaryCloseAutoAmountForEmployee(xodim) < 0.01) {
            await showAlert(t('employees.salaryCloseDuplicateWarn'), { variant: 'warning' })
            return
        }
        setSalaryOverviewModal({ employeeId: xodim.id, name: xodim.name })
        setSalaryForm({
            payment_date: defaultActivityDateForReportPeriod(reportPeriodYm),
            note: ''
        })
    }

    async function openAdvanceModal(xodim) {
        if (advancesTableMissing) {
            await showAlert(t('employees.advancesTableMissing'), { variant: 'warning' })
            return
        }
        if (closedPeriodYms.includes(reportPeriodYm)) {
            await showAlert(t('employees.payrollMonthClosedNoNewRows'), { variant: 'warning' })
            return
        }
        setAdvanceModal({ employeeId: xodim.id, name: xodim.name })
        setAdvanceForm({
            amount: '',
            advance_date: defaultActivityDateForReportPeriod(reportPeriodYm),
            note: ''
        })
    }

    function closeSalaryOverviewModal() {
        setSalaryOverviewModal(null)
        setSalaryForm({ payment_date: '', note: '' })
    }

    function closeAdvanceModal() {
        setAdvanceModal(null)
        setAdvanceForm({ amount: '', advance_date: '', note: '' })
    }

    function hasSalaryPaymentDuplicateThisMonth(employeeId, paymentDateInput, amount) {
        const ymd = calendarYmdForFilter(paymentDateInput)
        if (ymd.length !== 10) return false
        const empKey = employeeMapKey(employeeId)
        const list = salaryPaymentsByEmployee[empKey] || []
        const a = Number(amount) || 0
        return list.some(
            (r) =>
                calendarYmdForFilter(r.payment_date) === ymd &&
                Math.abs((Number(r.amount) || 0) - a) < 0.01
        )
    }

    async function handleSalaryPaymentSubmit(e) {
        e.preventDefault()
        if (!salaryOverviewModal || !salaryOverviewPayoutContext) return
        const amt = Math.round((Number(salaryOverviewPayoutContext.salaryAutoSaveAmount) || 0) * 100) / 100
        if (amt < 0.01) {
            await showAlert(t('employees.salaryCloseDuplicateWarn'), { variant: 'warning' })
            return
        }
        if (!salaryForm.payment_date) {
            await showAlert(t('employees.salaryPaymentDateRequired'), { variant: 'warning' })
            return
        }
        if (!activityDateInReportMonth(salaryForm.payment_date, reportPeriodYm)) {
            await showAlert(t('employees.payrollDateOutsideReportMonth'), { variant: 'warning' })
            return
        }

        if (salaryPaymentSubmitLockRef.current) return
        salaryPaymentSubmitLockRef.current = true
        try {
            setSalarySaving(true)
            if (
                hasSalaryPaymentDuplicateThisMonth(
                    salaryOverviewModal.employeeId,
                    salaryForm.payment_date,
                    amt
                )
            ) {
                await showAlert(t('employees.salaryPaymentDuplicateBlocked'), { variant: 'warning' })
                return
            }
            const empUuid = String(salaryOverviewModal.employeeId).trim()
            const { data: dupOnServer, error: dupServErr } = await supabase
                .from('employee_salary_payments')
                .select('id')
                .eq('employee_id', empUuid)
                .eq('payment_date', salaryForm.payment_date)
                .eq('amount', amt)
                .limit(1)
            if (dupServErr) {
                console.error('employee_salary_payments dup check:', dupServErr)
                await showAlert(
                    `${t('employees.salaryPaymentDupCheckFailed')}\n\n${dupServErr.message || String(dupServErr.code || '')}`,
                    { variant: 'error' }
                )
                return
            }
            if (dupOnServer?.length) {
                await showAlert(t('employees.salaryPaymentDuplicateBlocked'), { variant: 'warning' })
                await loadEmployees({ silent: true })
                return
            }
            const { data: insertedSal, error } = await fetch(`${API_URL}/employees/salary`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: empUuid,
                    amount: amt,
                    date: salaryForm.payment_date,
                    note: cleanNote && cleanNote !== '-' ? cleanNote : null
                })
            }).then(r => r.ok ? r.json() : ({}))

            if (!insertedSal?.id) {
                throw new Error('Toʻlovni saqlashda xatolik')
            }
            if (error) {
                const em = String(error.message || '').toLowerCase()
                const dup =
                    String(error.code || '') === '23505' ||
                    em.includes('duplicate key') ||
                    em.includes('unique constraint')
                if (dup) {
                    await showAlert(t('employees.salaryPaymentDuplicateBlocked'), { variant: 'warning' })
                    return
                }
                throw error
            }
            const newSalRow = insertedSal?.[0]
            if (newSalRow) {
                setSalaryRaw((prev) =>
                    prev.some((r) => r.id === newSalRow.id) ? prev : [newSalRow, ...prev]
                )
            }
            /** Alert/modaldan oldin — aks holda `loadEmployees` tugamaguncha ro‘yxat eski, ikkinchi «yopish» dublikat yaratadi */
            await loadEmployees({ silent: true })
            await showAlert(t('employees.salaryPaymentSaved'), { variant: 'success' })
            closeSalaryOverviewModal()
        } catch (err) {
            console.error(err)
            await showAlert(t('employees.salaryPaymentError'), { variant: 'error' })
        } finally {
            salaryPaymentSubmitLockRef.current = false
            setSalarySaving(false)
        }
    }

    async function handleAdvanceSubmit(e) {
        e.preventDefault()
        if (!advanceModal) return
        const amt = parseFloat(String(advanceForm.amount).replace(/\s/g, '').replace(',', '.'))
        if (!Number.isFinite(amt) || amt <= 0) {
            await showAlert(t('employees.salaryAmountInvalid'), { variant: 'warning' })
            return
        }
        if (!advanceForm.advance_date) {
            await showAlert(t('employees.advanceDateRequired'), { variant: 'warning' })
            return
        }
        if (!activityDateInReportMonth(advanceForm.advance_date, reportPeriodYm)) {
            await showAlert(t('employees.payrollDateOutsideReportMonth'), { variant: 'warning' })
            return
        }
        try {
            setAdvanceSaving(true)
            const cleanNote = advanceForm.note?.trim() || null
            const empId = String(advanceModal.employeeId || '').trim()
            
            const res = await fetch(`${API_URL}/employees/advance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeeId: empId,
                    amount: amt,
                    date: advanceForm.advance_date,
                    note: cleanNote && cleanNote !== '-' ? cleanNote : null
                })
            })
            if (!res.ok) throw new Error('Avans saqlashda xatolik')
            
            await showAlert(t('employees.advanceSaved'), { variant: 'success' })
            closeAdvanceModal()
            await loadEmployees({ silent: true })
        } catch (err) {
            console.error(err)
            const detail = err?.message || err?.error_description || String(err)
            await showAlert(`${t('employees.advanceError')}\n\n${detail}`, { variant: 'error' })
        } finally {
            setAdvanceSaving(false)
        }
    }

    function salaryStatusBadge(expectedTotal, settledTotal) {
        const exp = Number(expectedTotal) || 0
        const paid = Number(settledTotal) || 0
        if (exp <= 0) return null
        if (paid <= 0) {
            return (
                <span className="text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-[1rem] bg-white/5 text-white/40 border border-white/5 w-fit">
                    {t('employees.salaryBadgePending')}
                </span>
            )
        }
        if (exp > 0 && paid + 0.01 < exp) {
            return (
                <span className="text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-[1rem] bg-amber-500/10 text-amber-500 border border-amber-500/20 w-fit">
                    {t('employees.salaryBadgePartial')}
                </span>
            )
        }
        return (
            <span className="text-[9px] uppercase tracking-widest font-black px-2.5 py-1 rounded-[1rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit">
                {t('employees.salaryBadgePaid')}
            </span>
        )
    }

    const filteredEmployees = employees.filter((x) => {
        const q = searchTerm.toLowerCase().trim()
        if (!q) return true
        if (x.name?.toLowerCase().includes(q)) return true
        if (x.position?.toLowerCase().includes(q)) return true
        const digitsQ = q.replace(/\D/g, '')
        if (digitsQ.length > 0) {
            const ph = String(x.phone || '').replace(/\D/g, '')
            if (ph.includes(digitsQ)) return true
        }
        return false
    })

    const scheduleHintText = t('employees.daysScheduleHint').replace(
        '{{n}}',
        String(scheduleDaysCap())
    )

    const monthAdvancesGrandTotalRaw = useMemo(
        () =>
            Object.values(advancesByEmployee).reduce(
                (sum, list) => sum + (list || []).reduce((s, r) => s + (Number(r.amount) || 0), 0),
                0
            ),
        [advancesByEmployee]
    )
    const monthSalaryPaidGrandTotalRaw = useMemo(
        () =>
            Object.values(salaryPaymentsByEmployee).reduce(
                (sum, list) => sum + (list || []).reduce((s, r) => s + (Number(r.amount) || 0), 0),
                0
            ),
        [salaryPaymentsByEmployee]
    )

    /** Sariq karta: avanslar − oylik to‘lovlari (yopilgan qism ayiriladi) */
    const monthAdvancesNetDisplay = useMemo(() => {
        if (salaryPaymentsTableMissing) return monthAdvancesGrandTotalRaw
        return Math.max(0, monthAdvancesGrandTotalRaw - monthSalaryPaidGrandTotalRaw)
    }, [
        monthAdvancesGrandTotalRaw,
        monthSalaryPaidGrandTotalRaw,
        salaryPaymentsTableMissing
    ])

    /** Jami chiqim: ikki yo‘nalishni ikki marta hisoblamaslik */
    const monthTotalPaidOutGrandTotal = useMemo(() => {
        if (salaryPaymentsTableMissing) return monthAdvancesGrandTotalRaw
        return Math.max(monthAdvancesGrandTotalRaw, monthSalaryPaidGrandTotalRaw)
    }, [monthAdvancesGrandTotalRaw, monthSalaryPaidGrandTotalRaw, salaryPaymentsTableMissing])

    const salaryOverviewPayoutContext = useMemo(() => {
        if (!salaryOverviewModal?.employeeId) return null
        const xodim = employees.find(
            (e) => employeeMapKey(e.id) === employeeMapKey(salaryOverviewModal.employeeId)
        )
        if (!xodim) return null
        const contractTotal = (Number(xodim.monthly_salary) || 0) + (Number(xodim.bonus_percent) || 0)
        const k = employeeMapKey(xodim.id)
        const advList = advancesByEmployee[k] || []
        const salList = salaryPaymentsByEmployee[k] || []
        const advSum = advList.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        const salSum = salList.reduce((s, r) => s + (Number(r.amount) || 0), 0)
        const { remaining, totalOut } = payoutRemainingVsContract(contractTotal, advSum, salSum)
        const timeline = mergeEmployeePayoutsTimeline(advList, salList)
        const salaryAutoSaveAmount = salaryCloseAutoAmountForEmployee(xodim)
        return {
            contractTotal,
            advSum,
            salSum,
            remaining,
            totalOut,
            advList,
            salList,
            timeline,
            xodim,
            salaryAutoSaveAmount
        }
    }, [salaryOverviewModal, employees, advancesByEmployee, salaryPaymentsByEmployee])

    const statsMonthLabel = useMemo(() => {
        const { from } = monthRangeFromYm(reportPeriodYm)
        const [y, mo] = from.split('-').map(Number)
        const d = new Date(y, mo - 1, 1)
        const loc = language === 'ru' ? 'ru-RU' : language === 'en' ? 'en-US' : 'uz-UZ'
        return d.toLocaleDateString(loc, { month: 'long', year: 'numeric' })
    }, [reportPeriodYm, language])

    const isReportMonthClosed = closedPeriodYms.includes(reportPeriodYm)

    async function printEmployeesPayrollTable() {
        const rows = filteredEmployees.map((xodim) => {
            const empKey = employeeMapKey(xodim.id)
            const contractTotal = (Number(xodim.monthly_salary) || 0) + (Number(xodim.bonus_percent) || 0)
            const advList = advancesByEmployee[empKey] || []
            const advSum = advList.reduce((s, r) => s + (Number(r.amount) || 0), 0)
            const salList = salaryPaymentsByEmployee[empKey] || []
            const salSum = salList.reduce((s, r) => s + (Number(r.amount) || 0), 0)
            const totalOut = salaryPaymentsTableMissing ? advSum : Math.max(advSum, salSum)
            const remaining = Math.max(0, contractTotal - totalOut)
            return `
                <tr>
                    <td>${escapeHtml(xodim.name || '')}</td>
                    <td>${escapeHtml(xodim.position || '')}</td>
                    <td>${escapeHtml(formatUzs(contractTotal))}</td>
                    <td>${escapeHtml(formatUzs(advSum))}</td>
                    <td>${escapeHtml(salaryPaymentsTableMissing ? '—' : formatUzs(salSum))}</td>
                    <td>${escapeHtml(formatUzs(totalOut))}</td>
                    <td>${escapeHtml(formatUzs(remaining))}</td>
                </tr>
            `
        })
        const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(t('common.employees'))}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
    h1 { margin: 0 0 6px; font-size: 22px; }
    .sub { margin: 0 0 4px; color: #475569; font-size: 13px; }
    .cards { margin: 10px 0 16px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 7px 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(t('common.employees'))}</h1>
  <p class="sub">${escapeHtml(statsMonthLabel)}</p>
  <p class="sub">${escapeHtml(new Date().toLocaleString())}</p>
  <div class="cards">
    <div>${escapeHtml(t('employees.statsCardAdvancesTotal'))}: ${escapeHtml(formatUzs(monthAdvancesNetDisplay))}</div>
    <div>${escapeHtml(t('employees.statsCardSalaryClosedTotal'))}: ${escapeHtml(salaryPaymentsTableMissing ? '—' : formatUzs(monthSalaryPaidGrandTotalRaw))}</div>
    <div>${escapeHtml(t('employees.monthTotalPaidOutCard'))}: ${escapeHtml(formatUzs(monthTotalPaidOutGrandTotal))}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>${escapeHtml(t('employees.name'))}</th>
        <th>${escapeHtml(t('employees.position'))}</th>
        <th>${escapeHtml(t('employees.salaryModalContractLabel'))}</th>
        <th>${escapeHtml(t('employees.salaryModalPaidAdvanceLabel'))}</th>
        <th>${escapeHtml(t('employees.salaryModalPaidSalaryLabel'))}</th>
        <th>${escapeHtml(t('employees.rowTotalPaidOutLabel'))}</th>
        <th>${escapeHtml(t('employees.salaryModalRemainingLabel'))}</th>
      </tr>
    </thead>
    <tbody>
      ${rows.length ? rows.join('') : `<tr><td colspan="7">${escapeHtml(t('employees.noEmployees'))}</td></tr>`}
    </tbody>
  </table>
</body>
</html>`
        const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=820')
        if (popup) {
            popup.document.write(html)
            popup.document.close()
            popup.focus()
            popup.print()
            return
        }

        // Popup bloklansa ham shu oynada print qilish uchun fallback.
        const iframe = document.createElement('iframe')
        iframe.style.position = 'fixed'
        iframe.style.right = '0'
        iframe.style.bottom = '0'
        iframe.style.width = '0'
        iframe.style.height = '0'
        iframe.style.border = '0'
        document.body.appendChild(iframe)
        const doc = iframe.contentWindow?.document
        if (!doc) {
            iframe.remove()
            window.print()
            return
        }
        doc.open()
        doc.write(html)
        doc.close()
        setTimeout(() => {
            iframe.contentWindow?.focus()
            iframe.contentWindow?.print()
            setTimeout(() => iframe.remove(), 1500)
        }, 120)
    }

    if (loading) {
        return (
            <div className="p-8">
                <div className="flex items-center justify-center h-[50vh]">
                    <div className="animate-spin rounded-[1rem] h-16 w-16 border-[4px] border-b-transparent border-blue-500/50"></div>
                </div>
            </div>
        )
    }


    return (
        <div className="min-h-screen text-slate-100 font-sans selection:bg-blue-500/30 overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
            {/* CYBER BACKGROUND WITH GRID */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
                <div className="absolute inset-0 bg-[#070b14]" />
                <div className="absolute inset-0 opacity-[0.08]" 
                    style={{ backgroundImage: `linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)`, backgroundSize: '40px 40px' }} 
                />
                <div className="absolute top-[-15%] right-[-10%] w-[1000px] h-[1000px] bg-blue-500/30 blur-[150px] rounded-full animate-pulse" />
                <div className="absolute bottom-[-15%] left-[-10%] w-[900px] h-[900px] bg-purple-500/30 blur-[150px] rounded-full animate-pulse duration-[7s]" />
            </div>

            <div className="w-full h-screen p-4 lg:p-6 relative z-10 flex flex-col items-center">
                {/* MAIN CONTAINER WITH SOLID NEON BORDER */}
                <div className="w-full max-w-[1550px] h-full bg-[#0f172a]/70 border border-blue-500/40 rounded-3xl p-4 lg:p-6 shadow-[0_0_60px_rgba(37,99,235,0.15)] backdrop-blur-2xl flex flex-col gap-6 overflow-hidden">
                    <div className="shrink-0 flex flex-col gap-4">
                        <Header title={t('common.employees')} toggleSidebar={toggleSidebar} />
                    </div>
                    <div className="flex-1 overflow-y-auto no-scrollbar pb-10">

            <div className="flex flex-col gap-3 mb-6 px-0.5">
                <div className="flex flex-col lg:flex-row lg:flex-wrap lg:items-end gap-3 justify-between">
                    <p className="text-[11px] text-white/30 uppercase tracking-widest font-bold">
                        <span className="text-white/50 font-black">{t('employees.statsMonthLabel')}</span>{' '}
                        <span className="text-white font-black ml-1 uppercase">{statsMonthLabel}</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <label
                            htmlFor="report-period-ym"
                            className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] whitespace-nowrap"
                        >
                            {t('employees.reportPeriodPickerLabel')}
                        </label>
                        <input
                            id="report-period-ym"
                            type="month"
                            value={reportPeriodYm}
                            onChange={(e) => {
                                const v = e.target.value
                                if (v && /^\d{4}-\d{2}$/.test(v)) setReportPeriodYm(v)
                            }}
                            className="px-4 py-2.5 rounded-[1.5rem] border border-white/5 bg-black/40 text-sm font-bold text-white focus:ring-1 focus:ring-blue-500/50 outline-none transition-all custom-calendar-icon"
                        />
                        <button
                            type="button"
                            onClick={() => setReportPeriodYm(getCurrentYm())}
                            className="px-4 py-2.5 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-all border border-transparent shadow-sm"
                        >
                            {t('employees.reportPeriodCurrentMonth')}
                        </button>
                        {!payrollClosuresTableMissing ? (
                            isReportMonthClosed ? (
                                <button
                                    type="button"
                                    onClick={() => void executeReopenMonth(reportPeriodYm)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white transition-all border border-amber-500/20"
                                >
                                    <Unlock size={14} aria-hidden />
                                    {t('employees.payrollReopenMonth')}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => void executeCloseMonth(reportPeriodYm)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[1.5rem] text-[10px] uppercase font-black tracking-widest bg-white/10 text-white hover:bg-white/20 transition-all border border-white/5"
                                >
                                    <Lock size={14} aria-hidden />
                                    {t('employees.payrollCloseMonth')}
                                </button>
                            )
                        ) : null}
                    </div>
                </div>
                {isReportMonthClosed ? (
                    <div
                        className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 px-6 py-4 text-sm text-emerald-400 font-bold glass"
                        role="status"
                    >
                        <span className="font-black uppercase tracking-widest">{statsMonthLabel}</span>
                        {' — '}
                        <span className="opacity-80">{t('employees.payrollMonthClosedBanner')}</span>
                    </div>
                ) : null}
                {payrollClosuresTableMissing ? (
                    <div
                        className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 px-6 py-4 text-sm text-amber-400 font-bold glass"
                        role="status"
                    >
                        <span className="opacity-80 uppercase tracking-widest">{t('employees.payrollClosuresTableMissing')}</span>
                    </div>
                ) : null}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                <div className="glass rounded-[2rem] p-6 flex flex-col justify-center border-blue-500/20 bg-blue-500/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-[10px] font-black tracking-widest uppercase text-blue-500/70">{t('employees.statsCardEmployeesCount')}</p>
                            <p className="text-[9px] text-blue-500/40 mt-1 uppercase tracking-wider">{t('employees.statsCardEmployeesHint')}</p>
                            <p className="text-3xl font-black mt-3 tabular-nums text-blue-400">{employees.length}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-2xl shrink-0 ring-1 ring-blue-500/30">
                            <Users className="text-blue-500" size={24} />
                        </div>
                    </div>
                </div>
                <div className="glass rounded-[2rem] p-6 flex flex-col justify-center border-amber-500/20 bg-amber-500/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex justify-between items-start gap-3 relative z-10">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black tracking-widest uppercase text-amber-500/70">{t('employees.statsCardAdvancesTotal')}</p>
                            <p className="text-[9px] text-amber-500/40 mt-1 uppercase tracking-wider">{t('employees.statsCardAdvancesHint')}</p>
                            <p className="text-3xl font-black mt-3 tabular-nums text-amber-400">
                                {formatUzs(monthAdvancesNetDisplay)}
                            </p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-2xl shrink-0 ring-1 ring-amber-500/30">
                            <Wallet className="text-amber-500" size={24} aria-hidden />
                        </div>
                    </div>
                </div>
                <div className="glass rounded-[2rem] p-6 flex flex-col justify-center border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex justify-between items-start gap-3 relative z-10">
                        <div className="min-w-0">
                            <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500/70">{t('employees.statsCardSalaryClosedTotal')}</p>
                            <p className="text-[9px] text-emerald-500/40 mt-1 uppercase tracking-wider">{t('employees.statsCardSalaryClosedHint')}</p>
                            <p className="text-3xl font-black mt-3 tabular-nums text-emerald-400">
                                {salaryPaymentsTableMissing ? '—' : formatUzs(monthSalaryPaidGrandTotalRaw)}
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-2xl shrink-0 ring-1 ring-emerald-500/30">
                            <Banknote className="text-emerald-500" size={24} aria-hidden />
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-8 rounded-[2rem] glass border border-white/5 bg-white/[0.02] px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
                        {t('employees.monthTotalPaidOutCard')}
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1 font-bold">{t('employees.monthTotalPaidOutHint')}</p>
                </div>
                <p className="text-3xl font-black tabular-nums text-white shrink-0 neon-text">
                    {formatUzs(monthTotalPaidOutGrandTotal)}
                </p>
            </div>

            {salaryPaymentsTableMissing && (
                <div
                    className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    role="status"
                >
                    {t('employees.salaryPaymentsTableMissing')}
                </div>
            )}
            {advancesTableMissing && (
                <div
                    className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
                    role="status"
                >
                    {t('employees.advancesTableMissing')}
                </div>
            )}
            {advancesLoadError ? (
                <div
                    className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950 break-words"
                    role="alert"
                >
                    <span className="font-semibold">{t('employees.advancesLoadErrorTitle')}</span> {advancesLoadError}
                </div>
            ) : null}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8 glass rounded-[2rem] p-4">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-6 top-3.5 text-white/30" size={18} />
                    <input
                        type="text"
                        placeholder={t('employees.searchPlaceholder')}
                        className="w-full pl-14 pr-6 py-3 bg-black/20 border border-white/5 focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 rounded-[1.5rem] outline-none transition-all text-white placeholder-white/20 text-sm font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => void printEmployeesPayrollTable()}
                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white px-6 py-3 rounded-[1.5rem] transition-all border border-white/5 text-[11px] font-black uppercase tracking-widest"
                    >
                        <Printer size={16} />
                        <span className="hidden sm:inline">{t('common.print')}</span>
                    </button>
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className={`flex items-center gap-3 px-8 py-3 rounded-[1.5rem] transition-all text-[11px] font-black uppercase tracking-widest ${
                            isAdding
                                ? 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                                : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 hover:bg-blue-500'
                        }`}
                    >
                        {isAdding ? <X size={16} /> : <UserPlus size={16} />}
                        <span className="hidden sm:inline">{isAdding ? t('common.cancel') : t('employees.addEmployee')}</span>
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="glass rounded-[2.5rem] px-8 py-8 mb-8 fade-in relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative z-10">
                        <h3 className="text-xl font-black text-white uppercase tracking-wider mb-8 flex items-center gap-3">
                            <span className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 ring-1 ring-blue-500/30">
                                <UserPlus size={16} />
                            </span>
                            {editId ? t('employees.editEmployee') : t('employees.addEmployeeTitle')}
                        </h3>
                        <form onSubmit={handleSubmit}>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.nameLabel')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('employees.name')}
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.positionLabel')}</label>
                                    <input
                                        type="text"
                                        placeholder={t('employees.position')}
                                        value={form.position}
                                        onChange={(e) => setForm({ ...form, position: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.salaryLabel')}</label>
                                    <input
                                        type="number"
                                        placeholder={t('employees.salaryPlaceholder')}
                                        value={form.monthly_salary}
                                        onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold font-mono"
                                        required
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.bonus')}</label>
                                    <input
                                        type="number"
                                        placeholder={t('employees.bonusPlaceholder')}
                                        value={form.bonus_percent}
                                        onChange={(e) => setForm({ ...form, bonus_percent: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold font-mono"
                                        min="0"
                                    />
                                </div>
                                <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.phoneLabel')}</label>
                                    <input
                                        type="tel"
                                        autoComplete="tel"
                                        placeholder={t('employees.phonePlaceholder')}
                                        value={form.phone}
                                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold font-mono"
                                    />
                                </div>
                                <div className="md:col-span-2 lg:col-span-3">
                                    <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold leading-relaxed ml-2">{scheduleHintText}</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.workedDays')}</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={form.worked_days}
                                        onChange={(e) => onWorkedDaysChange(e.target.value)}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold font-mono"
                                        min="0"
                                        max="31"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] uppercase font-black tracking-[0.15em] text-white/50 ml-2">{t('employees.restDays')}</label>
                                    <input
                                        type="number"
                                        placeholder="0"
                                        value={form.rest_days}
                                        onChange={(e) => onRestDaysChange(e.target.value)}
                                        className="w-full px-6 py-4 bg-black/20 border border-white/5 rounded-[1.5rem] focus:bg-black/40 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 outline-none transition-all text-white placeholder-white/20 text-sm font-bold font-mono"
                                        min="0"
                                        max={String(MONTHLY_REST_DAYS_LIMIT)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-6 border-t border-white/5">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-8 py-3.5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-white/50 hover:bg-white/5 hover:text-white transition-all border border-transparent"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3.5 rounded-[1.5rem] hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 shadow-xl shadow-blue-600/30 font-black uppercase tracking-widest text-[11px] transition-all"
                                >
                                    <Save size={16} />
                                    {t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="glass rounded-[2.5rem] overflow-hidden">
                {filteredEmployees.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-white/20">
                        <Users size={64} className="mb-6 opacity-40 shrink-0 mx-auto" />
                        <p className="font-black text-sm uppercase tracking-widest">{t('employees.noEmployees')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[70rem] text-left">
                            <thead className="bg-[#0f172a] text-[10px] font-black uppercase tracking-[0.2em] text-white/30 border-y border-white/10">
                                <tr className="border-b border-white/5">
                                    <th className="sticky left-0 z-30 bg-[#0f172a] px-6 py-6 text-left align-middle w-[13rem] min-w-[13rem] max-w-[13rem] shadow-[4px_0_12px_-6px_rgba(0,0,0,0.5)]">
                                        {t('employees.name')}
                                    </th>
                                    <th className="sticky left-[13rem] z-30 bg-[#0f172a] px-6 py-6 text-left align-middle w-[11rem] min-w-[11rem] max-w-[11rem] shadow-[4px_0_12px_-6px_rgba(0,0,0,0.5)]">
                                        {t('employees.position')}
                                    </th>
                                    <th className="px-6 py-6 align-middle min-w-[20rem] max-w-[32rem]">
                                        <span className="block">{t('employees.operationsColumnTitle')}</span>
                                        <span className="block font-bold text-[9px] text-white/20 mt-1 uppercase tracking-widest">
                                            {t('employees.operationsColumnSub')}
                                        </span>
                                    </th>
                                    <th className="sticky right-[4.5rem] z-30 bg-[#0f172a] px-2 py-6 text-center align-middle w-16 min-w-[4rem] shadow-[-6px_0_14px_-6px_rgba(0,0,0,0.5)]">
                                        <span className="block text-[9px] tracking-widest text-white/20 font-black">
                                            {t('employees.tableColEditShort')}
                                        </span>
                                    </th>
                                    <th className="sticky right-0 z-30 bg-[#0f172a] px-2 py-6 text-center align-middle w-16 min-w-[4rem] shadow-[-6px_0_14px_-6px_rgba(0,0,0,0.5)]">
                                        <span className="block text-[9px] tracking-widest text-white/20 font-black">
                                            {t('employees.tableColDeleteShort')}
                                        </span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredEmployees.map((xodim) => {
                                    const empKey = employeeMapKey(xodim.id)
                                    const approvedLeaveDates = approvedLeaveDatesByEmployee[empKey] || []
                                    const restDaysCount = Math.max(0, Number(xodim.rest_days) || 0)
                                    const approvedVisibleDates =
                                        restDaysCount > 0 ? approvedLeaveDates.slice(0, restDaysCount) : []
                                    const contractTotal = (xodim.monthly_salary || 0) + (xodim.bonus_percent || 0)
                                    const advList = advancesByEmployee[empKey] || []
                                    const advSum = advList.reduce((s, r) => s + (r.amount || 0), 0)
                                    const salList = salaryPaymentsByEmployee[empKey] || []
                                    const salSum = salList.reduce((s, r) => s + (r.amount || 0), 0)
                                    const payoutTimeline = mergeEmployeePayoutsTimeline(advList, salList)
                                    const rowHasPayrollContext =
                                        contractTotal >= 0.01 || advSum >= 0.01 || salSum >= 0.01
                                    const salaryCloseDoneThisMonth =
                                        !salaryPaymentsTableMissing &&
                                        rowHasPayrollContext &&
                                        salaryCloseAutoAmountForEmployee(xodim) < 0.01
                                    return (
                                        <tr key={xodim.id} className="group transition-colors hover:bg-white/[0.02]">
                                            <td className="sticky left-0 z-20 bg-transparent group-hover:bg-[#1a2333]/90 backdrop-blur-md px-6 py-6 align-top border-b border-white/5 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.5)] w-[13rem] min-w-[13rem] max-w-[13rem] relative transition-colors">
                                                <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                <div className="flex flex-col gap-2 min-w-0">
                                                    <span className="font-black text-white/90 break-words leading-snug">{xodim.name}</span>
                                                    {xodim.phone ? (
                                                        <span className="text-[11px] font-mono font-bold text-white/40">{xodim.phone}</span>
                                                    ) : null}
                                                    {approvedVisibleDates.length > 0 ? (
                                                        <div className="text-[10px] text-white/30 leading-snug font-bold">
                                                            <span className="opacity-70">
                                                                {t('employees.approvedLeaveDatesLabel')}{' '}
                                                            </span>
                                                            <span className="font-mono tabular-nums text-emerald-400/80">
                                                                {approvedVisibleDates.join(', ')}
                                                            </span>
                                                        </div>
                                                    ) : null}
                                                    {salaryStatusBadge(contractTotal, advSum + salSum)}
                                                </div>
                                            </td>
                                            <td className="sticky left-[13rem] z-20 bg-transparent group-hover:bg-[#1a2333]/90 backdrop-blur-md px-6 py-6 align-top border-b border-white/5 shadow-[4px_0_12px_-6px_rgba(0,0,0,0.5)] w-[11rem] min-w-[11rem] max-w-[11rem] transition-colors">
                                                <span className="text-[12px] text-white/60 break-words leading-snug font-bold line-clamp-4">
                                                    {xodim.position}
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 align-top border-b border-white/5 min-w-[20rem] max-w-[32rem]">
                                                <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-xs tabular-nums text-white max-w-sm">
                                                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                                                        <span className="text-white/40 font-black uppercase tracking-widest text-[9px]">
                                                            {t('employees.rowTotalPaidOutLabel')}
                                                        </span>
                                                        <span className="font-black text-white text-sm neon-text">
                                                            {formatUzs(
                                                                salaryPaymentsTableMissing
                                                                    ? advSum
                                                                    : Math.max(advSum, salSum)
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-3 mb-3">
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            closedPeriodYms.includes(reportPeriodYm) ||
                                                            advancesTableMissing
                                                        }
                                                        onClick={() => void openAdvanceModal(xodim)}
                                                        className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest leading-snug bg-amber-500/10 text-amber-500 hover:bg-amber-500 hover:text-white border border-amber-500/20 disabled:opacity-30 disabled:pointer-events-none transition-all whitespace-nowrap"
                                                        title={
                                                            closedPeriodYms.includes(reportPeriodYm)
                                                                ? t('employees.payrollMonthClosedNoNewRows')
                                                                : advancesTableMissing
                                                                  ? t('employees.advancesTableMissing')
                                                                  : t('employees.rowGiveCashTitle')
                                                        }
                                                    >
                                                        <Wallet size={14} aria-hidden />
                                                        {t('employees.rowGiveCashShort')}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        disabled={
                                                            closedPeriodYms.includes(reportPeriodYm) ||
                                                            salaryPaymentsTableMissing
                                                        }
                                                        onClick={() => void openSalaryModal(xodim)}
                                                        className="inline-flex items-center justify-center gap-2 py-2 px-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest leading-snug bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 disabled:opacity-30 disabled:pointer-events-none transition-all whitespace-nowrap"
                                                        title={
                                                            closedPeriodYms.includes(reportPeriodYm)
                                                                ? t('employees.payrollMonthClosedNoNewRows')
                                                                : salaryPaymentsTableMissing
                                                                  ? t('employees.salaryPaymentsTableMissing')
                                                                  : t('employees.rowCloseSalaryTitle')
                                                        }
                                                    >
                                                        <Banknote size={14} aria-hidden />
                                                        {t('employees.rowCloseSalaryShort')}
                                                    </button>
                                                    {salaryCloseDoneThisMonth ? (
                                                        <span
                                                            className="inline-flex items-center gap-1.5 rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-[9px] font-black uppercase tracking-wider leading-tight text-emerald-400"
                                                            title={t('employees.rowSalaryClosedThisMonthTitle')}
                                                            role="status"
                                                        >
                                                            <CheckCircle2
                                                                className="shrink-0 text-emerald-400"
                                                                size={14}
                                                                aria-hidden
                                                            />
                                                            {t('employees.rowSalaryClosedThisMonthShort')}
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold leading-snug mb-3">
                                                    {t('employees.rowStatsLinkHint')}
                                                </p>
                                                <div className="flex flex-wrap gap-4 mb-4">
                                                    {!advancesTableMissing && advList.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeleteAllAdvancesPeriod(xodim, advList)}
                                                            className="text-[10px] font-black text-rose-500/70 hover:text-rose-400 uppercase tracking-widest"
                                                        >
                                                            {t('employees.deleteAllAdvancesThisMonth')}
                                                        </button>
                                                    ) : null}
                                                    {!salaryPaymentsTableMissing && salList.length > 1 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => openDeleteAllSalaryPaymentsPeriod(xodim, salList)}
                                                            className="text-[10px] font-black text-rose-500/70 hover:text-rose-400 uppercase tracking-widest"
                                                        >
                                                            {t('employees.deleteAllSalaryPaymentsThisMonth')}
                                                        </button>
                                                    ) : null}
                                                </div>
                                                {payoutTimeline.length > 0 ? (
                                                    <ol className="space-y-2 text-[11px] font-bold list-none pl-0">
                                                        {payoutTimeline.map((item, idx) => (
                                                            <li
                                                                key={
                                                                    item.kind === 'advance'
                                                                        ? `a-${item.raw?.id || `${item.sortKey}-${item.amount}-${idx}`}`
                                                                        : `s-${item.raw?.id || `${item.sortKey}-${item.amount}-${idx}`}`
                                                                }
                                                                className="tabular-nums rounded-2xl border border-white/5 bg-black/20 px-3 py-3 max-w-md group/item hover:border-white/10 transition-colors"
                                                            >
                                                                <div className="flex flex-wrap items-start gap-2">
                                                                    <span className="shrink-0 w-5 text-[9px] font-black text-white/20 pt-0.5 mt-0.5">
                                                                        {idx + 1}.
                                                                    </span>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="flex flex-wrap items-center gap-1.5 gap-y-1">
                                                                            <span className="text-white/40 font-mono">
                                                                                {formatAdvanceDate(item.displayDate)}
                                                                            </span>
                                                                            <span className="text-white/20">—</span>
                                                                            <span className="font-black text-white/80">
                                                                                {formatUzs(item.amount)}
                                                                            </span>
                                                                        </div>
                                                                        {item.note ? (
                                                                            <div className="text-[10px] text-white/40 mt-1.5 leading-snug">
                                                                                <span className="opacity-50">{t('employees.expenseNotePrefix')}</span>{' '}
                                                                                {item.note}
                                                                            </div>
                                                                        ) : null}
                                                                    </div>
                                                                    <div className="shrink-0 flex flex-wrap items-center justify-end gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                                        {item.kind === 'advance' &&
                                                                        !advancesTableMissing &&
                                                                        item.raw?.id ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openDeleteAdvance(item.raw, xodim.name)
                                                                                }
                                                                                className="shrink-0 p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10"
                                                                                title={t('employees.deleteOneAdvance')}
                                                                            >
                                                                                <Trash2 size={14} aria-hidden />
                                                                            </button>
                                                                        ) : null}
                                                                        {item.kind === 'salary' && item.raw?.id ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() =>
                                                                                    openDeleteSalaryPayment(item.raw, xodim.name)
                                                                                }
                                                                                className="shrink-0 p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/10"
                                                                                title={t('employees.deleteOneSalaryPayment')}
                                                                            >
                                                                                <Trash2 size={14} aria-hidden />
                                                                            </button>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </li>
                                                        ))}
                                                    </ol>
                                                ) : (
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('employees.noPayoutsThisMonth')}</p>
                                                )}
                                            </td>
                                            <td className="sticky right-[4.5rem] z-20 bg-transparent group-hover:bg-[#1a2333]/90 backdrop-blur-md px-0 py-3 align-middle border-b border-white/5 border-l border-white/5 w-16 min-w-[4rem] shadow-[-6px_0_14px_-6px_rgba(0,0,0,0.5)] transition-colors">
                                                <div className="flex justify-center items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEdit(xodim)}
                                                        className="p-3 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                                        title={t('employees.editEmployee')}
                                                    >
                                                        <Edit size={18} aria-hidden />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="sticky right-0 z-20 bg-transparent group-hover:bg-[#1a2333]/90 backdrop-blur-md px-0 py-3 align-middle border-b border-white/5 w-16 min-w-[4rem] shadow-[-6px_0_14px_-6px_rgba(0,0,0,0.5)] transition-colors">
                                                <div className="flex justify-center items-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => void handleDelete(xodim.id)}
                                                        className="p-3 text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                                        title={t('common.delete')}
                                                    >
                                                        <Trash2 size={18} aria-hidden />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {salaryOverviewModal && salaryOverviewPayoutContext ? (
                <div
                    className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="salary-overview-title"
                    onClick={(ev) => {
                        if (ev.target === ev.currentTarget) closeSalaryOverviewModal()
                    }}
                >
                    <div
                        className="relative w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col rounded-[2.5rem] border border-white/10 bg-[#0f172a]/95 shadow-[0_0_60px_rgba(16,185,129,0.15)] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            type="button"
                            onClick={closeSalaryOverviewModal}
                            className="absolute right-6 top-6 rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white transition-all z-10"
                            aria-label={t('common.close')}
                        >
                            <X size={20} />
                        </button>
                        <div className="px-8 pt-8 pb-6 border-b border-white/5 shrink-0 bg-transparent">
                            <h2 id="salary-overview-title" className="text-xl font-black text-white pr-10 uppercase tracking-widest">
                                {salaryOverviewModal.name}
                            </h2>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-white/40 mt-2">
                                {t('employees.salaryOverviewSubtitle')} —{' '}
                                <span className="text-blue-400">{statsMonthLabel}</span>
                            </p>
                        </div>
                        <div className="px-8 py-6 overflow-y-auto flex-1 min-h-0 space-y-6 custom-scrollbar">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/50 mb-3">{t('employees.advancesAccountingTitle')}</p>
                                <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-400 tabular-nums font-bold shadow-inner">
                                    <span className="uppercase tracking-widest opacity-80">{t('employees.salaryModalPaidAdvanceLabel')}:</span>{' '}
                                    <span className="font-black text-amber-500 neon-text">{formatUzs(salaryOverviewPayoutContext.advSum)}</span>
                                </div>
                            </div>
                            <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] shadow-inner px-5 py-4 text-xs text-white/70 space-y-3 tabular-nums font-bold">
                                <div className="flex flex-wrap justify-between gap-x-2">
                                    <span className="uppercase tracking-widest text-[9px] opacity-60">{t('employees.salaryModalContractLabel')}</span>
                                    <span className="font-black text-white">{formatUzs(salaryOverviewPayoutContext.contractTotal)}</span>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2">
                                    <span className="uppercase tracking-widest text-[9px] opacity-60">{t('employees.salaryModalPaidAdvanceLabel')}</span>
                                    <span className="font-black text-amber-400">{formatUzs(salaryOverviewPayoutContext.advSum)}</span>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2">
                                    <span className="uppercase tracking-widest text-[9px] opacity-60">{t('employees.salaryModalPaidSalaryLabel')}</span>
                                    <span className="font-black text-emerald-400">
                                        {salaryPaymentsTableMissing ? '—' : formatUzs(salaryOverviewPayoutContext.salSum)}
                                    </span>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2 pt-3 border-t border-white/5">
                                    <span className="text-[10px] uppercase tracking-widest text-white">{t('employees.salaryModalTotalPaidLabel')}</span>
                                    <span className="font-black text-white">
                                        {salaryPaymentsTableMissing
                                            ? formatUzs(salaryOverviewPayoutContext.advSum)
                                            : formatUzs(salaryOverviewPayoutContext.totalOut)}
                                    </span>
                                </div>
                                <div className="flex flex-wrap justify-between gap-x-2 pt-1">
                                    <span className="text-[10px] uppercase tracking-widest text-white">{t('employees.salaryModalRemainingLabel')}</span>
                                    <span className="font-black text-amber-400">
                                        {salaryPaymentsTableMissing
                                            ? '—'
                                            : formatUzs(salaryOverviewPayoutContext.remaining)}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-3">
                                    {t('employees.salaryOverviewListTitle')}
                                </p>
                                {salaryOverviewPayoutContext.timeline.length > 0 ? (
                                    <ol className="space-y-3 text-xs list-none pl-0">
                                        {salaryOverviewPayoutContext.timeline.map((item, idx) => (
                                            <li
                                                key={
                                                    item.kind === 'advance'
                                                        ? `ov-a-${item.raw?.id || `${item.sortKey}-${idx}`}`
                                                        : `ov-s-${item.raw?.id || `${item.sortKey}-${idx}`}`
                                                }
                                                className="rounded-[1.5rem] border border-white/10 bg-white/[0.02] px-4 py-3 tabular-nums flex gap-3 items-start shadow-inner"
                                            >
                                                <span className="text-white/20 font-black shrink-0 text-[10px] pt-0.5">{idx + 1}.</span>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white/40 font-mono text-[10px] tracking-wider">{formatAdvanceDate(item.displayDate)}</span>
                                                        <span className="text-white/20">—</span>
                                                        <span className="font-black text-white/90">{formatUzs(item.amount)}</span>
                                                    </div>
                                                    {item.note ? (
                                                        <div className="text-[10px] text-white/40 mt-1 uppercase tracking-widest">{item.note}</div>
                                                    ) : null}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                ) : (
                                    <p className="text-[10px] uppercase tracking-widest font-black text-white/30">{t('employees.noPayoutsThisMonth')}</p>
                                )}
                            </div>
                        </div>
                        <div className="px-8 py-6 border-t border-white/5 shrink-0 bg-black/40 rounded-b-[2.5rem] space-y-4 relative">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">
                                {t('employees.salaryOverviewFormLead')}
                            </p>
                            {salaryPaymentsTableMissing || closedPeriodYms.includes(reportPeriodYm) ? (
                                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-widest rounded-[1.5rem] bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                                    {salaryPaymentsTableMissing
                                        ? t('employees.salaryPaymentsTableMissing')
                                        : t('employees.payrollMonthClosedNoNewRows')}
                                </p>
                            ) : (
                                <form onSubmit={handleSalaryPaymentSubmit} className="space-y-4">
                                    <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest leading-relaxed">
                                        {t('employees.salaryPaymentCalculatedTotalsNote')}
                                    </p>
                                    <div className="rounded-[1.5rem] border border-white/5 bg-black/60 px-4 py-3 space-y-2 text-xs tabular-nums">
                                        <div className="flex flex-wrap justify-between gap-x-2 gap-y-1">
                                            <span className="text-white/50 uppercase tracking-widest text-[9px] font-bold">
                                                {t('employees.salaryModalTotalPaidLabel')}
                                            </span>
                                            <span className="font-black text-white">
                                                {formatUzs(salaryOverviewPayoutContext.totalOut)}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap justify-between gap-x-2 gap-y-1 pt-2 border-t border-white/5">
                                            <span className="text-white/80 uppercase tracking-widest text-[9px] font-black">
                                                {t('employees.salaryPaymentAutoSaveAmountLabel')}
                                            </span>
                                            <span className="font-black text-emerald-400">
                                                {salaryOverviewPayoutContext.salaryAutoSaveAmount >= 0.01
                                                    ? formatUzs(salaryOverviewPayoutContext.salaryAutoSaveAmount)
                                                    : '—'}
                                            </span>
                                        </div>
                                    </div>
                                    {salaryOverviewPayoutContext.salaryAutoSaveAmount >= 0.01 &&
                                    salaryOverviewPayoutContext.remaining < 0.01 ? (
                                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest rounded-[1.5rem] bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
                                            {t('employees.salaryCloseFromAdvanceHint')}
                                        </p>
                                    ) : null}
                                    {salaryOverviewPayoutContext.salaryAutoSaveAmount < 0.01 ? (
                                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest rounded-[1.5rem] bg-white/5 border border-white/10 px-4 py-3">
                                            {t('employees.salaryNoRemainingToSaveHint')}
                                        </p>
                                    ) : null}
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/70 ml-2">
                                            {t('employees.salaryPaymentDateLabel')}
                                        </label>
                                        <input
                                            type="date"
                                            required={salaryOverviewPayoutContext.salaryAutoSaveAmount >= 0.01}
                                            value={salaryForm.payment_date}
                                            onChange={(e) => setSalaryForm({ ...salaryForm, payment_date: e.target.value })}
                                            className="w-full px-5 py-3 border border-white/10 text-white rounded-[1.5rem] focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-black/40 custom-calendar-icon"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/70 ml-2">
                                            {t('employees.salaryPaymentNoteLabel')}
                                        </label>
                                        <input
                                            type="text"
                                            value={salaryForm.note}
                                            onChange={(e) => setSalaryForm({ ...salaryForm, note: e.target.value })}
                                            className="w-full px-5 py-3 border border-white/10 text-white rounded-[1.5rem] focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-[11px] uppercase tracking-widest font-bold placeholder-white/20 bg-black/40"
                                            placeholder="—"
                                        />
                                    </div>
                                    <div className="flex flex-wrap justify-end gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={closeSalaryOverviewModal}
                                            className="px-6 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all border border-transparent"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={salarySaving}
                                            className="px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white disabled:opacity-50 transition-all shadow-xl shadow-emerald-500/20"
                                        >
                                            {salarySaving
                                                ? t('common.loading')
                                                : salaryOverviewPayoutContext.salaryAutoSaveAmount >= 0.01
                                                  ? t('common.save')
                                                  : t('common.close')}
                                        </button>
                                    </div>
                                    <p className="text-[9px] uppercase tracking-widest font-bold text-white/30 text-right mt-2 mr-2">
                                        {salaryOverviewPayoutContext.salaryAutoSaveAmount >= 0.01
                                            ? t('employees.salarySaveClosesModalHint')
                                            : t('employees.salaryCloseModalHint')}
                                    </p>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            ) : salaryOverviewModal && !salaryOverviewPayoutContext ? (
                <div
                    className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="relative w-full max-w-sm rounded-[2rem] border border-white/10 glass p-8 shadow-2xl flex flex-col items-center">
                        <p className="text-[11px] font-black uppercase tracking-widest text-white/70 text-center">{t('employees.salaryOverviewNotFound')}</p>
                        <button
                            type="button"
                            onClick={closeSalaryOverviewModal}
                            className="mt-6 px-8 py-3 rounded-[1.5rem] font-black uppercase tracking-widest text-[11px] bg-white/10 text-white hover:bg-white/20 transition-all"
                        >
                            {t('common.close')}
                        </button>
                    </div>
                </div>
            ) : null}

            {advanceModal && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="advance-modal-title"
                >
                    <div className="relative w-full max-w-md rounded-[2.5rem] border border-white/10 glass p-8 shadow-2xl overflow-hidden">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-500/20 via-amber-400/50 to-amber-500/20"></div>
                        <button
                            type="button"
                            onClick={closeAdvanceModal}
                            className="absolute right-6 top-6 rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white transition-all"
                            aria-label={t('common.close')}
                        >
                            <X size={20} />
                        </button>
                        <h2 id="advance-modal-title" className="text-xl font-black text-white pr-10 mb-2 uppercase tracking-widest">
                            {t('employees.advanceModalTitle')}
                        </h2>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-amber-400/80 mb-8">{advanceModal.name}</p>
                        <form onSubmit={handleAdvanceSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/70 ml-2">{t('employees.advanceAmount')}</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    required
                                    value={advanceForm.amount}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, amount: e.target.value })}
                                    className="w-full px-5 py-3.5 border border-white/10 bg-white/[0.02] text-white rounded-[1.5rem] focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm font-black transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/70 ml-2">{t('employees.advanceDateLabel')}</label>
                                <input
                                    type="date"
                                    required
                                    value={advanceForm.advance_date}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, advance_date: e.target.value })}
                                    className="w-full px-5 py-3.5 border border-white/10 bg-white/[0.02] text-white rounded-[1.5rem] focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm font-black transition-all custom-calendar-icon"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-white/70 ml-2">{t('employees.advanceNoteLabel')}</label>
                                <input
                                    type="text"
                                    value={advanceForm.note}
                                    onChange={(e) => setAdvanceForm({ ...advanceForm, note: e.target.value })}
                                    className="w-full px-5 py-3.5 border border-white/10 bg-white/[0.02] text-white rounded-[1.5rem] focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none text-[11px] uppercase tracking-widest font-bold placeholder-white/20 transition-all"
                                    placeholder="—"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={closeAdvanceModal}
                                    className="px-6 py-3.5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest text-white/50 hover:bg-white/10 hover:text-white transition-all border border-transparent"
                                >
                                    {t('common.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={advanceSaving}
                                    className="px-8 py-3.5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500 hover:text-white disabled:opacity-50 transition-all shadow-xl shadow-amber-500/20"
                                >
                                    {advanceSaving ? t('common.loading') : t('common.save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

                    </div>
                </div>
            </div>
            <style jsx global>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    )
}