import { loadDB, saveDB } from "./storage.js"

export function addTransaction(data) {

    const db = loadDB()

    db.transactions.push(data)

    if (data.method !== "check") {

        if (data.type === "income") db.balance += data.amount
        else db.balance -= data.amount

    }

    saveDB(db)

}

export function getTransactions() {

    return loadDB().transactions

}

export function getBalance() {

    return loadDB().balance

}
