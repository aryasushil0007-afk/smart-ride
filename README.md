# Smart Ride – Monthly Pickup & Drop Subscription Platform

Fixed pickup and drop, same driver and vehicle, one predictable price.

## Run it
```bash
npm install
npm start
```
Open http://localhost:3000

## Demo logins
| Role | Login | Password |
|---|---|---|
| Admin | admin@smartride.com | Admin@123 |
| Driver | ramesh@smartride.com | Driver@123 |
| Rider | sign up on the home page | |

## Try the full flow
1. Sign up as a rider, choose a plan, enter pickup and drop, pay.
2. A verified driver is assigned automatically; open the My ride tab.
3. Log in as the driver and mark pickups or drops as done.
4. Log in as admin to see KPIs, verify new drivers, and reply to complaints.

Check the API end to end: start the server, then run `node tests/smoke.js`.

Docs: `docs/PRD.md` and `docs/TECHNICAL.md`.
