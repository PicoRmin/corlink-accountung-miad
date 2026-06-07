import { loadDB, saveDB, updateDB, migrate } from "./storage.js"
import {
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTransactionById,
    createTransferTransaction,
} from "./transactions.js"
import {
    getActiveAccountId,
    setActiveAccountId,
    addAccount,
    deleteAccount,
    transferBetweenAccounts,
} from "./accounts.js"
import { setBudget, deleteBudget } from "./budget.js"
import { clearCheck, bounceCheck } from "./checks.js"
import { calculateTotals } from "./reports.js"
import { exportCSV, exportJSON, printReport, importJSONFile } from "./export.js"
import { encryptBackupToJSON, decryptBackupFromJSON } from "./crypto.js"
import {
    pushToCloud,
    pullFromCloud,
    copySyncCodeToClipboard,
    importSyncCode,
    setSyncCredentials,
    testSyncConnection,
} from "./sync.js"
import { scanReceipt } from "./ocr.js"
import { initI18n, t, applyI18n, setLanguage } from "./i18n.js"
import { initTheme, initColorTheme, onThemeChange, onColorThemeChange } from "./theme.js"
import { showOnboarding } from "./onboarding.js"
import { initShortcuts } from "./shortcuts.js"
import { initCheckNotifications, requestNotificationPermission } from "./notifications.js"
import { initCalculator, useCalcResult } from "./calculator.js"
import { todayJalali, monthKey } from "./jalali.js"
import {
    formatMoney,
    getTxFilters,
    setTxFilters,
    renderBalance,
    renderKPIs,
    renderAccountSelector,
    renderTransactionsTable,
    renderCharts,
    renderBudgetSection,
    renderCheckReminders,
    renderAccountsList,
    renderBudgetList,
    populateFormSelects,
    renderDashboardExtras,
    fillEditForm,
    readFormData,
} from "./ui.js"
import { initAllDatePickers, setTodayPickers, setPickerDate, clearPicker } from "./datePicker.js"
import { addCategory } from "./categories.js"

let currentPage = 1
let editingTxId = null
let pendingDeleteId = null
let toastTimer = null
let undoTimer = null

// ── Navigation ──

export function switchPanel(name) {
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"))
    document.querySelectorAll(".nav-item").forEach(n => {
        n.classList.remove("active")
        n.removeAttribute("aria-current")
    })

    const panel = document.getElementById("panel-" + name)
    if (panel) panel.classList.add("active")

    const navBtn = document.querySelector(`.nav-item[data-panel="${name}"]`)
    if (navBtn) {
        navBtn.classList.add("active")
        navBtn.setAttribute("aria-current", "page")
    }

    document.body.dataset.activePanel = name
    window.scrollTo({ top: 0, behavior: "auto" })
}

// ── Toast ──

export function showToast(msg, { undo = false, onUndo } = {}) {
    const toast = document.getElementById("toast")
    if (!toast) return

    clearTimeout(toastTimer)
    clearTimeout(undoTimer)

    if (undo && onUndo) {
        toast.innerHTML = `
            <span>${msg}</span>
            <button type="button" class="toast-undo" id="toastUndo">${t("toast.undo")}</button>
        `
        toast.classList.add("show", "has-undo")
        toast.style.pointerEvents = "auto"

        document.getElementById("toastUndo")?.addEventListener("click", () => {
            onUndo()
            toast.classList.remove("show", "has-undo")
            toast.style.pointerEvents = ""
            toast.textContent = ""
        }, { once: true })

        undoTimer = setTimeout(() => {
            toast.classList.remove("show", "has-undo")
            toast.style.pointerEvents = ""
            toast.textContent = ""
        }, 5000)
    } else {
        toast.textContent = msg
        toast.classList.remove("has-undo")
        toast.style.pointerEvents = ""
        toast.classList.add("show")
        toastTimer = setTimeout(() => toast.classList.remove("show"), 2800)
    }
}

// ── Modals ──

function showModal(id) {
    document.body.classList.add("modal-open")
    document.getElementById("modalOverlay")?.classList.remove("hidden")
    document.getElementById(id)?.classList.remove("hidden")
}

