const router = require('express').Router();
const { load, save, uid, notify } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
router.use(requireAuth, requireRole('admin'));

router.get('/stats', (req, res) => {
  const db = load();
  const active = db.subscriptions.filter((s) => s.status === 'active');
  const mrr = Math.round(active.reduce((s, x) => s + x.amount / x.months, 0));
  const paidUsers = new Set(db.subscriptions.filter((s) => s.status !== 'pending_payment').map((s) => s.userId));
  const repeat = [...paidUsers].filter((u) => db.subscriptions.filter((s) => s.userId === u && s.status !== 'pending_payment').length > 1).length;
  const verified = db.drivers.filter((d) => d.verified);
  const capacity = verified.reduce((s, d) => s + d.capacity, 0);
  const resolved = db.complaints.filter((c) => c.resolvedAt);
  const avgHours = resolved.length ? resolved.reduce((s, c) => s + (new Date(c.resolvedAt) - new Date(c.createdAt)) / 36e5, 0) / resolved.length : 0;
  const revenue = {}; db.payments.forEach((p) => { const m = p.createdAt.slice(0, 7); revenue[m] = (revenue[m] || 0) + p.amount; });
  res.json({
    activeSubscriptions: active.length, mrr,
    retentionRate: paidUsers.size ? Math.round((repeat / paidUsers.size) * 100) : 0,
    driverUtilization: capacity ? Math.round((active.filter((s) => s.driverId).length / capacity) * 100) : 0,
    avgResolutionHours: +avgHours.toFixed(1),
    totalUsers: db.users.filter((u) => u.role === 'user').length, totalDrivers: db.drivers.length,
    openComplaints: db.complaints.filter((c) => c.status === 'open').length,
    unassigned: active.filter((s) => !s.driverId).length,
    totalRevenue: db.payments.reduce((s, p) => s + p.amount, 0),
    revenueByMonth: Object.entries(revenue).sort().map(([month, amount]) => ({ month, amount })),
  });
});

router.get('/users', (req, res) => {
  const db = load();
  res.json(db.users.filter((u) => u.role === 'user').map(({ passwordHash, ...u }) => ({ ...u, subscription: db.subscriptions.filter((s) => s.userId === u.id && s.status === 'active').map((s) => s.planName)[0] || 'None' })));
});

router.get('/drivers', (req, res) => {
  const db = load();
  res.json(db.drivers.map((d) => { const u = db.users.find((x) => x.id === d.userId); return { ...d, name: u.name, email: u.email, mobile: u.mobile, riders: db.subscriptions.filter((s) => s.driverId === d.id && s.status === 'active').length }; }));
});

router.put('/drivers/:id/verify', (req, res) => {
  const d = load().drivers.find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Driver not found.' });
  d.verified = !!req.body.verified; notify(d.userId, d.verified ? 'Account verified' : 'Verification removed', d.verified ? 'You can now receive riders.' : 'Please contact support.');
  save(); res.json(d);
});

router.get('/subscriptions', (req, res) => {
  const db = load();
  res.json(db.subscriptions.filter((s) => s.status !== 'pending_payment').map((s) => { const u = db.users.find((x) => x.id === s.userId); const d = db.drivers.find((x) => x.id === s.driverId); const du = d && db.users.find((x) => x.id === d.userId); return { ...s, userName: u && u.name, driverName: du ? du.name : null }; }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
});

router.put('/subscriptions/:id/driver', (req, res) => {
  const db = load(); const s = db.subscriptions.find((x) => x.id === req.params.id); const d = db.drivers.find((x) => x.id === req.body.driverId);
  if (!s || !d) return res.status(404).json({ error: 'Subscription or driver not found.' });
  if (!d.verified) return res.status(400).json({ error: 'Only verified drivers can be assigned.' });
  if (db.subscriptions.filter((x) => x.driverId === d.id && x.status === 'active' && x.id !== s.id).length >= d.capacity) return res.status(400).json({ error: 'This driver’s vehicle is full.' });
  s.driverId = d.id; notify(s.userId, 'Driver assigned', 'A driver has been assigned to your route.'); notify(d.userId, 'New rider assigned', `${s.pickup} to ${s.drop}`);
  save(); res.json(s);
});

router.get('/plans', (req, res) => res.json(load().plans));
router.post('/plans', (req, res) => {
  const { name, months, amount, perks = [] } = req.body;
  if (!name || !months || !amount) return res.status(400).json({ error: 'Name, duration and price are required.' });
  const p = { id: uid('plan'), name, months: +months, amount: +amount, active: true, perks }; load().plans.push(p); save(); res.json(p);
});
router.put('/plans/:id', (req, res) => {
  const p = load().plans.find((x) => x.id === req.params.id); if (!p) return res.status(404).json({ error: 'Plan not found.' });
  ['name', 'months', 'amount', 'active', 'perks'].forEach((k) => { if (req.body[k] !== undefined) p[k] = req.body[k]; });
  save(); res.json(p);
});

router.get('/complaints', (req, res) => res.json(load().complaints));
router.put('/complaints/:id', (req, res) => {
  const db = load(); const c = db.complaints.find((x) => x.id === req.params.id); if (!c) return res.status(404).json({ error: 'Not found.' });
  c.response = req.body.response || ''; c.status = req.body.status || 'resolved'; c.resolvedAt = c.status === 'resolved' ? new Date().toISOString() : null;
  notify(c.userId, 'Support update', `Your ${c.type} "${c.subject}" is ${c.status}.`);
  save(); res.json(c);
});

module.exports = router;
