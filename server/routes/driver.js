const router = require('express').Router();
const { load, save, uid, notify } = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const DRIVER_SHARE = 0.8, WORKING_DAYS = 26;

router.use(requireAuth, requireRole('driver'));
const me = (req) => load().drivers.find((d) => d.userId === req.user.id);

router.get('/profile', (req, res) => res.json({ user: { name: req.user.name, email: req.user.email, mobile: req.user.mobile }, driver: me(req) }));

router.put('/profile', (req, res) => {
  const d = me(req); const { vehicleModel, vehicleNumber, seats, licenseNo, documents } = req.body;
  if (vehicleModel !== undefined) d.vehicle.model = vehicleModel;
  if (vehicleNumber !== undefined) d.vehicle.number = vehicleNumber;
  if (seats) d.vehicle.seats = +seats;
  if (licenseNo !== undefined) d.licenseNo = licenseNo;
  if (Array.isArray(documents)) d.documents = documents;
  save(); res.json(d);
});

router.get('/route', (req, res) => {
  const db = load(); const d = me(req);
  const riders = db.subscriptions.filter((s) => s.driverId === d.id && s.status === 'active').map((s) => { const u = db.users.find((x) => x.id === s.userId); return { subscriptionId: s.id, name: u.name, mobile: u.mobile, pickup: s.pickup, drop: s.drop, pickupTime: s.pickupTime, dropTime: s.dropTime, endDate: s.endDate }; }).sort((a, b) => a.pickupTime.localeCompare(b.pickupTime));
  res.json({ verified: d.verified, riders });
});

router.get('/attendance', (req, res) => {
  const d = me(req); const date = req.query.date || new Date().toISOString().slice(0, 10);
  res.json(load().attendance.filter((a) => a.driverId === d.id && a.date === date));
});

router.post('/attendance', (req, res) => {
  const { subscriptionId, leg, status, date = new Date().toISOString().slice(0, 10) } = req.body;
  const db = load(); const d = me(req);
  const sub = db.subscriptions.find((s) => s.id === subscriptionId && s.driverId === d.id);
  if (!sub) return res.status(404).json({ error: 'Rider not on your route.' });
  if (!['pickup', 'drop'].includes(leg) || !['completed', 'absent'].includes(status)) return res.status(400).json({ error: 'Invalid attendance data.' });
  let rec = db.attendance.find((a) => a.subscriptionId === subscriptionId && a.leg === leg && a.date === date);
  if (rec) rec.status = status; else { rec = { id: uid('a'), driverId: d.id, subscriptionId, userId: sub.userId, leg, status, date, earning: 0 }; db.attendance.push(rec); }
  rec.earning = status === 'completed' ? Math.round((sub.amount / (sub.months * WORKING_DAYS * 2)) * DRIVER_SHARE) : 0;
  notify(sub.userId, leg === 'pickup' ? 'Pickup update' : 'Drop update', `Your ${leg} on ${date} is marked ${status}.`);
  save(); res.json(rec);
});

router.get('/earnings', (req, res) => {
  const d = me(req); const recs = load().attendance.filter((a) => a.driverId === d.id && a.status === 'completed');
  const byMonth = {}; recs.forEach((r) => { const m = r.date.slice(0, 7); byMonth[m] = byMonth[m] || { month: m, trips: 0, amount: 0 }; byMonth[m].trips++; byMonth[m].amount += r.earning; });
  res.json({ total: recs.reduce((s, r) => s + r.earning, 0), trips: recs.length, months: Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month)), share: DRIVER_SHARE * 100 });
});

module.exports = router;
