import { loadDB, updateDB } from "./storage.js"



const THEME_KEY = "financeTheme"

const COLOR_THEME_KEY = "financeColorTheme"

const COLOR_THEMES = ["blue", "green", "purple"]



const listeners = []

const colorListeners = []



const COLOR_META = {

    blue: { light: "#2563eb", dark: "#1d4ed8" },

    green: { light: "#059669", dark: "#047857" },

    purple: { light: "#7c3aed", dark: "#6d28d9" },

}



export function getThemePreference() {

    return localStorage.getItem(THEME_KEY) || "system"

}



export function getEffectiveTheme() {

    return resolveTheme(getThemePreference())

}



function resolveTheme(pref) {



    if (pref === "dark") return "dark"

    if (pref === "light") return "light"

    return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"



}



export function getColorTheme() {

    const stored = localStorage.getItem(COLOR_THEME_KEY)

    if (stored && COLOR_THEMES.includes(stored)) return stored



    const fromDb = loadDB().settings?.colorTheme

    if (fromDb && COLOR_THEMES.includes(fromDb)) return fromDb



    return "blue"

}



export function setThemePreference(pref) {



    localStorage.setItem(THEME_KEY, pref)

    applyTheme()

    syncThemeUI(pref)



}



export function setColorTheme(theme) {



    if (!COLOR_THEMES.includes(theme)) return



    localStorage.setItem(COLOR_THEME_KEY, theme)

    updateDB(db => {

        db.settings.colorTheme = theme

    })

    applyColorTheme()

    syncColorThemeUI(theme)



}



function updateThemeColorMeta() {



    const meta = document.querySelector('meta[name="theme-color"]')

    if (!meta) return



    const effective = getEffectiveTheme()

    const colorTheme = getColorTheme()

    const colors = COLOR_META[colorTheme] || COLOR_META.blue

    meta.content = effective === "dark" ? colors.dark : colors.light



}



export function applyTheme() {



    const effective = getEffectiveTheme()



    document.documentElement.setAttribute("data-theme", effective)

    updateThemeColorMeta()



    listeners.forEach(fn => fn(effective))



}



export function applyColorTheme() {



    const theme = getColorTheme()

    document.documentElement.setAttribute("data-color-theme", theme)

    updateThemeColorMeta()



    colorListeners.forEach(fn => fn(theme))



}



export function onThemeChange(fn) {

    listeners.push(fn)

}



export function onColorThemeChange(fn) {

    colorListeners.push(fn)

}



function syncThemeUI(pref) {



    document.querySelectorAll(".theme-tab").forEach(tab => {

        tab.classList.toggle("active", tab.dataset.theme === pref)

    })



    const quick = document.getElementById("themeQuickToggle")

    if (quick) {

        quick.textContent = getEffectiveTheme() === "dark" ? "☀️" : "🌙"

        quick.setAttribute("aria-label", getEffectiveTheme() === "dark" ? "حالت روشن" : "حالت تاریک")

    }



}



function syncColorThemeUI(theme) {



    document.querySelectorAll(".color-theme-tab").forEach(tab => {

        tab.classList.toggle("active", tab.dataset.colorTheme === theme)

    })



}



export function initTheme() {



    const pref = getThemePreference()

    applyTheme()

    syncThemeUI(pref)



    document.querySelectorAll(".theme-tab").forEach(tab => {



        tab.addEventListener("click", () => setThemePreference(tab.dataset.theme))



    })



    document.getElementById("themeQuickToggle")?.addEventListener("click", () => {



        const next = getEffectiveTheme() === "dark" ? "light" : "dark"

        setThemePreference(next)



    })



    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {



        if (getThemePreference() === "system") applyTheme()



    })



}



export function initColorTheme() {



    const theme = getColorTheme()

    localStorage.setItem(COLOR_THEME_KEY, theme)



    const dbTheme = loadDB().settings?.colorTheme

    if (!dbTheme || !COLOR_THEMES.includes(dbTheme)) {

        updateDB(db => {

            db.settings.colorTheme = theme

        })

    }



    applyColorTheme()

    syncColorThemeUI(theme)



    document.querySelectorAll(".color-theme-tab").forEach(tab => {



        tab.addEventListener("click", () => setColorTheme(tab.dataset.colorTheme))



    })



}

