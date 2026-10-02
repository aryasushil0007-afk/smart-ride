# Product Requirements Document – Smart Ride

## 1. Overview
Smart Ride is a subscription-based pickup & drop platform for daily commuters (office employees, students, working professionals). Riders get fixed pickup/drop locations and timings with the same driver and vehicle for a monthly, quarterly or yearly period.

## 2. Problem
- Inconsistent availability of daily cabs
- Frequent driver and vehicle changes
- Surge pricing and cost uncertainty
- Safety concerns for regular travellers
- Time wasted booking rides every day

## 3. Objectives
**Primary:** reliable fixed daily pickup & drop; same driver and vehicle; predictable subscription pricing; no daily booking.
**Secondary:** better safety and trust; recurring revenue; simpler transport management; long-term driver engagement.

## 4. Scope
**In scope:** registration and subscription management, fixed route/schedule, driver and vehicle assignment, online payment and invoicing, notifications, admin monitoring and support.
**Out of scope:** on-demand rides, inter-city travel, real-time fare negotiation.

## 5. Users
| Role | Goal |
|---|---|
| Rider | Reliable daily commute at a fixed price |
| Driver | Stable income from a fixed set of riders |
| Admin | Run the service: verify drivers, price plans, resolve issues |

## 6. Functional requirements and where they live
| Requirement | Implementation |
|---|---|
| Signup/login via mobile or email | `POST /api/auth/signup`, `/login`; `public/index.html` |
| Profile with pickup & drop | `PUT /api/auth/me`; User > Profile |
| Plan selection (monthly/quarterly/yearly) | `GET /api/plans`; `POST /api/subscriptions`; User > Plans |
| Fixed schedule and driver visibility | User > My ride (driver name, mobile, vehicle) |
| Online payments and invoice history | `POST /api/payments/pay`; User > Payments & invoices |
| Notifications and reminders | `/api/notifications`; User > Notifications |
| Driver onboarding and verification | Driver signup + Admin > Drivers > Verify |
| Assigned route and rider list | `GET /api/driver/route` |
| Daily attendance tracking | `POST /api/driver/attendance` |
| Earnings and payout summary | `GET /api/driver/earnings` (80% driver share per completed trip) |
| User and driver management | Admin > Users, Drivers |
| Subscription and pricing control | Admin > Plans & pricing, Subscriptions |
| Driver-route assignment | Automatic on payment (least-loaded verified driver); manual override in Admin > Subscriptions |
| Complaints and feedback | User > Support; Admin > Complaints |
| Analytics dashboard | Admin > Analytics |

## 7. User flow
Register/log in → enter pickup & drop → select plan → pay online → system assigns driver and vehicle → daily service begins → renew or cancel.

## 8. Non-functional requirements
- Performance: API responses under 3 seconds (in-memory data store, no heavy queries)
- Security: bcrypt password hashing, JWT sessions, role-based route guards; payment gateway handles card data (never stored)
- Usability: responsive Bootstrap layout, keyboard-visible focus, sentence-case plain copy
- Availability target: 99.5% (deploy behind a process manager and health check at `/api/health`)
- Scalability: multi-city ready by adding a `city` field and per-city plans; swap JSON store for PostgreSQL/MongoDB

## 9. KPIs
Active subscriptions, monthly recurring revenue (plan price ÷ months for active plans), retention rate (riders with more than one paid subscription), driver utilization (assigned riders ÷ total capacity of verified drivers), average complaint resolution time.

## 10. Assumptions and constraints
Assumptions: riders prefer fixed schedules; drivers accept long-term commitments; regular commuters adopt subscriptions.
Constraints: city transport regulations; driver availability at peak hours; traffic and route dependencies.

## 11. Future enhancements
Android/iOS apps, live GPS tracking, corporate/bulk subscriptions, AI route optimization, SOS and emergency features.
