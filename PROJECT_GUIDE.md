# PROJECT GUIDE — Janakalyan Samataa Yuwa Club

**Written for a complete beginner.** Every step is written out, nothing is assumed.
If you only read one file, read this one.

---

## Contents

**Part 1 — Getting started**
1. What has been built
2. Setup, step by step
3. Create your first secure administrator account
4. Using VS Code
5. Quick answers: name, logo, colours, navbar

**Part 2 — Every section, and which file controls it**
6. Homepage
7. About
8. Programs
9. Projects & Our Works
10. Impact
11. Beneficiaries
12. Women Empowered
13. Events
14. News & Notices
15. Gallery
16. Members & Leadership
17. Donors & Supporters
18. Join Community
19. Donate
20. Contact
21. Footer
22. Member Panel
23. Admin Panel

**Part 3 — How it works underneath**
24. How authentication works
25. How the Admin Panel is actually protected
26. The database
27. Security rules used in this project
28. File map (the quick-look table)
29. How the code comments work
30. Responsive design, accessibility and SEO
31. The "no fake data" rule
32. Error handling
33. What the organization can change without code
34. GitHub
35. Vercel deployment
36. Environment variables on Vercel
37. Adding your real information — a checklist
38. Troubleshooting
39. Command reference
40. Member accounts, email, कार्य समिति and the monthly fund

---

# PART 1 — GETTING STARTED

## 1. What has been built

One website with three separate areas:

| Area | Address | Who can see it |
|---|---|---|
| **Public website** | `/` , `/about`, `/programs`, … | Everybody |
| **Member panel** | `/member/login` → `/member/dashboard` | Signed-in members |
| **Admin panel** | `/admin/login` → `/admin/dashboard` | Signed-in administrators only |

The public website shows the organization's real information from the database.
The admin panel is where you add that information — **you never have to edit code
to add a program, an event, a news item, a photo or a donor.**

---

## 2. Setup, step by step

### Step 0 — Install the tools

1. **Node.js** — download the "LTS" version from <https://nodejs.org> and install it.
2. **VS Code** — download from <https://code.visualstudio.com> and install it.

To check Node is installed, open a terminal (in VS Code: **Terminal → New Terminal**)
and type:

```bash
node -v
```

You should see something like `v20.12.0`. If you see an error, reinstall Node.js.

### Step 1 — Open the project

In VS Code: **File → Open Folder** → choose the `janakalyan-samataa-yuwa-club` folder.

### Step 2 — Install the libraries

In the VS Code terminal, type:

```bash
npm install
```

This downloads everything the project needs into a folder called `node_modules`.
It takes 1–5 minutes. You only do this once.

### Step 3 — Choose your database

You have two choices. **If you are just practising, choose A.**

---

#### Choice A — A local file database (fastest, no account needed)

```bash
npm run db:use:sqlite
```

Now open the file **`.env`** in VS Code and find this line:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

Change it to exactly:

```
DATABASE_URL="file:./dev.db"
```

Then create the tables:

```bash
npm run db:push
```

Done. A database file is created at `prisma/dev.db` on your computer.

> ⚠️ **A file database cannot be used on Vercel.** Before you put the website
> online, do Choice B.

---

#### Choice B — PostgreSQL (needed for the real website and for Vercel)

1. Go to <https://neon.tech> and create a free account (or use Supabase or
   Vercel Postgres — any PostgreSQL service works).
2. Create a project. Neon shows you a **Connection string**. It looks like:

   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require
   ```

3. Copy it.
4. Open the file **`.env`** in VS Code and paste it after `DATABASE_URL=`, keeping
   the quotation marks:

   ```
   DATABASE_URL="postgresql://neondb_owner:AbC123xyz@ep-.../neondb?sslmode=require"
   ```

5. Make sure the project is set to PostgreSQL:

   ```bash
   npm run db:use:postgres
   ```

6. Create the tables:

   ```bash
   npm run db:push
   ```

### Step 4 — Create your secret key

Open `.env` and find:

```
AUTH_SECRET="dev-only-secret-change-me-before-you-deploy-0123456789abcdef"
```

Replace the value with a long random string. Create one by running:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the result and paste it between the quotation marks.

> This key signs login sessions. If somebody else knows it, they could fake a
> login. Keep it secret and use a **different** one on your own computer and on
> Vercel.

### Step 5 — Create your administrator account

Still in `.env`, set your own details:

```
ADMIN_NAME="Your Name"
ADMIN_EMAIL="you@example.com"
ADMIN_PASSWORD="a-long-strong-password"
```

Then run:

```bash
npm run admin:create
```

You should see:

```
✔ Created administrator account
    Email : you@example.com
    Role  : ADMIN
```

> There is **no** `admin / admin` account in this project, on purpose. The
> password must be at least 12 characters, contain a letter and a number, and
> must not be something like `password123`.

### Step 6 — Add the first content

Optional but recommended, so you can see how the design looks with content in it:

```bash
npm run db:seed:demo
```

This adds sample programs, events, projects and news — **every headline starts
with `[SAMPLE]`** so you can see it is not real content.

Remove it again before the website goes live:

```bash
npm run db:seed:demo -- --clean
```

### Step 7 — Start the website

```bash
npm run dev
```

Wait a few seconds, then open:

| What | Address |
|---|---|
| Public website | <http://localhost:3000> |
| Member sign in | <http://localhost:3000/member/login> |
| Member registration | <http://localhost:3000/member/register> |
| **Administrator sign in** | <http://localhost:3000/admin/login> |

To stop the website, click in the terminal and press **CTRL + C**.

### Step 8 — Other useful commands

```bash
npm run build          # build the production version (checks everything works)
npm start              # run the built version
npm run typecheck      # find mistakes in the code
npm run db:studio      # open a visual database browser in the web browser
```

`npm run test` does not exist because this project has no automated test suite.
To check the website, use `npm run build` and then click through the pages while
`npm run dev` is running.

---

## 3. Create your first secure administrator account

**The proper way** (recommended):

```bash
npm run admin:create
```

It reads `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD` from your `.env` file,
checks the password is strong enough, hashes it with bcrypt, and creates an
account with the role `ADMIN`.

**The alternative way** (once the website is running):

1. Sign in to an existing admin account.
2. Open **Admin Panel → Members → Add new**.
3. Fill in the name, email and a password, and set **Role** to *Administrator*.

**After creating the first account:**

- Sign in at `/admin/login`.
- Consider deleting `ADMIN_PASSWORD` from your `.env` file — you no longer need it.
- You can change your password from **Member Panel → My profile → Change my
  password**.

---

## 4. Using VS Code

### Opening the terminal

**Terminal → New Terminal**. All the `npm run …` commands are typed there.

### Finding things quickly

Press **CTRL + P** and start typing a file name. For example type `theme` and
you will see `config/theme.ts`.

Press **CTRL + SHIFT + F** to search inside every file. For example search for
`DONOR SECTION` to jump to the donor code.

### The folders you will actually open

| I want to change… | Open this |
|---|---|
| Colours | `config/theme.ts` |
| Website name, logo, menu, contact details | `config/site.ts` |
| A specific page | the matching folder inside `app/(site)/` |
| Colours/HTML of the navbar | `components/layout/NavbarShell.tsx` |
| The footer | `components/layout/Footer.tsx` |
| A form | `components/forms/…` |

### Good to know

- After changing `config/theme.ts`, **restart** the dev server (CTRL+C, then
  `npm run dev`) — colour changes are not picked up while it is running.
- Files ending in `.tsx` contain React components. The part inside `return ( … )`
  is what you see on the page.
- Lines starting with `//` or `{/* … */}` are comments. They do nothing — they
  are there to help you. **Do not delete the comments**, they label every section.

---

## 5. Quick answers: name, logo, colours, navbar

### Change the website / organization name

**One place:** `config/site.ts`

```ts
export const organization = {
  name: 'Janakalyan Samataa Yuwa Club',   // ← change this
  shortName: 'JSYC',
  tagline: '...',
  description: '...',
};
```

You can also change it **without editing code**, from
**Admin Panel → Settings → Organization identity**. Anything saved there
overrides the file, which is how the organization manages it day to day.

### Replace the logo

1. Put your own logo file into the folder `public/branding/`
   Recommended: `logo.png`, square, 512 × 512 pixels, transparent background.
2. Open `config/site.ts` and change the logo block:

```ts
export const logo = {
  src: '/branding/logo.svg',          // ← change to '/branding/logo.png'
  srcOnDark: '/branding/logo-on-dark.svg',  // version for the dark footer
  favicon: '/branding/favicon.svg',   // the browser tab icon
  alt: 'Janakalyan Samataa Yuwa Club logo',
  width: 48,
  height: 48,
};
```

3. Save. The new logo appears everywhere: navbar, footer, login pages, member
   panel, admin panel and the browser tab.

The logo that ships with the project is a **simple placeholder shape created for
this project** — it is not any real organization's logo. Delete
`public/branding/logo.svg` and `logo-on-dark.svg` once you have your own.

**One place draws the logo:** `components/layout/Logo.tsx`
(search for `ORGANIZATION LOGO`).

### Change the colours

**One place:** `config/theme.ts`

```ts
// MAIN BRAND COLOR (deep teal-green)
export const brand = {
  50: '#EFF9F6',
  ...
  600: '#157466',   // ← MAIN COLOUR: buttons, links, highlights
  700: '#115C53',   // ← hover colour
  ...
};

// ACCENT COLOR (warm amber - used for the Donate buttons)
export const accent = {
  ...
  500: '#E4880B',   // ← main accent
};
```

Change the hex codes, save, and **restart the dev server**. The whole website
updates — public pages and both panels.

That file also controls the fonts, the corner roundness and the shadow strength.

> Under the bonnet: `config/theme.ts` is imported by `tailwind.config.ts`, which
> turns each colour into classes such as `bg-brand-600`. You never need to touch
> `tailwind.config.ts`.

### Change the navbar menu

`config/site.ts`:

```ts
export const navigation = [
  { label: 'Home',     href: '/' },
  { label: 'About',    href: '/about' },
  { label: 'Programs', href: '/programs' },
  // …
  { label: 'Contact',  href: '/contact', group: 'more' },
];
```

