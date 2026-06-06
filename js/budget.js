import { loadDB, generateId, updateDB } from "./storage.js"
import { getTransactions } from "./transactions.js"
import { monthKey } from "./jalali.js"

export function getBudgets(monthKeyFilter) {
    const budgets = loadDB().budgets
    if (!monthKeyFilter) return budgets
    return budgets.filter(b => b.monthKey === monthKeyFilter)
}

export function getBudgetByCategory(categoryId, monthKeyValue) {
    return loadDB().budgets.find(b =>
        b.categoryId === categoryId && b.monthKey === monthKeyValue
    ) || null
}

export function setBudget(categoryId, limit, monthKeyValue) {
    const amount = Math.max(0, Number(limit) || 0)
    let budget = null

    updateDB(db => {
        const idx = db.budgets.findIndex(b =>
            b.categoryId === categoryId && b.monthKey === monthKeyValue
        )

        if (amount === 0) {
            if (idx !== -1) db.budgets.splice(idx, 1)
            return
        }

        if (idx !== -1) {
            db.budgets[idx].limit = amount
            budget = { ...db.budgets[idx] }
        } else {
            budget = {
                id: generateId("bud"),
                categoryId,
                limit: amount,
                monthKey: monthKeyValue,
            }
            db.budgets.push(budget)
        }
    })

    return budget
}

export function deleteBudget(id) {
    updateDB(db => {
        db.budgets = db.budgets.filter(b => b.id !== id)
    })
}

export function getBudgetUsage(categoryId, monthKeyValue) {
    const budget = getBudgetByCategory(categoryId, monthKeyValue)
    const spent = getTransactions({
        type: "expense",
        categoryId,
        monthKey: monthKeyValue,
    }).reduce((sum, tx) => sum + tx.amount, 0)

    const limit = budget?.limit || 0
    const percent = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0

    return {
        categoryId,
        monthKey: monthKeyValue,
        limit,
        spent,
        remaining: Math.max(0, limit - spent),
        percent,
        budget,
    }
}

export function getBudgetAlerts(threshold = 0.8) {
    const db = loadDB()
    const currentMonth = monthKey(new Date())
    const alerts = []

    db.budgets
        .filter(b => b.monthKey === currentMonth && b.limit > 0)
        .forEach(b => {
            const usage = getBudgetUsage(b.categoryId, b.monthKey)
            if (usage.percent >= threshold * 100) {
                alerts.push({
                    ...usage,
                    severity: usage.percent >= 100 ? "over" : "warning",
                })
            }
        })

    return alerts.sort((a, b) => b.percent - a.percent)
}

export function getAllBudgetUsage(monthKeyValue) {
    const key = monthKeyValue || monthKey(new Date())
    const budgets = getBudgets(key)
    return budgets.map(b => getBudgetUsage(b.categoryId, key))
}
