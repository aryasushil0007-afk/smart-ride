# Technical documentation

## Stack
- Frontend: HTML5, CSS3, JavaScript, Bootstrap 5 (CDN)
- Backend: Node.js 18+, Express
- Auth: JWT + bcryptjs
- Data: JSON file store (`data/db.json`) behind `server/db.js`
- Payments: built-in demo gateway; Razorpay/Stripe hook-in point documented below
- Deployment: any Node host (AWS EC2/Elastic Beanstalk, Render, Railway)

## Folder structure
```
smart-ride-v2/
├── server/
│   ├── index.js            app entry, middleware, route mounting
│   ├── db.js               data store + notify helper
│   ├── middleware/auth.js  JWT sign/verify, role guard
│   ├── routes/             auth, user, driver, admin
│   └── utils/seed.js       demo admin, plans, drivers
├── public/                 index, user, driver, admin pages
│   ├── css/style.css
│   └── js/                 common, user, driver, admin
├── data/                   db.json is created here on first run
├── docs/                   PRD.md, TECHNICAL.md
├── tests/smoke.js          end-to-end API check
└── .vscode/                settings, launch config, extensions
```

## Data model
- **users**: id, name, email, mobile, role (user|driver|admin), passwordHash, pickup, drop, pickupTime, dropTime
- **drivers**: id, userId, licenseNo, vehicle{model,number,seats}, documents[], verified, capacity
- **plans**: id, name, months, amount, active, perks[]
- **subscriptions**: id, userId, planId, amount, months, pickup, drop, pickupTime, dropTime, status (pending_payment|active|cancelled|expired), driverId, startDate, endDate
- **payments / invoices**: payment record per charge; invoice numbered `INV-xxxx` with 5% GST shown
- **attendance**: driverId, subscriptionId, leg (pickup|drop), status (completed|absent), date, earning
- **complaints, notifications**

## API summary
| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/signup`, `POST /api/auth/login`, `GET/PUT /api/auth/me` |
| Rider | `GET /api/plans`, `GET/POST /api/subscriptions[/mine]`, `POST /api/subscriptions/:id/cancel`, `POST /api/payments/pay`, `GET /api/invoices/mine`, `GET /api/payments/mine`, `GET /api/notifications`, `POST /api/notifications/read`, `GET/POST /api/complaints[/mine]` |
| Driver | `GET/PUT /api/driver/profile`, `GET /api/driver/route`, `GET/POST /api/driver/attendance`, `GET /api/driver/earnings` |
| Admin | `GET /api/admin/stats|users|drivers|subscriptions|plans|complaints`, `PUT /api/admin/drivers/:id/verify`, `PUT /api/admin/subscriptions/:id/driver`, `POST/PUT /api/admin/plans`, `PUT /api/admin/complaints/:id` |

## Business rules
- One active or unpaid subscription per rider at a time.
- On successful payment: plan activates, end date = start + plan months, invoice is created, and the verified driver with the most free seats is assigned. If none is free, the admin is notified to assign manually.
- Expired plans are marked on the next read and the rider is notified.
- Driver payout per completed trip = plan amount ÷ (months × 26 working days × 2 trips) × 80%.

## Plugging in Razorpay / Stripe
In `server/routes/user.js`, `POST /payments/pay` is the only place that marks a payment successful. Replace it with two steps: create a gateway order when the subscription is created, then verify the gateway's signature (Razorpay `razorpay_signature` / Stripe webhook) before activating the plan. Put keys in `.env`.

## Moving to a real database
All reads and writes go through `load()` and `save()` in `server/db.js`. Replace them with MongoDB or PostgreSQL queries; the route logic stays the same.

## Deployment checklist
Set a strong `JWT_SECRET`, change the seeded admin password, serve over HTTPS, run with `node server/index.js` under a process manager, and use `/api/health` for uptime checks.
