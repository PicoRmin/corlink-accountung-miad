import { getTransactions, getBalance } from "./transactions.js"
import { getActiveAccountId, getAccounts, getTotalBalance } from "./accounts.js"
import { getCategories, getCategoryLabel, getExpenseByCategory } from "./categories.js"
import { getAllBudgetUsage, getBudgetAlerts } from "./budget.js"
import { getUpcomingChecks, getCheckSummary } from "./checks.js"
import { getMonthlyComparison, getAccountSummary } from "./reports.js"
import { getPickerISO, setPickerDate } from "./datePicker.js"
import { calculateTotals, getKPIs, getMonthlyComparison, getBalanceTimeline } from "./reports.js"
import { formatJalali, parseJalaliString, toISODate, monthKey } from "./jalali.js"
import { PAGE_SIZE, CHECK_STATUSES } from "./constants.js"
import { t } from "./i18n.js"

const TYPE_LABELS = { income: "دریافت", expense: "پرداخت", transfer: "انتقال" }
const METHOD_LABELS = { cash: "نقد", check: "چک", transfer: "حواله" }
const METHOD_ICONS = { cash: "💵", check: "📝", transfer: "🏦" }

let chartInstances = {
    finance: null,
    category: null,
    balance: null,
}

let txFiltersState = {
    search: "",
    type: "",
    method: "",
    categoryId: "",
    fromDateISO: "",
    toDateISO: "",
    sortBy: "dateISO",
    sortDir: "desc",
}

export function formatMoney(n) {
    return Number(n).toLocaleString("fa-IR")
}

export function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
}

function el(id) {
    return document.getElementById(id)
}

function labelType(type) {
    return t(`txType.${type}`, TYPE_LABELS[type] || type)
}

function labelMethod(method) {
    return t(`method.${method}`, METHOD_LABELS[method] || method)
}

function labelCheckStatus(status) {
    return t(`checkStatus.${status}`, status)
}

function parseFilterDate(value) {
    if (!value) return ""
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
    try {
        return toISODate(parseJalaliString(value))
    } catch {
        return ""
    }
}

function parseSortValue(value) {
    if (!value || value === "date-desc") return { sortBy: "dateISO", sortDir: "desc" }
    if (value === "date-asc") return { sortBy: "dateISO", sortDir: "asc" }
    if (value === "amount-desc") return { sortBy: "amount", sortDir: "desc" }
    if (value === "amount-asc") return { sortBy: "amount", sortDir: "asc" }
    return { sortBy: "dateISO", sortDir: "desc" }
}

export function getTxFilters() {
    const search = el("search")?.value?.trim() ?? txFiltersState.search
    const type = el("filterType")?.value ?? txFiltersState.type
    const method = el("filterMethod")?.value ?? txFiltersState.method
    const categoryId = el("filterCategory")?.value ?? txFiltersState.categoryId
    const fromDateISO = getPickerISO("filterFromDatePicker") || parseFilterDate(el("filterFromDate")?.value ?? "")
    const toDateISO = getPickerISO("filterToDatePicker") || parseFilterDate(el("filterToDate")?.value ?? "")
    const sortVal = el("sortBy")?.value ?? "date-desc"
    const { sortBy, sortDir } = parseSortValue(sortVal)

    return {
        search,
        type: type || undefined,
        method: method || undefined,
        categoryId: categoryId || undefined,
        fromDateISO: fromDateISO || undefined,
        toDateISO: toDateISO || undefined,
        sortBy,
        sortDir,
        accountId: getActiveAccountId(),
    }
}

