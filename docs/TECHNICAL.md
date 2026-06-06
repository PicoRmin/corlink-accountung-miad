# مستندات فنی — CorLink Accounting

> نسخه: 1.0 · آخرین به‌روزرسانی: ۱۴۰۴/۰۳/۱۷

## ۱. نمای کلی

CorLink Accounting یک **Single Page Application (SPA)** استاتیک است که بدون فریم‌ورک، bundler یا backend کار می‌کند. تمام منطق در مرورگر اجرا می‌شود و داده‌ها در `localStorage` نگهداری می‌شوند.

| مورد | مقدار |
|------|--------|
| نوع پروژه | Static SPA |
| زبان رابط | فارسی (RTL) |
| حداقل مرورگر | Chrome 90+, Firefox 88+, Safari 14+, Edge 90+ |
| وابستگی خارجی | Chart.js (CDN), فونت Vazirmatn (Google Fonts) |
| استقرار | GitHub Pages |

---

## ۲. ساختار پوشه‌ها

```
corlink-accountung-miad/
├── index.html              # نقطه ورود — ساختار DOM و پنل‌ها
├── css/
│   └── style.css           # Design tokens، layout، responsive، dark mode
├── js/
│   ├── app.js              # Orchestrator — navigation، render، events
│   ├── storage.js          # لایه persistence (localStorage)
│   ├── transactions.js     # CRUD تراکنش و موجودی
│   ├── ui.js               # رندر جدول/کارت و فرمت اعداد
│   ├── reports.js          # محاسبات گزارش (دریافت/پرداخت)
│   ├── checks.js           # منطق یادآوری چک
│   ├── calculator.js       # ماشین‌حساب با parser امن
│   └── theme.js            # مدیریت تم روشن/تاریک/خودکار
├── docs/
│   ├── TECHNICAL.md        # این فایل
│   └── IDEAS.md            # پیشنهادات توسعه
├── .github/workflows/
│   └── deploy-pages.yml    # CI/CD برای GitHub Pages
├── .nojekyll               # غیرفعال کردن Jekyll در Pages
└── README.md               # راهنمای کاربر
```

---

## ۳. معماری

```
┌─────────────────────────────────────────────────┐
│                   index.html                     │
│  (Header · Panels · Bottom Nav · Toast)         │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                    app.js                        │
│  Navigation · Form · Chart · Backup · Theme      │
└──┬────────┬─────────┬──────────┬─────────┬───────┘
   │        │         │          │         │
   ▼        ▼         ▼          ▼         ▼
 ui.js  reports.js checks.js calculator theme.js
   │                    │
   ▼                    │
transactions.js ◄───────┘
   │
   ▼
storage.js ──► localStorage["financeDB"]
              localStorage["financeTheme"]
```

### اصول طراحی

- **ماژولار بودن:** هر فایل JS یک مسئولیت مشخص دارد.
- **ES Modules:** import/export بومی مرورگر؛ بدون build step.
- **Separation of concerns:** منطق داده (`transactions.js`) جدا از رندر (`ui.js`).
- **CSS Variables:** تم روشن/تاریک با override متغیرهای `:root`.

---

## ۴. مدل داده

### ۴.۱. کلید `financeDB`

```json
{
  "balance": 1500000,
  "transactions": [
    {
      "date": "۱۴۰۴/۳/۱۷",
      "desc": "فروش کالا",
      "amount": 500000,
      "type": "income",
      "method": "cash",
      "checkNumber": "",
      "bank": "",
      "dueDate": ""
    }
  ]
}
```

| فیلد | نوع | توضیح |
|------|-----|--------|
| `balance` | `number` | موجودی فعلی |
| `transactions` | `array` | لیست تراکنش‌ها |
| `type` | `"income"` \| `"expense"` | دریافت یا پرداخت |
| `method` | `"cash"` \| `"check"` \| `"transfer"` | روش پرداخت |
| `dueDate` | `string` | تاریخ سررسید چک (ISO `YYYY-MM-DD`) |

### ۴.۲. قوانین موجودی

- تراکنش‌های **نقد** و **حواله** بلافاصله روی `balance` اثر می‌گذارند.
- تراکنش‌های **چک** در موجودی لحاظ **نمی‌شوند** (تا زمان وصول/پرداخت واقعی).

### ۴.۳. کلید `financeTheme`

| مقدار | رفتار |
|--------|--------|
| `"light"` | تم روشن |
| `"dark"` | تم تاریک |
| `"system"` | پیروی از `prefers-color-scheme` (پیش‌فرض) |

---

## ۵. ماژول‌ها

### ۵.۱. `storage.js`

| تابع | ورودی | خروجی |
|------|--------|--------|
| `loadDB()` | — | شیء دیتابیس |
| `saveDB(db)` | شیء | — |

در اولین بار، اگر داده‌ای نباشد، `{ balance: 0, transactions: [] }` ساخته و ذخیره می‌شود.

### ۵.۲. `transactions.js`

| تابع | توضیح |
|------|--------|
| `addTransaction(data)` | افزودن تراکنش و به‌روزرسانی موجودی |
| `getTransactions()` | برگرداندن آرایه تراکنش‌ها |
| `getBalance()` | برگرداندن موجودی |

### ۵.۳. `ui.js`

