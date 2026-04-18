# GISS-SG Specialty Group Website

The website of the **Geographic Information Science and Systems Specialty Group**, an American Association of Geographers (AAG) specialty group. A modern rebuild of the prior WordPress site, preserving a decade of community content while giving future board members a simple way to publish updates.

Live site: 
Repository: github.com/rohan-debayan/GISS_AAG_Website_Build

---

## Contents

- [What this is](#what-this-is)
- [Tech stack](#tech-stack)
- [For board members: how to post content](#for-board-members-how-to-post-content)
- [For developers: running locally](#for-developers-running-locally)
- [Project structure](#project-structure)
- [Deployment](#deployment)
- [Scripts reference](#scripts-reference)
- [Credits](#credits)

---

## What this is

A content-driven website for a research specialty group. The site surfaces:

- **News** posts from the group (2015 onwards)
- **Awards** with dedicated pages per honor (Student Honors Paper Competition, Aangeenbrug Award, Waldo Tobler Distinguished Lecture), each with current-year winners plus a historical list
- **Annual event details** for each award year (poster, date, location, session agendas with presenters)
- **Officers** directory with photos, affiliations, and social links
- **Gallery** of photos from meetings and receptions
- **Reports** (business meeting minutes, budgets, presentations) with per-document public-or-officers-only visibility
- **Newsletters** rendered as an interactive PDF carousel
- **Constitution** and other evergreen governance pages

The design is editorial (Fraunces serif + Inter sans; forest green + terracotta palette; Grand Canyon shaded relief hero).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, React 19) |
| CMS | **Payload CMS 3.83** embedded in the same Next.js app |
| Database | **PostgreSQL 16** (via Drizzle) |
| File storage | Local filesystem in dev, Cloudflare R2 in production |
| Email | **Resend** for password resets and admin invitations |
| Rich text | Lexical editor with fixed toolbar, link and upload features |
| Image optimization | Next.js Image + Payload Sharp variants (thumbnail 400x400, card 800x600, hero 1920x1080) |
| PDF rendering | `react-pdf` for the newsletter carousel |
| Hosting | **Railway** (app + managed Postgres) |
| Domain | `aag-giss-sg.org` (planned) |

Everything runs in one Node.js service. Admin panel (`/admin`) and public site share the same server; content edits appear on the public site instantly.

## For board members: how to post content

Log in at **`/admin`** with your email and password. (Forgot password? Click the link, it emails a reset to you.)

### Common tasks

| I want to... | Go to |
|---|---|
| Write a news post | Content → Posts → Create New |
| Add a current officer | People → Officers → Create New |
| Upload an award winner's photo | Content → Award Winners → Create New |
| Add the year's event schedule (poster, agenda) | Content → Award Events → Create New |
| Upload a newsletter PDF | Content → Newsletters → Create New |
| Post a business meeting minutes document | Content → Reports → Create New (set visibility to Officers only) |
| Add a gallery photo | Library → Gallery → Create New |
| Edit an existing page | Content → Pages → click the page |

### Tips

- Every form field has a small description below it explaining what it's for.
- Images upload once, resize automatically.
- Posts and pages support **drafts**: save without publishing, come back later.
- Reports default to "Officers only" visibility since minutes often contain internal deliberations. Switch to "Public" for items that are safe to share.
- The rich-text editor has a toolbar above every content field: headings, bold, italic, links, images, lists, tables.

## For developers: running locally

### Prerequisites

- **Node.js** 20.x or 22.x (v24 also works)
- **Docker Desktop** (for Postgres)
- **Git**

### Setup

```bash
# 1. Clone
git clone https://github.com/rohan-debayan/GISS_AAG_Website_Build.git

# 2. Install dependencies
npm install

# 3. Copy the env template
cp .env.example .env
# then edit .env: set PAYLOAD_SECRET, RESEND_API_KEY if you need email locally

# 4. Start Postgres (Docker)
npm run db:up

# 5. Start the dev server
npm run dev
```

Open **http://localhost:3000**. First visit to `/admin` creates the first admin user.

### Useful dev commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run start        # serve the production build
npm run lint         # ESLint
npm run db:up        # start local Postgres via docker-compose
npm run db:down      # stop + remove container (volume persists)
npm run db:logs      # tail Postgres logs
```

## Project structure

```
root/
├── docker-compose.yml        Local Postgres
├── next.config.ts            Next.js + image domain config
├── package.json
├── public/
│   └── images/               Hero, logos, favicons
├── scripts/                  One-off CLI scripts (see Scripts reference)
└── src/
    ├── access/
    │   └── byRole.ts         Access control helpers (admin / editor / author)
    ├── app/
    │   ├── (frontend)/       Public site routes
    │   │   ├── page.tsx              home
    │   │   ├── blog/                 /blog, /blog/[slug]
    │   │   ├── awards/               /awards, /awards/[slug]
    │   │   ├── officers/
    │   │   ├── gallery/
    │   │   ├── reports/
    │   │   ├── newsletters/
    │   │   ├── pages/[slug]/         generic CMS pages
    │   │   └── components/           SiteHeader, SiteFooter, OfficerAvatar, PdfCarousel...
    │   └── (payload)/        Admin panel routes (auto-generated)
    ├── collections/          Payload collection schemas
    │   ├── Users.ts
    │   ├── Officers.ts
    │   ├── Posts.ts
    │   ├── Pages.ts
    │   ├── Media.ts
    │   ├── Gallery.ts
    │   ├── Winners.ts
    │   ├── AwardEvents.ts
    │   ├── Reports.ts
    │   ├── Events.ts
    │   ├── Newsletters.ts
    │   └── Jobs.ts
    └── payload.config.ts     Top-level Payload + DB + editor + email config
```

## Deployment

**Production target:** Railway (app service + managed Postgres + auto-HTTPS).

Railway reads `railway.json` at the repo root and picks up the Next.js app. Every push to `main` triggers a deploy.

### Environment variables

Set these in the Railway service settings:

| Variable | What it is |
|---|---|
| `DATABASE_URL` | Injected automatically when Postgres plugin is added |
| `PAYLOAD_SECRET` | Random 96-char hex string; never commit |
| `NEXT_PUBLIC_SERVER_URL` | The public URL the app is served at |
| `RESEND_API_KEY` | From resend.com dashboard |
| `RESEND_FROM` | `no-reply@your-domain.org` once domain is verified; otherwise `onboarding@resend.dev` |
| `RESEND_FROM_NAME` | `GISS-SG Specialty Group` |

## Access model

Four roles, enforced by `src/access/byRole.ts`:

| Role | Can |
|---|---|
| **admin** | Anything, including managing users |
| **editor** | Create/edit/delete all content, but can't touch users |
| **author** | CRUD their own posts, read-only elsewhere |
| *(none)* | Public visitor |

Reports have a per-document `visibility` flag (`public` | `officers`). Anonymous visitors see only public reports. Other collections are public read.

## Credits

- **Design & build:** Debayan Mandal (Communications Director, GISS-SG), 2026
- **Content:** A decade of work from all past board members, preserved from the original WordPress site
- **Hero imagery:** USGS National Map shaded relief of the Grand Canyon region (public domain)
- **CMS:** [Payload 3](https://payloadcms.com)
- **Framework:** [Next.js 16](https://nextjs.org)

## License

All content © the Geographic Information Science and Systems Specialty Group of the American Association of Geographers. All rights reserved.

The application code is MIT licensed; see `LICENSE` if provided.
