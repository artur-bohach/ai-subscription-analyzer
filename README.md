# AI Subscription Analyzer

A modern web application for tracking and analyzing your recurring digital subscriptions, built with Node.js, Express, EJS, PostgreSQL and Prisma ORM.

## Features

- **Full CRUD** — create, view, edit and delete subscriptions
- **Financial summary** — monthly/yearly totals calculated from all billing cycles
- **Billing cycle normalization** — weekly, monthly and yearly costs compared apples-to-apples
- **Multi-currency support** — EUR, USD, GBP and more
- **Status tracking** — active, paused, cancelled with color-coded badges
- **Next payment calculator** — auto-computes next due date from start date + cycle
- **Category organization** — Entertainment, Productivity, AI Tools and more
- **Glassmorphism dark UI** — modern SaaS-style design with Tailwind CSS
- **Client-side validation** — real-time form feedback without page reloads
- **Flash notifications** — toast-style success/error messages (auto-dismiss)
- **Responsive design** — works on mobile, tablet and desktop
- **Auth scaffold** — session + login/logout stub ready for FR5

## Tech Stack

| Layer          | Technology                        |
|----------------|-----------------------------------|
| Runtime        | Node.js                           |
| Framework      | Express.js                        |
| Templates      | EJS + express-ejs-layouts         |
| Database       | PostgreSQL                        |
| ORM            | Prisma                            |
| Styling        | Tailwind CSS 4 (CDN)              |
| Icons          | Lucide Icons (CDN)                |
| Font           | Inter (Google Fonts)              |
| Session        | express-session + connect-flash   |
| Auth (stub)    | bcryptjs                          |

## Project Structure

```
ai-subscription-analyzer/
├── prisma/
│   └── schema.prisma          # Database schema (User + Subscription)
├── public/
│   ├── css/styles.css         # Glassmorphism styles, animations
│   └── js/validation.js       # Client-side validation & interactivity
├── views/
│   ├── layouts/main.ejs       # Root HTML layout (head, navbar, footer)
│   ├── partials/
│   │   ├── navbar.ejs         # Responsive navbar with active-link highlight
│   │   ├── footer.ejs
│   │   └── flash.ejs          # Toast notifications
│   ├── home.ejs               # Landing page
│   ├── about.ejs              # About + FAQ accordion
│   ├── contact.ejs            # Contact form (UI only)
│   ├── login.ejs              # Login page (FR5 stub)
│   ├── error.ejs              # 404 / 500 error page
│   └── subscriptions/
│       ├── index.ejs          # Dashboard table with summary cards
│       ├── show.ejs           # Subscription detail view
│       ├── new.ejs            # Create form
│       └── edit.ejs           # Edit form with danger zone
├── routes/
│   ├── index.js               # Public routes: /, /about, /contact
│   ├── subscriptions.js       # CRUD routes: /subscriptions/*
│   └── auth.js                # Auth routes: /login, /logout
├── middleware/
│   └── auth.js                # requireAuth / requireAdmin guards (stub)
├── utils/
│   └── helpers.js             # Prisma singleton + helper functions
├── seed.js                    # Database seed script
├── app.js                     # Express app entry point
├── .env.example               # Environment variable template
└── package.json
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and set your PostgreSQL connection string:

```
DATABASE_URL="postgresql://username:password@localhost:5432/ai_subscription_analyzer"
SESSION_SECRET="your-random-secret-key"
```

### 3. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 4. Seed with sample data

```bash
node seed.js
```

This creates:
- 1 admin user (`admin` / `admin123`)
- 10 sample subscriptions across categories

### 5. Start the server

```bash
npm start        # production
npm run dev      # development (with nodemon auto-reload)
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Default Credentials

| Username | Password  |
|----------|-----------|
| `admin`  | `admin123`|

## Implemented Requirements

| ID  | Feature                                      | Status |
|-----|----------------------------------------------|--------|
| FR1 | Public pages: Home, About, Contact           | ✅     |
| FR2 | CRUD for subscriptions                       | ✅     |
| FR3 | Glassmorphism dark UI + responsive design    | ✅     |
| FR4 | Financial calculations (monthly/yearly)      | ✅     |
| FR5 | Auth scaffold (login/session stub)           | 🔶 stub|

## Available Routes

| Method | Route                          | Description              |
|--------|--------------------------------|--------------------------|
| GET    | `/`                            | Home / landing page      |
| GET    | `/about`                       | About page + FAQ         |
| GET    | `/contact`                     | Contact form             |
| GET    | `/login`                       | Login page               |
| POST   | `/login`                       | Process login            |
| POST   | `/logout`                      | Logout                   |
| GET    | `/subscriptions`               | List all subscriptions   |
| GET    | `/subscriptions/new`           | New subscription form    |
| POST   | `/subscriptions`               | Create subscription      |
| GET    | `/subscriptions/:id`           | View subscription        |
| GET    | `/subscriptions/:id/edit`      | Edit subscription form   |
| PUT    | `/subscriptions/:id`           | Update subscription      |
| DELETE | `/subscriptions/:id`           | Delete subscription      |
