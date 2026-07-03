import { Request, Response } from 'express';
import { prisma } from '../db.js';

// ─── GET CHAT HISTORY BETWEEN TWO USERS ───
export const getChatHistory = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id;
        const partnerId = Array.isArray(req.params.partnerId) ? req.params.partnerId[0] : req.params.partnerId;
        const cycleId = req.query.cycleId as string;

        if (!partnerId || !cycleId) {
            return res.status(400).json({ success: false, message: "partnerId and cycleId are required." });
        }

        // SECURITY: Verify mutual match before showing chat
        const isMutual = await verifyMutualMatch(currentUserId, partnerId, cycleId);
        if (!isMutual) {
            return res.status(403).json({ success: false, message: "You can only chat with your Top 5 matches." });
        }

        const messages = await prisma.message.findMany({
            where: {
                cycleId,
                OR: [
                    { senderId: currentUserId, receiverId: partnerId },
                    { senderId: partnerId, receiverId: currentUserId }
                ]
            },
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                content: true,
                senderId: true,
                receiverId: true,
                isRead: true,
                createdAt: true,
            }
        });

        // Mark unread messages from partner as read
        await prisma.message.updateMany({
            where: {
                senderId: partnerId,
                receiverId: currentUserId,
                cycleId,
                isRead: false,
            },
            data: { isRead: true }
        });

        res.json({ success: true, messages });
    } catch (error) {
        console.error("Chat History Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch chat history." });
    }
};

// ─── SEND MESSAGE (REST FALLBACK) ───
export const sendMessage = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id;
        const { receiverId, content, cycleId } = req.body;

        if (!receiverId || !content || !cycleId) {
            return res.status(400).json({ success: false, message: "receiverId, content, and cycleId are required." });
        }

        // SECURITY: Verify mutual match
        const isMutual = await verifyMutualMatch(currentUserId, receiverId, cycleId);
        if (!isMutual) {
            return res.status(403).json({ success: false, message: "You can only message your Top 5 matches." });
        }

        const message = await prisma.message.create({
            data: {
                senderId: currentUserId,
                receiverId,
                content,
                cycleId,
            }
        });

        res.status(201).json({ success: true, message: message });
    } catch (error) {
        console.error("Send Message Error:", error);
        res.status(500).json({ success: false, message: "Failed to send message." });
    }
};

// ─── GET UNREAD COUNT ───
export const getUnreadCount = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id;

        const unreadCount = await prisma.message.count({
            where: { receiverId: currentUserId, isRead: false }
        });

        res.json({ success: true, unreadCount });
    } catch (error) {
        console.error("Unread Count Error:", error);
        res.status(500).json({ success: false, message: "Failed to get unread count." });
    }
};

// ═══════════════════════════════════════════
//  MUTUAL MATCH VERIFICATION (Security Core)
// ═══════════════════════════════════════════
// A user can ONLY chat if both users appear in each other's Top 5
export async function verifyMutualMatch(userA: string, userB: string, cycleId: string): Promise<boolean> {
    const [matchAtoB, matchBtoA] = await Promise.all([
        prisma.matchResult.findFirst({
            where: { userId: userA, matchedUserId: userB, cycleId, rank: { lte: 5 } }
        }),
        prisma.matchResult.findFirst({
            where: { userId: userB, matchedUserId: userA, cycleId, rank: { lte: 5 } }
        })
    ]);

    return !!(matchAtoB && matchBtoA);
}