function hideModals() {
    document.body.classList.remove("modal-open")
    document.getElementById("modalOverlay")?.classList.add("hidden")
    document.querySelectorAll(".modal").forEach(m => m.classList.add("hidden"))
    editingTxId = null
    pendingDeleteId = null
}

// ── Form helpers ──

function toggleFormFields() {
    const type = document.getElementById("type")?.value
    const method = document.getElementById("method")?.value
    const checkFields = document.getElementById("checkFields")
    const transferFields = document.getElementById("transferFields")

    checkFields?.classList.toggle("hidden", method !== "check" || type === "transfer")
    transferFields?.classList.toggle("hidden", type !== "transfer")

    if (type === "transfer") {
        document.querySelectorAll(".method-tab").forEach(t => {
            t.classList.toggle("active", t.dataset.method === "transfer")
        })
        const methodInput = document.getElementById("method")
        if (methodInput) methodInput.value = "transfer"
    }

    populateFormSelects()
}

function resetForm() {
    const form = document.getElementById("txForm")
    form?.reset()
    const methodInput = document.getElementById("method")
    if (methodInput) methodInput.value = "cash"
    document.querySelectorAll(".method-tab").forEach(tab => {
        tab.classList.toggle("active", tab.dataset.method === "cash")
    })
    setPickerDate("txDatePicker", null)
    clearPicker("dueDatePicker")
    toggleFormFields()
}

function validateTxData(data) {
    if (!data.desc) {
        showToast(t("error.required"))
        document.getElementById("desc")?.focus()
        return false
    }
    if (!data.amount || data.amount <= 0) {
        showToast(t("error.invalidAmount"))
        document.getElementById("amount")?.focus()
        return false
    }
    if (data.type === "transfer" && !data.transferToAccountId) {
        showToast(t("form.transferTo"))
        return false
    }
    return true
}

// ── Transaction handlers ──

function handleTxSubmit(e) {
    e.preventDefault()
    const data = readFormData()
    if (!validateTxData(data)) return

    if (data.type === "transfer") {
        createTransferTransaction({
            fromAccountId: data.accountId,
            toAccountId: data.transferToAccountId,
            amount: data.amount,
            desc: data.desc,
            dateISO: data.dateISO,
        })
    } else {
        addTransaction(data)
    }

    resetForm()
    render()
    showToast(t("tx.saved"))
    switchPanel("transactions")
}

function openEditModal(id) {
    const tx = getTransactionById(id)
    if (!tx) return
    editingTxId = id
    fillEditForm(tx)
    showModal("editModal")
}

function handleEditSave(e) {
    e.preventDefault()
    if (!editingTxId) return

    const data = readFormData("edit")
    if (!data.desc || !data.amount || data.amount <= 0) {
        showToast(t("error.invalidAmount"))
        return
    }

    updateTransaction(editingTxId, data)
    hideModals()
    render()
    showToast(t("tx.updated"))
}

function requestDelete(id) {
    pendingDeleteId = id
    const confirmMsg = document.getElementById("confirmMessage")
    if (confirmMsg) confirmMsg.textContent = t("tx.deleteConfirm")
    showModal("confirmModal")
}

function confirmDelete() {
    if (!pendingDeleteId) return
    const tx = getTransactionById(pendingDeleteId)
    if (!tx) {
        hideModals()
        return
    }

    const deleted = { ...tx }
    const id = pendingDeleteId
    deleteTransaction(id)
    hideModals()
    render()

    showToast(t("tx.deleted"), {
        undo: true,
        onUndo: () => {
            updateDB(db => {
                if (!db.transactions.some(t => t.id === deleted.id)) {
                    db.transactions.push(deleted)
                }
            })
            render()
            showToast(t("tx.saved"))
        },
    })
}

function handleCheckAction(id, action) {
    if (action === "clear-check") {
        clearCheck(id)
        showToast(t("check.clear") + " ✓")
    } else if (action === "bounce-check") {
        bounceCheck(id)
        showToast(t("check.bounce"))
    }
    render()
}

