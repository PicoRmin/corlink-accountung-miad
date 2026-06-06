export function initCalculator() {

    const container = document.getElementById("calculator")

    const keys = ["7", "8", "9", "/",
        "4", "5", "6", "*",
        "1", "2", "3", "-",
        "0", ".", "=", "+"]

    keys.forEach(k => {

        let btn = document.createElement("button")

        btn.innerText = k

        btn.onclick = () => press(k)

        container.appendChild(btn)

    })

}

function press(v) {

    let d = document.getElementById("calcDisplay")

    if (v === "=") {

        d.value = eval(d.value)

    } else {

        d.value += v

    }

}
