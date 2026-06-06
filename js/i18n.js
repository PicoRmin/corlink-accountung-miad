let currentLang = "fa"
let messages = {}
let loaded = false

const FALLBACK_FA = {
    "nav.dashboard": "داشبورد",
    "nav.transactions": "تراکنش‌ها",
    "nav.add": "ثبت",
    "nav.calculator": "ماشین‌حساب",
    "nav.settings": "تنظیمات",
    "stats.balance": "موجودی",
    "stats.income": "دریافت",
    "stats.expense": "پرداخت",
}

async function fetchLocale(lang) {
    const res = await fetch(`locales/${lang}.json`)
    if (!res.ok) throw new Error(`Locale not found: ${lang}`)
    return res.json()
}

export async function loadLocale(lang) {
    try {
        messages = await fetchLocale(lang)
        currentLang = lang
        loaded = true
        return messages
    } catch {
        if (lang !== "fa") return loadLocale("fa")
        messages = { ...FALLBACK_FA }
        currentLang = "fa"
        loaded = true
        return messages
    }
}

export function t(key, fallback) {
    if (!loaded) {
        return fallback ?? key
    }
    return messages[key] ?? fallback ?? key
}

export function getLanguage() {
    return currentLang
}

export function setLanguage(lang) {
    return loadLocale(lang)
}

export function applyI18n(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
        const key = el.getAttribute("data-i18n")
        const attr = el.getAttribute("data-i18n-attr")
        const text = t(key)
        if (attr) {
            el.setAttribute(attr, text)
        } else {
            el.textContent = text
        }
    })

    root.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
        el.placeholder = t(el.getAttribute("data-i18n-placeholder"))
    })

    root.querySelectorAll("[data-i18n-title]").forEach(el => {
        el.title = t(el.getAttribute("data-i18n-title"))
    })

    document.documentElement.lang = currentLang
    document.documentElement.dir = currentLang === "fa" ? "rtl" : "ltr"
}

export async function initI18n(preferredLang) {
    const lang = preferredLang || "fa"
    await loadLocale(lang)
    applyI18n()
    return currentLang
}

export function getMessages() {
    return { ...messages }
}

export function isLoaded() {
    return loaded
}
