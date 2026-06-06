import { addTransaction } from "./transactions.js"
import { renderTable, renderBalance } from "./ui.js"
import { calculateTotals } from "./reports.js"
import { getUpcomingChecks } from "./checks.js"
import { initCalculator } from "./calculator.js"
import { loadDB, saveDB } from "./storage.js"

let chartInstance = null

document.getElementById("addTransaction")
    .onclick = () => {

        const data = {

            date: new Date().toLocaleDateString(),

            desc: desc.value,

            amount: Number(amount.value),

            type: type.value,

            method: method.value,

            checkNumber: checkNumber.value,

            bank: bank.value,

            dueDate: dueDate.value

        }

        addTransaction(data)

        render()

    }

document.getElementById("search")
    .oninput = e => renderTable(e.target.value)

function render() {

    renderBalance()

    renderTable()

    renderChart()

    renderReminder()

}

function renderChart() {

    const { income, expense } = calculateTotals()

    if (chartInstance) chartInstance.destroy()

    chartInstance = new Chart(

        document.getElementById("financeChart"),

        {

            type: "doughnut",

            data: {
                labels: ["دریافت", "پرداخت"],
                datasets: [{
                    data: [income, expense]
                }]
            }

        })

}

function renderReminder() {

    const list = getUpcomingChecks()

    let msg = ""

    list.forEach(c => {

        msg += `چک ${c.desc} نزدیک سررسید است <br>`

    })

    document.getElementById("checkReminder").innerHTML = msg

}

document.getElementById("export").onclick = () => {

    const db = loadDB()
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" })
    const link = document.createElement("a")

    link.href = URL.createObjectURL(blob)
    link.download = "finance-backup.json"
    link.click()
    URL.revokeObjectURL(link.href)

}

document.getElementById("import").onchange = e => {

    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {

        try {

            saveDB(JSON.parse(reader.result))
            render()

        } catch {

            alert("فایل پشتیبان نامعتبر است")

        }

    }

    reader.readAsText(file)
    e.target.value = ""

}

initCalculator()

render()
