import { getTransactions, getBalance, affectsBalance } from "./transactions.js"
import { loadDB } from "./storage.js"
import { monthKey } from "./jalali.js"

function txInReport(tx) {
    if (tx.type === "transfer") return false
    if (tx.method === "check" && tx.checkStatus !== "cleared") return false
    return true
}

export function calculateTotals(filters = {}) {
    let income = 0
    let expense = 0

    getTransactions(filters).forEach(tx => {
        if (!txInReport(tx)) return
        if (tx.type === "income") income += tx.amount
        else if (tx.type === "expense") expense += tx.amount
    })

    return { income, expense, net: income - expense }
}

export function getKPIs(filters = {}) {
    const txs = getTransactions(filters).filter(txInReport)
    const expenses = txs.filter(tx => tx.type === "expense")
    const incomes = txs.filter(tx => tx.type === "income")

    const totalExpense = expenses.reduce((s, tx) => s + tx.amount, 0)
    const totalIncome = incomes.reduce((s, tx) => s + tx.amount, 0)

    const uniqueDays = new Set(expenses.map(tx => tx.dateISO)).size
    const avgDailyExpense = uniqueDays > 0 ? totalExpense / uniqueDays : 0

    const maxIncome = incomes.reduce((max, tx) => Math.max(max, tx.amount), 0)
    const maxExpense = expenses.reduce((max, tx) => Math.max(max, tx.amount), 0)

    return {
        avgDailyExpense,
        maxIncome,
        maxExpense,
        totalIncome,
        totalExpense,
        transactionCount: txs.length,
    }
}

function shiftMonthKey(key, delta) {
    const [jy, jm] = key.split("-").map(Number)
    let ny = jy
    let nm = jm + delta
    while (nm > 12) { nm -= 12; ny += 1 }
    while (nm < 1) { nm += 12; ny -= 1 }
    return `${ny}-${String(nm).padStart(2, "0")}`
}

export function getMonthlyComparison(referenceDate = new Date()) {
    const currentKey = monthKey(referenceDate)
    const previousKey = shiftMonthKey(currentKey, -1)

    const current = calculateTotals({ monthKey: currentKey })
    const previous = calculateTotals({ monthKey: previousKey })

    const pct = (curr, prev) => {
        if (prev === 0) return curr > 0 ? 100 : 0
        return Math.round(((curr - prev) / prev) * 100)
    }

    return {
        currentMonth: currentKey,
        previousMonth: previousKey,
        current,
        previous,
        change: {
            income: pct(current.income, previous.income),
            expense: pct(current.expense, previous.expense),
            net: pct(current.net, previous.net),
        },
    }
}

export function getBalanceTimeline(accountId, monthsBack = 6) {
    const db = loadDB()
    const accId = accountId || db.activeAccountId

    const keys = []
    let key = monthKey(new Date())
    for (let i = 0; i < monthsBack; i += 1) {
        keys.unshift(key)
        key = shiftMonthKey(key, -1)
    }

    return keys.map(monthKeyValue => {
        const txsUpToMonth = db.transactions.filter(tx => {
            const txMonth = monthKey(new Date(tx.dateISO + "T12:00:00"))
            return txMonth <= monthKeyValue && (
                tx.accountId === accId
                || tx.transferFromAccountId === accId
                || tx.transferToAccountId === accId
            )
        })

        let balance = 0
        txsUpToMonth.forEach(tx => {
            if (tx.type === "transfer") {
                if (!affectsBalance(tx)) return
                if (tx.transferFromAccountId === accId) balance -= tx.amount
                if (tx.transferToAccountId === accId) balance += tx.amount
            } else if (tx.accountId === accId && affectsBalance(tx)) {
                if (tx.type === "income") balance += tx.amount
                else if (tx.type === "expense") balance -= tx.amount
            }
        })

        return {
            monthKey: monthKeyValue,
            balance,
            label: monthKeyValue.replace("-", "/"),
        }
    })
}

export function getDailyTotals(filters = {}, days = 30) {
    const txs = getTransactions(filters).filter(txInReport)
    const map = new Map()

    txs.forEach(tx => {
        const day = tx.dateISO
        if (!map.has(day)) map.set(day, { income: 0, expense: 0 })
        const row = map.get(day)
        if (tx.type === "income") row.income += tx.amount
        else row.expense += tx.amount
    })

    return [...map.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-days)
        .map(([dateISO, totals]) => ({ dateISO, ...totals }))
}

export function getMethodBreakdown(filters = {}) {
    const breakdown = { cash: 0, check: 0, transfer: 0 }
    getTransactions(filters).filter(txInReport).forEach(tx => {
        if (breakdown[tx.method] !== undefined) {
            breakdown[tx.method] += tx.amount
        }
    })
    return breakdown
}

export function getAccountSummary() {
    const db = loadDB()
    return db.accounts.map(acc => ({
        id: acc.id,
        name: acc.name,
        icon: acc.icon,
        balance: getBalance(acc.id),
        ...calculateTotals({ accountId: acc.id }),
    }))
}
