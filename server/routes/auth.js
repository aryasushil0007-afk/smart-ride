const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { load, save, uid } = require('../db');
const { sign, requireAuth } = require('../middleware/auth');

const clean = (u) => { const { passwordHash, ...rest } = u; return rest; };

router.post('/signup', (req, res) => {
  const { name, email, mobile, password, role = 'user', vehicleModel, vehicleNumber, licenseNo } = req.body;
  if (!name || !password || (!email && !mobile)) return res.status(400).json({ error: 'Name, password and an email or mobile number are required.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  if (!['user', 'driver'].includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  const db = load();
  if (db.users.find((u) => (email && u.email === email.toLowerCase()) || (mobile && u.mobile === mobile))) return res.status(409).json({ error: 'An account with this email or mobile already exists.' });
  const user = { id: uid('u'), name, email: (email || '').toLowerCase(), mobile: mobile || '', role, passwordHash: bcrypt.hashSync(password, 10), pickup: '', drop: '', pickupTime: '09:00', dropTime: '18:00', createdAt: new Date().toISOString() };
  db.users.push(user);
  if (role === 'driver') db.drivers.push({ id: uid('d'), userId: user.id, licenseNo: licenseNo || '', vehicle: { model: vehicleModel || '', number: vehicleNumber || '', seats: 4 }, documents: [], verified: false, capacity: 4 });
  save();
  res.json({ token: sign(user), user: clean(user) });
});

router.post('/login', (req, res) => {
  const { identifier = '', password = '' } = req.body;
  const id = identifier.trim().toLowerCase();
  const user = load().users.find((u) => u.email === id || u.mobile === id);
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) return res.status(401).json({ error: 'Incorrect email/mobile or password.' });
  res.json({ token: sign(user), user: clean(user) });
});

router.get('/me', requireAuth, (req, res) => res.json(clean(req.user)));

router.put('/me', requireAuth, (req, res) => {
  ['name', 'mobile', 'pickup', 'drop', 'pickupTime', 'dropTime'].forEach((k) => { if (req.body[k] !== undefined) req.user[k] = req.body[k]; });
  save();
  res.json(clean(req.user));
});

module.exports = router;