export function setTxFilters(filters = {}) {
    txFiltersState = { ...txFiltersState, ...filters }

    if (el("search") && filters.search !== undefined) el("search").value = filters.search
    if (el("filterType") && filters.type !== undefined) el("filterType").value = filters.type
    if (el("filterMethod") && filters.method !== undefined) el("filterMethod").value = filters.method
    if (el("filterCategory") && filters.categoryId !== undefined) el("filterCategory").value = filters.categoryId
    if (el("filterFromDate") && filters.fromDateISO !== undefined) el("filterFromDate").value = filters.fromDateISO
    if (el("filterToDate") && filters.toDateISO !== undefined) el("filterToDate").value = filters.toDateISO
    if (el("sortBy") && filters.sortBy !== undefined) {
        const key = `${filters.sortBy}-${filters.sortDir || "desc"}`.replace("dateISO", "date")
        el("sortBy").value = key
    }
}

export function renderBalance(income, expense) {
    const accountId = getActiveAccountId()
    const bal = getBalance(accountId)
    const balanceEl = el("balance")
    if (balanceEl) balanceEl.textContent = formatMoney(bal)
    if (el("miniBalance")) el("miniBalance").textContent = formatMoney(bal)

    if (income !== undefined && el("statIncome")) {
        el("statIncome").textContent = formatMoney(income)
    }
    if (expense !== undefined && el("statExpense")) {
        el("statExpense").textContent = formatMoney(expense)
    }
    if (el("statTotal")) {
        el("statTotal").textContent = formatMoney(getTotalBalance())
    }
}

export function renderKPIs() {
    if (!el("kpiRow")) return

    const accountId = getActiveAccountId()
    const kpis = getKPIs({ accountId })
    const comparison = getMonthlyComparison()
    const changeSign = (n) => (n > 0 ? "+" : "")

    const avgEl = el("kpiAvgDailyExpense")
    const maxIncEl = el("kpiMaxIncome")
    const maxExpEl = el("kpiMaxExpense")
    const compareEl = el("kpiMonthCompare")

    if (avgEl) avgEl.textContent = formatMoney(Math.round(kpis.avgDailyExpense))
    if (maxIncEl) maxIncEl.textContent = formatMoney(kpis.maxIncome)
    if (maxExpEl) maxExpEl.textContent = formatMoney(kpis.maxExpense)
    if (compareEl) {
        compareEl.textContent = `${changeSign(comparison.change.income)}${comparison.change.income.toLocaleString("fa-IR")}٪ / ${changeSign(comparison.change.expense)}${comparison.change.expense.toLocaleString("fa-IR")}٪`
        compareEl.className = "kpi-value"
    }
}

export function renderAccountSelector() {
    const select = el("accountSelector")
    if (!select) return

    const accounts = getAccounts()
    const activeId = getActiveAccountId()

    select.innerHTML = accounts.map(acc => `
        <option value="${acc.id}" ${acc.id === activeId ? "selected" : ""}>
            ${escapeHtml(acc.icon)} ${escapeHtml(acc.name)}
        </option>
    `).join("")
}

function buildTxActions(tx) {
    const actions = `
        <button type="button" class="btn-icon" data-tx-id="${tx.id}" data-action="edit" title="${t("tx.edit")}">✏️</button>
        <button type="button" class="btn-icon" data-tx-id="${tx.id}" data-action="delete" title="${t("tx.delete")}">🗑️</button>
    `

    if (tx.method === "check" && tx.checkStatus === CHECK_STATUSES.pending) {
        return actions + `
            <button type="button" class="btn-icon" data-tx-id="${tx.id}" data-action="clear-check" title="${t("check.clear")}">✓</button>
            <button type="button" class="btn-icon" data-tx-id="${tx.id}" data-action="bounce-check" title="${t("check.bounce")}">↩</button>
        `
    }
    return actions
}

function buildCheckBadge(tx) {
    if (tx.method !== "check" || !tx.checkStatus) return ""
    const cls = tx.checkStatus === CHECK_STATUSES.cleared ? "income"
        : tx.checkStatus === CHECK_STATUSES.bounced ? "expense" : "check"
    return `<span class="tag ${cls}">${labelCheckStatus(tx.checkStatus)}</span>`
}

