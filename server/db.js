// Simple JSON-file database. Swap this module for MongoDB/PostgreSQL in production.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data', 'db.json');
const EMPTY = { users: [], plans: [], subscriptions: [], payments: [], invoices: [], drivers: [], attendance: [], complaints: [], notifications: [], counters: { invoice: 1000 } };
let db = null;

function load() {
  if (db) return db;
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  db = fs.existsSync(FILE) ? { ...structuredClone(EMPTY), ...JSON.parse(fs.readFileSync(FILE, 'utf8')) } : structuredClone(EMPTY);
  return db;
}
function save() { fs.writeFileSync(FILE, JSON.stringify(db, null, 2)); }
const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
function notify(userId, title, message) {
  load().notifications.unshift({ id: uid('n'), userId, title, message, read: false, createdAt: new Date().toISOString() });
}
module.exports = { load, save, uid, notify };
