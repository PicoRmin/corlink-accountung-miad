const SALT_LENGTH = 16
const IV_LENGTH = 12
const ITERATIONS = 100000

function encodeBase64(buffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ""
    bytes.forEach(b => { binary += String.fromCharCode(b) })
    return btoa(binary)
}

function decodeBase64(str) {
    const binary = atob(str)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }
    return bytes
}

async function deriveKey(password, salt) {
    const enc = new TextEncoder()
    const baseKey = await crypto.subtle.importKey(
        "raw",
        enc.encode(password),
        "PBKDF2",
        false,
        ["deriveKey"]
    )

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt,
            iterations: ITERATIONS,
            hash: "SHA-256",
        },
        baseKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    )
}

export async function encryptBackup(data, password) {
    if (!password || password.length < 4) {
        throw new Error("Password must be at least 4 characters")
    }

    const enc = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
    const key = await deriveKey(password, salt)

    const plaintext = typeof data === "string" ? data : JSON.stringify(data)
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        enc.encode(plaintext)
    )

    return {
        version: 1,
        algorithm: "AES-GCM",
        kdf: "PBKDF2-SHA256",
        iterations: ITERATIONS,
        salt: encodeBase64(salt),
        iv: encodeBase64(iv),
        ciphertext: encodeBase64(ciphertext),
    }
}

export async function decryptBackup(encrypted, password) {
    if (!encrypted || !password) {
        throw new Error("Encrypted payload and password required")
    }

    const salt = decodeBase64(encrypted.salt)
    const iv = decodeBase64(encrypted.iv)
    const ciphertext = decodeBase64(encrypted.ciphertext)
    const key = await deriveKey(password, salt)

    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv },
            key,
            ciphertext
        )
        const text = new TextDecoder().decode(decrypted)
        try {
            return JSON.parse(text)
        } catch {
            return text
        }
    } catch {
        throw new Error("Decryption failed — wrong password or corrupted file")
    }
}

export async function encryptBackupToJSON(data, password) {
    const encrypted = await encryptBackup(data, password)
    return JSON.stringify(encrypted, null, 2)
}

export async function decryptBackupFromJSON(json, password) {
    const payload = typeof json === "string" ? JSON.parse(json) : json
    return decryptBackup(payload, password)
}
