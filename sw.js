const CACHE_NAME = "corlink-v2"

const STATIC_ASSETS = [
    "./",
    "./index.html",
    "./css/style.css",
    "./manifest.json",
    "./icons/icon-192.svg",
    "./icons/icon-512.svg",
    "./js/app.js",
    "./js/ui.js",
    "./js/storage.js",
    "./js/transactions.js",
    "./js/accounts.js",
    "./js/categories.js",
    "./js/budget.js",
    "./js/checks.js",
    "./js/reports.js",
    "./js/export.js",
    "./js/crypto.js",
    "./js/sync.js",
    "./js/ocr.js",
    "./js/i18n.js",
    "./js/theme.js",
    "./js/onboarding.js",
    "./js/shortcuts.js",
    "./js/datePicker.js",
    "./js/notifications.js",
    "./js/calculator.js",
    "./js/constants.js",
    "./js/jalali.js",
    "./locales/fa.json",
    "./locales/en.json",
]

const CDN_ASSETS = [
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
]

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    )
    self.skipWaiting()
})

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
        ).then(() => self.clients.claim())
    )
})

function isJsonBinRequest(url) {
    return url.hostname.includes("jsonbin.io")
}

function isCdnAsset(url) {
    return CDN_ASSETS.some((asset) => url.href === asset || url.href.startsWith(asset))
}

function isLocaleRequest(url) {
    return url.pathname.includes("/locales/") && url.pathname.endsWith(".json")
}

self.addEventListener("fetch", (event) => {
    const { request } = event

    if (request.method !== "GET") return

    const url = new URL(request.url)

    if (isJsonBinRequest(url)) {
        event.respondWith(networkFirst(request))
        return
    }

    if (isCdnAsset(url) || isLocaleRequest(url)) {
        event.respondWith(cacheOnFetch(request))
        return
    }

    if (url.origin === self.location.origin) {
        event.respondWith(cacheFirst(request))
    }
})

async function cacheFirst(request) {
    const cached = await caches.match(request)
    if (cached) return cached

    try {
        const response = await fetch(request)
        if (response.ok) {
            const cache = await caches.open(CACHE_NAME)
            cache.put(request, response.clone())
        }
        return response
    } catch {
        return caches.match("./index.html")
    }
}

async function cacheOnFetch(request) {
    const cache = await caches.open(CACHE_NAME)
    const cached = await cache.match(request)

    try {
        const response = await fetch(request)
        if (response.ok) {
            cache.put(request, response.clone())
        }
        return response
    } catch {
        if (cached) return cached
        throw new Error("Network unavailable and no cache for " + request.url)
    }
}

async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME)

    try {
        const response = await fetch(request)
        if (response.ok) {
            cache.put(request, response.clone())
        }
        return response
    } catch {
        const cached = await cache.match(request)
        if (cached) return cached
        throw new Error("Network unavailable and no cache for " + request.url)
    }
}
