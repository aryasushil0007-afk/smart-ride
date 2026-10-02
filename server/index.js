require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const seed = require('./utils/seed');

seed();
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', require('./routes/auth'));
// Role-specific routers go before the rider router: it applies auth to everything mounted under /api.
app.use('/api/driver', require('./routes/driver'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/user'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Smart Ride running at http://localhost:${PORT}`));
