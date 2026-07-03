import express from 'express';
import type { Request, Response } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/authRoutes.js'; 
import matchRoutes from './routes/matchRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import superAdminRoutes from './routes/superAdminRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

// Socket.io & Cron
import { initializeSocket } from './socket/socketServer.js';
import { startCronJobs } from './cron/cronJobs.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080; 

// ─── MIDDLEWARE ───
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
}));
app.use(express.json());

// ─── ROUTES ───
app.use('/auth', authRoutes);
app.use('/matches', matchRoutes);
app.use('/user', userRoutes);
app.use('/admin', adminRoutes);
app.use('/super-admin', superAdminRoutes);
app.use('/chat', chatRoutes);

// Health check
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'VibeSync API is running smoothly! 🚀',
    version: '2.0.0',
  });
});

// ─── HTTP SERVER + SOCKET.IO ───
const httpServer = createServer(app);
initializeSocket(httpServer);

// ─── START CRON JOBS ───
startCronJobs();

// ─── LAUNCH ───
httpServer.listen(PORT, () => {
  console.log(`⚡️[Server]: VibeSync Backend is alive at http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready for connections`);
  console.log(`⏰ Cron scheduler active`);
});