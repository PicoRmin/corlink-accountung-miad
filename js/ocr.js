const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js"

let tesseractModule = null

async function loadTesseract() {
    if (tesseractModule) return tesseractModule
    tesseractModule = await import(TESSERACT_CDN)
    return tesseractModule
}

function extractAmounts(text) {
    const persian = "۰۱۲۳۴۵۶۷۸۹"
    const normalized = text
        .replace(/[۰-۹]/g, ch => String(persian.indexOf(ch)))
        .replace(/[,،]/g, "")
        .replace(/\s+/g, " ")

    const patterns = [
        /(?:مبلغ|جمع|total|amount)[:\s]*([\d]+(?:\.\d+)?)/gi,
        /([\d]{1,3}(?:,\d{3})+(?:\.\d+)?)/g,
        /([\d]{4,})/g,
    ]

    const found = new Set()

    patterns.forEach(re => {
        let match
        const regex = new RegExp(re.source, re.flags)
        while ((match = regex.exec(normalized)) !== null) {
            const num = Number(String(match[1] || match[0]).replace(/[^\d.]/g, ""))
            if (num > 0) found.add(num)
        }
    })

    return [...found].sort((a, b) => b - a)
}

function guessDescription(text) {
    const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean)
    return lines.slice(0, 3).join(" — ").slice(0, 120)
}

export async function scanReceipt(file, { lang = "fas+eng", onProgress } = {}) {
    if (!file) {
        throw new Error("No file provided")
    }

    const { createWorker } = await loadTesseract()
    const worker = await createWorker(lang, 1, {
        logger: m => {
            if (onProgress && m.status === "recognizing text") {
                onProgress(Math.round((m.progress || 0) * 100))
            }
        },
    })

    try {
        const { data } = await worker.recognize(file)
        const text = data.text || ""
        const amounts = extractAmounts(text)
        const amount = amounts[0] || 0

        return {
            text,
            amount,
            amounts,
            desc: guessDescription(text),
            confidence: data.confidence,
        }
    } finally {
        await worker.terminate()
    }
}

export function parseReceiptText(text) {
    const amounts = extractAmounts(text)
    return {
        text,
        amount: amounts[0] || 0,
        amounts,
        desc: guessDescription(text),
    }
}
