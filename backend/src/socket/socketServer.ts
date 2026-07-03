import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { verifyMutualMatch } from '../controllers/chatController.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Track online users: userId -> socketId
const onlineUsers = new Map<string, string>();

export function initializeSocket(httpServer: HTTPServer) {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: ['http://localhost:3000', 'http://localhost:5173'],
            methods: ['GET', 'POST'],
            credentials: true,
        }
    });

    // ─── JWT AUTH MIDDLEWARE ───
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication required'));
        }

        try {
            const cleanToken = token.startsWith('Bearer ') ? token.split(' ')[1] : token;
            const decoded: any = jwt.verify(cleanToken, JWT_SECRET);
            socket.data.userId = decoded.id;
            socket.data.email = decoded.email;
            socket.data.role = decoded.role;
            next();
        } catch (err) {
            return next(new Error('Invalid or expired token'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.userId;
        console.log(`🔌 Socket connected: ${socket.data.email} (${userId})`);

        // Register user as online
        onlineUsers.set(userId, socket.id);

        // Join user's personal room for targeted messages
        socket.join(`user:${userId}`);

        // ─── SEND MESSAGE ───
        socket.on('send_message', async (data: { receiverId: string; content: string; cycleId: string }, callback) => {
            try {
                const { receiverId, content, cycleId } = data;

                if (!receiverId || !content || !cycleId) {
                    return callback?.({ success: false, message: 'Missing fields' });
                }

                // SECURITY: Verify mutual match
                const isMutual = await verifyMutualMatch(userId, receiverId, cycleId);
                if (!isMutual) {
                    return callback?.({ success: false, message: 'You can only message Top 5 mutual matches.' });
                }

                // Save to database
                const message = await prisma.message.create({
                    data: { senderId: userId, receiverId, content, cycleId }
                });

                // Emit to receiver if online
                io.to(`user:${receiverId}`).emit('new_message', {
                    id: message.id,
                    senderId: userId,
                    receiverId,
                    content,
                    createdAt: message.createdAt,
                    isRead: false,
                });

                callback?.({ success: true, message });
            } catch (error) {
                console.error('Socket send_message error:', error);
                callback?.({ success: false, message: 'Failed to send message' });
            }
        });

        // ─── MARK AS READ ───
        socket.on('mark_read', async (data: { partnerId: string; cycleId: string }) => {
            try {
                await prisma.message.updateMany({
                    where: {
                        senderId: data.partnerId,
                        receiverId: userId,
                        cycleId: data.cycleId,
                        isRead: false,
                    },
                    data: { isRead: true }
                });

                // Notify the partner that their messages were read
                io.to(`user:${data.partnerId}`).emit('messages_read', { 
                    readBy: userId, 
                    cycleId: data.cycleId 
                });
            } catch (error) {
                console.error('Socket mark_read error:', error);
            }
        });

        // ─── TYPING INDICATOR ───
        socket.on('typing', (data: { receiverId: string }) => {
            io.to(`user:${data.receiverId}`).emit('user_typing', { userId });
        });

        socket.on('stop_typing', (data: { receiverId: string }) => {
            io.to(`user:${data.receiverId}`).emit('user_stop_typing', { userId });
        });

        // ─── DISCONNECT ───
        socket.on('disconnect', () => {
            onlineUsers.delete(userId);
            console.log(`🔌 Socket disconnected: ${socket.data.email}`);
        });
    });

    console.log('🔌 Socket.io initialized with JWT auth');
    return io;
}
