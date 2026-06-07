import { toGregorian, toJalali, parseJalaliString, toISODate, todayJalali } from "./jalali.js"

const MONTH_NAMES = [
    "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
    "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
]

function daysInJalaliMonth(jy, jm) {
    if (jm <= 6) return 31
    if (jm <= 11) return 30
    const back = toJalali(toGregorian(jy, 12, 30))
    return back.jm === 12 && back.jd === 30 ? 30 : 29
}

function buildYearOptions(selected) {
    const { jy } = todayJalali()
    let html = ""
    for (let y = jy - 5; y <= jy + 2; y += 1) {
        html += `<option value="${y}" ${y === selected ? "selected" : ""}>${y}</option>`
    }
    return html
}

function buildMonthOptions(selected) {
    return MONTH_NAMES.map((name, i) => {
        const m = i + 1
        return `<option value="${m}" ${m === selected ? "selected" : ""}>${name}</option>`
    }).join("")
}

function buildDayOptions(jy, jm, selected) {
    const max = daysInJalaliMonth(jy, jm)
    let html = ""
    for (let d = 1; d <= max; d += 1) {
        html += `<option value="${d}" ${d === selected ? "selected" : ""}>${d}</option>`
    }
    return html
}

function getHiddenInput(pickerEl) {
    return pickerEl.closest(".jalali-date-picker-wrap")?.querySelector('input[type="hidden"]')
        || document.getElementById(pickerEl.dataset.target)
}

function syncHiddenInput(pickerEl) {
    const hidden = getHiddenInput(pickerEl)
    if (!hidden) return

    const y = Number(pickerEl.querySelector(".jd-year")?.value)
    const m = Number(pickerEl.querySelector(".jd-month")?.value)
    const d = Number(pickerEl.querySelector(".jd-day")?.value)

    if (!y || !m || !d) {
        hidden.value = ""
        hidden.dataset.iso = ""
        return
    }

    hidden.value = `${y}/${String(m).padStart(2, "0")}/${String(d).padStart(2, "0")}`
    try {
        hidden.dataset.iso = toISODate(toGregorian(y, m, d))
    } catch {
        hidden.dataset.iso = ""
    }
}

function refreshDays(pickerEl) {
    const y = Number(pickerEl.querySelector(".jd-year")?.value)
    const m = Number(pickerEl.querySelector(".jd-month")?.value)
    const daySel = pickerEl.querySelector(".jd-day")
    if (!daySel || !y || !m) return

    const current = Number(daySel.value) || 1
    const max = daysInJalaliMonth(y, m)
    const safeDay = Math.min(current, max)

    daySel.innerHTML = buildDayOptions(y, m, safeDay)
    syncHiddenInput(pickerEl)
}

function ensurePickerStructure(picker) {
    if (picker.querySelector(".jd-year")) return
    picker.innerHTML = `
        <select class="jd-year" aria-label="سال"></select>
        <select class="jd-month" aria-label="ماه"></select>
        <select class="jd-day" aria-label="روز"></select>
    `
}

function initOptionalPicker(picker) {
    ensurePickerStructure(picker)
    const yearSel = picker.querySelector(".jd-year")
    const monthSel = picker.querySelector(".jd-month")
    const daySel = picker.querySelector(".jd-day")
    yearSel.innerHTML = `<option value="">—</option>` + buildYearOptions(todayJalali().jy).replace(/ selected/g, "")
    monthSel.innerHTML = `<option value="">—</option>` + buildMonthOptions(0).replace(/ selected/g, "")
    daySel.innerHTML = `<option value="">—</option>`
    syncHiddenInput(picker)
}

export function initDatePicker(pickerId) {
    const picker = document.getElementById(pickerId)
    if (!picker || picker.dataset.inited) return

    picker.dataset.inited = "1"
    ensurePickerStructure(picker)

    if (picker.dataset.optional === "true") {
        initOptionalPicker(picker)
    } else {
        setPickerDate(pickerId, null)
    }

    picker.querySelector(".jd-year")?.addEventListener("change", () => {
        if (picker.dataset.optional === "true" && !picker.querySelector(".jd-year")?.value) {
            initOptionalPicker(picker)
            return
        }
        refreshDays(picker)
    })
    picker.querySelector(".jd-month")?.addEventListener("change", () => refreshDays(picker))
    picker.querySelector(".jd-day")?.addEventListener("change", () => syncHiddenInput(picker))
}

export function setPickerDate(pickerId, jalaliStr) {
    const picker = document.getElementById(pickerId)
    if (!picker) return

    let jy, jm, jd
    if (!jalaliStr) {
        ({ jy, jm, jd } = todayJalali())
    } else {
        try {
            const d = parseJalaliString(jalaliStr)
            ;({ jy, jm, jd } = toJalali(d))
        } catch {
            ({ jy, jm, jd } = todayJalali())
        }
    }

    const yearSel = picker.querySelector(".jd-year")
    const monthSel = picker.querySelector(".jd-month")
    const daySel = picker.querySelector(".jd-day")

    if (yearSel) {
        yearSel.innerHTML = buildYearOptions(jy)
        yearSel.value = String(jy)
    }
    if (monthSel) monthSel.value = String(jm)
    if (daySel) daySel.innerHTML = buildDayOptions(jy, jm, jd)
    daySel.value = String(jd)

    syncHiddenInput(picker)
}

export function getPickerISO(pickerId) {
    const picker = document.getElementById(pickerId)
    const hidden = picker ? getHiddenInput(picker) : null
    if (hidden?.dataset.iso) return hidden.dataset.iso
    if (hidden?.value) {
        try {
            return toISODate(parseJalaliString(hidden.value))
        } catch {
            return ""
        }
    }
    return ""
}

export function getPickerJalali(pickerId) {
    const picker = document.getElementById(pickerId)
    const hidden = picker ? getHiddenInput(picker) : null
    return hidden?.value || ""
}

export function initAllDatePickers() {
    document.querySelectorAll(".jalali-date-picker").forEach(el => initDatePicker(el.id))
}

export function setTodayPickers() {
    const { jy, jm, jd } = todayJalali()
    const todayStr = `${jy}/${String(jm).padStart(2, "0")}/${String(jd).padStart(2, "0")}`

    document.querySelectorAll(".jalali-date-picker:not([data-optional='true'])").forEach(el => {
        const hidden = getHiddenInput(el)
        if (hidden && !hidden.value) setPickerDate(el.id, todayStr)
    })
}

export function clearPicker(pickerId) {
    const picker = document.getElementById(pickerId)
    if (!picker) return
    if (picker.dataset.optional === "true") {
        initOptionalPicker(picker)
        return
    }
    const hidden = getHiddenInput(picker)
    if (hidden) {
        hidden.value = ""
        hidden.dataset.iso = ""
    }
}

export { MONTH_NAMES }