- **Delete a line** to remove a link.
- **Add a line** to add a link (create the matching folder in `app/(site)/` first).
- Links with `group: 'more'` are collected into the **"More" drop-down** on
  desktop so the navbar does not become too wide. On mobile all links are shown.

The buttons on the right side are in `navigationActions` just below.

**The navbar markup itself:** `components/layout/NavbarShell.tsx`
(search for `NAVBAR`). The mobile menu is in the same file.

> **There is deliberately no "Admin" link in the public menu.** Administrators
> simply visit `/admin/login`. There is one discreet "Administration" link at the
> bottom of the footer, and it only opens the login page — never the dashboard.

---

# PART 2 — EVERY SECTION AND WHICH FILE CONTROLS IT

Everything below follows the same idea:

- **Public page** → a folder inside `app/(site)/`
- **Admin screen** → a folder inside `app/admin/(panel)/`
- **Database rules** → `prisma/schema.prisma` and `lib/validation/schemas.ts`
- **Admin form fields** → the `FIELDS` list at the top of that admin page

Each file begins with a labelled comment block, for example:

```ts
// ========================================
// PROGRAMS SECTION
// This code controls Programs.
// ========================================
```

Search the project for that heading (CTRL + SHIFT + F) to jump straight to it.

---

## 6. Homepage

| What | Where |
|---|---|
| The whole home page | `app/(site)/page.tsx` |
| The big green banner at the top | `components/public/Hero.tsx` |
| The numbers block | `components/public/StatGrid.tsx` |
| Program cards | `components/public/ProgramCard.tsx` |
| Project cards | `components/public/ProjectCard.tsx` |
| Event / news / donor / member cards | `components/public/Cards.tsx` |
| Photo grid | `components/public/GalleryGrid.tsx` |
| The heading and paragraph text | **Admin Panel → Settings → Homepage content** |

The home page is assembled from eleven labelled blocks, in this order: hero,
introduction, programs preview, projects preview, impact, beneficiaries, women
empowered, upcoming events, latest news, gallery, donors, and finally the
call-to-action block.

**The heading on the home page** comes from the setting `home.heroTitle`, not
from code. Change it in **Admin Panel → Settings → Homepage content**.

---

## 7. About

| What | Where |
|---|---|
| The page | `app/(site)/about/page.tsx` |
| The layout of the text blocks | `components/public/ContentSectionView.tsx` |
| The actual text | **Admin Panel → Content sections**, group **"About page"** |

The page looks for blocks by their **slug** so it knows where to put them:

| Slug | Appears as |
|---|---|
| `who-we-are` | "Who we are" introduction |
| `vision` | Vision card |
| `mission` | Mission card |
| `objectives` | Objectives list |
| `core-values` | Core values |
| `what-we-do` | What we do |
| `our-approach` | Our approach |

Any other block you create in the "About page" group is shown further down under
"Further information", so nothing is ever lost.

The **sort order** column controls the sequence.

---

## 8. Programs

| What | Where |
|---|---|
| The list page | `app/(site)/programs/page.tsx` |
| A single program page | `app/(site)/programs/[slug]/page.tsx` |
| The program card | `components/public/ProgramCard.tsx` |
| **Admin screen** | `app/admin/(panel)/programs/page.tsx` |
| Validation rules | `lib/validation/schemas.ts` → `programSchema` |
| Database table | `prisma/schema.prisma` → `model Program` |

**To add a program:** Admin Panel → Programs → **Add new**.

Fields: title, category, short summary, full details, objectives (one per line),
results, who it is for, location, start/end date, status, linked project, picture,
published (on/off), featured (on/off), sort order.

**Publish / unpublish:** click the green **Published / Hidden** switch in the
table. Only published programs appear on the website.

**Search & filter:** the search box at the top and the status drop-down.

**Category filter on the public page** is built automatically from the categories
you have used, so you never have to maintain a list.

---

## 9. Projects & Our Works

**One admin screen controls both public pages.**

| What | Where |
|---|---|
| Projects list | `app/(site)/projects/page.tsx` |
| Our Works list | `app/(site)/our-works/page.tsx` |
| The shared list layout | `components/public/ProjectListing.tsx` |
| A single entry page | `app/(site)/projects/[slug]/page.tsx` and `app/(site)/our-works/[slug]/page.tsx` |
| The shared detail layout | `components/public/ProjectDetail.tsx` |
| **Admin screen** | `app/admin/(panel)/projects/page.tsx` |
| Validation rules | `lib/validation/schemas.ts` → `projectSchema` |

**How the two pages are separated:** the **Type** field.

- Type = **Project** → the entry appears on `/projects`
- Type = **Our Work** → the entry appears on `/our-works`

Both are stored in the same database table (`model Project`), which halves the
amount of code to maintain.

Fields: title, type, category, summary, full details, objectives, activities,
results, impact, who benefited, location, start/end date, status, picture,
published, featured, sort order.

> **"Who benefited" is free text on purpose.** Write a description in your own
> words. If you have a verified number, put it in
> **Admin Panel → Settings → Impact numbers** instead — that is the only place a
> statistic is ever displayed.

---

## 10. Impact

| What | Where |
|---|---|
| The page | `app/(site)/impact/page.tsx` |
| The number blocks | `components/public/StatGrid.tsx` |
| The numbers themselves | **Admin Panel → Settings → Impact numbers** |
| Longer impact text | **Admin Panel → Content sections**, group "Impact" |

**How the numbers work:** there are four slots (`impact.value1` … `impact.value4`)
plus a label for each. They are **empty when the project is installed**.

- Empty slot → **nothing is shown at all**. No zero, no placeholder figure.
- Filled slot → the number appears in a card.

The page also shows a **live count of published content** (how many programs,
projects, events, news items and photos exist). Those are facts about this
website, not impact claims, so they are safe to display.

---

## 11. Beneficiaries

| What | Where |
|---|---|
| The page | `app/(site)/beneficiaries/page.tsx` |
| The card design | `components/public/Cards.tsx` → `BeneficiaryCard` |
| **Admin screen** | `app/admin/(panel)/beneficiaries/page.tsx` |

Groups are **fully configurable** — nothing is hard-coded. The seed script
creates six common ones (Youth, Women, Children, Families, Local communities,
Vulnerable groups) **with no numbers attached**.

- **Icons:** pick one from the dropdown; the available names are in
  `components/ui/Icon.tsx`.
- **Numbers:** the field *Number supported* is optional.
  **Leave it empty and no number is shown.** Fill it in only with a figure the
  organization can verify, and use *What the number counts* to explain it
  (for example "families supported").

---

## 12. Women Empowered

| What | Where |
|---|---|
| The page | `app/(site)/women-empowered/page.tsx` |
| The text | **Admin Panel → Content sections**, group "Women Empowered" |

Two slugs matter here:

- `women-empowered` → the introduction at the top of the page
- `story` → a success story, shown in the Stories block

**Programs for women** are found automatically: the page looks for programs whose
title or category contains the word "women", so you do not have to tick a
special box.

**Stories:** the Stories block appears **only** when you have added a real one.
While it is empty the page shows an honest note instead of an invented story.

**Photos** come from **Admin Panel → Gallery** — the page shows the latest eight.

---

## 13. Events

| What | Where |
|---|---|
| The list page | `app/(site)/events/page.tsx` |
| A single event page | `app/(site)/events/[slug]/page.tsx` |
| The event card | `components/public/Cards.tsx` → `EventCard` |
| **Admin screen** | `app/admin/(panel)/events/page.tsx` |
| Validation rules | `lib/validation/schemas.ts` → `eventSchema` |

**Public filters:** `/events` (all), `/events?when=upcoming` (future events),
`/events?when=past` (already happened). Upcoming events also appear on the
homepage.

**Date badge:** the day/month/year square on the card is generated automatically
from the event's start date.

**Registration information** is free text — for example a phone number, or a
sentence telling people where to sign up. It is shown in the sidebar. This
project does not run an online event-registration system; you say how people
should take part.

**Status:** if an event's start date is in the past, the website shows it as
"Completed" automatically even if the status still says "Upcoming".

---

## 14. News & Notices

| What | Where |
|---|---|
| The list page | `app/(site)/news/page.tsx` |
| A single article | `app/(site)/news/[slug]/page.tsx` |
| The article card | `components/public/Cards.tsx` → `NewsCard` |
| **Admin screen** | `app/admin/(panel)/news/page.tsx` |
| Validation rules | `lib/validation/schemas.ts` → `newsSchema` |

**Types:** News, Notice, Press release, Story. The Type field is also the filter
on the public page (`/news?type=NOTICE`), and notices are what members see in the
Member Panel.

**How to format the article** — plain text, no HTML needed:

| You type | You get |
|---|---|
| A blank line between text | A new paragraph |
| `# A heading` | A small heading |
| `- an item` | A bullet point |
| `**important**` | **bold** text |

**Featured picture:** paste a link, or upload a file while working locally.
**Article date:** `publishedAt`. Leave it empty and the article is dated today.

---

## 15. Gallery

| What | Where |
|---|---|
| The page | `app/(site)/gallery/page.tsx` |
| The photo grid + click-to-enlarge viewer | `components/public/GalleryGrid.tsx` |
| The album card | `components/public/Cards.tsx` → `AlbumCard` |
| **Admin screens** | `app/admin/(panel)/gallery/page.tsx` (two tabs: Albums, Photos) |

**Albums** group photos. **Photos** are the individual pictures. A photo can be
linked to an album, a program, a project or an event — and then it also appears on
that page.

**The viewer:** click any photo to open it larger. Arrow keys move between photos,
`Esc` closes it, and the buttons on the phone screen do the same.

**Captions** come from the caption field on each photo.

> **Only publish photographs you own or have permission to use.** Do not copy
> images from other websites or search engines. The gallery page says this on the
> public site too.

---

## 16. Members & Leadership

| What | Where |
|---|---|
| The page | `app/(site)/members/page.tsx` |
| The person card | `components/public/Cards.tsx` → `MemberCard` |
| **Admin screen** | `app/admin/(panel)/members/page.tsx` |
| The database query (what is public) | `lib/data/public.ts` → `getPublicMembers()` |

**Privacy is the important part of this page.** A member appears publicly
**only** when an administrator switches on *Show on the public Members page*.
Even then, only these fields are read from the database:

