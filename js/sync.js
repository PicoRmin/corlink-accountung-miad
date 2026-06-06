import { loadDB, saveDB, migrate } from "./storage.js"

const JSONBIN_BASE = "https://api.jsonbin.io/v3/b"

function getSyncCredentials() {
    const { syncBinId, syncApiKey } = loadDB().settings
    if (!syncBinId || !syncApiKey) {
        throw new Error("Sync credentials not configured")
    }
    return { binId: syncBinId, apiKey: syncApiKey }
}

function headers(apiKey, extra = {}) {
    return {
        "Content-Type": "application/json",
        "X-Master-Key": apiKey,
        ...extra,
    }
}

export async function pushToCloud(dbOverride) {
    const { binId, apiKey } = getSyncCredentials()
    const db = dbOverride || loadDB()

    const res = await fetch(`${JSONBIN_BASE}/${binId}`, {
        method: "PUT",
        headers: headers(apiKey),
        body: JSON.stringify({
            syncedAt: new Date().toISOString(),
            data: db,
        }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Push failed (${res.status}): ${err}`)
    }

    return res.json()
}

export async function pullFromCloud() {
    const { binId, apiKey } = getSyncCredentials()

    const res = await fetch(`${JSONBIN_BASE}/${binId}/latest`, {
        headers: headers(apiKey, { "X-Access-Key": apiKey }),
    })

    if (!res.ok) {
        const err = await res.text()
        throw new Error(`Pull failed (${res.status}): ${err}`)
    }

    const payload = await res.json()
    const remote = payload.record?.data || payload.record
    const db = migrate(remote)
    saveDB(db)
    return db
}

export function generateSyncCode() {
    const db = loadDB()
    const payload = {
        v: 1,
        exportedAt: new Date().toISOString(),
        data: db,
    }
    const json = JSON.stringify(payload)
    return btoa(unescape(encodeURIComponent(json)))
}

export function importSyncCode(code) {
    if (!code || typeof code !== "string") {
        throw new Error("Invalid sync code")
    }

    let parsed
    try {
        const json = decodeURIComponent(escape(atob(code.trim())))
        parsed = JSON.parse(json)
    } catch {
        throw new Error("Sync code is corrupted or invalid")
    }

    const db = migrate(parsed.data || parsed)
    saveDB(db)
    return db
}

export async function copySyncCodeToClipboard() {
    const code = generateSyncCode()
    await navigator.clipboard.writeText(code)
    return code
}

export function setSyncCredentials(binId, apiKey) {
    const db = loadDB()
    db.settings.syncBinId = binId.trim()
    db.settings.syncApiKey = apiKey.trim()
    saveDB(db)
    return db.settings
}

export async function testSyncConnection() {
    const { binId, apiKey } = getSyncCredentials()
    const res = await fetch(`${JSONBIN_BASE}/${binId}/meta`, {
        headers: headers(apiKey),
    })
    if (!res.ok) {
        throw new Error(`Connection failed (${res.status})`)
    }
    return res.json()
}
