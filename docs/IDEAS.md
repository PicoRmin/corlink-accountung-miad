# پیشنهادات و ایده‌های توسعه

> **وضعیت:** تمام فازهای roadmap اصلی پیاده‌سازی شده‌اند (v2.0).  
> موارد زیر برای نسخه‌های بعدی پیشنهاد می‌شوند.

---

## ✅ پیاده‌سازی شده

### فاز ۱
- [x] حذف و ویرایش تراکنش + Undo
- [x] تاریخ شمسی (جلالی)
- [x] Export CSV / JSON / چاپ

### فاز ۲
- [x] PWA (manifest + service worker)
- [x] دسته‌بندی + نمودار میله‌ای
- [x] داشبورد KPI + نمودار خطی + مقایسه ماهانه

### فاز ۳
- [x] مدیریت چک (pending / cleared / bounced)
- [x] چند حساب + انتقال
- [x] بودجه‌بندی

### فاز ۴
- [x] Sync ابری (JSONBin.io + کد clipboard)
- [x] OCR فاکتور (Tesseract.js)

### سایر
- [x] i18n (fa/en)
- [x] تم رنگی (blue/green/purple)
- [x] میانبرهای کیبورد
- [x] Onboarding
- [x] پشتیبان رمزنگاری‌شده
- [x] Pull-to-refresh
- [x] اعلان چک (Notification API)
- [x] Schema migration v1→v2

---

## 🔮 ایده‌های آینده

### اولویت بالا
1. **Date picker شمسی بصری** — تقویم popup به‌جای input متنی
2. **Swipe-to-delete** در موبایل
3. **Bundle Chart.js محلی** — حذف کامل وابستگی CDN

### اولویت متوسط
4. **IndexedDB** — برای داده‌های بزرگ‌تر از 5MB
5. **Vitest** — unit test برای calculator و transactions
6. **TypeScript migration**
7. **Push notification از Service Worker** — حتی وقتی تب بسته است

### اولویت پایین
8. **Firebase Auth** — sync واقعی چندکاربره
9. **OCR پیشرفته** — تشخیص خودکار دسته و تاریخ
10. **تم‌های سفارشی** — color picker
11. **Export Excel (.xlsx)**
12. **چند ارز** — ریال/تومان/دلار

---

## بهبودهای UX پیشنهادی

- Skeleton loading برای لیست بلند
- SVG illustration برای empty states
- Haptic feedback (Vibration API)
- ARIA keyboard nav کامل بین پنل‌ها

---

## یادداشت فنی

پروژه همچنان **بدون build step** است تا deploy روی GitHub Pages ساده بماند.  
برای TypeScript یا bundler، workflow CI باید به‌روز شود.

---

*آخرین به‌روزرسانی: ۱۴۰۴/۰۳/۱۷ — v2.0*
