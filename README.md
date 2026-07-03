# Telegram Auto Posting Bot

Node.js (ES Modules) da yozilgan, production-ready Telegram avtomatik reklama
yuborish tizimi. Bot boshqaruv interfeysi uchun **grammY**, foydalanuvchi
Telegram akkauntidan (guruhlarni olish va reklama yuborish uchun)
**GramJS** ishlatiladi. Ma'lumotlar **better-sqlite3** da saqlanadi,
rejalashtirish **node-cron** orqali amalga oshiriladi.

## Xususiyatlar

- 🔐 Login/parol bilan kirish (admin oldindan yaratadi), sessiya doimiy saqlanadi
- 🔗 Telegram akkauntni ulash (telefon → kod → 2FA → GramJS sessiya)
- 👥 Guruh/supergruppalarni avtomatik olish va inline tugmalar orqali tanlash
- 📢 Matn / rasm / video / caption / inline URL tugmali reklama yaratish
- ⏰ Yuborish intervalini tanlash (5 yoki 10 daqiqa)
- ▶️/⛔️ Postingni boshlash va to'xtatish (guruhlar orasida 60 soniya kutish)
- 🛡 Admin panel: `/stats`, `/users`, `/logs`, `/newuser`, blok/o'chirish
- 🔒 Parollar bcrypt bilan, GramJS sessiyalari AES-256-GCM bilan shifrlangan

## Loyiha tuzilishi

```
src/
  config/env.js              .env o'qish va tekshirish
  utils/                     logger, crypto (AES-256-GCM), password (bcrypt), sleep
  db/                        SQLite ulanish va schema.sql
  repositories/              har bir jadval uchun SQL so'rovlar
  services/                  biznes-logika (auth, telegram akkaunt, guruhlar,
                              reklama, interval, posting scheduler, admin)
  runtime/state.js           runtime xotiradagi holat (GramJS clientlar,
                              cron vazifalar, login jarayonlari)
  bot/
    context.js                grammY session boshlang'ich holati
    keyboards/                reply va inline klaviaturalar
    middlewares/               authGuard, adminOnly
    handlers/                  har bir menyu bandi uchun alohida handler
    bot.js                     Bot yig'ish va middleware ro'yxatga olish
  index.js                    kirish nuqtasi
scripts/createUser.js        birinchi login/parolni yaratish uchun CLI
```

## O'rnatish

1. Bog'liqliklarni o'rnating:

   ```bash
   npm install
   ```

2. `.env.example` faylidan `.env` yarating va to'ldiring:

   ```bash
   cp .env.example .env
   ```

   | O'zgaruvchi | Qayerdan olinadi |
   |---|---|
   | `BOT_TOKEN` | [@BotFather](https://t.me/BotFather) |
   | `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` | https://my.telegram.org → API development tools |
   | `ADMIN_IDS` | O'z Telegram ID'ingiz (masalan [@userinfobot](https://t.me/userinfobot) orqali), vergul bilan bir nechtasi |
   | `ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` buyrug'i bilan generatsiya qiling (64 hex belgi) |

3. Birinchi login/parolni yarating (admin panel orqali emas, chunki bot hali
   ishga tushmagan bo'lishi mumkin):

   ```bash
   npm run create-user -- admin StrongPassword123
   ```

   Bot ishga tushgandan keyin qo'shimcha foydalanuvchilarni admin
   `/newuser <login> <parol>` buyrug'i orqali yaratishi mumkin.

   **Ephemeral disk bo'lgan platformalarda (masalan Render bepul tarifi):**
   har bir redeploy/restart'da SQLite fayli o'chib ketadi, shu bilan birga
   yuqoridagi CLI orqali yaratilgan login ham yo'qoladi. Buning o'rniga
   `.env` (yoki platforma Environment sozlamalarida) `BOOTSTRAP_USERNAME_1` /
   `BOOTSTRAP_PASSWORD_1`, `BOOTSTRAP_USERNAME_2` / `BOOTSTRAP_PASSWORD_2` va
   hokazo tarzda bir nechta admin login/parol juftligini belgilang — bot har
   safar ishga tushganda, agar shu loginlar mavjud bo'lmasa, ularni avtomatik
   qayta yaratadi. Har bir juftlik uchun alohida raqam (`_1`, `_2`, `_3`, ...)
   ishlatiladi, shuning uchun har bir admin o'zining login/parolidan
   foydalanadi.

4. Botni ishga tushiring:

   ```bash
   npm start
   ```

   Ishlab chiqish vaqtida fayllar o'zgarganda avtomatik qayta ishga tushirish
   uchun: `npm run dev`.

## Foydalanish oqimi

1. Botga `/start` yuboring → login va parolni kiriting.
2. **🔗 Telegram Account** → telefon raqam → SMS/Telegram kodi → (agar
   yoqilgan bo'lsa) 2FA parol. GramJS sessiyasi shifrlanib bazaga yoziladi.
3. **👥 Groups** → akkauntingizdagi barcha group/supergroup inline
   ro'yxatda chiqadi, kerakli guruhlarni belgilang, **✅ Done** bosing.
4. **📢 Advertisement** → matn yoki rasm/video (caption bilan) yuboring,
   so'ng ixtiyoriy inline tugma (`Matn | https://url`) yoki `Yo'q`.
5. **⏰ Interval** → 5 yoki 10 daqiqa tanlang.
6. **▶️ Start Posting** — scheduler ishga tushadi: har bir tsiklda tanlangan
   guruhlarga ketma-ket yuboriladi, guruhlar orasida 60 soniya kutiladi;
   tsikllar orasidagi vaqt tanlangan interval bilan boshqariladi.
7. **⛔️ Stop Posting** — schedulerni to'xtatadi.
8. **🚪 Logout** — botdan chiqadi (qayta kirish uchun login/parol kerak
   bo'ladi); orqa fondagi posting holati o'zgarmaydi.

## Admin buyruqlari

Faqat `.env` dagi `ADMIN_IDS` ro'yxatidagi Telegram ID'lar uchun:

- `/stats` — umumiy statistika
- `/users` — foydalanuvchilar ro'yxati, har biri uchun Block/Unblock va Delete tugmalari
- `/logs` — so'nggi 20 ta log yozuvi
- `/newuser <login> <parol>` — yangi login/parol yaratish

## Xavfsizlik

- Parollar `bcryptjs` bilan xeshlanadi (native kompilyatsiyasiz, `bcrypt`
  bilan bir xil algoritm — Windows'da o'rnatishni osonlashtiradi).
- GramJS sessiya satrlari `AES-256-GCM` bilan shifrlanib SQLite'ga yoziladi
  (`ENCRYPTION_KEY` orqali).
- Har bir foydalanuvchi alohida GramJS sessiyasi va alohida guruh/reklama
  ma'lumotlariga ega — foydalanuvchilar orasida hech qanday umumiy holat yo'q.
- **Muhim texnik cheklov:** Telegram serveri inline tugmali xabarlarni faqat
  botlardan qabul qiladi — oddiy foydalanuvchi akkaunti (GramJS) orqali
  yuborilgan xabarga URL tugma biriktirib bo'lmaydi. Shu sababli tizim avval
  native tugma bilan yuborishga harakat qiladi, server rad etsa, tugma
  matni/havolasini xabar matniga (`🔗 Matn: URL`) qo'shib yuboradi — reklama
  har doim yetkaziladi.

## Ma'lumotlar bazasi

SQLite (`better-sqlite3`), jadvallar: `users`, `sessions`, `groups`,
`campaigns`, `logs`, `admins`. To'liq sxema: [src/db/schema.sql](src/db/schema.sql).
