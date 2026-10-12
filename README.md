<img src="assets/banner1.svg" alt="sobhan" width="100%">

<div align="center">

# ☕ IGU Café

### Skip the line. Order from your phone. Grab your coffee.

![Status](https://img.shields.io/badge/status-in%20development-orange?style=for-the-badge)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![i18next](https://img.shields.io/badge/i18next-26A69A?style=for-the-badge&logo=i18next&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)

**🇹🇷 Türkçe · 🇬🇧 English · 🇸🇦 العربية · ☀️ Light · 🌙 Dark**

### 🔗 [Try the live demo](https://igu-menu-iqcg.vercel.app)

</div>

---

## 💡 Why I built this

Between classes at Istanbul Gelişim University, the café line gets *long*. Everyone wants coffee at the same time, and half the break disappears waiting.

So I decided to build a fix: students order from their phones, pick a pickup time, and the café gets the order instantly. Nobody has to stand in line. My goal is to see it running in our real café, and if not, it's still the most complete project I've built so far. 🚀

---

## 🎨 Design

I designed the look myself before writing the code: **bold and playful, in the university's blue**.

- 💙 University blue with a sunny yellow accent
- 🧩 Thick outlines, "sticker" shadows, and tilted labels for a fun, hand-made feel
- 🔤 **Bricolage Grotesque** for headings, **Figtree** for text, **Noto Sans Arabic** for Arabic
- 🌙 Light and dark themes built on semantic color tokens, so every screen switches at once
- 🌀 The theme switch paints the new colors in a growing circle from the button
- ♿ Respects "reduce motion", large touch targets, and screen reader labels

---

## ✨ Features

### 🎓 For students
- 🔐 Sign in with a one-time email code, no passwords to remember
- 🎓 Only university emails can place orders
- 📋 Browse the menu by category, with allergen and diet tags (🌾 gluten, 🥛 milk, 🌱 vegan…)
- ☕ Customize drinks: size, milk type, extra shot, with live price updates
- ⏰ Pick a pickup time, and see which slots are almost full
- 📝 Add a note to your order
- 📡 Watch your order status live: **received → being prepared → ready**
- 🎫 A big "order ready" ticket with your number, pickup time, and progress steps
- 📳 Your phone vibrates when your order is ready
- 🌍 Turkish, English, or Arabic, with a full right-to-left layout
- 🌙 Light and dark mode that follows your phone, or your own choice

### 👨‍🍳 For staff
- 🔢 One shared café computer: tap your name, type your PIN, and you're in
- 🔁 "Switch person" at shift change; the screen locks itself after 30 idle minutes
- ⚡ Live dashboard, orders sorted by pickup time
- 🔄 One tap to move orders: preparing → ready → picked up
- 💵 Mark orders as paid at the counter
- 🧾 Print 80mm thermal receipts in Turkish, with options and pickup time
- 🚫 Mark items sold out in one tap
- ⏸️ Pause online orders when the kitchen is overwhelmed, students see it instantly
- 🌍 Staff screens in all three languages

### 📊 For the café manager
- 🍰 Add menu items in Turkish, English, and Arabic
- 🪄 One-click translate: type the Turkish name, get English and Arabic filled in
- ✏️ Edit prices and categories
- 🛠️ Build option groups (size, milk, extras) with extra prices, and turn them on per item
- 🥜 Tag allergens and vegan / vegetarian items
- 🗄️ Archive old items without losing order history
- ⚙️ Set opening hours, slot length, orders per slot, and preparation time
- 📈 Sales reports by date and hour: income, orders, average order, cancellations
- 🏆 Best-selling items and busiest hours
- 📥 Export reports to an Excel dashboard:
  - 🗂️ one sheet per language (Türkçe, English, العربية with right-to-left)
  - 🔢 big number cards: income, orders, average order, cancelled
  - 📊 4 charts: orders by hour, income by hour, best sellers, income by item
  - 📋 hourly and item tables with each one's share of income
  - 🖨️ prints cleanly: dashboard on page 1, tables on page 2
- 🖨️ Print reports straight from the browser
- 👥 Add staff, set or reset PINs, and turn people off without losing their history
- 🕵️ Activity log by day, shift, and person: who started, finished, cancelled, or took payment for each order
- 🌍 Manager screens in all three languages

---

## 🔒 Security

I treated security as a core feature, not an afterthought:

- 🛡️ **Row Level Security** on every table: students only ever see their own orders
- 👥 **Role-based access:** student, staff, and manager each see only what their job needs
- 💰 **Server-side pricing:** totals and option prices are calculated in the database, so nobody can fake a price
- 🚪 **One door for orders:** a validated database function is the only way to create one
- ✅ **Option rules in the database:** no two sizes, no missing required choices, no oat milk on a croissant
- 🎓 **University email check** inside the order function, so it can't be bypassed
- 🚫 **Spam protection:** max 2 active orders per student, plus item and note limits
- 🏁 **Race condition protection:** per-student locks stop duplicate orders, per-slot locks stop overbooking
- 📜 **Business rules in the database:** no pickup without payment, paid orders can't be cancelled
- 🕵️ **Full order history:** every change is logged with who, when, and which shift
- 🔢 **Hashed staff PINs:** stored with bcrypt, easy PINs like 1234 refused, 5 wrong tries lock that person for 5 minutes
- ⏱️ **Staff sessions expire** after 30 idle minutes or 12 hours, and are checked on the server for every action
- 🧊 **Frozen prices:** each order saves its prices and options, so menu changes never rewrite history
- 🗃️ **Nothing is deleted:** menu items are archived, so old orders and reports stay correct

---

## 🛠️ Tech stack

| | Technology |
|---|---|
| ⚛️ Frontend | React + Vite |
| 🎨 Styling | Tailwind CSS v4 with design tokens |
| 🗄️ Database | PostgreSQL (Supabase) |
| 🔑 Auth | Supabase Auth with email codes |
| 📡 Live updates | Supabase Realtime |
| 🌍 Languages | i18next + react-i18next, RTL support |
| 🌙 Themes | CSS variables + View Transitions API |
| 🖨️ Printing | Browser print, 80mm receipt sized in JS |
| 📥 Excel export | JSZip fills a template built with Python (openpyxl) |
| 🚀 Hosting | Vercel, auto-deploy on every push |

---

## 📁 Project structure

<details>
<summary>Click to expand</summary>

```
src/
├── components/
│   ├── Hero.jsx               💙 Blue header with greeting
│   ├── PickupBanner.jsx       ⏰ Next free pickup time
│   ├── Login.jsx              🔐 Email code sign-in
│   ├── Menu.jsx               📋 Menu with categories and allergens
│   ├── OptionPicker.jsx       ☕ Size, milk, and extras picker
│   ├── Cart.jsx               🛒 Cart, pickup time, and ordering
│   ├── MyOrders.jsx           📡 Live order status
│   ├── LanguageSwitcher.jsx   🌍 Language dropdown
│   ├── ThemeToggle.jsx        🌙 Animated light / dark switch
│   ├── icons.jsx              ✏️ Hand-drawn SVG icons
│   ├── StaffDashboard.jsx     👨‍🍳 Staff order screen
│   ├── OrderingToggle.jsx     ⏸️ Pause and resume orders
│   ├── Receipt.jsx            🧾 Printable receipt
│   ├── AvailabilityPanel.jsx  🚫 Staff sold-out toggles
│   ├── ManagerMenu.jsx        🍰 Manager menu editor
│   ├── ManagerOptions.jsx     🛠️ Option groups and choices
│   ├── ManagerStaff.jsx       👥 Staff, PINs, and activity log
│   ├── PinLock.jsx            🔢 "Who's working?" PIN screen
│   ├── NameFields.jsx         🌍 3-language name inputs + translate
│   ├── SalesReport.jsx        📊 Sales reports
│   └── CafeSettings.jsx       ⚙️ Hours and slot settings
├── locales/
│   ├── tr.json                🇹🇷 Turkish
│   ├── en.json                🇬🇧 English
│   └── ar.json                🇸🇦 Arabic
├── lib/
│   ├── supabase.js            🔌 Supabase client
│   ├── format.js              💰 Price and time formatting
│   ├── localize.js            🌍 Picks the right language from the database
│   ├── print.js               🖨️ Prints the receipt at its exact 80mm size
│   ├── exportExcel.js         📥 Fills the Excel template with report data
│   ├── translate.js           🪄 Machine translation for names
│   ├── staffSession.js        🔢 PIN session for staff actions
│   └── errors.js              ⚠️ Translates database errors
├── i18n.js                    🌍 Language setup and RTL
├── theme.js                   🌙 Theme logic
└── index.css                  🎨 Design tokens and themes

database/
├── 01_menu.sql                Menu tables + sample data
├── 02_orders.sql              Orders + place_order function
├── 03_staff.sql               Roles, staff access, realtime
├── 04_order_events.sql        Order history with shifts
├── 05_payments.sql            Payment and pickup rules
├── 06_menu_management.sql     Manager editing, archiving, sold out
├── 07_sales_report.sql        Sales report function
├── 08_university_email.sql    University-email-only ordering
├── 09_item_options.sql        Options, allergens, option pricing
├── 10_pickup_slots.sql        Pickup slots, capacity, pause orders
├── 11_hardening.sql          Locks down helper functions, adds indexes
└── 12_staff_pins.sql         Staff PINs, sessions, activity log

public/
└── sales-report-template.xlsx 📊 Empty Excel dashboard the app fills in

tools/
└── make-excel-template.py   🐍 Builds the Excel template

assets/
└── banner1.svg                🎨 README banner
```

</details>

---

## 🚀 Getting started

**1. Clone and install**
```bash
npm install
```

**2. Set up Supabase**
- Create a project at [supabase.com](https://supabase.com)
- Run the files in `database/` **in order** (01 → 12) in the SQL Editor
- Connect an SMTP provider and add `{{ .Token }}` to the **Magic Link** and **Confirm signup** email templates

**3. Allow your university's email domain**
```sql
insert into allowed_email_domains (domain) values ('your-university-domain');
```

**4. Add your environment variables**

Copy `.env.example` to `.env`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```
> ⚠️ Use the **publishable** key only. The secret key never goes in the frontend, and `.env` never goes on GitHub.

<details>
<summary>📊 Changing the Excel report design (optional)</summary>

The template is made by a Python script. Edit it, then rebuild:
```bash
pip install openpyxl
python tools/make-excel-template.py public/sales-report-template.xlsx
```
> If you move rows or bump `TEMPLATE_VERSION`, update the same values in `src/lib/exportExcel.js`.

</details>

**5. Run it**
```bash
npm run dev
```

**6. Assign roles**

Sign in once with the person's email, then run:
```sql
insert into user_roles (user_id, role)
select id, 'staff' from auth.users where email = 'staff@example.com';
```
Use `'manager'` instead of `'staff'` for the café manager.

> 💡 Give `'staff'` to **one shared café account** (the counter computer), not to each person. People are added in the manager's **Staff** tab and unlock the terminal with their own PIN.

---

## 🗺️ Roadmap

### ✅ Done
- [x] Email code login
- [x] Menu, cart, and ordering
- [x] Live staff dashboard
- [x] Live order status for students
- [x] Payments and receipt printing
- [x] Order history with shifts
- [x] Manager menu editor: add items, edit prices, archive
- [x] Staff sold-out toggle
- [x] 📊 Sales reports by date and hour
- [x] 📥 Excel dashboard export with charts, in 3 languages
- [x] 🪄 Auto-translate menu names to English and Arabic
- [x] 🛠️ Manager screen for item options, allergens, and diet tags
- [x] 🔢 Staff PINs on a shared terminal, with an activity log by person and shift
- [x] 🎓 University-email-only ordering
- [x] ☕ Item options (size, milk, extra shot) and allergen tags
- [x] ⏰ Pickup time slots and "pause orders" for rush hours
- [x] ⚙️ Café settings for the manager
- [x] 🌍 Turkish / English / Arabic with right-to-left support
- [x] 🌙 Dark and light themes with an animated switch
- [x] 🎨 New bold & playful design for students and staff
- [x] 🚀 Live on Vercel
- [x] 🌍 Manager screens in all three languages
- [x] 🎫 "Order ready" ticket with a live progress tracker

### 🚧 In progress
- [ ] 🐞 Bug report form and developer dashboard

### 📌 Planned
- [ ] 📜 Terms of use and KVKK privacy notice
- [ ] 📱 Installable app with "order ready" notifications

### 🔮 Future ideas
- [ ] 💳 Online payment (iyzico / PayTR)
- [ ] ⭐ Loyalty stamps and reorder favorites
- [ ] 📺 Kitchen display screen
- [ ] 🇮🇷 Persian language

---

## 👨‍💻 About me

Hi, I'm **Sobhan Mirgholami**, a Computer Engineering student at **Istanbul Gelişim University**. I love programming, design, and solving real problems I see around me. This project started with a long coffee line. ☕

<!-- Add your links here when ready -->
<!-- [LinkedIn](https://linkedin.com/in/your-profile) · [GitHub](https://github.com/your-username) -->

---

<div align="center">

Made with ☕ and late nights in Istanbul

⭐ If you like this project, give it a star!

</div>
