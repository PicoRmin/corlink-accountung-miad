# مدیریت مالی (CorLink Accounting)

اپلیکیشن کامل مدیریت مالی فارسی — PWA، موبایل‌فرست، GitHub Pages.

## امکانات

### فاز ۱
- حذف و ویرایش تراکنش (با Undo)
- تاریخ شمسی (جلالی)
- Export: JSON، CSV، چاپ PDF

### فاز ۲
- PWA (نصب روی موبایل، آفلاین)
- دسته‌بندی تراکنش‌ها + نمودار میله‌ای
- داشبورد پیشرفته (KPI، نمودار خطی موجودی، مقایسه ماهانه)

### فاز ۳
- مدیریت چک (در انتظار / وصول / برگشتی)
- چند حساب + انتقال بین حساب‌ها
- بودجه‌بندی ماهانه با progress bar

### فاز ۴ و بیشتر
- Sync ابری (JSONBin.io) + کد همگام‌سازی
- OCR فاکتور (Tesseract.js)
- i18n فارسی/انگلیسی
- تم روشن/تاریک/خودکار + رنگ آبی/سبز/بنفش
- پشتیبان رمزنگاری‌شده (AES-GCM)
- Onboarding، میانبرهای کیبورد، Pull-to-refresh
- اعلان چک (Notification API)

## مستندات

| سند | توضیح |
|-----|--------|
| [docs/TECHNICAL.md](docs/TECHNICAL.md) | معماری، API، deploy |
| [docs/IDEAS.md](docs/IDEAS.md) | وضعیت پیاده‌سازی و ایده‌های آینده |

## اجرای محلی

```bash
npx serve .
```

## استقرار GitHub Pages

1. Push به GitHub
2. **Settings → Pages → Source:** GitHub Actions
3. آدرس: `https://USERNAME.github.io/corlink-accountung-miad/`

## ساختار

```
├── index.html
├── manifest.json, sw.js
├── css/style.css
├── js/          (20+ ماژول)
├── locales/     (fa.json, en.json)
├── icons/
└── docs/
```

## Sync ابری

در تنظیمات، Bin ID و API Key از [JSONBin.io](https://jsonbin.io) را وارد کنید.

## میانبرها

| کلید | عمل |
|------|-----|
| `Ctrl+N` | ثبت تراکنش |
| `/` | جستجو |
| `1-5` | تعویض پنل |
