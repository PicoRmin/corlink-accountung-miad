import { getTransactions } from "./transactions.js"

export function getUpcomingChecks() {

    const list = getTransactions()

    const today = new Date()

    let reminders = []

    list.forEach(t => {

        if (t.method === "check" && t.dueDate) {

            let due = new Date(t.dueDate)

            let diff = (due - today) / (1000 * 60 * 60 * 24)

            if (diff <= 5 && diff >= 0) {

                reminders.push(t)

            }

        }

    })

    return reminders

}
