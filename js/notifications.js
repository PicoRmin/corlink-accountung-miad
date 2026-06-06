import { getUpcomingChecks } from "./checks.js"
import { t } from "./i18n.js"

const NOTIFIED_KEY = "financeCheckNotified"

function getNotifiedSet() {
    try {
        return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || "[]"))
    } catch {
        return new Set()
    }
}

function saveNotifiedSet(set) {
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...set].slice(-100)))
}

export async function requestNotificationPermission() {
    if (!("Notification" in window)) return "unsupported"
    if (Notification.permission === "granted") return "granted"
    if (Notification.permission === "denied") return "denied"
    return Notification.requestPermission()
}

export function notifyCheckReminders() {
    if (!("Notification" in window) || Notification.permission !== "granted") return

    const notified = getNotifiedSet()
    const upcoming = getUpcomingChecks()

    upcoming.forEach(check => {
        if (notified.has(check.id)) return

        const title = t("check.reminder")
        const body = `${check.desc} — ${check.dueDateJalali || check.dueDate}`

        try {
            new Notification(title, { body, icon: "./icons/icon-192.svg", tag: check.id })
            notified.add(check.id)
        } catch {
            // ignore
        }
    })

    saveNotifiedSet(notified)
}

export function initCheckNotifications() {
    if ("serviceWorker" in navigator && "Notification" in window) {
        navigator.serviceWorker.ready.then(() => {
            notifyCheckReminders()
        }).catch(() => {})
    } else {
        notifyCheckReminders()
    }

    setInterval(notifyCheckReminders, 60 * 60 * 1000)
}