function handleTxAction(e) {
    const btn = e.target.closest("[data-action][data-tx-id]")
    if (!btn) return
    e.preventDefault()
    const { action, txId } = btn.dataset
    if (action === "edit") openEditModal(txId)
    else if (action === "delete") requestDelete(txId)
    else if (action === "clear-check" || action === "bounce-check") handleCheckAction(txId, action)
}

// ── Filters & pagination ──

function applyFilters() {
    currentPage = 1
    renderTransactions()
}

function clearFilters() {
    setTxFilters({
        search: "",
        type: "",
        method: "",
        categoryId: "",
        fromDateISO: "",
        toDateISO: "",
        sortBy: "dateISO",
        sortDir: "desc",
    })
    ;["search", "filterType", "filterMethod", "filterCategory"].forEach(id => {
        const node = document.getElementById(id)
        if (node) node.value = ""
    })
    clearPicker("filterFromDatePicker")
    clearPicker("filterToDatePicker")
    const sortBy = document.getElementById("sortBy")
    if (sortBy) sortBy.value = "date-desc"
    currentPage = 1
    renderTransactions()
}

function handleAddCategory() {
    const name = document.getElementById("newCategoryName")?.value?.trim()
    const type = document.getElementById("newCategoryType")?.value || "expense"
    if (!name) {
        showToast(t("error.required"))
        return
    }
    const key = `custom-${Date.now()}`
    addCategory({ key, icon: "📁", type, name })
    document.getElementById("newCategoryName").value = ""
    render()
    showToast(t("category.add") + " ✓")
}

function goPage(delta) {
    const { pages } = renderTransactionsTable(currentPage)
    const next = currentPage + delta
    if (next < 1 || next > pages) return
    currentPage = next
    renderTransactions()
}

// ── Accounts ──

function handleAddAccount() {
    const name = document.getElementById("accountName")?.value?.trim()
    if (!name) {
        showToast(t("error.required"))
        return
    }
    addAccount({
        name,
        accountNumber: document.getElementById("accountNumber")?.value?.trim() || "",
        sheba: document.getElementById("accountSheba")?.value?.trim() || "",
        bankName: document.getElementById("accountBank")?.value?.trim() || "",
    })
    document.getElementById("accountName").value = ""
    document.getElementById("accountNumber").value = ""
    document.getElementById("accountSheba").value = ""
    document.getElementById("accountBank").value = ""
    render()
    showToast(t("account.add") + " ✓")
}

function handleDeleteAccount(id) {
    const result = deleteAccount(id)
    if (!result.ok) {
        showToast(result.reason === "has_transactions"
            ? t("error.generic")
            : t("error.generic"))
        return
    }
    render()
    showToast(t("account.delete") + " ✓")
}

function handleAccountTransfer() {
    const from = document.getElementById("transferFrom")?.value
    const to = document.getElementById("transferTo")?.value
    const amount = Number(document.getElementById("transferAmount")?.value)

    try {
        transferBetweenAccounts(from, to, amount)
        document.getElementById("transferAmount").value = ""
        render()
        showToast(t("account.transfer") + " ✓")
    } catch {
        showToast(t("error.invalidAmount"))
    }
}

// ── Budget ──

function handleSetBudget() {
    const categoryId = document.getElementById("budgetCategory")?.value
    const limit = document.getElementById("budgetLimit")?.value
    if (!categoryId || !limit) {
        showToast(t("error.required"))
        return
    }
    setBudget(categoryId, limit, monthKey(new Date()))
    document.getElementById("budgetLimit").value = ""
    render()
    showToast(t("budget.title") + " ✓")
}

function handleDeleteBudget(id) {
    deleteBudget(id)
    render()
    showToast(t("tx.deleted"))
}

// ── Export / import ──

function handleExportJSON() {
    exportJSON()
    showToast(t("export.success"))
}

function handleExportCSV() {
    exportCSV(getTxFilters())
    showToast(t("export.success"))
}

