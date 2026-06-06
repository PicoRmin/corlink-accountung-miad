export const DB_VERSION = 2

export const PAGE_SIZE = 20

export const CHECK_STATUSES = {
    pending: "pending",
    cleared: "cleared",
    bounced: "bounced",
}

export const DEFAULT_CATEGORIES = [
    { id: "cat-rent", key: "rent", icon: "🏠", type: "expense" },
    { id: "cat-salary", key: "salary", icon: "💼", type: "income" },
    { id: "cat-purchase", key: "purchase", icon: "🛒", type: "expense" },
    { id: "cat-sales", key: "sales", icon: "📦", type: "income" },
    { id: "cat-food", key: "food", icon: "🍽️", type: "expense" },
    { id: "cat-transport", key: "transport", icon: "🚌", type: "expense" },
    { id: "cat-utilities", key: "utilities", icon: "💡", type: "expense" },
    { id: "cat-other", key: "other", icon: "📁", type: "expense" },
]

export const TX_TYPES = ["income", "expense", "transfer"]

export const TX_METHODS = ["cash", "check", "transfer"]

export const DEFAULT_SETTINGS = {
    language: "fa",
    colorTheme: "blue",
    onboardingDone: false,
    syncBinId: "",
    syncApiKey: "",
}