function renderTxRow(t) {
    const isIncome = t.type === "income"
    const isTransfer = t.type === "transfer"
    const typeLabel = labelType(t.type)
    const methodLabel = labelMethod(t.method)
    const cat = getCategories().find(c => c.id === t.categoryId)
    const catLabel = cat ? getCategoryLabel(cat) : ""
    const acc = getAccounts().find(a => a.id === t.accountId)
    const accLabel = acc ? acc.name : "—"
    const dueDisplay = t.dueDateJalali || t.dueDate || "—"
    const amountClass = isTransfer ? "" : (isIncome ? "income" : "expense")
    const sign = isTransfer ? "⇄" : (isIncome ? "+" : "−")

    return `
<tr data-tx-id="${t.id}">
    <td>${escapeHtml(t.date)}</td>
    <td>${escapeHtml(t.desc)}</td>
    <td class="${amountClass}" style="font-weight:600;direction:ltr">${sign}${formatMoney(t.amount)}</td>
    <td><span class="tag ${t.type}">${typeLabel}</span></td>
    <td><span class="tag">${methodLabel}</span></td>
    <td>${catLabel ? `<span class="tag">${escapeHtml(catLabel)}</span>` : "—"}</td>
    <td>${escapeHtml(accLabel)}</td>
    <td>${dueDisplay} ${buildCheckBadge(t)}</td>
    <td class="tx-actions">${buildTxActions(t)}</td>
</tr>`
}

function renderTxCard(t) {
    const isIncome = t.type === "income"
    const isTransfer = t.type === "transfer"
    const typeLabel = labelType(t.type)
    const methodLabel = labelMethod(t.method)
    const cat = getCategories().find(c => c.id === t.categoryId)
    const catLabel = cat ? getCategoryLabel(cat) : ""
    const sign = isTransfer ? "⇄" : (isIncome ? "+" : "−")
    const amountClass = isTransfer ? "" : t.type

    return `
<div class="tx-card" data-tx-id="${t.id}">
    <div class="tx-card-icon ${t.type}">${isTransfer ? "⇄" : (isIncome ? "↑" : "↓")}</div>
    <div class="tx-card-body">
        <div class="tx-card-top">
            <span class="tx-card-desc">${escapeHtml(t.desc)}</span>
            <span class="tx-card-amount ${amountClass}">${sign}${formatMoney(t.amount)}</span>
        </div>
        <div class="tx-card-meta">
            <span class="tx-card-date">${escapeHtml(t.date)}</span>
            <span class="tag ${t.type}">${typeLabel}</span>
            <span class="tag">${METHOD_ICONS[t.method] || ""} ${methodLabel}</span>
            ${catLabel ? `<span class="tag">${escapeHtml(catLabel)}</span>` : ""}
            ${t.dueDateJalali || t.dueDate ? `<span class="tag check">${t.dueDateJalali || t.dueDate}</span>` : ""}
            ${buildCheckBadge(t)}
        </div>
        <div class="tx-card-actions tx-actions">${buildTxActions(t)}</div>
    </div>
</div>`
}

export function renderTransactionsTable(page = 1) {
    const tbody = el("transactionsTable")
    const cards = el("transactionsCards")
    const empty = el("txEmpty")
    const count = el("txCount")
    const pageInfo = el("pageInfo")

    if (!tbody && !cards) return { total: 0, page: 1, pages: 1 }

    const filters = getTxFilters()
    const all = getTransactions(filters)
    const total = all.length
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const safePage = Math.min(Math.max(1, page), pages)
    const list = getTransactions({
        ...filters,
        offset: (safePage - 1) * PAGE_SIZE,
        limit: PAGE_SIZE,
    })

    if (count) count.textContent = total.toLocaleString("fa-IR")
    if (pageInfo) {
        pageInfo.textContent = t("pagination.page", `صفحه ${safePage}`)
            .replace("{page}", safePage.toLocaleString("fa-IR"))
            + ` / ${pages.toLocaleString("fa-IR")}`
    }

    if (tbody) tbody.innerHTML = ""
    if (cards) cards.innerHTML = ""

    if (!list.length) {
        empty?.classList.remove("hidden")
        return { total, page: safePage, pages }
    }

    empty?.classList.add("hidden")

    if (tbody) {
        tbody.innerHTML = list.map(renderTxRow).join("")
    }
    if (cards) {
        cards.innerHTML = list.map(renderTxCard).join("")
    }

    return { total, page: safePage, pages }
}

