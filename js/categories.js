import { loadDB, updateDB } from "./storage.js"
import { getTransactions } from "./transactions.js"
import { t } from "./i18n.js"

export function getCategories() {
    return loadDB().categories
}

export function getCategoryById(id) {
    return loadDB().categories.find(c => c.id === id) || null
}

export function getCategoryLabel(category) {
    if (!category) return ""
    return t(`category.${category.key}`, category.key)
}

export function addCategory({ key, icon, type = "expense" }) {
    let created = null
    updateDB(db => {
        created = {
            id: `cat-${key}-${Date.now()}`,
            key,
            icon,
            type,
        }
        db.categories.push(created)
    })
    return created
}

export function getExpenseByCategory(filters = {}) {
    const txs = getTransactions({
        ...filters,
        type: "expense",
    })

    const totals = new Map()

    txs.forEach(tx => {
        const catId = tx.categoryId || "cat-other"
        totals.set(catId, (totals.get(catId) || 0) + tx.amount)
    })

    const categories = getCategories()
    return categories
        .map(cat => ({
            category: cat,
            label: getCategoryLabel(cat),
            total: totals.get(cat.id) || 0,
        }))
        .filter(row => row.total > 0)
        .sort((a, b) => b.total - a.total)
}

export function getIncomeByCategory(filters = {}) {
    const txs = getTransactions({
        ...filters,
        type: "income",
    })

    const totals = new Map()

    txs.forEach(tx => {
        const catId = tx.categoryId || "cat-other"
        totals.set(catId, (totals.get(catId) || 0) + tx.amount)
    })

    return getCategories()
        .filter(c => c.type === "income")
        .map(cat => ({
            category: cat,
            label: getCategoryLabel(cat),
            total: totals.get(cat.id) || 0,
        }))
        .filter(row => row.total > 0)
        .sort((a, b) => b.total - a.total)
}