`name`, `photoUrl`, `designation`, `department`, `bio`, `joinedAt`

These are **never selected** for the public page, so they cannot leak:
email address, phone number, password hash, membership number, address, internal
status, login history.

**Leadership vs members:** anyone with a *Designation* (Chairperson, Secretary,
Volunteer…) is shown in the "Leadership" section at the top. The rest are listed
below as "Our members".

---

## 17. Donors & Supporters

| What | Where |
|---|---|
| The page | `app/(site)/donors/page.tsx` |
| The donor card | `components/public/Cards.tsx` → `DonorCard` |
| **Admin screen** | `app/admin/(panel)/donors/page.tsx` |
| Private donation records | `app/admin/(panel)/donations/page.tsx` |

**A donor is private by default.** Nothing appears publicly until you switch on
*Show publicly*. Only publish what the supporter has actually agreed to share.

Public fields: name, organization, logo, short description, area supported,
website link.

**Never public:** amounts, payment references, bank details, contact details,
internal notes. In fact, amounts are not even stored in this table — they live in
a separate, private table (`model Donation`) that only administrators can open.

The page groups supporters by their *Area they support*, so it reads like a
professional supporters wall.

---

## 18. Join Community

| What | Where |
|---|---|
| The page | `app/(site)/join/page.tsx` |
| The form | `components/forms/JoinForm.tsx` |
| Where it is saved | `app/api/join/route.ts` |
| Validation rules | `lib/validation/schemas.ts` → `joinApplicationSchema` |
| **Admin screen (private)** | `app/admin/(panel)/applications/page.tsx` |

Fields: full name, phone, email, address, area of interest, message, and an
optional extra box.

**What happens after sending:** the application is saved in the
`join_applications` table and shown **only** inside the Admin Panel, where it can
be searched, filtered by status (New / Reviewing / Approved / Rejected), given an
internal note, or deleted. It is never shown on the public website.

**Spam protection:** there is a hidden "honeypot" box. Real people never see it,
so anything typed into it means a robot — the submission is silently accepted but
not saved. Repeated submissions from the same address are also slowed down.

**The area-of-interest list** lives in `lib/constants.ts` →
`AREA_OF_INTEREST_OPTIONS`. Edit that list to change the dropdown.

---

## 19. Donate

| What | Where |
|---|---|
| The page | `app/(site)/donate/page.tsx` |
| The bank/QR details | **Admin Panel → Settings → Donation information** |

**This page does not take payments, and that is deliberate.** It shows the ways
the organization really accepts contributions:

- bank transfer details
- a QR code picture
- any other methods you list

Every field is editable from the Admin Panel. **If a field is empty it is simply
not shown** — so the page never displays half a bank account number.

The page does show a short notice explaining that the website never asks for card
or wallet details. Keep that notice: it protects your supporters from scammers
who pretend to collect money for the organization.

> If you later get a real online payment gateway, use the provider's own secure
> checkout. Never type card details into this project, and never store a payment
> secret in the code — only in `.env`.

---

## 20. Contact

| What | Where |
|---|---|
| The page | `app/(site)/contact/page.tsx` |
| The form | `components/forms/ContactForm.tsx` |
| Where it is saved | `app/api/contact/route.ts` |
| Address, phone, email, hours, map | **Admin Panel → Settings → Contact information** |
| Social links | **Admin Panel → Settings → Social media links** |
| **Admin screen (private)** | `app/admin/(panel)/messages/page.tsx` |

**Placeholders:** until you fill the settings in, the page shows
`[Add official contact number]` and similar. That is intentional — better an
obvious placeholder than a wrong phone number.

**The map** only appears when you paste a Google Maps **embed** link into
`contact.mapEmbedUrl`. To get one: open Google Maps → find your location →
**Share → Embed a map** → copy the `src="…"` address.

**A social link that is empty is hidden automatically.** No broken icons.

**Replying:** this project does not send emails by itself, so the Contact page
does not promise an automatic reply. Administrators read messages in
**Admin Panel → Contact messages** and reply from their normal email program.
If you later want automatic notification emails, there is a marked place to add
it inside `app/api/contact/route.ts`.

---

## 21. Footer

**File:** `components/layout/Footer.tsx` (search for `FOOTER`).

| What | Where it is set |
|---|---|
| The short paragraph under the logo | `config/site.ts` → `footer.aboutText` |
| The "Explore" column links | `config/site.ts` → `navigation` (first links) |
| The "Get involved" column | `components/layout/Footer.tsx` (the second list) |
| Address, phone, email | **Admin Panel → Settings → Contact information** |
| Social icons | **Admin Panel → Settings → Social media links** |
| Copyright line and legal links | `config/site.ts` → `footer` |
| The discreet "Administration" link | at the bottom of `Footer.tsx` — it only opens the login page |

---

## 22. Member Panel

| What | Where |
|---|---|
| Sign in | `app/member/login/page.tsx` |
| Register | `app/member/register/page.tsx` |
| The panel layout (menu, header) | `app/member/(panel)/layout.tsx` |
| The menu itself | `components/member/MemberNav.tsx` |
| Dashboard | `app/member/(panel)/dashboard/page.tsx` |
| My profile | `app/member/(panel)/profile/page.tsx` |
| My tasks | `app/member/(panel)/tasks/page.tsx` |
| Task progress buttons | `components/member/TaskStatusControl.tsx` |
| Profile edit form | `components/forms/ProfileForm.tsx` |
| Password form | `components/forms/PasswordForm.tsx` |
| The server check that protects it all | `lib/auth/guards.ts` → `requireMember()` |

**A member can:**

- register (if registration is switched on), sign in and sign out
- see their profile and membership status
- read notices published by the organization
- see published programs and upcoming events
- see the tasks assigned to them and mark their progress
- change their own name, phone, address, short introduction and photo
- change their own password

**A member cannot:**

- open the Admin Panel (they are stopped on the server and sent to
  `/unauthorized`)
- see another member's private information
- change their own email, role or membership status
- create, edit or delete programs, events or news
- edit anybody else's task

**The register page can be switched off** from
**Admin Panel → Settings → Join community page → "Allow public member
registration"**. Set it to `false` and the form is replaced by a notice, and the
server refuses registrations too.

---

## 23. Admin Panel

**Sign in at `/admin/login`** (there is no public Admin link in the menu).

| Admin screen | Address | Manages |
|---|---|---|
| Dashboard | `/admin/dashboard` | Overview, real counts, recent activity |
| Programs | `/admin/programs` | Programs |
| Projects & Our Works | `/admin/projects` | Both `/projects` and `/our-works` |
| Events | `/admin/events` | Events |
| News & Notices | `/admin/news` | News, notices, press releases, stories |
| Gallery | `/admin/gallery` | Albums and photos |
| Content sections | `/admin/content-sections` | Long text: About, Vision, Mission, Women, Impact… |
| Women Empowered | `/admin/content-sections?group=WOMEN` | Shortcut to the Women blocks |
| Beneficiaries | `/admin/beneficiaries` | Who the organization serves |
| Donors & supporters | `/admin/donors` | Public supporters |
| Members | `/admin/members` | Member and administrator accounts |
| Member tasks | `/admin/tasks` | Tasks given to members |
| Join applications | `/admin/applications` | Private: join form submissions |
| Contact messages | `/admin/messages` | Private: contact form messages |
| Donations received | `/admin/donations` | Private record book of contributions |
| Website settings | `/admin/settings` | Name, contact, socials, homepage, donate, impact |
| Activity log | `/admin/activity` | Read-only history of admin actions |

**Every screen works the same way:**

- **Add new** button → a form slides in from the right
- **Pencil icon** → edit that record
- **Bin icon** → delete (always asks you to confirm first)
- **Published / Hidden** switch → publish or unpublish with one click
- **Search box** → search inside that section
- **Filter drop-down** → narrow the list (for example by status)
- **Refresh** button → reload the list

**The files:**

| What | Where |
|---|---|
| The panel layout (sidebar, header) | `app/admin/(panel)/layout.tsx` |
| The sidebar menu | `components/admin/AdminNav.tsx` |
| Each screen | `app/admin/(panel)/<name>/page.tsx` |
| The table + add/edit/delete logic | `components/admin/ResourceManager.tsx` |
| The sliding form | `components/admin/ResourceForm.tsx` |
| Which sections exist + their rules | `lib/api/resources.ts` |
| The generic create/read/update/delete engine | `lib/api/crud.ts` |
| The settings form | `components/admin/SettingsForm.tsx` |

**Adding a whole new section** takes four small steps, described in the comments
at the top of `lib/api/resources.ts`.

---



---

# PART 3 — HOW IT WORKS UNDERNEATH

## 24. How authentication works

Authentication means "proving who you are". Authorisation means "what you are
allowed to do". This project keeps the two strictly separate.

### The files

| File | What it does |
|---|---|
| `app/api/auth/login/route.ts` | Checks an email + password and creates a session |
| `app/api/auth/logout/route.ts` | Deletes the session |
| `app/api/auth/register/route.ts` | Creates a new member account |
| `lib/auth/password.ts` | Hashes passwords with bcrypt, and checks them |
| `lib/auth/token.ts` | Creates and verifies the signed session token |
| `lib/auth/session.ts` | Reads and writes the session **cookie** |
| `lib/auth/guards.ts` | Protects **pages** (`requireAdmin`, `requireMember`) |
| `lib/api/guard.ts` | Protects **API routes** (`requireAdminApi`) |
| `lib/auth/rate-limit.ts` | Slows down repeated failed login attempts |
| `components/forms/LoginForm.tsx` | The sign-in form used by both logins |

### What happens when somebody signs in

1. They type an email and password at `/member/login` or `/admin/login`.
2. The form sends them to `POST /api/auth/login`.
3. The server looks the account up by email.
4. `bcrypt.compare()` checks the typed password against the stored **hash**.
   (The real password is never stored anywhere, so nobody — not even an
   administrator — can read it back.)
5. Refused if the account is deactivated.
6. Refused if the person used the **admin** login page but is only a member.
7. A signed token is placed in an **HTTP-only cookie**. Browser JavaScript cannot
   read it, which protects it from cross-site scripting attacks.
8. The browser is sent to the dashboard.