function handlePrint() {
    try {
        printReport({ accountId: getActiveAccountId() })
    } catch {
        showToast(t("error.generic"))
    }
}

async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
        const data = await importJSONFile(file)
        saveDB(migrate(data))
        render()
        showToast(t("settings.import") + " ✓")
    } catch {
        showToast(t("export.invalidFile"))
    }
    e.target.value = ""
}

async function handleEncryptedExport() {
    const password = document.getElementById("exportPassword")?.value
    if (!password) {
        showToast(t("error.required"))
        return
    }
    try {
        const db = loadDB()
        const json = await encryptBackupToJSON(db, password)
        const blob = new Blob([json], { type: "application/json" })
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = `corlink-encrypted-${new Date().toISOString().slice(0, 10)}.json`
        link.click()
        URL.revokeObjectURL(link.href)
        showToast(t("export.success"))
    } catch (err) {
        showToast(err.message || t("error.generic"))
    }
}

async function handleEncryptedImport(e) {
    const file = e.target.files?.[0]
    const password = document.getElementById("encryptedImportPassword")?.value
    if (!file || !password) return
    try {
        const text = await file.text()
        const data = await decryptBackupFromJSON(text, password)
        saveDB(migrate(data))
        render()
        showToast(t("settings.import") + " ✓")
    } catch {
        showToast(t("export.invalidFile"))
    }
    e.target.value = ""
}

// ── Sync ──

async function handleSyncPush() {
    const binId = document.getElementById("syncBinId")?.value
    const apiKey = document.getElementById("syncApiKey")?.value
    if (binId && apiKey) setSyncCredentials(binId, apiKey)
    try {
        await testSyncConnection()
        await pushToCloud()
        showToast(t("settings.syncPush") + " ✓")
    } catch (err) {
        showToast(err.message || t("error.generic"))
    }
}

async function handleSyncPull() {
    const binId = document.getElementById("syncBinId")?.value
    const apiKey = document.getElementById("syncApiKey")?.value
    if (binId && apiKey) setSyncCredentials(binId, apiKey)
    try {
        await pullFromCloud()
        render()
        showToast(t("settings.syncPull") + " ✓")
    } catch (err) {
        showToast(err.message || t("error.generic"))
    }
}

async function handleCopySyncCode() {
    try {
        await copySyncCodeToClipboard()
        showToast(t("settings.syncCode") + " ✓")
    } catch {
        showToast(t("error.generic"))
    }
}

function handleImportSyncCode() {
    const code = document.getElementById("importSyncCode")?.value
    if (!code?.trim()) return
    try {
        importSyncCode(code.trim())
        document.getElementById("importSyncCode").value = ""
        render()
        showToast(t("settings.import") + " ✓")
    } catch {
        showToast(t("export.invalidFile"))
    }
}

// ── OCR ──

async function handleScanReceipt() {
    const input = document.getElementById("ocrFile")
    const file = input?.files?.[0]
    if (!file) {
        showToast(t("ocr.scan"))
        return
    }

    const btn = document.getElementById("scanReceipt")
    if (btn) btn.disabled = true

    try {
        showToast(t("ocr.scanning"))
        const result = await scanReceipt(file)
        if (result.amount) {
            document.getElementById("amount").value = result.amount
            if (result.desc) document.getElementById("desc").value = result.desc
            showToast(`${t("ocr.result")}: ${formatMoney(result.amount)}`)
        } else {
            showToast(t("ocr.noAmount"))
        }
    } catch {
        showToast(t("error.generic"))
    } finally {
        if (btn) btn.disabled = false
        if (input) input.value = ""
    }
}

// ── Language ──

async function handleLanguageChange(lang) {
    await setLanguage(lang)
    updateDB(db => {
        db.settings.language = lang
    })
    applyI18n()
    render()
}

// ── Render ──

function renderTransactions() {
    const result = renderTransactionsTable(currentPage)
    currentPage = result.page
    const prevBtn = document.getElementById("btnPrevPage")
    const nextBtn = document.getElementById("btnNextPage")
    if (prevBtn) prevBtn.disabled = currentPage <= 1
    if (nextBtn) nextBtn.disabled = currentPage >= result.pages
}