function chartTextColor() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue("--text-muted").trim() || "#64748b"
}

function destroyCharts() {
    Object.keys(chartInstances).forEach(key => {
        if (chartInstances[key]) {
            chartInstances[key].destroy()
            chartInstances[key] = null
        }
    })
}

export function renderCharts() {
    destroyCharts()

    const accountId = getActiveAccountId()
    const { income, expense } = calculateTotals({ accountId })
    const financeCanvas = el("financeChart")
    const categoryCanvas = el("categoryChart")
    const balanceCanvas = el("balanceLineChart")
    const chartEmpty = el("chartEmpty")
    const categoryEmpty = el("categoryChartEmpty")
    const balanceEmpty = el("balanceLineChartEmpty")

    if (financeCanvas) {
        if (income === 0 && expense === 0) {
            chartEmpty?.classList.remove("hidden")
            financeCanvas.style.display = "none"
        } else {
            chartEmpty?.classList.add("hidden")
            financeCanvas.style.display = "block"
            chartInstances.finance = new Chart(financeCanvas, {
                type: "doughnut",
                data: {
                    labels: [t("stats.income"), t("stats.expense")],
                    datasets: [{
                        data: [income, expense],
                        backgroundColor: ["#059669", "#dc2626"],
                        borderWidth: 0,
                        hoverOffset: 6,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    cutout: "65%",
                    plugins: {
                        legend: {
                            position: "bottom",
                            labels: {
                                font: { family: "Vazirmatn", size: 13 },
                                padding: 16,
                                usePointStyle: true,
                                color: chartTextColor(),
                            },
                        },
                    },
                },
            })
        }
    }

    const categoryData = getExpenseByCategory({ accountId })
    if (categoryCanvas) {
        if (!categoryData.length) {
            categoryEmpty?.classList.remove("hidden")
            categoryCanvas.style.display = "none"
        } else {
            categoryEmpty?.classList.add("hidden")
            categoryCanvas.style.display = "block"
            chartInstances.category = new Chart(categoryCanvas, {
                type: "bar",
                data: {
                    labels: categoryData.map(r => r.label),
                    datasets: [{
                        label: t("stats.expense"),
                        data: categoryData.map(r => r.total),
                        backgroundColor: "rgba(37, 99, 235, 0.7)",
                        borderRadius: 6,
                    }],
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            ticks: { color: chartTextColor(), font: { family: "Vazirmatn" } },
                        },
                        x: {
                            ticks: { color: chartTextColor(), font: { family: "Vazirmatn", size: 10 } },
                        },
                    },
                },
            })
        }
    }

    const timeline = getBalanceTimeline(accountId)
    if (balanceCanvas) {
        const hasData = timeline.some(p => p.balance !== 0)
        if (!hasData) {
            balanceEmpty?.classList.remove("hidden")
            balanceCanvas.style.display = "none"
        } else {
            balanceEmpty?.classList.add("hidden")
            balanceCanvas.style.display = "block"
            chartInstances.balance = new Chart(balanceCanvas, {
                type: "line",
                data: {
                    labels: timeline.map(p => p.label),
                    datasets: [{
                        label: t("stats.balance"),
                        data: timeline.map(p => p.balance),
                        borderColor: "#2563eb",
                        backgroundColor: "rgba(37, 99, 235, 0.1)",
                        fill: true,
                        tension: 0.3,
                    }],
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            ticks: { color: chartTextColor(), font: { family: "Vazirmatn" } },
                        },
                        x: {
                            ticks: { color: chartTextColor(), font: { family: "Vazirmatn", size: 10 } },
                        },
                    },
                },
            })
        }
    }
}