### Why editing the cookie does not work

The cookie contains a token signed with your `AUTH_SECRET`. If somebody edits it
to change their role from `MEMBER` to `ADMIN`, the signature no longer matches and
the server rejects it.

### Rate limiting

After 8 failed attempts from the same email or address, that combination is
blocked for 10 minutes. See `lib/auth/rate-limit.ts`.

> **Honest limitation:** those counters live in the memory of the running server.
> On Vercel each server instance keeps its own counters, so this slows an attacker
> down but is not a complete shield. If you need more, replace that one file with
> a service such as Upstash Redis — nothing else needs to change.

---

## 25. How the Admin Panel is actually protected

This was one of the most important requirements, so here is exactly how it works.

### What is NOT the protection

- Hiding the "Admin" link in the menu — that is only cosmetic.
- Hiding the panel with CSS (`display: none`) — useless.
- Checking the role in the browser — useless, anybody can change browser state.

### The three real layers

| Layer | File | What it does |
|---|---|---|
| **1. Middleware** | `middleware.ts` | Runs *before* the page. No valid session → redirected to `/admin/login`. Logged in but not an ADMIN → redirected to `/unauthorized`. |
| **2. Page guard** | `lib/auth/guards.ts` → `requireAdmin()` | Every page inside `app/admin/(panel)/` calls this. It **re-reads the user from the database**, so a disabled account or a changed role takes effect immediately. |
| **3. API guard** | `lib/api/guard.ts` → `requireAdminApi()` | Every route inside `app/api/admin/…` calls this. It also blocks cross-site requests (CSRF protection). |

**Defence in depth:** if one layer were ever misconfigured, the next one still
stops the request.

### What a normal member actually receives

This was tested against the running website:

| What the member tries | Result |
|---|---|
| `GET /api/admin/programs` | **403 Forbidden** — *"You are not authorized to access this page. Administrators only."* |
| `POST /api/admin/programs` (create a program) | **403 Forbidden** — nothing is created |
| `GET /api/admin/members` (read other members) | **403 Forbidden** |
| `GET /admin/dashboard` in the address bar | **redirected to `/unauthorized`** |
| Signing in at `/admin/login` with correct member credentials | **403 Forbidden** — *"This account does not have administrator access."* |
| Adding `role: "ADMIN"` to their own profile update | ignored; the member is still blocked from the admin API |

### Where the admin login page lives

`/admin/login`. There is no public link to it in the navbar. There is one
discreet "Administration" link at the bottom of the footer, and it only opens the
login page — never the dashboard.

---

## 26. The database

**The structure is defined in one file:** `prisma/schema.prisma`

It contains a labelled description of every table. The tables are:

| Table | Stores |
|---|---|
| `users` | Login accounts (admins and members) |
| `member_profiles` | Member details: designation, department, status, bio, photo |
| `site_settings` | Everything editable on the Settings page (key/value) |
| `content_sections` | Long text blocks: About, Vision, Mission, Women, Impact… |
| `programs` | Programs |
| `projects` | Projects **and** Our Works (the `kind` column decides) |
| `events` | Events |
| `news_posts` | News, notices, press releases, stories |
| `gallery_albums` / `gallery_images` | Gallery |
| `donors` | Supporters |
| `join_applications` | Private: join form submissions |
| `contact_messages` | Private: contact form messages |
| `donations` | Private: record of contributions received |
| `beneficiary_categories` | Who the organization serves |
| `tasks` | Tasks assigned to a member |
| `activity_logs` | Who did what, and when |

### Two engines, one structure

The schema deliberately avoids PostgreSQL-only features so you can switch with
one command:

```bash
npm run db:use:sqlite      # local file database, for practice
npm run db:use:postgres    # PostgreSQL, for the real website and Vercel
```

That is also why statuses are stored as plain text instead of database enums —
it keeps the project portable. They are still validated strictly by Zod and typed
in TypeScript, so a wrong value can never be saved.

### Changing the structure

1. Edit `prisma/schema.prisma`.
2. Run `npm run db:push` (quick) or `npm run db:migrate` (creates a saved
   migration — better for a live website).
3. Run `npm run db:generate` if the editor still shows old field names.

### Looking inside the database

```bash
npm run db:studio
```

Opens a visual browser at <http://localhost:5555> where you can see every table.
Useful for checking that a form really saved what you expected.

---

## 27. Security rules used in this project

| Rule | How it is done here |
|---|---|
| Never store plain passwords | bcrypt with 12 rounds (`lib/auth/password.ts`) |
| Never hard-code passwords | `.env` only; `.env` is in `.gitignore` |
| Never hard-code API keys | `.env` only |
| Never expose database credentials | `.env` only; nothing secret is sent to the browser |
| Never trust front-end role checks | every admin page and API re-checks the role on the server |
| Members cannot reach admin APIs | `requireAdminApi()` returns 403 |
| Sessions are signed | `jose` HS256 with `AUTH_SECRET` (minimum 32 characters) |
| Cookie is protected | `httpOnly`, `sameSite=lax`, `secure` in production |
| Login guessing is slowed down | `lib/auth/rate-limit.ts` |
| Cross-site form attacks blocked | origin check in `lib/api/guard.ts` and same-site cookies |
| Every input validated on the server | Zod schemas in `lib/validation/schemas.ts` |
| Uploads restricted | images only, max 4 MB, file names regenerated (`app/api/upload/route.ts`) |
| Private data never reaches public pages | column-level `select` in `lib/data/public.ts` |
| Admin cannot lock itself out | rules in `lib/api/self-protection.ts` and `lib/api/resources.ts` |

### Things you should do yourself

1. Use a **different** `AUTH_SECRET` on Vercel than on your computer.
2. Never commit the `.env` file (it is already blocked by `.gitignore`).
3. Use a strong administrator password, and a different one for each person.
4. If somebody leaves the organization, **switch their account off** instead of
   deleting it — you keep the record but remove the access.
5. Never type card numbers, PINs or online-banking passwords anywhere in this
   project.

---

## 28. File map (the quick-look table)

| Feature | File / Folder | What it controls |
|---|---|---|
| **Colours / theme** | `config/theme.ts` | Every colour on the website |
| **Website name, menu, contact fallbacks** | `config/site.ts` | Organization name, navbar links, footer text, SEO defaults |
| **Logo** | `public/branding/` + `config/site.ts` | The logo image and its path |
| **Logo drawing** | `components/layout/Logo.tsx` | Where the logo is rendered |
| **Navbar** | `components/layout/NavbarShell.tsx` | Top menu, mobile menu, user menu |
| **Navbar data** | `components/layout/Navbar.tsx` | Reads the signed-in user, passes links |
| **Footer** | `components/layout/Footer.tsx` | Footer columns, social links, copyright |
| **Homepage** | `app/(site)/page.tsx` | The whole home page |
| **Home hero** | `components/public/Hero.tsx` | The big green banner |
| **About** | `app/(site)/about/page.tsx` | About page layout |
| **Content text blocks** | `components/public/ContentSectionView.tsx` | How long text blocks are rendered |
| **Programs** | `app/(site)/programs/…` + `app/admin/(panel)/programs/page.tsx` | Program list, detail and admin |
| **Projects** | `app/(site)/projects/…` + `app/admin/(panel)/projects/page.tsx` | Projects list, detail and admin |
| **Our Works** | `app/(site)/our-works/…` + the same admin screen | Our Works list and detail |
| **Shared project layout** | `components/public/ProjectListing.tsx`, `components/public/ProjectDetail.tsx` | Used by both pages |
| **Impact** | `app/(site)/impact/page.tsx` | Impact page |
| **Impact numbers** | `components/public/StatGrid.tsx` | The number cards (hidden when empty) |
| **Beneficiaries** | `app/(site)/beneficiaries/page.tsx` + `app/admin/(panel)/beneficiaries/page.tsx` | Beneficiary groups |
| **Women Empowered** | `app/(site)/women-empowered/page.tsx` | Women Empowered page |
| **Events** | `app/(site)/events/…` + `app/admin/(panel)/events/page.tsx` | Events list, detail and admin |
| **News** | `app/(site)/news/…` + `app/admin/(panel)/news/page.tsx` | News list, article page and admin |
| **Gallery** | `app/(site)/gallery/page.tsx` + `app/admin/(panel)/gallery/page.tsx` | Albums, photos, viewer |
| **Gallery grid / viewer** | `components/public/GalleryGrid.tsx` | The responsive grid and the lightbox |
| **Donors** | `app/(site)/donors/page.tsx` + `app/admin/(panel)/donors/page.tsx` | Public supporters page and admin |
| **Members** | `app/(site)/members/page.tsx` + `app/admin/(panel)/members/page.tsx` | Public members page and admin |
| **Cards (events, news, donors, members, beneficiaries, albums)** | `components/public/Cards.tsx` | All smaller card designs |
| **Program / project cards** | `components/public/ProgramCard.tsx`, `components/public/ProjectCard.tsx` | The two main card designs |
| **Join Community** | `app/(site)/join/page.tsx`, `components/forms/JoinForm.tsx`, `app/api/join/route.ts` | The join form and where it is saved |
| **Donate** | `app/(site)/donate/page.tsx` | Donation information page |
| **Contact** | `app/(site)/contact/page.tsx`, `components/forms/ContactForm.tsx`, `app/api/contact/route.ts` | Contact page, form and storage |
| **Contact details / social links** | Admin Panel → Settings (`lib/settings.ts`) | Address, phone, email, hours, map, socials |
| **Member login / register** | `app/member/login/page.tsx`, `app/member/register/page.tsx` | The two public member pages |
| **Member Panel** | `app/member/(panel)/…` | Dashboard, profile, tasks |
| **Member menu** | `components/member/MemberNav.tsx` | The member panel menu |
| **Admin Panel** | `app/admin/(panel)/…` | All 16 admin screens |
| **Admin login** | `app/admin/login/page.tsx` | The administrator sign-in page |
| **Admin menu** | `components/admin/AdminNav.tsx` | The admin sidebar |
| **Admin table engine** | `components/admin/ResourceManager.tsx` | Search, filter, add, edit, delete, publish |
| **Admin form** | `components/admin/ResourceForm.tsx` | The sliding edit window |
| **Admin section definitions** | `lib/api/resources.ts` | Which sections exist and their rules |
| **Authentication** | `lib/auth/…` | Password hashing, sessions, guards, rate limiting |
| **Login / logout / register APIs** | `app/api/auth/…` | The three authentication endpoints |
| **Route protection (first layer)** | `middleware.ts` | Redirects visitors away from the panels |
| **Database structure** | `prisma/schema.prisma` | Every table and relationship |
| **Database connection** | `lib/prisma.ts` | The Prisma client used by every query |
| **Public database queries** | `lib/data/public.ts` | Everything the public pages read |
| **Editable settings** | `lib/settings.ts` | The full list of editable values |
| **Validation rules** | `lib/validation/schemas.ts` | Every form's rules |
| **Status lists and options** | `lib/constants.ts` | Dropdown options, roles, statuses |
| **Badge colours** | `lib/status-styles.ts` | Colour of each status badge |
| **Small helpers** | `lib/utils.ts` | Date formatting, slugs, text shortening |
| **Icons** | `components/ui/Icon.tsx` | Every small drawing on the website |
| **Buttons, badges, alerts…** | `components/ui/…` | Shared interface pieces |
| **Global styles** | `app/globals.css` | Base styling and reusable classes |
| **SEO, fonts, favicon** | `app/layout.tsx` | Page titles, social previews, fonts |
| **Sitemap / robots** | `app/sitemap.ts`, `app/robots.ts` | What search engines may index |
| **404 page** | `app/not-found.tsx` | "Page not found" |
| **Error page** | `app/error.tsx` | "Something went wrong" |
| **Not-authorised page** | `app/(site)/unauthorized/page.tsx` | Shown to a member blocked from admin |
| **Privacy / Terms** | `app/(site)/privacy/page.tsx`, `app/(site)/terms/page.tsx` | The two legal pages |
| **Setup scripts** | `scripts/…` | `admin:create`, `admin:reset` (locked out), `db:use:sqlite`, `db:use:postgres` |
| **Seed scripts** | `prisma/seed.mjs`, `prisma/seed-demo.mjs` | First setup and sample content |