export function render() {
    const accountId = getActiveAccountId()
    const { income, expense } = calculateTotals({ accountId })

    renderAccountSelector()
    renderBalance(income, expense)
    renderKPIs()
    renderCharts()
    renderBudgetSection()
    renderCheckReminders()
    renderDashboardExtras()
    renderTransactions()
    renderAccountsList(handleDeleteAccount)
    renderBudgetList(handleDeleteBudget)
    populateFormSelects()
    applyI18n()
}

// ── Event wiring ──

function wireEvents() {
    document.querySelectorAll(".nav-item").forEach(btn => {
        btn.addEventListener("click", () => switchPanel(btn.dataset.panel))
    })

    document.getElementById("accountSelector")?.addEventListener("change", e => {
        setActiveAccountId(e.target.value)
        currentPage = 1
        render()
    })

    document.getElementById("txForm")?.addEventListener("submit", handleTxSubmit)

    document.getElementById("type")?.addEventListener("change", toggleFormFields)

    document.querySelectorAll(".method-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".method-tab").forEach(t => t.classList.remove("active"))
            tab.classList.add("active")
            const methodInput = document.getElementById("method")
            if (methodInput) methodInput.value = tab.dataset.method
            toggleFormFields()
        })
    })

    document.getElementById("search")?.addEventListener("input", applyFilters)
    ;["filterType", "filterMethod", "filterCategory", "filterFromDate", "filterToDate", "sortBy"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", applyFilters)
    })
    document.getElementById("btnClearFilters")?.addEventListener("click", clearFilters)
    document.getElementById("btnPrevPage")?.addEventListener("click", () => goPage(-1))
    document.getElementById("btnNextPage")?.addEventListener("click", () => goPage(1))

    document.getElementById("transactionsTable")?.addEventListener("click", handleTxAction)
    document.getElementById("transactionsCards")?.addEventListener("click", handleTxAction)
    document.getElementById("checkReminder")?.addEventListener("click", handleTxAction)

    document.getElementById("editForm")?.addEventListener("submit", handleEditSave)
    document.getElementById("btnCancelEdit")?.addEventListener("click", hideModals)
    document.getElementById("btnConfirmYes")?.addEventListener("click", confirmDelete)
    document.getElementById("btnConfirmNo")?.addEventListener("click", hideModals)
    document.getElementById("modalOverlay")?.addEventListener("click", hideModals)

    document.getElementById("editType")?.addEventListener("change", () => {
        const type = document.getElementById("editType")?.value
        document.getElementById("editTransferFields")?.classList.toggle("hidden", type !== "transfer")
        document.getElementById("editCheckFields")?.classList.toggle("hidden", document.getElementById("editMethod")?.value !== "check" || type === "transfer")
    })

    document.querySelectorAll(".edit-method-tabs .method-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            document.querySelectorAll(".edit-method-tabs .method-tab").forEach(t => t.classList.remove("active"))
            tab.classList.add("active")
            const methodInput = document.getElementById("editMethod")
            if (methodInput) methodInput.value = tab.dataset.method
            const type = document.getElementById("editType")?.value
            document.getElementById("editCheckFields")?.classList.toggle("hidden", tab.dataset.method !== "check" || type === "transfer")
        })
    })

    document.getElementById("btnAddAccount")?.addEventListener("click", handleAddAccount)
    document.getElementById("btnAddCategory")?.addEventListener("click", handleAddCategory)
    document.getElementById("btnViewAllTx")?.addEventListener("click", () => switchPanel("transactions"))
    document.getElementById("btnTransfer")?.addEventListener("click", handleAccountTransfer)
    document.getElementById("btnSetBudget")?.addEventListener("click", handleSetBudget)

    document.getElementById("export")?.addEventListener("click", handleExportJSON)
    document.getElementById("exportCsv")?.addEventListener("click", handleExportCSV)
    document.getElementById("printReport")?.addEventListener("click", handlePrint)
    document.getElementById("import")?.addEventListener("change", handleImport)
    document.getElementById("btnEncryptedExport")?.addEventListener("click", handleEncryptedExport)
    document.getElementById("importEncrypted")?.addEventListener("change", handleEncryptedImport)
    document.getElementById("btnEncryptedImport")?.addEventListener("click", () => {
        document.getElementById("importEncrypted")?.click()
    })

    document.getElementById("btnPushCloud")?.addEventListener("click", handleSyncPush)
    document.getElementById("btnPullCloud")?.addEventListener("click", handleSyncPull)
    document.getElementById("btnCopySyncCode")?.addEventListener("click", handleCopySyncCode)
    document.getElementById("btnImportSyncCode")?.addEventListener("click", handleImportSyncCode)

    document.getElementById("scanReceipt")?.addEventListener("click", handleScanReceipt)

    document.getElementById("languageSelect")?.addEventListener("change", e => {
        handleLanguageChange(e.target.value)
    })

    document.getElementById("btnRestartTour")?.addEventListener("click", () => {
        updateDB(db => { db.settings.onboardingDone = false })
        showOnboarding({ force: true })
    })

    document.getElementById("btnEnableNotifications")?.addEventListener("click", async () => {
        const result = await requestNotificationPermission()
        if (result === "granted") showToast(t("check.reminder") + " ✓")
        else if (result === "denied") showToast(t("error.generic"))
    })

    document.getElementById("syncBinId")?.addEventListener("change", saveSyncSettings)
    document.getElementById("syncApiKey")?.addEventListener("change", saveSyncSettings)

    useCalcResult(val => {
        const amountInput = document.getElementById("amount")
        if (amountInput) amountInput.value = val.replace(/[^\d.-]/g, "") || val
        switchPanel("add")
        showToast(t("form.amount"))
    })
}