export function renderBudgetSection() {
    const container = el("budgetProgress")
    const empty = el("budgetEmpty")
    if (!container) return

    const currentMonth = monthKey(new Date())
    const usage = getAllBudgetUsage(currentMonth)
    const alerts = getBudgetAlerts()

    if (!usage.length) {
        container.innerHTML = ""
        empty?.classList.remove("hidden")
        return
    }

    empty?.classList.add("hidden")

    container.innerHTML = usage.map(row => {
        const cat = getCategories().find(c => c.id === row.categoryId)
        const label = cat ? getCategoryLabel(cat) : row.categoryId
        const alert = alerts.find(a => a.categoryId === row.categoryId)
        const barClass = row.percent >= 100 ? "over" : row.percent >= 80 ? "warning" : ""
        const alertText = alert
            ? (alert.severity === "over" ? t("budget.over") : t("budget.alert"))
            : ""

        return `
        <div class="budget-item ${barClass}">
            <div class="budget-item-header">
                <span>${escapeHtml(label)}</span>
                <span>${formatMoney(row.spent)} / ${formatMoney(row.limit)}</span>
            </div>
            <div class="budget-progress">
                <div class="budget-progress-bar ${barClass}" style="width:${row.percent}%"></div>
            </div>
            <div class="budget-item-meta">
                <span>${t("budget.remaining")}: ${formatMoney(row.remaining)}</span>
                ${alertText ? `<span class="budget-alert">${alertText}</span>` : ""}
            </div>
        </div>`
    }).join("")
}

export function renderCheckReminders() {
    const list = getUpcomingChecks()
    const container = el("checkReminder")
    const badge = el("checkBadge")

    if (!container) return

    if (badge) badge.textContent = list.length.toLocaleString("fa-IR")

    if (!list.length) {
        container.innerHTML = `<div class="empty-state" style="padding:16px">${t("check.noUpcoming")}</div>`
        return
    }

    container.innerHTML = list.map(c => `
        <div class="reminder-item" data-tx-id="${c.id}">
            <span class="reminder-icon">⏰</span>
            <div class="reminder-body">
                <strong>${escapeHtml(c.desc)}</strong>
                <span>${t("form.dueDate")}: ${c.dueDateJalali || c.dueDate} — ${formatMoney(c.amount)} ${t("form.amount")}</span>
            </div>
            <div class="reminder-actions">
                <button type="button" class="btn-text" data-tx-id="${c.id}" data-action="clear-check">${t("check.clear")}</button>
                <button type="button" class="btn-text" data-tx-id="${c.id}" data-action="bounce-check">${t("check.bounce")}</button>
            </div>
        </div>
    `).join("")
}

export function renderAccountsList(onDelete) {
    const list = el("accountsList")
    if (!list) return

    const accounts = getAccounts()
    const activeId = getActiveAccountId()

    list.innerHTML = accounts.map(acc => {
        const meta = [acc.bankName, acc.accountNumber, acc.sheba].filter(Boolean).join(" · ")
        return `
        <div class="account-item ${acc.id === activeId ? "active" : ""}" data-account-id="${acc.id}">
            <span class="account-icon">${escapeHtml(acc.icon)}</span>
            <div class="account-info">
                <strong>${escapeHtml(acc.name)}</strong>
                <span>${formatMoney(getBalance(acc.id))}</span>
                ${meta ? `<small class="account-meta">${escapeHtml(meta)}</small>` : ""}
            </div>
            ${accounts.length > 1 ? `<button type="button" class="btn-text account-delete" data-account-id="${acc.id}">${t("account.delete")}</button>` : ""}
        </div>`
    }).join("")

    if (onDelete) {
        list.querySelectorAll(".account-delete").forEach(btn => {
            btn.addEventListener("click", () => onDelete(btn.dataset.accountId))
        })
    }
}

