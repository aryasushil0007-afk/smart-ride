const jwt = require('jsonwebtoken');
const { load } = require('../db');
const SECRET = process.env.JWT_SECRET || 'dev-secret';
const sign = (user) => jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });

function requireAuth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    const p = jwt.verify(h.replace('Bearer ', ''), SECRET);
    const user = load().users.find((u) => u.id === p.id);
    if (!user) return res.status(401).json({ error: 'Session expired. Please log in again.' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Please log in to continue.' });
  }
}
const requireRole = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'You do not have access to this section.' });

module.exports = { sign, requireAuth, requireRole };
