const DISPLAY = () => document.getElementById("calcDisplay")
const EXPRESSION = () => document.getElementById("calcExpression")

let currentExpr = ""
let lastResult = null
let history = []
let shouldResetDisplay = false

const KEYS = [
    { label: "AC", action: "clear", cls: "fn" },
    { label: "⌫", action: "backspace", cls: "fn" },
    { label: "(", value: "(", cls: "fn" },
    { label: "÷", value: "/", cls: "op" },

    { label: "7", value: "7" },
    { label: "8", value: "8" },
    { label: "9", value: "9" },
    { label: "×", value: "*", cls: "op" },

    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "−", value: "-", cls: "op" },

    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "+", value: "+", cls: "op" },

    { label: "±", action: "negate", cls: "fn" },
    { label: "0", value: "0" },
    { label: ")", value: ")", cls: "fn" },
    { label: "=", action: "equals", cls: "eq" },

    { label: "%", action: "percent", cls: "fn wide" },
    { label: ".", value: ".", cls: "wide" },
]

export function initCalculator() {

    const container = document.getElementById("calculator")

    KEYS.forEach(k => {

        const btn = document.createElement("button")
        btn.textContent = k.label
        if (k.cls) btn.classList.add(...k.cls.split(" "))

        btn.addEventListener("click", () => handleKey(k))
        container.appendChild(btn)

    })

    document.getElementById("clearHistory").onclick = () => {

        history = []
        renderHistory()

    }

    document.addEventListener("keydown", onKeyboard)
    updateDisplay("0")

}

function handleKey(key) {

    if (key.action === "clear") {
        currentExpr = ""
        lastResult = null
        updateDisplay("0")
        EXPRESSION().textContent = ""
        return
    }

    if (key.action === "backspace") {
        if (shouldResetDisplay) {
            currentExpr = ""
            shouldResetDisplay = false
        } else {
            currentExpr = currentExpr.slice(0, -1)
        }
        updateDisplay(currentExpr || "0")
        return
    }

    if (key.action === "negate") {
        if (!currentExpr || currentExpr === "0") return
        if (currentExpr.startsWith("-")) currentExpr = currentExpr.slice(1)
        else currentExpr = "-" + currentExpr
        updateDisplay(currentExpr)
        return
    }

    if (key.action === "percent") {
        try {
            const val = evaluate(currentExpr || "0")
            currentExpr = String(val / 100)
            updateDisplay(currentExpr)
        } catch { /* ignore */ }
        return
    }

    if (key.action === "equals") {
        calculate()
        return
    }

    if (shouldResetDisplay && key.value && !isOperator(key.value)) {
        currentExpr = ""
        shouldResetDisplay = false
    } else if (shouldResetDisplay && isOperator(key.value)) {
        currentExpr = String(lastResult ?? "")
        shouldResetDisplay = false
    }

    if (key.value === "." && hasTrailingDecimal(currentExpr)) return

    if (isOperator(key.value) && isOperator(currentExpr.slice(-1))) {
        currentExpr = currentExpr.slice(0, -1) + key.value
    } else {
        currentExpr += key.value
    }

    updateDisplay(currentExpr)
}

function calculate() {

    if (!currentExpr) return

    try {

        const result = evaluate(currentExpr)
        const formatted = formatResult(result)

        EXPRESSION().textContent = currentExpr + " ="
        updateDisplay(formatted)

        history.unshift({ expr: currentExpr, result: formatted })
        if (history.length > 20) history.pop()
        renderHistory()

        lastResult = result
        shouldResetDisplay = true

    } catch {

        updateDisplay("خطا")
        shouldResetDisplay = true

    }

}