export function renderBudgetList(onDelete) {
    const list = el("budgetList")
    if (!list) return

    const currentMonth = monthKey(new Date())
    const usage = getAllBudgetUsage(currentMonth)

    if (!usage.length) {
        list.innerHTML = `<div class="empty-state" style="padding:12px">${t("tx.empty")}</div>`
        return
    }

    list.innerHTML = usage.map(row => {
        const cat = getCategories().find(c => c.id === row.categoryId)
        const label = cat ? getCategoryLabel(cat) : row.categoryId
        const budgetId = row.budget?.id || ""

        return `
        <div class="budget-list-item" data-budget-id="${budgetId}">
            <div>
                <strong>${escapeHtml(label)}</strong>
                <span>${formatMoney(row.spent)} / ${formatMoney(row.limit)}</span>
            </div>
            ${budgetId ? `<button type="button" class="btn-text budget-delete" data-budget-id="${budgetId}">🗑️</button>` : ""}
        </div>`
    }).join("")

    if (onDelete) {
        list.querySelectorAll(".budget-delete").forEach(btn => {
            btn.addEventListener("click", () => onDelete(btn.dataset.budgetId))
        })
    }
}

function buildCategoryOptions(typeFilter) {
    return getCategories()
        .filter(c => !typeFilter || c.type === typeFilter || c.id === "cat-other")
        .map(c => `<option value="${c.id}">${escapeHtml(c.icon)} ${escapeHtml(getCategoryLabel(c))}</option>`)
        .join("")
}

function buildAccountOptions(excludeId) {
    return getAccounts()
        .filter(a => a.id !== excludeId)
        .map(a => `<option value="${a.id}">${escapeHtml(a.icon)} ${escapeHtml(a.name)}</option>`)
        .join("")
}

export function populateFormSelects() {
    const category = el("category")
    const txAccount = el("txAccount")
    const transferTo = el("transferToAccount")
    const filterCategory = el("filterCategory")
    const budgetCategory = el("budgetCategory")
    const transferFrom = el("transferFrom")
    const transferToSettings = el("transferTo")
    const editCategory = el("editCategory")
    const editAccount = el("editAccount")
    const editTransferTo = el("editTransferToAccount")
    const typeVal = el("type")?.value || "expense"

    if (category) {
        const current = category.value
        category.innerHTML = buildCategoryOptions(typeVal === "transfer" ? null : typeVal)
        if (current) category.value = current
    }
    if (editCategory) {
        const current = editCategory.value
        editCategory.innerHTML = buildCategoryOptions()
        if (current) editCategory.value = current
    }
    if (txAccount) {
        const current = txAccount.value || getActiveAccountId()
        txAccount.innerHTML = getAccounts().map(a =>
            `<option value="${a.id}">${escapeHtml(a.icon)} ${escapeHtml(a.name)}</option>`
        ).join("")
        txAccount.value = current
    }
    if (editAccount) {
        editAccount.innerHTML = getAccounts().map(a =>
            `<option value="${a.id}">${escapeHtml(a.icon)} ${escapeHtml(a.name)}</option>`
        ).join("")
    }
    if (transferTo) transferTo.innerHTML = buildAccountOptions(txAccount?.value)
    if (editTransferTo) editTransferTo.innerHTML = buildAccountOptions(editAccount?.value)

    if (filterCategory) {
        const current = filterCategory.value
        filterCategory.innerHTML = `<option value="">${t("form.category")}</option>` + buildCategoryOptions()
        if (current) filterCategory.value = current
    }
    if (budgetCategory) {
        budgetCategory.innerHTML = buildCategoryOptions("expense")
    }
    if (transferFrom) {
        transferFrom.innerHTML = getAccounts().map(a =>
            `<option value="${a.id}">${escapeHtml(a.icon)} ${escapeHtml(a.name)}</option>`
        ).join("")
    }
    if (transferToSettings) {
        transferToSettings.innerHTML = buildAccountOptions(transferFrom?.value)
    }
}

