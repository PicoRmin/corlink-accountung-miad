import { CHECK_STATUSES } from "./constants.js"
import { getTransactions, updateTransaction } from "./transactions.js"
import { toISODate } from "./jalali.js"

export function getUpcomingChecks(daysAhead = 5) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(today)
    end.setDate(end.getDate() + daysAhead)

    return getTransactions({ method: "check" })
        .filter(tx => {
            if (!tx.dueDate) return false
            if (tx.checkStatus === CHECK_STATUSES.cleared) return false
            if (tx.checkStatus === CHECK_STATUSES.bounced) return false

            const due = new Date(tx.dueDate + "T12:00:00")
            return due >= today && due <= end
        })
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getPendingChecks(accountId) {
    return getTransactions({
        method: "check",
        accountId,
        checkStatus: CHECK_STATUSES.pending,
    })
}

export function getChecksByStatus(status, accountId) {
    return getTransactions({
        method: "check",
        accountId,
        checkStatus: status,
    })
}

export function setCheckStatus(id, status) {
    if (!Object.values(CHECK_STATUSES).includes(status)) {
        throw new Error(`Invalid check status: ${status}`)
    }
    return updateTransaction(id, { checkStatus: status })
}

export function clearCheck(id) {
    return setCheckStatus(id, CHECK_STATUSES.cleared)
}

export function bounceCheck(id) {
    return setCheckStatus(id, CHECK_STATUSES.bounced)
}

export function getOverdueChecks() {
    const todayISO = toISODate(new Date())
    return getTransactions({ method: "check", checkStatus: CHECK_STATUSES.pending })
        .filter(tx => tx.dueDate && tx.dueDate < todayISO)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function getCheckSummary(accountId) {
    const checks = getTransactions({ method: "check", accountId })
    const summary = {
        pending: 0,
        cleared: 0,
        bounced: 0,
        pendingAmount: 0,
        clearedAmount: 0,
    }

    checks.forEach(tx => {
        const st = tx.checkStatus || CHECK_STATUSES.pending
        if (st === CHECK_STATUSES.pending) {
            summary.pending += 1
            summary.pendingAmount += tx.amount
        } else if (st === CHECK_STATUSES.cleared) {
            summary.cleared += 1
            summary.clearedAmount += tx.amount
        } else if (st === CHECK_STATUSES.bounced) {
            summary.bounced += 1
        }
    })

    return summary
}
