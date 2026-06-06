import { getTransactions, getBalance } from "./transactions.js"

export function renderTable(filter = "") {

    const table = document.getElementById("transactionsTable")

    table.innerHTML = ""

    getTransactions()
        .filter(t => t.desc.includes(filter))
        .forEach(t => {

            table.innerHTML += `
<tr>
<td>${t.date}</td>
<td>${t.desc}</td>
<td>${t.amount}</td>
<td>${t.type}</td>
<td>${t.method}</td>
<td>${t.dueDate || "-"}</td>
</tr>
`

        })

}

export function renderBalance() {

    document.getElementById("balance").innerText =
        "موجودی: " + getBalance()

}