---

## 29. How the code comments work

Every major file starts with a labelled comment block. The labels match the
requirement list exactly, so you can search for them.

**TypeScript / JavaScript:**

```ts
// ========================================
// DONOR SECTION
// This code controls the Donor Section.
// ========================================
```

**CSS:**

```css
/* ========================================
   DONOR SECTION
   Styles for the Donor Section
   ======================================== */
```

**HTML / JSX:**

```html
<!-- ========================================
     DONOR SECTION
     This code controls the Donor Section.
     ======================================== -->
```

### How to find a section

1. Press **CTRL + SHIFT + F** in VS Code.
2. Type the label, for example `GALLERY SECTION`.
3. Click the result.

### The labels used in this project

`NAVBAR` · `ORGANIZATION LOGO` · `HOME PAGE` · `ABOUT US` · `PROGRAMS SECTION` ·
`PROJECTS / OUR WORKS` · `IMPACT / STATISTICS SECTION` · `BENEFICIARIES SECTION` ·
`WOMEN EMPOWERED` · `EVENTS SECTION` · `NEWS / NOTICES` · `GALLERY SECTION` ·
`MEMBERS SECTION` · `DONOR SECTION` · `JOIN COMMUNITY FORM` · `CONTACT FORM` ·
`FOOTER` · `MEMBER LOGIN + ADMIN LOGIN FORM` · `MEMBER PANEL` ·
`MEMBER DASHBOARD` · `ADMIN LOGIN` · `ADMIN PANEL` · `ADMIN DASHBOARD` ·
`AUTHENTICATION` · `DATABASE` · `API` · `ROUTES` ·
`WEBSITE COLOR / THEME CONFIGURATION` · `ADMIN PANEL - SECTION REGISTRY`

Comments are only on the important parts — headings, components, functions and
tricky logic — so they help rather than get in the way.

---

## 30. Responsive design, accessibility and SEO

### Responsive design

The layout was built mobile-first and tested at **320px, 375px, 390px, 768px,
1024px and 1440px+**. There is no horizontal scrolling at any width.

How it is done:

- All grids start as one column and add columns as the screen grows
  (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`).
- The mobile navbar becomes a full-screen menu with the ☰ button.
- Long lists (sidebar menus, filters, admin quick-nav) scroll sideways instead
  of overflowing.
- Admin tables scroll inside their own box, so the page itself never breaks.
- `overflow-x: hidden` on `body` as a final safety net.
- Images use a fixed aspect ratio, so nothing jumps while loading.

**To check it yourself:** in your browser press **F12**, then **CTRL + SHIFT + M**
to switch to the device toolbar and try the different phone sizes.

### Accessibility

- Correct heading order — one `<h1>` per page, then `<h2>`, `<h3>`…
- Every form input has a real `<label>` joined to it.
- Error messages use `aria-invalid` and `aria-describedby`, so a screen reader
  reads the problem out loud.
- A "Skip to main content" link appears when you press TAB.
- Menus open and close with the keyboard, and `Esc` closes them.
- Focus outlines are always visible (never switched off).
- Alt text on images; decorative shapes are hidden with `aria-hidden`.
- Colours were chosen for readable contrast.
- `prefers-reduced-motion` is respected, so animations stop for people who
  prefer that.
- The gallery viewer is a proper dialog with labelled arrow buttons.

### SEO

| What | Where |
|---|---|
| Page titles and description template | `app/layout.tsx` |
| A title and description per page | `export const metadata` in each page file |
| Article/program-specific titles | `generateMetadata()` in the `[slug]` pages |
| Open Graph + Twitter preview cards | `app/layout.tsx` |
| Organization structured data (schema.org NGO) | `app/layout.tsx` |
| Sitemap | `app/sitemap.ts` → `/sitemap.xml` |
| Robots rules | `app/robots.ts` → `/robots.txt` |
| Admin, member and API pages kept out of search | `app/robots.ts` |

Set `NEXT_PUBLIC_SITE_URL` to your real address so the sitemap and share links use
the correct domain.

**Admin and member pages are excluded from search engines twice:** once in
`robots.txt` (a polite request) and — far more importantly — by the real
server-side authorization in section 25.

---



---

## 31. The "no fake data" rule

This project contains **no invented information**. Nothing was made up to fill
the pages. Here is exactly how that is enforced:

| What must never be invented | How the project handles it |
|---|---|
| Organization description | Placeholder text: `[Add organization description]` |
| Phone, email, address | Placeholders: `[Add official contact number]` etc. |
| Impact numbers | Four empty slots — **the whole block is hidden while they are empty** |
| Beneficiary numbers | The number field is optional — no number is shown when empty |
| Programs, projects, events, news | Not created at all; the pages show a friendly empty state |
| Donors | None are created; a plain invitation is shown instead |
| Success stories | Not written; an honest note invites real ones |
| Achievements, awards, registrations | No fields exist for unverified claims |
| Partnerships | None listed |
| Photos | Only placeholder graphics, never borrowed images |

The **only** content the setup script creates is:

1. your own administrator account (from your `.env`),
2. six broadly-recognised beneficiary group names, **with no numbers**.

The optional `db:seed:demo` sample content is different: **every headline is
prefixed with `[SAMPLE]`** so it can never be confused with real information, and
it can be deleted with one command.

### Where the placeholders live

`lib/settings.ts` — the `SETTING_DEFINITIONS` list. Each entry has a `default`
value. When a value has not been saved in the Admin Panel, that default is shown,
so a visitor sees a clear placeholder rather than a blank space or a wrong detail.

---

## 32. Error handling

The website is built to fail politely.

| Situation | What the visitor sees |
|---|---|
| A page does not exist | `app/not-found.tsx` — a friendly 404 with links back |
| A page crashes | `app/error.tsx` — "Something went wrong" with a **Try again** button |
| A member opens an admin page | `app/(site)/unauthorized/page.tsx` — "You are not authorized to access this page" |
| A section has no content yet | A helpful empty state explaining where to add it |
| A list is loading | A "Loading…" box (admin tables) |
| A form has a mistake | A red message under the exact field that is wrong |
| A form succeeds | A green confirmation message |
| An image is missing | A neutral placeholder image (`public/branding/image-placeholder.svg`) |
| The database is not connected | The public site still works and shows empty states; the admin dashboard shows clear setup instructions |
| The internet is lost mid-form | "Could not reach the server. Please check your connection and try again." |
| Too many failed logins | "Too many failed sign-in attempts. Please wait N minutes and try again." |

**Every message is written in plain language**, and the server error code is only
shown as a short reference (`Reference: xxxxx`), never as a technical stack trace
on the public site. In development, the full technical detail appears in a
collapsible box to help you debug.

---

## 33. What the organization can change without code

Everything in this list is done from **`/admin`** — no files, no VS Code:

- Organization name, tagline, description, established year, registration details
- Address, phone numbers, email, office hours, map link
- Social media links
- Homepage heading, sub-heading, introduction and hero picture
- Donation information: bank details, QR picture, other methods, note
- Impact numbers
- Whether public member registration is open
- Programs, projects, our works, events, news, notices, press releases, stories
- Gallery albums and photos, including captions and dates
- Beneficiary groups, their descriptions, icons and (optional) numbers
- Donors and their public visibility
- Members: accounts, roles, membership status, public profiles
- Tasks assigned to members
- Join applications and contact messages
- The private donation record book

**Only these need code edits:**

| Change | File |
|---|---|
| Colours | `config/theme.ts` |
| The logo file | `public/branding/` |
| Menu links | `config/site.ts` |
| Adding a whole new type of content | `prisma/schema.prisma` + `lib/api/resources.ts` |
| The wording of the empty states | the relevant page file |

---

## 34. GitHub

### First time — create the repository

1. Create an empty repository on <https://github.com> (do **not** add a README,
   a `.gitignore`, or a licence — you already have them).
2. In the VS Code terminal, inside the project folder:

```bash
git init
git add .
git commit -m "Initial website"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

Replace `YOUR-USERNAME` and `YOUR-REPO-NAME` with your own.

### After the first time — saving your changes

```bash
git add .
git commit -m "Describe what you changed"
git push
```

### Check before you push

`.gitignore` already blocks the files that must never be uploaded:

- `.env` (your secrets) — **the most important one**
- `node_modules/` (huge, and can be reinstalled)
- `.next/` (build output)
- `prisma/*.db` (your local database file, with real data in it)
- `public/uploads/*` (uploaded files)

To confirm your `.env` is safe, run:

```bash
git status
```

If `.env` is **not** in the list of files to be committed, you are safe. If it
ever appears, stop and add it to `.gitignore` before pushing.

> **If you accidentally push a secret:** change it immediately (create a new
> `AUTH_SECRET`, change the database password), because it stays in the
> repository history forever.

---

## 35. Vercel deployment

### Before you start

1. The project is on GitHub (section 34).
2. You have a **PostgreSQL** database. A local SQLite file will **not** work on
   Vercel, because the file system there is read-only.
3. Run `npm run db:use:postgres` so the project is configured for PostgreSQL.

### Deploy

1. Go to <https://vercel.com> and sign in with GitHub.
2. Click **Add New… → Project**.
3. Find your repository and click **Import**.
4. Vercel detects Next.js automatically. **Leave the build settings exactly as
   they are** — the build command is already correct (`package.json` handles it).
5. Open **Environment Variables** and add the ones in section 36 below.
6. Click **Deploy**.

The first deployment takes 2–4 minutes.

### After the first deploy — create the database tables

Vercel does not run `db:push` for you. Do it once from your own computer, using
the **production** database address:

```bash
npm run db:push
npm run admin:create
```

(Both commands read `DATABASE_URL` from your `.env` file, so temporarily paste
the production address there, run them, and then switch back to your local
address if you prefer.)

### Every later update

Once the project is on GitHub, deployment is automatic:

```bash
git add .
git commit -m "Updated contact details"
git push
```

Vercel detects the push and redeploys within a minute or two.

### Custom domain

**Project → Settings → Domains → Add**. After adding the domain, also update
`NEXT_PUBLIC_SITE_URL` to the new address and redeploy.

---

## 36. Environment variables on Vercel

Go to **Project → Settings → Environment Variables** and add each one.
Tick **Production**, **Preview** and **Development** unless you have a reason not to.

| Name | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://…` | Your production database address |
| `AUTH_SECRET` | a long random string | **Different** from your local one |
| `NEXT_PUBLIC_SITE_URL` | `https://your-site.vercel.app` | Used by the sitemap and share links |
| `MEMBER_REGISTRATION_ENABLED` | `true` or `false` | Whether the public can register |
| `ADMIN_NAME` | Your name | Only needed if you run `admin:create` against production |
| `ADMIN_EMAIL` | `you@example.com` | Same |
| `ADMIN_PASSWORD` | a strong password | Same — you can delete it afterwards |
| `BLOB_READ_WRITE_TOKEN` | (optional) | Vercel Blob, only if you want image uploads in production |

**Important:** after changing an environment variable you must **redeploy** for it
to take effect (**Deployments → … → Redeploy**).

To create a strong `AUTH_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### About image uploads in production

Vercel's file system is read-only, so uploading an image file there does not work.
Two options:

1. **Paste image links** (works everywhere) — host your photos somewhere public
   (your own website, Google Drive with a direct link, Cloudinary, Imgur…) and
   paste the link into the picture field.
2. **Connect Vercel Blob** — create a Blob store in your Vercel project, add the
   token as `BLOB_READ_WRITE_TOKEN`, and add the upload call in the marked place
   in `app/api/upload/route.ts`.

Either way, the website explains the situation clearly instead of showing a
confusing error.

---

## 37. Adding your real information — a checklist

Work through this in order. Everything is done from **`/admin`**.

### A. Set up access
- [ ] Sign in at `/admin/login`
- [ ] **Members → Add new** to create an account for each person who needs access
- [ ] Give somebody `Administrator` only if they really need it

### B. Organization details
- [ ] **Settings → Organization identity**: name, tagline, description, established year, registration details
- [ ] **Settings → Contact information**: address, phone, email, office hours
- [ ] **Settings → Social media links**: only pages you actually control
- [ ] **Settings → Homepage content**: heading, sub-heading, introduction
- [ ] Paste a Google Maps embed link if you want a map

### C. The About page
- [ ] **Content sections** (group "About page"): create blocks with the slugs
      `who-we-are`, `vision`, `mission`, `objectives`, `core-values`,
      `what-we-do`, `our-approach`
- [ ] Set the **sort order** so they appear in a sensible sequence

### D. Core content
- [ ] **Beneficiaries**: rename the six seeded groups to match your work, or add your own. Add a number **only** if you have a verified one.
- [ ] **Programs**: add your real programs, one at a time. Use "Featured" for the three you want on the homepage.
- [ ] **Projects & Our Works**: add each one and choose the Type (Project or Our Work).
- [ ] **Events**: add upcoming events with real dates; add past ones for the archive.
- [ ] **News & Notices**: publish a first announcement so the page is not empty.

### E. Photos and people
- [ ] **Gallery → Albums**: create albums
- [ ] **Gallery → Photos**: add your own photographs with captions
- [ ] **Members**: add members and leaders; switch on *Show on the public Members page* only with each person's agreement
- [ ] **Donors**: add supporters; switch on *Show publicly* only with their agreement

### F. Impact and giving
- [ ] **Settings → Impact numbers**: enter only figures you can verify. Leave them empty otherwise.
- [ ] **Settings → Donation information**: bank details, QR picture, other methods
- [ ] **Content sections** (group "Impact") for any longer impact text

### G. Finish
- [ ] **Content sections** (group "Women Empowered"): the introduction, and a `story` block if you have one
- [ ] Check every page yourself on a phone and on a computer
- [ ] `npm run db:seed:demo -- --clean` to remove any sample content
- [ ] Replace `public/branding/logo.svg` with your real logo
- [ ] Push to GitHub so the live site updates

---

## 38. Troubleshooting

### "DATABASE_URL is not set" when I run a command

Your `.env` file still has the placeholder. Open `.env` and set a real
`DATABASE_URL`, or run `npm run db:use:sqlite` and set
`DATABASE_URL="file:./dev.db"`.

### "Can't reach database server" / "P1001"

The database address is wrong, or the database is asleep.
On the free Neon plan the database pauses after a while — open the Neon dashboard
and it wakes up. Double-check the whole connection string, including the password,
and that `?sslmode=require` is at the end.

### "Table does not exist" / "P2021"

You have not created the tables yet:

```bash
npm run db:push
```

### The website loads but every section is empty

That is expected before you add content. Sign in at `/admin/login` and add your
first program or news item. If the admin dashboard says the database is not
connected, follow the setup instructions it shows.

### "AUTH_SECRET is missing or too short"

Open `.env` and set `AUTH_SECRET` to a random string of at least 32 characters
(the guide in section 2, step 4, shows how to create one).

### I sign in but I am sent straight back to the login page

1. Make sure `AUTH_SECRET` is set and is the same on every server instance.
2. Clear the cookie: in your browser press F12 → **Application** → **Cookies** →
   delete the `jsyc_session` entry.
3. Restart `npm run dev`.

### A member gets "You are not authorized to access this page"

That is correct behaviour — it means the server-side protection is working. Only
accounts with the role `ADMIN` may open the Admin Panel. An existing administrator
can change somebody's role in **Members → edit → Role**.

### "This is the only administrator account"

Safety rule: the project will not let you remove the last administrator, because
then nobody could open the Admin Panel again. Create a second administrator first,
then make the change.

### Colours did not change

Restart the dev server (CTRL+C, then `npm run dev`). Tailwind reads the theme file
when it starts.

### `npm run build` fails with `Cannot find module '@prisma/client'`

Run:

```bash
npm run db:generate
```

### The image I uploaded does not appear

Uploading works while developing on your own computer. On Vercel the file system
is read-only, so paste a link to an image that is already online instead — see
section 36. Also check the picture field actually contains the address, and that
you saved the form.

### "Too many failed sign-in attempts. Please wait 10 minutes and try again."

**Nothing is broken.** The website counts failed sign-in attempts so that nobody
can guess passwords by trying thousands of combinations. After **8 wrong
passwords** an account is paused for **10 minutes**.

Two ways to continue immediately, without waiting:

1. **Restart the website.** `Ctrl + C` in the terminal, then `npm run dev`. The
   counters live in the server's memory, so restarting clears them.
2. Or use the rescue tool described in the next section.

**Why the correct password was also refused:** once the pause starts, every
attempt for that account is refused until it expires — including the right
password. This is normal for any rate limit.

The limit itself is set in `lib/auth/rate-limit.ts` (`MAX_ATTEMPTS = 8`,
`BLOCK_MINUTES = 10`). Change those two numbers if you prefer different values.

### "I changed the admin email or password and now I cannot sign in"

There are **two different places** that hold administrator details, and only one
of them is the real one:

| Where | What it is | Does changing it change your login? |
|---|---|---|
| The `.env` file | Only a *source* for the setup commands | **No** — not until you run a command |
| The database | Where the real account lives | **Yes** — changed in Admin Panel → Members |

So editing `.env` on its own changes nothing. After editing `.env` you must run
`npm run admin:create` (or `npm run admin:reset`) for it to take effect.

**The rescue tool.** If you cannot get in at all, this lists every account and
then repairs the administrator:

```bash
# 1. see which accounts actually exist
npm run admin:reset -- --list

# 2. put the details you want into your .env file
#      ADMIN_EMAIL="you@yourdomain.com"
#      ADMIN_PASSWORD="a-new-long-password-with-numbers-123"

# 3. apply them
npm run admin:reset
```

The listing shows the email, the role, whether the account is switched on and the
membership status — so you can see what really exists instead of guessing. The
password must be at least 12 characters and contain a letter and a number.

Repairing a password **never changes an existing role** — fixing a forgotten
password must not silently downgrade a Super Administrator back to a plain Admin.

### "Which role should this account have, and how do I change it?"

There are three administrator roles plus the ordinary member role:

| Role | What it can do |
|---|---|
| `ADMIN` | Day-to-day work: website content, members, recording money in and out |
| `FINANCE_ADMIN` | Everything an ADMIN can do, plus reports and fund settings |
| `SUPER_ADMIN` | Everything, **plus approving an expense** |
| `MEMBER` | Ordinary member: own data only, cannot open the Admin Panel at all |

Approving an expense is deliberately restricted to `SUPER_ADMIN`, so that the
person who records a spend is not automatically the person who approves it. If
the "Approve" button seems to be missing, the account is almost certainly not a
Super Administrator.

A role can be changed from the command line, without touching the password:

```bash
# see the current roles first
npm run admin:reset -- --list

# then change one (uses ADMIN_EMAIL from .env)
npm run admin:reset -- --role SUPER_ADMIN

# or name the account with --email
npm run admin:reset -- --role FINANCE_ADMIN --email someone@example.com
npm run admin:reset -- --role MEMBER --email someone@example.com
```

After a role change, **sign out and sign in again**. The session cookie created at
sign-in remembers the old role, so the new permissions only start working on the
next sign-in.

### `npm run build` fails with "EPERM ... query_engine-windows.dll.node"

The database engine file is locked because the website is still running.
**Stop the server first** (`Ctrl + C`), then run `npm run build`.

### I want to start again with an empty database

```bash
npm run db:seed:demo -- --clean   # removes sample content
```

To remove everything, delete `prisma/dev.db` (SQLite) and run
`npm run db:push` and `npm run db:seed` again. **On PostgreSQL this deletes real
data — be careful.**

---

## 39. Command reference

| Command | What it does |
|---|---|
| `npm install` | Install the libraries (once) |
| `npm run dev` | Start the website on <http://localhost:3000> |
| `npm run build` | Build the production version and check everything compiles |
| `npm start` | Run the built version |
| `npm run typecheck` | Find TypeScript mistakes |
| `npm run lint` | Check the code style |
| `npm run db:generate` | Regenerate the Prisma client after a schema change |
| `npm run db:push` | Create/update the tables from `prisma/schema.prisma` |
| `npm run db:migrate` | Create a saved migration (better for a live site) |
| `npm run db:deploy` | Apply saved migrations (used on a server) |
| `npm run db:studio` | Open a visual database browser |
| `npm run db:seed` | Create the admin account + beneficiary groups |
| `npm run db:seed:demo` | Add `[SAMPLE]` content for design review |
| `npm run db:seed:demo -- --clean` | Remove all `[SAMPLE]` content |
| `npm run admin:create` | Create or update the first administrator account |
| `npm run admin:reset` | **Locked out?** List every account, then repair the administrator |
| `npm run admin:reset -- --list` | Only show which accounts exist |
| `npm run admin:reset -- --role SUPER_ADMIN` | Change only the role (password untouched) |
| `npm run admin:reset -- --role FINANCE_ADMIN --email x@y.com` | Same, for a named account |
| `npm run db:use:sqlite` | Switch the project to a local file database |
| `npm run db:use:postgres` | Switch the project back to PostgreSQL |

---

## 40. Member accounts, email, कार्य समिति and the monthly fund

This section explains the features added in the latest update. Everything here is
already built and connected to the database.

### 40.1 Members are created by the office (no public registration)

Nobody can register themselves any more. This is deliberate: it is what makes the
member list, the contribution records and the reports trustworthy.

**To add a member:**  Admin Panel → Members → **Add member**

| Field | What to put |
|---|---|
| Full name | The person's real name |
| Email address | The address the verification email is sent to |
| Starting password | Press **Generate a password** and write it down, or type your own (at least 8 characters) |
| Email the member a verification link now | Leave this **ticked** |
| District / Municipality / Ward | Used by the reports, so please fill them in |

When you save, three things happen:

1. the account is created with the role **Member**;
2. the password is turned into a bcrypt hash (nobody, including you, can read it back);
3. a verification email is sent.

The member cannot open the member panel until they have proved the email address is
theirs. Until then, signing in shows a clear message and a link to the
**Verify email** page.

### 40.2 Setting up email (SMTP) — please do this

Without email settings the website still works, but **no email is sent**. The
verification link is printed in the terminal window instead (where you ran
`npm run dev`), and the Admin Panel says plainly that nothing was sent. Nothing is
ever faked.

Add these lines to your `.env` file:

```bash
MAIL_FROM_NAME="Janakalyan Samataa Yuwa Club"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your.address@gmail.com"
SMTP_PASSWORD="the 16 character app password"
MAIL_FROM="your.address@gmail.com"
```

**Using Gmail:** your normal password will **not** work.

1. Turn on 2-Step Verification on the Google account.
2. Google Account → Security → **App passwords** → create one for "Mail".
3. Copy the 16 character password into `SMTP_PASSWORD`.

On Vercel, add the same names in Project → Settings → Environment Variables.

### 40.3 Verify email and forgot password

| Address | What it is for |
|---|---|
| `/member/verify-email` | Type the 6 digit code from the email, or open the link. A "send me a new link" button is on the same page. |
| `/member/forgot-password` | Type the registered email to be sent a reset link (valid 30 minutes). |
| `/member/reset-password` | Choose the new password. Every device that was signed in is signed out at once. |

These three pages work **while signed out** — they have to, because somebody who
cannot sign in is exactly the person who needs them.

Codes and links expire, can be used only once, and five wrong codes throw the code
away. The link is never shown on the screen: a code on the screen would prove nothing.

### 40.4 कार्य समिति (Karya Samiti)

**Public page:** `/karya-samiti` — it is in the "More" menu of the website.

Visitors see exactly four things: **photo, full name, post and current address.**
Nothing else, ever.

**To manage it:**  Admin Panel → **Karya Samiti**

| Box on the form | Who sees it |
|---|---|
| Public information | Everybody (name, post, current address, photo, order, current/former) |
| Private information (admin only) | Only signed-in administrators (phone, email, permanent address, date of birth, citizenship, member number, joining dates, internal notes) |

The private values are **never loaded** by the public page — they are not in the
page, not in the data, and not in anything a search engine can see.

- **Order:** the "Display order" number decides the order on the website (1 = first).
- **Former members:** set "Current or former" to *Former*. They disappear from the
  page but stay in the database.
- **Positions:** Admin Panel → Karya Samiti → **Committee posts**. अध्यक्ष,
  उपाध्यक्ष, सचिव, सह–सचिव, कोषाध्यक्ष and सदस्य are already there. Add your own if
  the committee uses other titles.
- **Photo:** upload it on the form and check the preview. With no photo, a
  placeholder with the person's initials is shown — we never use a stranger's photo.

### 40.5 The monthly member contribution (Rs. 20, due on the 15th)

- The amount is **Rs. 20** and the due day is the **15th of the same month**.
  Both can be changed in Admin Panel → Settings → Monthly fund.
- **The month opens by itself.** The first time a member opens their fund page in a
  new month, their Rs. 20 obligation is created. The office does not have to press
  anything (though "Create this month" still exists on the monthly tracking page).
- An administrator never gets a contribution row — this is an obligation of members.

**Money rules (the same everywhere):**

| Rule | Detail |
|---|---|
| Only **APPROVED** payments count | Pending and rejected payments are never added to the collected total |
| The member cannot approve their own payment | They submit; the office verifies |
| One transaction ID, one payment | The same bank transaction cannot be recorded twice |
| Nothing is really deleted | A removed payment is hidden and the audit trail stays |

**Member side:** Member panel → **Monthly fund** (required amount, paid, waiting for
approval, still to pay, due date, history), then **Pay fund** to submit a payment
with the amount, method, transaction ID, date and the receipt picture. New payments
are **Pending verification**.

**Office side:** Admin Panel → Fund management → **Payment verification** to approve
or reject (a rejection needs a reason, and the member sees it).

### 40.6 Payment settings (banks, eSewa, Khalti and QR codes)

Admin Panel → Fund management → **Payment settings**

Each row is one way a member can pay:

| Payment method | Name | Number / ID |
|---|---|---|
| Bank account | For example NIC Asia Bank | The account number |
| eSewa wallet | eSewa | The eSewa ID (mobile number) |
| Khalti wallet | Khalti | The Khalti ID |
| Other method | Whatever you use | Its number |

- Attach the **QR picture** with the upload button — this is how most members pay.
- **Recommended** puts that account first on the member payment page.
- Switching **Show to members** off hides an account immediately.
- An account that already has payments cannot be deleted (switch it off instead), so
  old receipts keep pointing at a real record.

### 40.7 Who can do what

| Role | Can do |
|---|---|
| Member | Own profile, own contributions, own payments, own messages |
| Admin | All website content, members, committee, payment verification |
| Finance Admin | The above, plus expense records and fund reports |
| Super Admin | Everything, including approving an expense |

Change somebody's role with:

```bash
npm run admin:reset -- --list
npm run admin:reset -- --role SUPER_ADMIN
```

## 41. Where is the code for each feature? (the map for VS Code)

Open the file in the middle column, and the right column tells you what you are
looking at. Every file also starts with a comment block that says the same thing,
so you can tell what a file controls before changing a line.

### 41.1 Loan management (Super Admin)

| File | What it controls |
|---|---|
| `lib/loan/calc.ts` | **All the arithmetic.** Payable = amount + interest, remaining = payable − repayments, the repayment percentage, and the status that comes out of it (Completed / Overdue / Partially paid) |
| `lib/loan/schemas.ts` | The loan form rules, and the lists of statuses, agreement states and repayment methods |
| `lib/loan/service.ts` | The actions: create, approve, reject, pay out, cancel, record a repayment, edit, remove - each with its audit line and notification |
| `app/admin/(panel)/loans/page.tsx` | The Loan management screen: overview cards on top, records table below |
| `app/admin/(panel)/loans/[id]/page.tsx` | One loan in full: the money, the progress bar, the agreement, the repayments |
| `components/admin/LoanPanels.tsx` | The three panels that send something to the server: decision buttons, record a repayment, upload the agreement |
| `app/member/(panel)/loans/page.tsx` | What the member sees - their own loans, read only |
| `app/api/admin/loans/decisions/route.ts` | Approve / reject / pay out / cancel (server) |
| `app/api/admin/loans/returns/route.ts` | Add or remove a repayment (server) |
| `app/api/admin/loans/agreement/route.ts` | Upload, view and download the private agreement file (server) |
| `lib/api/resources.ts` (search for `loans:`) | **Who may use loans** (`readRoles` / `writeRoles`) and what the table shows |
| `prisma/schema.prisma` (search for `model Loan`) | The `loans`, `loan_returns` and `loan_documents` tables |

### 41.2 Karya Samiti (कार्य समिति)

| File | What it controls |
|---|---|
| `app/(site)/karya-samiti/page.tsx` | The public page at `/karya-samiti` |
| `components/public/CommitteeMemberCard.tsx` | How one committee member card looks (photo, name, post, address) |
| `lib/karya/queries.ts` | **The privacy rule.** `PUBLIC_FIELDS` lists the only four columns a visitor may ever see |
| `lib/karya/schemas.ts` | The committee form rules and the six starting positions |
| `app/admin/(panel)/karya-samiti/page.tsx` | The management screen (public box + private box) |
| `app/admin/(panel)/karya-samiti/posts/page.tsx` | The list of positions (add your own) |
| `components/admin/AdminNav.tsx` | The Admin Panel menu (where Karya Samiti and Loans appear) |
| `config/site.ts` | The public website menu (where कार्य समिति appears) |

### 41.3 Member accounts, email and passwords

| File | What it controls |
|---|---|
| `app/admin/(panel)/members/page.tsx` | The Add member form (every box and its order) |
| `lib/api/resources.ts` (search for `members:`) | What happens when a member is saved: password hashing, the invite, the notification |
| `lib/email/mailer.ts` | The SMTP connection (the only place that talks to a mail server) |
| `lib/email/templates.ts` | **The wording of every email** - change the text here |
| `lib/auth/verification.ts` | The expiring link and 6 digit code (made, checked, thrown away) |
| `app/member/verify-email/page.tsx` | The "prove this email is yours" page |
| `app/member/forgot-password/page.tsx` | Step 1 of a password reset |
| `app/member/reset-password/page.tsx` | Step 2 - choose the new password |
| `components/forms/VerifyEmailForm.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx` | The three forms those pages use |
| `app/api/auth/login/route.ts` | Who may sign in, and the exact message when they may not |
| `lib/auth/guards.ts` + `lib/api/guard.ts` | The page guards and the API guards |
| `middleware.ts` | The first line of protection, and the pages that stay open to the public |
| `lib/auth/token.ts` | What is inside a signed-in cookie, and how a password change cancels it |

### 41.4 The monthly member fund (Rs. 20)

| File | What it controls |
|---|---|
| `lib/fund/calc.ts` | The fund arithmetic: the balance, the monthly series, the due date, opening a month automatically |
| `lib/fund/service.ts` | Approve / reject / cancel a payment, and the audit line for each |
| `lib/fund/schemas.ts` | The fund form rules, including the bank / eSewa / Khalti payment settings |
| `app/admin/(panel)/fund/page.tsx` | The fund dashboard cards and charts |
| `app/admin/(panel)/fund/contributions/page.tsx` | The month-by-month tracking table |
| `app/admin/(panel)/fund/banks/page.tsx` | **Payment settings** - bank accounts, eSewa, Khalti and the QR codes |
| `app/admin/(panel)/fund/pending/page.tsx` | Payment verification (approve / reject with a reason) |
| `app/member/(panel)/fund/page.tsx` | What the member sees: required, paid, waiting, still to pay, history |
| `app/member/(panel)/fund/pay/page.tsx` + `components/member/PayFundForm.tsx` | The member payment page and its form |

### 41.5 Shared building blocks (used by every feature)

| File | What it controls |
|---|---|
| `lib/constants.ts` | Role names, membership statuses, payment methods, small role helpers |
| `lib/api/crud.ts` | The generic engine behind every Admin Panel table (including `readRoles` / `writeRoles`) |
| `lib/api/resources.ts` | **The map of the Admin Panel** - one entry per section: which table, which rules, who may use it |
| `components/admin/ResourceManager.tsx` | The shared table (search, filter, add, edit, delete, loading states) |
| `components/admin/ResourceForm.tsx` | The shared form (including the "Generate a password" button) |
| `components/admin/types.ts` | The column types (`text`, `money`, `link`, `badge`, ...) and field types |
| `lib/notifications.ts` | Every in-app notification and notification email in the project |
| `lib/settings.ts` | Everything the office can change without code (Admin Panel → Settings) |
| `config/districts.ts` | The 77 districts of Nepal |
| `config/site.ts`, `config/theme.ts` | The organization's name, contact details and colours |

### 41.6 "I want to change something - which file?"

| I want to change... | Open this |
|---|---|
| The monthly amount (Rs. 20) or the due day | Admin Panel → Settings → Monthly fund (or the default in `lib/settings.ts`) |
| The loan status names or colours | `lib/loan/schemas.ts` (`LOAN_STATUS_OPTIONS`, `LOAN_STATUS_TONES`) |
| Whether a signed agreement is needed before approval | Admin Panel → Settings → Loans (`loan.requireAgreementBeforeApproval`) |
| Who may see loans | `lib/api/resources.ts` → the `loans:` entry (`readRoles`, `writeRoles`) |
| Which four things the public sees about the committee | `lib/karya/queries.ts` → `PUBLIC_FIELDS` |
| The wording of a verification or reset email | `lib/email/templates.ts` |
| The bank / eSewa / Khalti details and QR codes | Admin Panel → Fund management → Payment settings |
| A new item in the Admin Panel menu | `components/admin/AdminNav.tsx` |
| A new item in the member menu | `components/member/MemberNav.tsx` |
| A new item in the public website menu | `config/site.ts` |
| Which pages stay open while signed out | `middleware.ts` → `OPEN_PAGES` |
| The organization's name, address or phone | Admin Panel → Settings (defaults in `config/site.ts`) |
| Who may open the collection accounting screens | `app/admin/(panel)/fund/accounting/page.tsx` and `.../contributors/page.tsx` (the guard in the first lines) |
| The list of 77 districts or their provinces | `config/districts.ts` |
| The activity types in the district form | `lib/district/schemas.ts` → `ACTIVITY_TYPE_OPTIONS` |
| Which number appears on a notification or when it is sent | `lib/notifications.ts` and the module that calls it (fund, loans, members, messages) |

### 41.7 Collection accounting and the Super Admin overview

| File | What it controls |
|---|---|
| `lib/fund/collection.ts` | **Every figure on the accounting screens** - the 13 cards, the last 12 months, and the member-wise contribution rows with their search and filters |
| `app/admin/(panel)/fund/accounting/page.tsx` | The accounting screen: cards, the month picker, the 12-month bars and the CSV links |
| `app/admin/(panel)/fund/contributors/page.tsx` | The member-wise report: search (name / email / member ID / district / phone), month, status and district filters, totals and paging |
| `app/admin/(panel)/master/page.tsx` | The master dashboard: members, monthly contribution, loans, district work and payments side by side (never added together) |
| `app/api/admin/fund/reports/route.ts` | The CSV and JSON downloads behind the report buttons |

### 41.8 District work (all 77 districts)

| File | What it controls |
|---|---|
| `config/districts.ts` | The 77 districts and their provinces (reference data) |
| `lib/district/schemas.ts` | The activity form rules, plus the type and status lists and their colours |
| `lib/district/analytics.ts` | **Every total** on the analytics screen: activities, beneficiaries, members, fund used, and the breakdowns by province, type, year and district |
| `app/admin/(panel)/districts/page.tsx` | The screen itself: the cards, the filters, the three breakdown tables and the records table |
| `lib/api/resources.ts` (search for `'district-activities':`) | Which table it uses, which fields the search looks at, and who may change it |

### 41.9 Notifications and messages

| File | What it controls |
|---|---|
| `lib/notifications.ts` | **The single place that writes a notification**, used by the fund, loans, member accounts and messages |
| `app/api/notifications/route.ts` | The list and the "mark as read" API (always the signed-in person's own notifications) |
| `components/shared/NotificationCentre.tsx` | The list itself: skeleton while loading, empty state, mark one / mark all as read |
| `app/member/(panel)/notifications/page.tsx` | The member's notification screen |
| `app/admin/(panel)/notifications/page.tsx` | The administrator's notification screen |
| `app/api/member/messages/route.ts` | The member's conversation with the office (read and send) |
| `components/member/MessageThread.tsx` | The conversation and the write box the member uses |
| `app/member/(panel)/messages/page.tsx` | The page the member opens to write to the office |
| `app/api/admin/member-messages/route.ts` | **The office's side**: list of conversations, one conversation, and sending a reply |
| `app/admin/(panel)/member-messages/page.tsx` | **Where the office answers a member** - choose a conversation on the left, read it and reply on the right |
| `components/admin/MemberConversation.tsx` | The conversation and the reply box the office uses |

**Careful - two screens with similar names, and they are different things:**

| Screen | What it is |
|---|---|
| Admin Panel → Inbox → **Messages from members** (`/admin/member-messages`) | The private conversation between a member and the office (the `Message` table) |
| Admin Panel → Inbox → **Contact messages** (`/admin/messages`) | What strangers typed into the contact form on the public website (the `ContactMessage` table). Its API is the generic `/api/admin/messages` |

### 41.10 Two folders that are NOT part of the website

| Folder | What it is |
|---|---|
| `tools/` | The automatic tests (`test-loans.mjs`, `test-collection.mjs`, `test-new-modules.mjs`) and two small helpers (`cleanup-test-rows.cjs` removes leftover test accounts, `diagnose.cjs` prints the database file and row counts). They run against your own computer and are **not** uploaded to GitHub and **not** in the delivered zip. Run any of them with the development server running, for example `node tools/test-new-modules.mjs` |
| `private/` | Signed loan agreements and other private files. Kept outside the public website folder, listed in `.gitignore`, and never included in a zip |

## Final word

Everything is labelled, commented and grouped so that you can find any part of the
site quickly:

1. **Colours** → `config/theme.ts`
2. **Name, logo, menu** → `config/site.ts`
3. **A page** → the matching folder in `app/(site)/`
4. **A form** → `components/forms/`
5. **The panels** → `app/admin/(panel)/…` and `app/member/(panel)/…`
6. **Security** → `middleware.ts`, `lib/auth/guard*.ts`, `lib/api/guard.ts`
7. **Database** → `prisma/schema.prisma`

And remember: almost everything the organization needs to change day to day is
changed from **`/admin`**, without opening a single code file.