function fieldId(prefix, name) {
    if (!prefix) return name
    const editMap = {
        desc: "editDesc",
        amount: "editAmount",
        type: "editType",
        category: "editCategory",
        txAccount: "editAccount",
        txDate: "editDate",
        date: "editDate",
        method: "editMethod",
        checkNumber: "editCheckNumber",
        bank: "editBank",
        dueDateJalali: "editDueDateJalali",
        transferToAccount: "editTransferToAccount",
    }
    if (prefix === "edit" && editMap[name]) return editMap[name]
    return prefix + name.charAt(0).toUpperCase() + name.slice(1)
}

export function readFormData(prefix = "") {
    const p = prefix
    const type = el(fieldId(p, "type"))?.value || "expense"
    const method = el(fieldId(p, "method"))?.value || el("method")?.value || "cash"
    const dateHidden = el(fieldId(p, "txDate")) || el(fieldId(p, "date"))
    const dateStr = dateHidden?.value || ""
    let dateISO = dateHidden?.dataset?.iso || ""
    let date = dateStr

    if (!dateISO && dateStr) {
        try {
            dateISO = toISODate(parseJalaliString(dateStr))
            date = formatJalali(parseJalaliString(dateStr))
        } catch {
            dateISO = toISODate(new Date())
            date = formatJalali(new Date())
        }
    } else if (!dateStr && !dateISO) {
        dateISO = toISODate(new Date())
        date = formatJalali(new Date())
    }

    const dueHidden = el(fieldId(p, "dueDateJalali"))
    const dueJalali = dueHidden?.value || ""
    let dueDate = dueHidden?.dataset?.iso || ""
    let dueDateJalali = dueJalali
    if (!dueDate && dueJalali) {
        try {
            dueDate = toISODate(parseJalaliString(dueJalali))
            dueDateJalali = formatJalali(parseJalaliString(dueJalali))
        } catch {
            if (/^\d{4}-\d{2}-\d{2}$/.test(dueJalali)) {
                dueDate = dueJalali
                dueDateJalali = formatJalali(new Date(dueJalali + "T12:00:00"))
            }
        }
    }

    return {
        desc: el(fieldId(p, "desc"))?.value?.trim() || "",
        amount: Number(el(fieldId(p, "amount"))?.value) || 0,
        type,
        method: type === "transfer" ? "transfer" : method,
        categoryId: el(fieldId(p, "category"))?.value || "cat-other",
        accountId: el(fieldId(p, "txAccount"))?.value || getActiveAccountId(),
        date,
        dateISO,
        checkNumber: el(fieldId(p, "checkNumber"))?.value || "",
        bank: el(fieldId(p, "bank"))?.value || "",
        dueDate,
        dueDateJalali,
        transferToAccountId: el(fieldId(p, "transferToAccount"))?.value || "",
    }
}

export function fillEditForm(tx) {
    const set = (id, val) => {
        const node = el(id)
        if (node) node.value = val ?? ""
    }

    set("editDesc", tx.desc)
    set("editAmount", tx.amount)
    set("editType", tx.type)
    set("editCategory", tx.categoryId)
    set("editAccount", tx.accountId)
    set("editDate", tx.date)
    set("editMethod", tx.method)
    set("editCheckNumber", tx.checkNumber)
    set("editBank", tx.bank)
    set("editDueDateJalali", tx.dueDateJalali || tx.dueDate)
    set("editTransferToAccount", tx.transferToAccountId)

    const checkFields = el("editCheckFields")
    const transferFields = el("editTransferFields")
    checkFields?.classList.toggle("hidden", tx.method !== "check")
    transferFields?.classList.toggle("hidden", tx.type !== "transfer")

    document.querySelectorAll(".edit-method-tabs .method-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.method === tx.method)
    })

    populateFormSelects()
    set("editCategory", tx.categoryId)
    set("editAccount", tx.accountId)
    set("editTransferToAccount", tx.transferToAccountId)

    setPickerDate("editDatePicker", tx.date)
    setPickerDate("editDueDatePicker", tx.dueDateJalali || tx.dueDate || "")
}

