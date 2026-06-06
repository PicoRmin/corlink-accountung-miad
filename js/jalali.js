const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹"

function pad2(n) {
    return String(n).padStart(2, "0")
}

function toPersianDigits(str) {
    return String(str).replace(/\d/g, d => PERSIAN_DIGITS[d])
}

function jalCal(jy) {
    const breaks = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
        1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
    ]
    let bl = breaks.length
    let gy = jy + 621
    let leapJ = -14
    let jp = breaks[0]
    let jm, jump, leap, n, i

    if (jy < jp || jy >= breaks[bl - 1]) {
        throw new Error(`Invalid Jalali year: ${jy}`)
    }

    for (i = 1; i < bl; i += 1) {
        jm = breaks[i]
        jump = jm - jp
        if (jy < jm) break
        leapJ += Math.floor(jump / 33) * 8 + Math.floor((jump % 33) / 4)
        jp = jm
    }

    n = jy - jp
    leapJ += Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4)
    if ((jump % 33) === 4 && jump - n === 4) leapJ += 1

    leap = (((n + 1) % 33) - 1) % 4
    if (leap === -1) leap = 4

    return { leap, gy }
}

function g2d(gy, gm, gd) {
    let d = Math.floor((gy + Math.floor((gm - 8) / 6) + 100100) * 1461 / 4)
        + Math.floor((153 * ((gm + 9) % 12) + 2) / 5)
        + gd - 34840408
    d -= Math.floor((Math.floor((gy + 100100 + Math.floor((gm - 8) / 6)) / 100) * 3) / 4) + 752
    return d
}

function d2g(jdn) {
    let j = 4 * jdn + 139361631
    j += Math.floor((Math.floor((4 * jdn + 183187720) / 146097) * 3) / 4) * 4 - 3908
    const i = Math.floor(((j % 1461) / 4) * 5 + 308)
    const gd = Math.floor((i % 153) / 5) + 1
    const gm = ((Math.floor(i / 153)) % 12) + 1
    const gy = Math.floor(j / 1461) - 100100 + Math.floor((8 - gm) / 6)
    return { gy, gm, gd }
}

function j2d(jy, jm, jd) {
    const r = jalCal(jy)
    return g2d(r.gy, 3, r.leap + 1) + (jm - 1) * 31 - Math.floor(jm / 7) * (jm - 7) + jd - 1
}

function d2j(jdn) {
    const g = d2g(jdn)
    let jy = g.gy - 621
    const r = jalCal(jy)
    const jdn1f = g2d(g.gy, 3, r.leap + 1)
    let k = jdn - jdn1f
    let jm, jd

    if (k >= 0) {
        if (k <= 185) {
            jm = 1 + Math.floor(k / 31)
            jd = (k % 31) + 1
            return { jy, jm, jd }
        }
        k -= 186
    } else {
        jy -= 1
        k += 179
        if (r.leap === 0) k += 1
    }

    jm = 7 + Math.floor(k / 30)
    jd = (k % 30) + 1
    return { jy, jm, jd }
}

export function toJalali(date) {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) {
        throw new Error("Invalid date")
    }
    return d2j(g2d(d.getFullYear(), d.getMonth() + 1, d.getDate()))
}

export function toGregorian(jy, jm, jd) {
    const g = d2g(j2d(jy, jm, jd))
    return new Date(g.gy, g.gm - 1, g.gd)
}

export function formatJalali(date, { persianDigits = true } = {}) {
    const { jy, jm, jd } = toJalali(date)
    const formatted = `${jy}/${pad2(jm)}/${pad2(jd)}`
    return persianDigits ? toPersianDigits(formatted) : formatted
}

export function todayJalali() {
    return toJalali(new Date())
}

export function parseJalaliString(str) {
    const normalized = String(str)
        .replace(/[۰-۹]/g, ch => PERSIAN_DIGITS.indexOf(ch))
        .replace(/[^\d/]/g, "")
    const parts = normalized.split("/").map(Number)

    if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) {
        throw new Error(`Invalid Jalali date string: ${str}`)
    }

    const [jy, jm, jd] = parts
    return toGregorian(jy, jm, jd)
}

export function monthKey(date) {
    const { jy, jm } = toJalali(date instanceof Date ? date : new Date(date))
    return `${jy}-${pad2(jm)}`
}

export function monthKeyFromJalali(jy, jm) {
    return `${jy}-${pad2(jm)}`
}

export function toISODate(date) {
    const d = date instanceof Date ? date : new Date(date)
    const y = d.getFullYear()
    const m = pad2(d.getMonth() + 1)
    const day = pad2(d.getDate())
    return `${y}-${m}-${day}`
}
