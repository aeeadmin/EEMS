const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const socketService = require('./src/services/socketService');
const cronService = require('./src/services/cronService');

const authRoutes = require('./src/routes/auth');
const employeeRoutes = require('./src/routes/employees');
const requestRoutes = require('./src/routes/requests');
const managerRoutes = require('./src/routes/managers');
const adminRoutes = require('./src/routes/admins');
const notificationRoutes = require('./src/routes/notifications');
const auditRoutes = require('./src/routes/audit');
const retirementRoutes = require('./src/routes/retirement');
const exportRoutes = require('./src/routes/export');

const app = express();
const server = http.createServer(app);

// CORS Config
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));
app.use(helmet({
  crossOriginResourcePolicy: false // Allow loading assets across origins
}));
app.use(morgan('dev'));
app.use(express.json());

// Socket.IO Init
socketService.init(server, corsOptions);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/retirement', retirementRoutes);
app.use('/api/export', exportRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error occurred', error: err.message });
});

// Initialize Cron Jobs
cronService.startCron();

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 EEMS Backend Server running on port ${PORT}`);
});
