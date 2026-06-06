const PANEL_KEYS = ["dashboard", "transactions", "add", "calculator", "settings"]

let initialized = false
let switchPanelFn = null
let showToastFn = null

function isInputFocused() {
    const el = document.activeElement
    if (!el) return false
    const tag = el.tagName
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable
}

function focusSearch() {
    const search = document.getElementById("search")
    if (search) {
        search.focus()
        search.select?.()
        return true
    }
    return false
}

function handleKeydown(e) {
    if (!switchPanelFn) return

    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key.toLowerCase() === "n") {
        e.preventDefault()
        switchPanelFn("add")
        showToastFn?.("⌨ Ctrl+N")
        return
    }

    if (e.key === "/" && !isInputFocused()) {
        e.preventDefault()
        if (focusSearch()) {
            switchPanelFn("transactions")
        }
        return
    }

    if (!mod && !e.altKey && !isInputFocused() && /^[1-5]$/.test(e.key)) {
        const idx = Number(e.key) - 1
        const panel = PANEL_KEYS[idx]
        if (panel) {
            e.preventDefault()
            switchPanelFn(panel)
        }
    }

    if (e.key === "Escape") {
        const onboarding = document.getElementById("onboardingOverlay")
        if (onboarding?.classList.contains("show")) return
        document.activeElement?.blur?.()
    }
}

export function initShortcuts(switchPanel, showToast) {
    if (initialized) return
    switchPanelFn = switchPanel
    showToastFn = showToast
    document.addEventListener("keydown", handleKeydown)
    initialized = true
}

export function destroyShortcuts() {
    document.removeEventListener("keydown", handleKeydown)
    initialized = false
    switchPanelFn = null
    showToastFn = null
}

export function getShortcutHelp() {
    return [
        { keys: "Ctrl+N", action: "shortcuts.newTx" },
        { keys: "/", action: "shortcuts.search" },
        { keys: "1-5", action: "shortcuts.panels" },
    ]
}

export { PANEL_KEYS }
