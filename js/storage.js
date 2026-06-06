import {
    DB_VERSION,
    DEFAULT_CATEGORIES,
    DEFAULT_SETTINGS,
    CHECK_STATUSES,
} from "./constants.js"
import { formatJalali, toISODate, monthKey } from "./jalali.js"

const DB_KEY = "financeDB"

export function generateId(prefix = "") {
    const rand = Math.random().toString(36).slice(2, 9)
    return prefix ? `${prefix}-${Date.now()}-${rand}` : `${Date.now()}-${rand}`
}

function createDefaultAccount() {
    return {
        id: generateId("acc"),
        name: "حساب اصلی",
        icon: "💰",
    }
}

export function createEmptyDB() {
    const defaultAccount = createDefaultAccount()
    return {
        dbVersion: DB_VERSION,
        activeAccountId: defaultAccount.id,
        accounts: [defaultAccount],
        categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
        budgets: [],
        transactions: [],
        settings: { ...DEFAULT_SETTINGS },
    }
}

function normalizeTransaction(tx, defaultAccountId) {
    const dateISO = tx.dateISO || (tx.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(tx.dueDate)
        ? tx.dueDate
        : toISODate(new Date()))

    let date = tx.date
    if (!date && dateISO) {
        try {
            date = formatJalali(new Date(dateISO + "T12:00:00"))
        } catch {
            date = formatJalali(new Date())
        }
    }

    const method = tx.method || "cash"
    const isCheck = method === "check"

    return {
        id: tx.id || generateId("tx"),
        accountId: tx.accountId || defaultAccountId,
        date: date || formatJalali(new Date()),
        dateISO,
        desc: tx.desc || "",
        amount: Number(tx.amount) || 0,
        type: tx.type || "expense",
        method,
        categoryId: tx.categoryId || "cat-other",
        checkNumber: tx.checkNumber || "",
        bank: tx.bank || "",
        dueDate: tx.dueDate || "",
        dueDateJalali: tx.dueDateJalali || (tx.dueDate ? formatJalali(new Date(tx.dueDate + "T12:00:00")) : ""),
        checkStatus: tx.checkStatus || (isCheck ? CHECK_STATUSES.pending : ""),
        transferToAccountId: tx.transferToAccountId || "",
        transferFromAccountId: tx.transferFromAccountId || "",
    }
}

export function migrate(raw) {
    if (!raw || typeof raw !== "object") {
        return createEmptyDB()
    }

    if (raw.dbVersion === DB_VERSION) {
        const db = { ...createEmptyDB(), ...raw }
        db.settings = { ...DEFAULT_SETTINGS, ...raw.settings }
        db.accounts = raw.accounts?.length ? raw.accounts : createEmptyDB().accounts
        db.activeAccountId = raw.activeAccountId || db.accounts[0].id
        db.categories = raw.categories?.length ? raw.categories : DEFAULT_CATEGORIES.map(c => ({ ...c }))
        db.budgets = raw.budgets || []
        db.transactions = (raw.transactions || []).map(tx =>
            normalizeTransaction(tx, db.activeAccountId)
        )
        db.dbVersion = DB_VERSION
        return db
    }

    const defaultAccount = createDefaultAccount()
    const migratedTx = (raw.transactions || []).map(tx =>
        normalizeTransaction(tx, defaultAccount.id)
    )

    return {
        dbVersion: DB_VERSION,
        activeAccountId: defaultAccount.id,
        accounts: [defaultAccount],
        categories: DEFAULT_CATEGORIES.map(c => ({ ...c })),
        budgets: [],
        transactions: migratedTx,
        settings: { ...DEFAULT_SETTINGS },
    }
}

export function loadDB() {
    const stored = localStorage.getItem(DB_KEY)

    if (!stored) {
        const db = createEmptyDB()
        localStorage.setItem(DB_KEY, JSON.stringify(db))
        return db
    }

    try {
        const parsed = JSON.parse(stored)
        const db = migrate(parsed)
        if (parsed.dbVersion !== DB_VERSION || !parsed.activeAccountId) {
            localStorage.setItem(DB_KEY, JSON.stringify(db))
        }
        return db
    } catch {
        const db = createEmptyDB()
        localStorage.setItem(DB_KEY, JSON.stringify(db))
        return db
    }
}

export function saveDB(db) {
    const payload = {
        ...db,
        dbVersion: DB_VERSION,
    }
    localStorage.setItem(DB_KEY, JSON.stringify(payload))
    return payload
}

export function updateDB(mutator) {
    const db = loadDB()
    mutator(db)
    return saveDB(db)
}