function loadSyncSettings() {
    const db = loadDB()
    const binId = document.getElementById("syncBinId")
    const apiKey = document.getElementById("syncApiKey")
    if (binId) binId.value = db.settings.syncBinId || ""
    if (apiKey) apiKey.value = db.settings.syncApiKey || ""

    const langSelect = document.getElementById("languageSelect")
    if (langSelect) langSelect.value = db.settings.language || "fa"
}

function saveSyncSettings() {
    const binId = document.getElementById("syncBinId")?.value?.trim() || ""
    const apiKey = document.getElementById("syncApiKey")?.value?.trim() || ""
    updateDB(db => {
        db.settings.syncBinId = binId
        db.settings.syncApiKey = apiKey
    })
    if (binId && apiKey) setSyncCredentials(binId, apiKey)
}

function initPullToRefresh() {
    let startY = 0
    let pulling = false

    document.addEventListener("touchstart", e => {
        if (window.scrollY <= 0) startY = e.touches[0].clientY
    }, { passive: true })

    document.addEventListener("touchmove", e => {
        if (window.scrollY > 0) return
        const diff = e.touches[0].clientY - startY
        if (diff > 80 && !pulling) {
            pulling = true
            document.body.classList.add("pulling")
        }
    }, { passive: true })

    document.addEventListener("touchend", () => {
        if (pulling) {
            render()
            showToast(t("settings.syncPull") || "به‌روزرسانی شد")
        }
        pulling = false
        document.body.classList.remove("pulling")
    }, { passive: true })
}

async function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return
    try {
        await navigator.serviceWorker.register("./sw.js")
    } catch {
        // offline or unsupported
    }
}

// ── Init ──

export async function init() {
    await registerServiceWorker()

    const db = loadDB()
    await initI18n(db.settings.language || "fa")

    initTheme()
    initColorTheme()
    onThemeChange(() => renderCharts())
    onColorThemeChange(() => renderCharts())

    wireEvents()
    loadSyncSettings()
    initPullToRefresh()
    initCalculator()
    initShortcuts(switchPanel, showToast)
    initCheckNotifications()

    initAllDatePickers()
    setTodayPickers()

    render()
    showOnboarding({ switchPanel })
}

init()
