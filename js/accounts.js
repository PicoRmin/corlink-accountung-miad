import { loadDB, saveDB, generateId, updateDB } from "./storage.js"
import { createTransferTransaction, getBalance } from "./transactions.js"

export function getAccounts() {
    return loadDB().accounts
}

export function getActiveAccountId() {
    return loadDB().activeAccountId
}

export function getActiveAccount() {
    const db = loadDB()
    return db.accounts.find(a => a.id === db.activeAccountId) || db.accounts[0] || null
}

export function setActiveAccountId(id) {
    updateDB(db => {
        if (db.accounts.some(a => a.id === id)) {
            db.activeAccountId = id
        }
    })
}

export function getAccountById(id) {
    return loadDB().accounts.find(a => a.id === id) || null
}

export function addAccount({ name, icon = "💰" }) {
    const account = {
        id: generateId("acc"),
        name: name.trim(),
        icon,
    }
    updateDB(db => {
        db.accounts.push(account)
        if (!db.activeAccountId) db.activeAccountId = account.id
    })
    return account
}

export function updateAccount(id, { name, icon }) {
    let updated = null
    updateDB(db => {
        const acc = db.accounts.find(a => a.id === id)
        if (!acc) return
        if (name !== undefined) acc.name = name.trim()
        if (icon !== undefined) acc.icon = icon
        updated = { ...acc }
    })
    return updated
}

export function deleteAccount(id) {
    const db = loadDB()
    if (db.accounts.length <= 1) {
        return { ok: false, reason: "last_account" }
    }

    const hasTx = db.transactions.some(tx =>
        tx.accountId === id
        || tx.transferFromAccountId === id
        || tx.transferToAccountId === id
    )
    if (hasTx) {
        return { ok: false, reason: "has_transactions" }
    }

    updateDB(d => {
        d.accounts = d.accounts.filter(a => a.id !== id)
        if (d.activeAccountId === id) {
            d.activeAccountId = d.accounts[0]?.id || ""
        }
    })
    return { ok: true }
}

export function getTotalBalance() {
    const db = loadDB()
    return db.accounts.reduce((sum, acc) => sum + getBalance(acc.id), 0)
}

export function transferBetweenAccounts(fromAccountId, toAccountId, amount, desc = "") {
    const from = Number(amount)
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) {
        throw new Error("Invalid transfer accounts")
    }
    if (!from || from <= 0) {
        throw new Error("Invalid transfer amount")
    }

    const tx = createTransferTransaction({
        fromAccountId,
        toAccountId,
        amount: from,
        desc,
    })
    return tx
}

export function getAccountBalances() {
    return getAccounts().map(acc => ({
        ...acc,
        balance: getBalance(acc.id),
    }))
}
