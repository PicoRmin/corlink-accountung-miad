import { loadDB, saveDB } from "./storage.js"
import { t, applyI18n } from "./i18n.js"

const STEPS = [
    {
        target: "#panel-dashboard",
        titleKey: "onboarding.step1Title",
        bodyKey: "onboarding.step1Body",
    },
    {
        target: "#panel-add",
        titleKey: "onboarding.step2Title",
        bodyKey: "onboarding.step2Body",
    },
    {
        target: "#panel-transactions",
        titleKey: "onboarding.step3Title",
        bodyKey: "onboarding.step3Body",
    },
    {
        target: "#panel-settings",
        titleKey: "onboarding.step4Title",
        bodyKey: "onboarding.step4Body",
    },
]

let overlayEl = null
let currentStep = 0
let onCompleteCallback = null

function createOverlay() {
    if (overlayEl) return overlayEl

    overlayEl = document.createElement("div")
    overlayEl.id = "onboardingOverlay"
    overlayEl.className = "onboarding-overlay"
    overlayEl.innerHTML = `
        <div class="onboarding-backdrop"></div>
        <div class="onboarding-card" role="dialog" aria-modal="true">
            <div class="onboarding-progress"></div>
            <h2 class="onboarding-title"></h2>
            <p class="onboarding-body"></p>
            <div class="onboarding-actions">
                <button type="button" class="btn-secondary onboarding-skip">${t("onboarding.skip")}</button>
                <button type="button" class="btn-primary onboarding-next">${t("onboarding.next")}</button>
            </div>
        </div>
    `
    document.body.appendChild(overlayEl)

    overlayEl.querySelector(".onboarding-skip").addEventListener("click", finishOnboarding)
    overlayEl.querySelector(".onboarding-next").addEventListener("click", nextStep)
    overlayEl.querySelector(".onboarding-backdrop").addEventListener("click", finishOnboarding)

    return overlayEl
}

function highlightTarget(selector) {
    document.querySelectorAll(".onboarding-highlight").forEach(el => {
        el.classList.remove("onboarding-highlight")
    })

    const target = document.querySelector(selector)
    if (target) {
        target.classList.add("onboarding-highlight")
        target.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    return target
}

function renderStep(index) {
    const step = STEPS[index]
    if (!step) return

    const overlay = createOverlay()
    overlay.querySelector(".onboarding-title").textContent = t(step.titleKey)
    overlay.querySelector(".onboarding-body").textContent = t(step.bodyKey)
    overlay.querySelector(".onboarding-progress").textContent =
        t("onboarding.progress", `${index + 1}/${STEPS.length}`)
            .replace("{current}", index + 1)
            .replace("{total}", STEPS.length)

    const nextBtn = overlay.querySelector(".onboarding-next")
    nextBtn.textContent = index === STEPS.length - 1
        ? t("onboarding.finish")
        : t("onboarding.next")

    highlightTarget(step.target)
    overlay.classList.add("show")
}

function nextStep() {
    currentStep += 1
    if (currentStep >= STEPS.length) {
        finishOnboarding()
    } else {
        renderStep(currentStep)
    }
}

function finishOnboarding() {
    const db = loadDB()
    db.settings.onboardingDone = true
    saveDB(db)

    document.querySelectorAll(".onboarding-highlight").forEach(el => {
        el.classList.remove("onboarding-highlight")
    })

    if (overlayEl) {
        overlayEl.classList.remove("show")
        setTimeout(() => {
            overlayEl?.remove()
            overlayEl = null
        }, 300)
    }

    if (onCompleteCallback) onCompleteCallback()
}

export function showOnboarding({ onComplete, force = false } = {}) {
    const db = loadDB()
    if (db.settings.onboardingDone && !force) return false

    onCompleteCallback = onComplete || null
    currentStep = 0
    applyI18n()
    renderStep(0)
    return true
}

export function resetOnboarding() {
    const db = loadDB()
    db.settings.onboardingDone = false
    saveDB(db)
}

export function isOnboardingDone() {
    return loadDB().settings.onboardingDone
}

export function getOnboardingStepCount() {
    return STEPS.length
}
