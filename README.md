# مدیریت مالی (Finance Manager)

اپلیکیشن ساده مدیریت مالی با HTML، CSS و JavaScript خالص.

## امکانات

- ثبت تراکنش (دریافت / پرداخت)
- روش‌های پرداخت: نقد، چک، حواله
- نمایش موجودی و لیست تراکنش‌ها
- جستجو در تراکنش‌ها
- یادآوری چک‌های نزدیک به سررسید
- نمودار دریافت و پرداخت
- ماشین‌حساب
- پشتیبان‌گیری و بازیابی داده (Export / Import)

داده‌ها در `localStorage` مرورگر ذخیره می‌شوند.

## اجرای محلی

فایل `index.html` را در مرورگر باز کنید، یا از یک سرور ساده استفاده کنید:

```bash
npx serve .
```

> به‌خاطر ES Modules، باز کردن مستقیم فایل (`file://`) ممکن است در بعضی مرورگرها کار نکند. استفاده از سرور محلی توصیه می‌شود.

## استقرار روی GitHub Pages

1. مخزن را در GitHub بسازید و کد را push کنید:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/corlink-accountung-miad.git
git push -u origin main
```

2. در GitHub بروید به **Settings → Pages**
3. در **Build and deployment**، Source را روی **GitHub Actions** بگذارید
4. با push به شاخه `main`، workflow به‌صورت خودکار سایت را deploy می‌کند

آدرس سایت:

```
https://USERNAME.github.io/corlink-accountung-miad/
```

## ساختار پروژه

```
├── index.html
├── css/style.css
└── js/
    ├── app.js
    ├── storage.js
    ├── transactions.js
    ├── ui.js
    ├── reports.js
    ├── checks.js
    └── calculator.js
```
