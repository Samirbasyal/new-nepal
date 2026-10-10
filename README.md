# Janakalyan Samataa Yuwa Club — Official Website

A complete, production-ready website for a community / NGO organization, with a
public website, a member panel and a protected admin panel.

> **New to coding?** Read **[PROJECT_GUIDE.md](PROJECT_GUIDE.md)** instead of this file.
> It explains everything in simple language, step by step.

---

## What is included

| Area | What it does |
|---|---|
| **Public website** | Home, About, Programs, Projects, Our Works, Impact, Beneficiaries, Women Empowered, Events, News & Notices, Gallery, Members, Donors, Join Community, Donate, Contact |
| **Member panel** | `/member/login`, `/member/dashboard`, `/member/profile`, `/member/tasks` |
| **Admin panel** | `/admin/login`, `/admin/dashboard` and 14 management screens |
| **Database** | PostgreSQL (production) or SQLite (local practice) via Prisma |
| **Authentication** | bcrypt password hashing + signed, HTTP-only session cookies |
| **Authorization** | Three levels: PUBLIC → MEMBER → ADMIN, checked on the server |

---

## Technology

- **Next.js 15** (App Router) — server-rendered React, one framework for pages and APIs
- **TypeScript** — catches mistakes before the website runs
- **Tailwind CSS 3** — styling with colours managed in one file
- **Prisma 6 + PostgreSQL** — the database and its structure
- **bcryptjs** — password hashing
- **jose** — signing and verifying login sessions
- **Zod** — validating every form on the server

Everything above is free, open-source and works on Vercel.

---

## Quick start (5 minutes, with a local file database)

```bash
# 1. Install the libraries
npm install

# 2. Switch to a simple local database (no account needed)
npm run db:use:sqlite
#    then open the .env file and set:  DATABASE_URL="file:./dev.db"

# 3. Create the tables
npm run db:push

# 4. Create your administrator account
#    (set ADMIN_EMAIL and ADMIN_PASSWORD in .env first)
npm run admin:create

# 5. Start the website
npm run dev
```

Then open:

- Website → <http://localhost:3000>
- Member panel → <http://localhost:3000/member/login>
- Admin panel → <http://localhost:3000/admin/login>

> A local file database **cannot** be used on Vercel. Before you deploy, run
> `npm run db:use:postgres` and set a real PostgreSQL address.

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the website on your computer |
| `npm run build` | Build the production version |
| `npm start` | Run the built version |
| `npm run typecheck` | Check the TypeScript code for mistakes |
| `npm run lint` | Check the code style |
| `npm run db:push` | Create/update the database tables |
| `npm run db:studio` | Open a visual database browser |
| `npm run db:seed` | Create the admin account + beneficiary groups |
| `npm run db:seed:demo` | Add clearly marked `[SAMPLE]` content to review the design |
| `npm run db:seed:demo -- --clean` | Remove all sample content again |
| `npm run admin:create` | Create or update the first administrator account |
| `npm run admin:reset` | Locked out? List all accounts and repair the administrator |
| `npm run db:use:sqlite` | Switch to a local file database |
| `npm run db:use:postgres` | Switch back to PostgreSQL |

---

## Project structure

```
janakalyan-samataa-yuwa-club/
├── app/                    All pages and API routes
│   ├── (site)/             Public website  (brackets = no /site in the address)
│   ├── admin/              Admin panel  → /admin/...
│   ├── member/             Member panel → /member/...
│   └── api/                Backend endpoints
├── components/             Reusable building blocks
│   ├── admin/              Admin panel pieces
│   ├── forms/              All forms
│   ├── layout/             Navbar, footer, logo
│   ├── member/             Member panel pieces
│   ├── public/             Cards, gallery, hero
│   └── ui/                 Buttons, badges, icons, alerts
├── config/                 ← theme.ts (colours) and site.ts (name, logo, menu)
├── hooks/                  Small shared React helpers
├── lib/                    Database, authentication, validation, helpers
├── prisma/                 Database structure + seed scripts
├── public/                 Logo, favicon, placeholder images
├── scripts/                Command line helper scripts
├── .env.example            Template for your secret settings
├── PROJECT_GUIDE.md        ← Read this first (written for beginners)
└── README.md               This file
```

---

## Security summary

- Passwords are hashed with bcrypt (12 rounds) and never stored as text.
- Sessions are signed JWTs in `httpOnly`, `sameSite=lax` cookies.
- The admin area is protected **three times** on the server: `middleware.ts`,
  `requireAdmin()` on every page, and `requireAdminApi()` on every API route.
  A normal member calling an admin API receives **403 Forbidden**.
- Every form is validated on the server with Zod.
- Login attempts are rate-limited, and cross-site requests are blocked.
- No secrets are stored in the code — everything sensitive lives in `.env`.

---

## Licence and content

The code is yours to use and change. **No third-party text, images or logos were
copied into this project.** The logo and the placeholder images are simple
original shapes created for this project and are meant to be replaced.

All organization information is a placeholder such as `[Add official contact
number]`. Nothing has been invented — no statistics, achievements, registrations
or partnerships. Fill in the real information from the Admin Panel.