export function renderDashboardExtras() {
    const accountId = getActiveAccountId()
    const comparison = getMonthlyComparison()
    const changeSign = n => (n > 0 ? "+" : "")

    const compareEl = el("monthCompareCards")
    if (compareEl) {
        compareEl.innerHTML = `
        <div class="compare-card">
            <span class="compare-label">${t("stats.income")} — ${comparison.currentMonth.replace("-", "/")}</span>
            <strong class="compare-value income">${formatMoney(comparison.current.income)}</strong>
            <span class="compare-change">${changeSign(comparison.change.income)}${comparison.change.income.toLocaleString("fa-IR")}٪ ${t("kpi.monthCompare")}</span>
        </div>
        <div class="compare-card">
            <span class="compare-label">${t("stats.expense")} — ${comparison.currentMonth.replace("-", "/")}</span>
            <strong class="compare-value expense">${formatMoney(comparison.current.expense)}</strong>
            <span class="compare-change">${changeSign(comparison.change.expense)}${comparison.change.expense.toLocaleString("fa-IR")}٪ ${t("kpi.monthCompare")}</span>
        </div>
        <div class="compare-card">
            <span class="compare-label">${t("stats.balance")}</span>
            <strong class="compare-value">${formatMoney(comparison.current.net)}</strong>
            <span class="compare-change">${changeSign(comparison.change.net)}${comparison.change.net.toLocaleString("fa-IR")}٪</span>
        </div>`
    }

    const accountsGrid = el("dashboardAccounts")
    if (accountsGrid) {
        const summary = getAccountSummary()
        accountsGrid.innerHTML = summary.map(a => `
            <div class="dash-account-card ${a.id === accountId ? "active" : ""}">
                <span class="dash-acc-icon">${escapeHtml(a.icon)}</span>
                <strong>${escapeHtml(a.name)}</strong>
                <span class="dash-acc-balance">${formatMoney(a.balance)}</span>
                <small>+${formatMoney(a.income)} / −${formatMoney(a.expense)}</small>
            </div>
        `).join("") || `<div class="empty-state">${t("tx.empty")}</div>`
    }

    const recentEl = el("recentTransactions")
    if (recentEl) {
        const recent = getTransactions({ accountId, limit: 5 })
        recentEl.innerHTML = recent.length
            ? recent.map(tx => {
                const sign = tx.type === "income" ? "+" : tx.type === "expense" ? "−" : "⇄"
                return `<div class="recent-tx-item">
                    <div><strong>${escapeHtml(tx.desc)}</strong><small>${escapeHtml(tx.date)}</small></div>
                    <span class="${tx.type}">${sign}${formatMoney(tx.amount)}</span>
                </div>`
            }).join("")
            : `<div class="empty-state">${t("tx.empty")}</div>`
    }

    const checkSumEl = el("checkSummary")
    if (checkSumEl) {
        const sum = getCheckSummary(accountId)
        checkSumEl.innerHTML = `
            <div class="check-stat"><span>${t("checkStatus.pending")}</span><strong>${sum.pending.toLocaleString("fa-IR")}</strong><small>${formatMoney(sum.pendingAmount)}</small></div>
            <div class="check-stat"><span>${t("checkStatus.cleared")}</span><strong>${sum.cleared.toLocaleString("fa-IR")}</strong><small>${formatMoney(sum.clearedAmount)}</small></div>
            <div class="check-stat"><span>${t("checkStatus.bounced")}</span><strong>${sum.bounced.toLocaleString("fa-IR")}</strong></div>
        `
    }
}
