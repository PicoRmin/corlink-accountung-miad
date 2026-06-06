import { loadDB } from "./storage.js"
import { getTransactions } from "./transactions.js"
import { getCategories, getCategoryLabel } from "./categories.js"
import { getAccounts, getTotalBalance } from "./accounts.js"
import { calculateTotals, getKPIs, getMonthlyComparison } from "./reports.js"
import { formatJalali } from "./jalali.js"
import { t } from "./i18n.js"

export function downloadBlob(blob, filename) {
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
    URL.revokeObjectURL(link.href)
}

function escapeCsvCell(value) {
    const str = String(value ?? "")
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`
    }
    return str
}

export function exportCSV(filters = {}) {
    const txs = getTransactions(filters)
    const headers = [
        t("export.colDate"),
        t("export.colDesc"),
        t("export.colAmount"),
        t("export.colType"),
        t("export.colMethod"),
        t("export.colCategory"),
        t("export.colAccount"),
        t("export.colCheckNumber"),
        t("export.colDueDate"),
        t("export.colCheckStatus"),
    ]

    const accounts = getAccounts()
    const accountMap = new Map(accounts.map(a => [a.id, a.name]))

    const rows = txs.map(tx => {
        const cat = getCategories().find(c => c.id === tx.categoryId)
        return [
            tx.date,
            tx.desc,
            tx.amount,
            t(`txType.${tx.type}`, tx.type),
            t(`method.${tx.method}`, tx.method),
            cat ? getCategoryLabel(cat) : "",
            accountMap.get(tx.accountId) || "",
            tx.checkNumber,
            tx.dueDateJalali || tx.dueDate,
            tx.checkStatus ? t(`checkStatus.${tx.checkStatus}`, tx.checkStatus) : "",
        ].map(escapeCsvCell).join(",")
    })

    const bom = "\uFEFF"
    const csv = bom + [headers.map(escapeCsvCell).join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const dateStr = formatJalali(new Date(), { persianDigits: false }).replace(/\//g, "-")
    downloadBlob(blob, `corlink-transactions-${dateStr}.csv`)
    return csv
}

export function exportJSON(includeMeta = true) {
    const db = loadDB()
    const payload = includeMeta
        ? {
            exportedAt: new Date().toISOString(),
            app: "CorLink Accounting",
            version: db.dbVersion,
            data: db,
        }
        : db

    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const dateStr = new Date().toISOString().slice(0, 10)
    downloadBlob(blob, `corlink-backup-${dateStr}.json`)
    return json
}

export function printReport(filters = {}) {
    const totals = calculateTotals(filters)
    const kpis = getKPIs(filters)
    const comparison = getMonthlyComparison()
    const txs = getTransactions({ ...filters, limit: 100 })

    const rows = txs.map(tx => `
        <tr>
            <td>${tx.date}</td>
            <td>${tx.desc}</td>
            <td>${Number(tx.amount).toLocaleString("fa-IR")}</td>
            <td>${t(`txType.${tx.type}`, tx.type)}</td>
        </tr>
    `).join("")

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<title>${t("export.reportTitle")}</title>
<style>
  body { font-family: Tahoma, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin-bottom: 8px; }
  .meta { color: #555; margin-bottom: 20px; font-size: 13px; }
  .stats { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 16px; min-width: 140px; }
  .stat strong { display: block; font-size: 18px; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
  th { background: #f5f5f5; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>${t("export.reportTitle")}</h1>
  <div class="meta">${t("export.generatedAt")}: ${formatJalali(new Date())}</div>
  <div class="stats">
    <div class="stat">${t("stats.income")}<strong>${totals.income.toLocaleString("fa-IR")}</strong></div>
    <div class="stat">${t("stats.expense")}<strong>${totals.expense.toLocaleString("fa-IR")}</strong></div>
    <div class="stat">${t("stats.balance")}<strong>${getTotalBalance().toLocaleString("fa-IR")}</strong></div>
    <div class="stat">${t("kpi.avgDailyExpense")}<strong>${Math.round(kpis.avgDailyExpense).toLocaleString("fa-IR")}</strong></div>
    <div class="stat">${t("kpi.maxIncome")}<strong>${kpis.maxIncome.toLocaleString("fa-IR")}</strong></div>
  </div>
  <p>${t("export.monthCompare")}: ${comparison.currentMonth} vs ${comparison.previousMonth}</p>
  <table>
    <thead>
      <tr>
        <th>${t("export.colDate")}</th>
        <th>${t("export.colDesc")}</th>
        <th>${t("export.colAmount")}</th>
        <th>${t("export.colType")}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <script>window.onload = () => window.print()</script>
</body>
</html>`

    const win = window.open("", "_blank", "width=900,height=700")
    if (!win) {
        throw new Error("Popup blocked")
    }
    win.document.write(html)
    win.document.close()
}

export function importJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result)
                const data = parsed.data || parsed
                resolve(data)
            } catch (err) {
                reject(err)
            }
        }
        reader.onerror = () => reject(reader.error)
        reader.readAsText(file)
    })
}