function evaluate(expr) {

    const tokens = tokenize(expr)
    if (!tokens.length) throw new Error("empty")

    const output = []
    const ops = []

    const prec = { "+": 1, "-": 1, "*": 2, "/": 2 }

    for (const t of tokens) {

        if (typeof t === "number") {
            output.push(t)
        } else if (t === "(") {
            ops.push(t)
        } else if (t === ")") {
            while (ops.length && ops[ops.length - 1] !== "(") {
                output.push(ops.pop())
            }
            if (!ops.length) throw new Error("parens")
            ops.pop()
        } else {
            while (
                ops.length &&
                ops[ops.length - 1] !== "(" &&
                prec[ops[ops.length - 1]] >= prec[t]
            ) {
                output.push(ops.pop())
            }
            ops.push(t)
        }

    }

    while (ops.length) {
        const op = ops.pop()
        if (op === "(" || op === ")") throw new Error("parens")
        output.push(op)
    }

    const stack = []

    for (const t of output) {

        if (typeof t === "number") {
            stack.push(t)
        } else {
            const b = stack.pop()
            const a = stack.pop()
            if (a === undefined || b === undefined) throw new Error("ops")

            if (t === "+") stack.push(a + b)
            else if (t === "-") stack.push(a - b)
            else if (t === "*") stack.push(a * b)
            else if (t === "/") {
                if (b === 0) throw new Error("div0")
                stack.push(a / b)
            }
        }

    }

    if (stack.length !== 1) throw new Error("invalid")
    return stack[0]

}

function tokenize(expr) {

    const tokens = []
    let i = 0

    while (i < expr.length) {

        const ch = expr[i]

        if (ch === " " || ch === "\t") { i++; continue }

        if (ch === "(" || ch === ")") {
            tokens.push(ch)
            i++
            continue
        }

        if ("+-*/".includes(ch)) {

            const prev = tokens[tokens.length - 1]
            const isUnary = !prev || prev === "(" || typeof prev === "string"

            if (ch === "-" && isUnary) {
                i++
                let num = ""
                while (i < expr.length && (expr[i] === "." || /\d/.test(expr[i]))) {
                    num += expr[i++]
                }
                if (!num) throw new Error("num")
                tokens.push(-parseFloat(num))
                continue
            }

            tokens.push(ch)
            i++
            continue
        }

        if (ch === "." || /\d/.test(ch)) {

            let num = ""
            while (i < expr.length && (expr[i] === "." || /\d/.test(expr[i]))) {
                num += expr[i++]
            }
            tokens.push(parseFloat(num))
            continue
        }

        throw new Error("char")

    }

    return tokens

}

function formatResult(n) {

    if (!isFinite(n)) throw new Error("inf")

    const rounded = Math.round(n * 1e10) / 1e10
    const str = String(rounded)

    if (str.includes("e")) return str
    return str

}

function updateDisplay(val) {
    DISPLAY().value = val
}

function isOperator(ch) {
    return "+-*/".includes(ch)
}

function hasTrailingDecimal(expr) {

    const parts = expr.split(/[+\-*/()]/).filter(Boolean)
    const last = parts[parts.length - 1] || ""
    return last.includes(".")

}

function renderHistory() {

    const list = document.getElementById("calcHistory")
    list.innerHTML = ""

    if (!history.length) {
        list.innerHTML = '<li style="cursor:default;color:var(--text-muted);justify-content:center">تاریخچه‌ای نیست</li>'
        return
    }

    history.forEach(item => {

        const li = document.createElement("li")
        li.innerHTML = `
            <span class="calc-history-expr">${item.expr} =</span>
            <span class="calc-history-result">${item.result}</span>
        `
        li.onclick = () => {
            currentExpr = item.result
            shouldResetDisplay = false
            updateDisplay(item.result)
            EXPRESSION().textContent = ""
        }
        list.appendChild(li)

    })

}

function onKeyboard(e) {

    const panel = document.getElementById("panel-calculator")
    if (!panel.classList.contains("active")) return

    const map = {
        "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
        "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
        "+": "+", "-": "-", "*": "*", "/": "/",
        ".": ".", "Enter": "=", "=": "=", "Backspace": "backspace",
        "Escape": "clear", "%": "percent",
        "(": "(", ")": ")",
    }

    const val = map[e.key]
    if (!val) return

    e.preventDefault()

    if (val === "=") handleKey({ action: "equals" })
    else if (val === "backspace") handleKey({ action: "backspace" })
    else if (val === "clear") handleKey({ action: "clear" })
    else if (val === "percent") handleKey({ action: "percent" })
    else handleKey({ value: val })

}

export function useCalcResult(callback) {

    document.getElementById("calcDisplay").addEventListener("dblclick", () => {

        const val = DISPLAY().value
        if (val && val !== "0" && val !== "خطا") callback(val)

    })

}