| تابع | توضیح |
|------|--------|
| `formatMoney(n)` | فرمت عدد با `toLocaleString("fa-IR")` |
| `renderTable(filter)` | رندر جدول (دسکتاپ) + کارت (موبایل) |
| `renderBalance(income, expense)` | به‌روزرسانی هدر و آمار |

### ۵.۴. `reports.js`

`calculateTotals()` — جمع مبالغ دریافت و پرداخت از روی تمام تراکنش‌ها (مستقل از method).

### ۵.۵. `checks.js`

`getUpcomingChecks()` — چک‌هایی که `dueDate` آن‌ها بین **امروز** و **۵ روز آینده** است.

### ۵.۶. `calculator.js`

ماشین‌حساب با **Shunting Yard Algorithm** — بدون `eval()`.

| قابلیت | جزئیات |
|--------|--------|
| عملگرها | `+ − × ÷ % ( )` |
| توابع | AC، Backspace، ± |
| تاریخچه | ۲۰ محاسبه آخر در حافظه RAM |
| کیبورد | Enter، Escape، Backspace، اعداد |
| ادغام | دوبار کلیک روی نتیجه → پر کردن فیلد مبلغ |

### ۵.۷. `theme.js`

| تابع | توضیح |
|------|--------|
| `initTheme()` | بارگذاری اولیه + event listeners |
| `setThemePreference(pref)` | ذخیره و اعمال تم |
| `onThemeChange(fn)` | callback هنگام تغییر تم (برای re-render نمودار) |

**جلوگیری از Flash:** اسکریپت inline در `<head>` قبل از CSS، تم را از `localStorage` می‌خواند.

---

## ۶. رابط کاربری

### ۶.۱. ناوبری

پنج پنل با `data-panel`:

| پنل | ID | محتوا |
|-----|-----|--------|
| داشبورد | `panel-dashboard` | نمودار، یادآوری چک |
| تراکنش‌ها | `panel-transactions` | جستجو، لیست |
| ثبت | `panel-add` | فرم تراکنش |
| ماشین‌حساب | `panel-calculator` | ماشین‌حساب |
| تنظیمات | `panel-settings` | تم، backup، درباره |

### ۶.۲. Breakpoint‌ها

| عرض | رفتار |
|-----|--------|
| `< 640px` | کارت تراکنش، فرم تک‌ستونه |
| `≥ 641px` | جدول، nav با عرض محدود |
| `≥ 900px` | max-width: 960px |

### ۶.۳. Design Tokens (CSS Variables)

متغیرهای اصلی در `:root` و override در `[data-theme="dark"]`:

`--bg`, `--surface`, `--text`, `--primary`, `--income`, `--expense`, `--border`, ...

---

## ۷. وابستگی‌های خارجی

### Chart.js

```html
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
```

- نوع: Doughnut chart
- re-render هنگام تغییر تم (رنگ legend)

### Vazirmatn

```html
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700&display=swap">
```

---

## ۸. استقرار (GitHub Pages)

### Workflow

فایل `.github/workflows/deploy-pages.yml`:

1. Trigger: push به `main` / `master` یا manual
2. `actions/upload-pages-artifact` — کل repo به‌عنوان artifact
3. `actions/deploy-pages` — deploy

### پیش‌نیاز GitHub

Settings → Pages → Source: **GitHub Actions**

### محدودیت‌ها

- مسیرها **نسبی** هستند — سازگار با project pages
- ES Modules نیاز به HTTP(S) دارند — `file://` ممکن است کار نکند
- `localStorage` per-origin — داده بین دستگاه‌ها sync نمی‌شود

---

## ۹. امنیت

| موضوع | وضعیت |
|--------|--------|
| XSS در رندر | `escapeHtml()` در `ui.js` |
| ماشین‌حساب | بدون `eval()` — parser اختصاصی |
| داده حساس | فقط localStorage مرورگر — بدون رمزنگاری |
| CDN | وابستگی به jsdelivr و Google Fonts |

> برای داده مالی حساس، backup رمزنگاری‌شده یا backend توصیه می‌شود.

---

## ۱۰. توسعه محلی

```bash
npx serve .
python -m http.server 8080
```

---

## ۱۱. عیب‌یابی

| مشکل | علت احتمالی | راه‌حل |
|------|-------------|--------|
| صفحه سفید | ES Module روی `file://` | از HTTP server استفاده کنید |
| داده پاک شد | پاک کردن cache/cookies | Import از backup JSON |
| نمودار نمایش نداده | تراکنشی ثبت نشده | حالت empty state عادی است |
| تم چشمک می‌زند | cache قدیمی | Hard refresh (Ctrl+Shift+R) |
| فونت لود نمی‌شود | فیلتر اینترنت | فونت system-ui fallback دارد |

---

## ۱۲. API داخلی (مرجع سریع)

```javascript
loadDB() → { balance, transactions }
saveDB(db) → void
addTransaction({ date, desc, amount, type, method, checkNumber, bank, dueDate })
getTransactions() → Transaction[]
getBalance() → number
calculateTotals() → { income, expense }
getUpcomingChecks() → Transaction[]
initTheme()
setThemePreference("light" | "dark" | "system")
onThemeChange((effective) => void)
```

---

## ۱۳. Changelog

| نسخه | تغییرات |
|------|---------|
| 1.0 | UI/UX موبایل، ماشین‌حساب پیشرفته، dark mode، مستندات |
