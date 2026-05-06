# SubTracker

SubTracker is a dark fintech-style web app for tracking recurring subscriptions, understanding monthly and yearly spend, and managing user accounts. It is built as a university web development project and as a portfolio-ready Express/EJS application.

## Current Status

The project now covers FR1-FR5 core work:

- Public pages: home, about, contact
- Full subscription CRUD: list, details, create, edit, delete
- Client-side and server-side validation for subscription forms
- Session authentication with registration, login, logout, password hashing, and guest guards
- Protected routes with user-scoped subscription data
- Admin panel with user management, subscription overview, aggregate stats, and charts
- User dashboard with Chart.js analytics, summary cards, upcoming payments, and spending breakdowns
- Profile page with account details, profile update, password change, preferences UI, and account deletion
- Custom 404/500 pages, flash messages, breadcrumbs, responsive navigation, and polished dark UI

FR6, XML export and XSLT report generation, is the main remaining university requirement.

## Recent Work Logged

Since the older README version, the following work has been added:

- Implemented FR5 authentication using `bcryptjs`, `express-session`, and route guards.
- Added role-aware navigation and admin-only middleware.
- Scoped subscriptions so regular users only access their own records.
- Built the admin dashboard and user management screens.
- Built the authenticated analytics dashboard with Chart.js.
- Added the profile/settings page with password and account management flows.
- Expanded seed data to include multiple realistic users and subscriptions.
- Refined the visual system toward the current SubTracker dark theme.
- Synced Prisma migrations with the current `User` schema and cascade delete behavior.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | Express.js |
| Templates | EJS + express-ejs-layouts |
| Database | PostgreSQL |
| ORM | Prisma |
| Styling | Tailwind CSS CDN + custom CSS |
| Charts | Chart.js |
| Auth | bcryptjs + express-session + connect-flash |
| Icons | Lucide Icons |
| Font | Inter |

## Project Structure

```text
ai-subscription-analyzer/
├── app.js
├── middleware/
│   └── auth.js
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   ├── css/styles.css
│   └── js/
├── routes/
│   ├── admin.js
│   ├── auth.js
│   ├── index.js
│   ├── profile.js
│   └── subscriptions.js
├── utils/
│   ├── helpers.js
│   └── validators.js
├── views/
│   ├── admin/
│   ├── auth/
│   ├── errors/
│   ├── layouts/
│   ├── partials/
│   ├── subscriptions/
│   ├── dashboard.ejs
│   ├── home.ejs
│   └── profile.ejs
└── seed.js
```

## Getting Started

Install dependencies:

```bash
npm install
```

Create the environment file:

```bash
cp .env.example .env
```

Set your PostgreSQL connection in `.env`:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/ai_subscription_analyzer"
SESSION_SECRET="your-super-secret-session-key-change-this"
PORT=3000
NODE_ENV=development
```

Run migrations and seed the database:

```bash
npx prisma migrate dev
npm run seed
```

Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo Credentials

| Role | Username | Email | Password |
| --- | --- | --- | --- |
| Admin | `admin` | `admin@subtracker.app` | `admin123` |
| User | `testuser` | `user@example.com` | `user123` |
| User | `demo` | `demo@example.com` | `demo123` |

The seed script also creates several additional demo users with realistic subscription data.

## Main Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/` | Landing page |
| GET | `/about` | About page |
| GET | `/contact` | Contact page |
| GET | `/register` | Registration page |
| POST | `/register` | Create account |
| GET | `/login` | Login page |
| POST | `/login` | Create session |
| POST | `/logout` | Destroy session |
| GET | `/dashboard` | User analytics dashboard |
| GET | `/subscriptions` | User subscription list |
| GET | `/subscriptions/new` | New subscription form |
| POST | `/subscriptions` | Create subscription |
| GET | `/subscriptions/:id` | Subscription details |
| GET | `/subscriptions/:id/edit` | Edit subscription form |
| PUT | `/subscriptions/:id` | Update subscription |
| DELETE | `/subscriptions/:id` | Delete subscription |
| GET | `/profile` | Profile and settings |
| POST | `/profile` | Update profile |
| POST | `/profile/password` | Change password |
| DELETE | `/profile` | Delete account |
| GET | `/admin` | Admin dashboard |
| GET | `/admin/users` | User management |
| GET | `/admin/users/:id` | User details |
| DELETE | `/admin/users/:id` | Delete user |
| GET | `/admin/subscriptions` | All subscriptions overview |

## Requirement Progress

| Requirement | Status |
| --- | --- |
| FR1: Public pages | Done |
| FR2: Subscription CRUD | Done |
| FR3: Validation and error handling | Mostly done |
| FR4: Routing, layout polish, flash messages, 404/500 | Done |
| FR5: Auth, admin, dashboard, profile | Mostly done |
| FR6: XML export + XSLT report | Not started |

## Notes

- EJS templates must not use `require()`. Shared helpers are exposed through `app.locals` in `app.js`.
- HTML forms use `method-override` for PUT and DELETE requests.
- Prisma Client is accessed through the singleton helper in `utils/helpers.js`.
- `.env`, `node_modules`, virtual environments, and local Claude settings are ignored by git.
