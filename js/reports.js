import { getTransactions } from "./transactions.js"

export function calculateTotals() {

    let income = 0
    let expense = 0

    getTransactions().forEach(t => {

        if (t.type === "income") income += t.amount
        else expense += t.amount

    })

    return { income, expense }

}
