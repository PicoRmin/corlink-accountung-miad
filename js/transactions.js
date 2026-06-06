import { CHECK_STATUSES } from "./constants.js"
import { formatJalali, toISODate, monthKey } from "./jalali.js"
import { loadDB, saveDB, generateId, updateDB } from "./storage.js"

function normalizeTxInput(data, existing = null) {
    const now = new Date()
    const dateISO = data.dateISO || existing?.dateISO || toISODate(data.date ? new Date(data.date) : now)
    const date = data.date || existing?.date || formatJalali(new Date(dateISO + "T12:00:00"))
    const method = data.method ?? existing?.method ?? "cash"
    const isCheck = method === "check"

    return {
        id: existing?.id || generateId("tx"),
        accountId: data.accountId ?? existing?.accountId ?? loadDB().activeAccountId,
        date,
        dateISO,
        desc: (data.desc ?? existing?.desc ?? "").trim(),
        amount: Math.abs(Number(data.amount ?? existing?.amount ?? 0)),
        type: data.type ?? existing?.type ?? "expense",
        method,
        categoryId: data.categoryId ?? existing?.categoryId ?? "cat-other",
        checkNumber: data.checkNumber ?? existing?.checkNumber ?? "",
        bank: data.bank ?? existing?.bank ?? "",
        dueDate: data.dueDate ?? existing?.dueDate ?? "",
        dueDateJalali: data.dueDateJalali ?? existing?.dueDateJalali
            ?? (data.dueDate ? formatJalali(new Date(data.dueDate + "T12:00:00")) : ""),
        checkStatus: data.checkStatus ?? existing?.checkStatus ?? (isCheck ? CHECK_STATUSES.pending : ""),
        transferToAccountId: data.transferToAccountId ?? existing?.transferToAccountId ?? "",
        transferFromAccountId: data.transferFromAccountId ?? existing?.transferFromAccountId ?? "",
    }
}

export function affectsBalance(tx) {
    if (tx.type === "transfer") return true
    if (tx.method === "check") return tx.checkStatus === CHECK_STATUSES.cleared
    return true
}

export function getSignedAmount(tx, accountId) {
    if (!affectsBalance(tx)) return 0

    if (tx.type === "transfer") {
        if (tx.transferFromAccountId === accountId) return -tx.amount
        if (tx.transferToAccountId === accountId) return tx.amount
        return 0
    }

    if (tx.accountId !== accountId) return 0
    if (tx.type === "income") return tx.amount
    if (tx.type === "expense") return -tx.amount
    return 0
}

export function recalculate(accountId) {
    return getBalance(accountId)
}

export function getBalance(accountId) {
    const db = loadDB()
    const id = accountId || db.activeAccountId
    return db.transactions.reduce((sum, tx) => sum + getSignedAmount(tx, id), 0)
}

export function getTransactions(filters = {}) {
    const db = loadDB()
    let list = [...db.transactions]

    if (filters.accountId) {
        list = list.filter(tx =>
            tx.accountId === filters.accountId
            || tx.transferFromAccountId === filters.accountId
            || tx.transferToAccountId === filters.accountId
        )
    }

    if (filters.type) {
        list = list.filter(tx => tx.type === filters.type)
    }

    if (filters.method) {
        list = list.filter(tx => tx.method === filters.method)
    }

    if (filters.categoryId) {
        list = list.filter(tx => tx.categoryId === filters.categoryId)
    }

    if (filters.checkStatus) {
        list = list.filter(tx => tx.checkStatus === filters.checkStatus)
    }

    if (filters.search) {
        const q = filters.search.trim()
        if (q) list = list.filter(tx => tx.desc.includes(q))
    }

    if (filters.fromDateISO) {
        list = list.filter(tx => tx.dateISO >= filters.fromDateISO)
    }

    if (filters.toDateISO) {
        list = list.filter(tx => tx.dateISO <= filters.toDateISO)
    }

    if (filters.monthKey) {
        list = list.filter(tx => monthKey(new Date(tx.dateISO + "T12:00:00")) === filters.monthKey)
    }

    const sortBy = filters.sortBy || "dateISO"
    const sortDir = filters.sortDir === "asc" ? 1 : -1

    list.sort((a, b) => {
        if (sortBy === "amount") return (a.amount - b.amount) * sortDir
        if (sortBy === "desc") return a.desc.localeCompare(b.desc, "fa") * sortDir
        return a.dateISO.localeCompare(b.dateISO) * sortDir
    })

    if (filters.offset) {
        list = list.slice(filters.offset)
    }

    if (filters.limit) {
        list = list.slice(0, filters.limit)
    }

    return list
}

export function getTransactionById(id) {
    return loadDB().transactions.find(tx => tx.id === id) || null
}

export function addTransaction(data) {
    const tx = normalizeTxInput(data)
    updateDB(db => {
        db.transactions.push(tx)
    })
    return tx
}

export function updateTransaction(id, data) {
    let updated = null
    updateDB(db => {
        const idx = db.transactions.findIndex(tx => tx.id === id)
        if (idx === -1) return
        updated = normalizeTxInput(data, db.transactions[idx])
        db.transactions[idx] = updated
    })
    return updated
}

export function deleteTransaction(id) {
    let removed = false
    updateDB(db => {
        const before = db.transactions.length
        db.transactions = db.transactions.filter(tx => tx.id !== id)
        removed = db.transactions.length < before
    })
    return removed
}

export function createTransferTransaction({ fromAccountId, toAccountId, amount, desc, dateISO }) {
    const now = new Date()
    const iso = dateISO || toISODate(now)
    return addTransaction({
        type: "transfer",
        method: "transfer",
        accountId: fromAccountId,
        transferFromAccountId: fromAccountId,
        transferToAccountId: toAccountId,
        amount: Math.abs(Number(amount)),
        desc: desc || "",
        dateISO: iso,
        date: formatJalali(new Date(iso + "T12:00:00")),
        categoryId: "cat-other",
    })
}
