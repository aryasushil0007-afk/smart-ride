const router = require('express').Router();
const { load, save, uid, notify } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/plans', (req, res) => res.json(load().plans.filter((p) => p.active)));

router.use(requireAuth, requireRole('user'));

function expireOld(db) {
  const now = new Date();
  db.subscriptions.forEach((s) => { if (s.status === 'active' && new Date(s.endDate) < now) { s.status = 'expired'; notify(s.userId, 'Subscription ended', `Your ${s.planName} plan has ended. Renew to keep your driver and schedule.`); } });
}

function assignDriver(db, sub) {
  const candidates = db.drivers.filter((d) => d.verified).map((d) => ({ d, load: db.subscriptions.filter((s) => s.driverId === d.id && s.status === 'active').length })).filter((x) => x.load < x.d.capacity).sort((a, b) => a.load - b.load);
  if (!candidates.length) return null;
  return candidates[0].d;
}

const decorate = (db, s) => {
  const d = db.drivers.find((x) => x.id === s.driverId);
  const du = d && db.users.find((u) => u.id === d.userId);
  return { ...s, driver: d ? { name: du.name, mobile: du.mobile, vehicle: d.vehicle } : null };
};

router.get('/subscriptions/mine', (req, res) => {
  const db = load(); expireOld(db); save();
  res.json(db.subscriptions.filter((s) => s.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((s) => decorate(db, s)));
});

router.post('/subscriptions', (req, res) => {
  const { planId, pickup, drop, pickupTime, dropTime } = req.body;
  const db = load();
  const plan = db.plans.find((p) => p.id === planId && p.active);
  if (!plan) return res.status(400).json({ error: 'Please select a valid plan.' });
  if (!pickup || !drop || !pickupTime || !dropTime) return res.status(400).json({ error: 'Pickup, drop locations and timings are required.' });
  if (db.subscriptions.find((s) => s.userId === req.user.id && ['active', 'pending_payment'].includes(s.status))) return res.status(409).json({ error: 'You already have an active or unpaid subscription. Cancel it or complete the payment first.' });
  const sub = { id: uid('s'), userId: req.user.id, planId, planName: plan.name, months: plan.months, amount: plan.amount, pickup, drop, pickupTime, dropTime, status: 'pending_payment', driverId: null, startDate: null, endDate: null, createdAt: new Date().toISOString() };
  db.subscriptions.push(sub);
  Object.assign(req.user, { pickup, drop, pickupTime, dropTime });
  save();
  res.json(sub);
});

router.post('/payments/pay', (req, res) => {
  const { subscriptionId, method = 'UPI' } = req.body;
  const db = load();
  const sub = db.subscriptions.find((s) => s.id === subscriptionId && s.userId === req.user.id);
  if (!sub || sub.status !== 'pending_payment') return res.status(400).json({ error: 'No pending payment found for this subscription.' });
  // Demo gateway: replace with Razorpay/Stripe order + signature verification.
  const payment = { id: uid('pay'), subscriptionId: sub.id, userId: req.user.id, amount: sub.amount, method, status: 'success', txnId: 'TXN' + Date.now(), createdAt: new Date().toISOString() };
  db.payments.push(payment);
  const start = new Date(); const end = new Date(start); end.setMonth(end.getMonth() + sub.months);
  sub.status = 'active'; sub.startDate = start.toISOString(); sub.endDate = end.toISOString();
  const driver = assignDriver(db, sub);
  sub.driverId = driver ? driver.id : null;
  const invoice = { id: uid('inv'), invoiceNo: 'INV-' + (++db.counters.invoice), paymentId: payment.id, subscriptionId: sub.id, userId: req.user.id, planName: sub.planName, amount: sub.amount, tax: Math.round(sub.amount * 0.05), method, createdAt: payment.createdAt };
  db.invoices.push(invoice);
  notify(req.user.id, 'Payment received', `₹${sub.amount} paid for the ${sub.planName} plan. Invoice ${invoice.invoiceNo} is ready.`);
  if (driver) { notify(req.user.id, 'Driver assigned', 'Your driver and vehicle are assigned. Daily pickup starts tomorrow.'); notify(driver.userId, 'New rider assigned', `${req.user.name} has been added to your route.`); }
  else { notify(req.user.id, 'Driver assignment pending', 'We are finding a driver on your route. You will be notified shortly.'); db.users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id, 'Unassigned subscription', `${req.user.name} needs a driver.`)); }
  save();
  res.json({ payment, invoice, subscription: decorate(db, sub) });
});

router.post('/subscriptions/:id/cancel', (req, res) => {
  const db = load();
  const sub = db.subscriptions.find((s) => s.id === req.params.id && s.userId === req.user.id);
  if (!sub || !['active', 'pending_payment'].includes(sub.status)) return res.status(400).json({ error: 'This subscription cannot be cancelled.' });
  sub.status = 'cancelled'; sub.cancelledAt = new Date().toISOString();
  notify(req.user.id, 'Subscription cancelled', 'Your subscription was cancelled. You can subscribe again any time.');
  save(); res.json(sub);
});

router.get('/invoices/mine', (req, res) => res.json(load().invoices.filter((i) => i.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
router.get('/payments/mine', (req, res) => res.json(load().payments.filter((p) => p.userId === req.user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))));

router.get('/notifications', (req, res) => res.json(load().notifications.filter((n) => n.userId === req.user.id)));
router.post('/notifications/read', (req, res) => { load().notifications.filter((n) => n.userId === req.user.id).forEach((n) => (n.read = true)); save(); res.json({ ok: true }); });

router.get('/complaints/mine', (req, res) => res.json(load().complaints.filter((c) => c.userId === req.user.id)));
router.post('/complaints', (req, res) => {
  const { type = 'complaint', subject, message } = req.body;
  if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required.' });
  const db = load();
  db.complaints.unshift({ id: uid('c'), userId: req.user.id, userName: req.user.name, type, subject, message, status: 'open', response: '', createdAt: new Date().toISOString(), resolvedAt: null });
  db.users.filter((u) => u.role === 'admin').forEach((a) => notify(a.id, 'New ' + type, subject));
  save(); res.json({ ok: true });
});

module.exports = router;
