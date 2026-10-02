const bcrypt = require('bcryptjs');
const { load, save, uid } = require('../db');

function seed() {
  const db = load();
  if (!db.users.find((u) => u.role === 'admin')) {
    db.users.push({ id: uid('u'), name: 'Smart Ride Admin', email: 'admin@smartride.com', mobile: '9000000000', role: 'admin', passwordHash: bcrypt.hashSync('Admin@123', 10), pickup: '', drop: '', createdAt: new Date().toISOString() });
  }
  if (!db.plans.length) {
    db.plans.push(
      { id: 'plan_monthly', name: 'Monthly', months: 1, amount: 2500, active: true, perks: ['Same driver & vehicle', 'Fixed daily schedule', 'Cancel before renewal'] },
      { id: 'plan_quarterly', name: 'Quarterly', months: 3, amount: 7000, active: true, perks: ['Same driver & vehicle', 'About 7% cheaper than monthly', 'Priority support'] },
      { id: 'plan_yearly', name: 'Yearly', months: 12, amount: 26000, active: true, perks: ['Same driver & vehicle', 'About 13% cheaper than monthly', 'Price locked for the year'] }
    );
  }
  if (!db.drivers.length) {
    [['Ramesh Kumar', 'ramesh@smartride.com', '9111111111', 'Maruti Dzire', 'UP32 AB 1234'], ['Sunil Verma', 'sunil@smartride.com', '9222222222', 'Hyundai Aura', 'UP32 CD 5678']].forEach(([name, email, mobile, model, number]) => {
      const u = { id: uid('u'), name, email, mobile, role: 'driver', passwordHash: bcrypt.hashSync('Driver@123', 10), pickup: '', drop: '', createdAt: new Date().toISOString() };
      db.users.push(u);
      db.drivers.push({ id: uid('d'), userId: u.id, licenseNo: 'DL-' + mobile.slice(-4), vehicle: { model, number, seats: 4 }, documents: ['Driving licence', 'RC book', 'Insurance'], verified: true, capacity: 4 });
    });
  }
  save();
}
module.exports = seed;
if (require.main === module) { seed(); console.log('Seed complete. Admin: admin@smartride.com / Admin@123'); }
