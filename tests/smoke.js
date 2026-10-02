// Run with the server started:  npm start   then   node tests/smoke.js
const B = 'http://localhost:' + (process.env.PORT || 3000) + '/api';
const call = async (p, m = 'GET', body, t) => {
  const r = await fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json(); if (!r.ok) throw new Error(`${m} ${p}: ${d.error}`); return d;
};
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
(async () => {
  const email = `rider${Date.now()}@test.com`;
  const u = await call('/auth/signup', 'POST', { name: 'Test Rider', email, password: 'secret1' }); ok(!!u.token, 'rider signup');
  const plans = await call('/plans'); ok(plans.length >= 3, 'plans listed');
  const sub = await call('/subscriptions', 'POST', { planId: plans[0].id, pickup: 'A', drop: 'B', pickupTime: '08:30', dropTime: '18:00' }, u.token); ok(sub.status === 'pending_payment', 'subscription created');
  const paid = await call('/payments/pay', 'POST', { subscriptionId: sub.id, method: 'UPI' }, u.token); ok(paid.subscription.status === 'active' && !!paid.subscription.driver, 'payment activates plan and assigns driver');
  ok((await call('/invoices/mine', 'GET', null, u.token)).length === 1, 'invoice generated');
  const d = await call('/auth/login', 'POST', { identifier: paid.subscription.driver.mobile, password: 'Driver@123' });
  const route = await call('/driver/route', 'GET', null, d.token); ok(route.riders.some((r) => r.subscriptionId === sub.id), 'driver sees rider');
  const att = await call('/driver/attendance', 'POST', { subscriptionId: sub.id, leg: 'pickup', status: 'completed' }, d.token); ok(att.earning > 0, 'attendance earns payout');
  const a = await call('/auth/login', 'POST', { identifier: 'admin@smartride.com', password: 'Admin@123' });
  const st = await call('/admin/stats', 'GET', null, a.token); ok(st.activeSubscriptions >= 1 && st.mrr > 0, 'admin KPIs');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
