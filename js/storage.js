const DB_KEY = "financeDB"

export function loadDB() {

    let db = localStorage.getItem(DB_KEY)

    if (!db) {

        db = {
            balance: 0,
            transactions: []
        }

        localStorage.setItem(DB_KEY, JSON.stringify(db))

        return db

    }

    return JSON.parse(db)

}

export function saveDB(db) {

    localStorage.setItem(DB_KEY, JSON.stringify(db))

}
