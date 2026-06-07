import { DEFAULT_DASHBOARD_WIDGET_ORDER } from "./constants.js"
import { loadDB, updateDB } from "./storage.js"

const DESKTOP_MQ = "(min-width: 1024px)"
let draggedEl = null
let container = null
let mq = null
let onLayoutChange = null

function getSavedOrder() {
    const db = loadDB()
    const saved = db.settings?.dashboardWidgetOrder
    if (!Array.isArray(saved) || !saved.length) return [...DEFAULT_DASHBOARD_WIDGET_ORDER]
    const known = new Set(DEFAULT_DASHBOARD_WIDGET_ORDER)
    const valid = saved.filter(id => known.has(id))
    DEFAULT_DASHBOARD_WIDGET_ORDER.forEach(id => {
        if (!valid.includes(id)) valid.push(id)
    })
    return valid
}

function saveOrder() {
    if (!container) return
    const order = [...container.querySelectorAll(".dashboard-widget")]
        .map(el => el.dataset.widgetId)
        .filter(Boolean)
    updateDB(db => {
        db.settings.dashboardWidgetOrder = order
    })
}

export function applyDashboardOrder() {
    container = document.getElementById("dashboardWidgets")
    if (!container) return

    const order = getSavedOrder()
    const widgets = new Map(
        [...container.querySelectorAll(".dashboard-widget")].map(el => [el.dataset.widgetId, el])
    )

    order.forEach(id => {
        const el = widgets.get(id)
        if (el) container.appendChild(el)
    })
}

function setDraggable(enabled) {
    if (!container) return
    container.classList.toggle("dashboard-widgets--draggable", enabled)
    container.querySelectorAll(".dashboard-widget").forEach(el => {
        el.draggable = enabled
    })
}

function onDragStart(e) {
    if (!e.target.closest(".drag-handle")) {
        e.preventDefault()
        return
    }
    draggedEl = e.currentTarget
    draggedEl.classList.add("is-dragging")
    e.dataTransfer.effectAllowed = "move"
    e.dataTransfer.setData("text/plain", draggedEl.dataset.widgetId || "")
}

function onDragEnd() {
    if (draggedEl) {
        draggedEl.classList.remove("is-dragging")
        draggedEl = null
    }
    container?.querySelectorAll(".dashboard-widget").forEach(el => {
        el.classList.remove("drag-over")
    })
    onLayoutChange?.()
}

function onDragOver(e) {
    e.preventDefault()
    if (!draggedEl) return

    const under = document.elementFromPoint(e.clientX, e.clientY)
    const target = under?.closest?.(".dashboard-widget")
    if (!target || target === draggedEl || !container.contains(target)) return

    target.classList.add("drag-over")
    container.querySelectorAll(".dashboard-widget").forEach(el => {
        if (el !== target) el.classList.remove("drag-over")
    })

    const box = target.getBoundingClientRect()
    const before = e.clientY < box.top + box.height / 2
    container.insertBefore(draggedEl, before ? target : target.nextElementSibling)
}

function onDrop(e) {
    e.preventDefault()
    saveOrder()
    onLayoutChange?.()
}

function bindWidgetEvents() {
    if (!container) return
    container.querySelectorAll(".dashboard-widget").forEach(el => {
        el.removeEventListener("dragstart", onDragStart)
        el.removeEventListener("dragend", onDragEnd)
        el.removeEventListener("dragover", onDragOver)
        el.removeEventListener("drop", onDrop)
        el.addEventListener("dragstart", onDragStart)
        el.addEventListener("dragend", onDragEnd)
        el.addEventListener("dragover", onDragOver)
        el.addEventListener("drop", onDrop)
    })
}

function onBreakpointChange(e) {
    setDraggable(e.matches)
}

export function initDashboardLayout({ onReorder } = {}) {
    onLayoutChange = onReorder || null
    container = document.getElementById("dashboardWidgets")
    if (!container) return

    applyDashboardOrder()
    bindWidgetEvents()

    mq = window.matchMedia(DESKTOP_MQ)
    mq.addEventListener("change", onBreakpointChange)
    setDraggable(mq.matches)
}
