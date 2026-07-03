import { Request, Response } from 'express';
import { prisma } from '../db.js';

// ─── SUBMIT / UPDATE PREFERENCES ───
export const submitPreferences = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id || userPayload._id || userPayload.userId;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const { answers } = req.body;

        if (!answers || !Array.isArray(answers)) {
            return res.status(400).json({ success: false, message: "Invalid answers format. Expected an array." });
        }

        // 1. Fetch user to get their collegeId
        const user = await prisma.user.findUnique({ 
            where: { id: currentUserId } 
        });

        if (!user || !user.collegeId) {
            return res.status(400).json({ success: false, message: "User or College not found." });
        }

        // 2. Find the active OPEN cycle — use transaction to prevent race condition
        const submission = await prisma.$transaction(async (tx) => {
            const activeCycle = await tx.matchingCycle.findFirst({
                where: { 
                    collegeId: user.collegeId!, 
                    status: 'OPEN' 
                }
            });

            if (!activeCycle) {
                throw new Error('CYCLE_NOT_OPEN');
            }

            // 3. Upsert the submission (create or update)
            return await tx.submission.upsert({
                where: {
                    userId_cycleId: {
                        userId: currentUserId,
                        cycleId: activeCycle.id
                    }
                },
                update: {
                    answers: answers,
                    submittedAt: new Date()
                },
                create: {
                    userId: currentUserId,
                    cycleId: activeCycle.id,
                    answers: answers
                }
            });
        });

        res.json({ success: true, message: "Preferences saved successfully.", submission });

    } catch (error: any) {
        if (error.message === 'CYCLE_NOT_OPEN') {
            return res.status(403).json({ 
                success: false, 
                message: "Submissions are currently closed. Wait for the next cycle or contact admin." 
            });
        }
        console.error("Submit Preferences Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── GET ACTIVE QUESTIONS (For Student Form) ───
export const getActiveQuestions = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id || userPayload._id || userPayload.userId;

        // 1. Get user's college
        const user = await prisma.user.findUnique({ 
            where: { id: currentUserId },
            select: { collegeId: true }
        });

        if (!user || !user.collegeId) {
            return res.status(400).json({ success: false, message: "User or College not found." });
        }

        // 2. Check if cycle is OPEN
        const activeCycle = await prisma.matchingCycle.findFirst({
            where: { collegeId: user.collegeId, status: 'OPEN' }
        });

        if (!activeCycle) {
             return res.json({ success: true, questions: [], message: "Form is not live yet." });
        }

        // 3. Fetch active questions for this college
        const questions = await prisma.question.findMany({
            where: { 
                collegeId: user.collegeId,
                isActive: true 
            },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                text: true,
                type: true,
                matchType: true,
                options: true
            }
        });

        res.json({ success: true, questions, cycleId: activeCycle.id, cycleName: activeCycle.name });

    } catch (error) {
        console.error("Fetch Questions Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ─── GET USER PROFILE ───
export const getUserProfile = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id || userPayload._id || userPayload.userId;

        const user = await prisma.user.findUnique({
            where: { id: currentUserId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                degree: true,
                passingYear: true,
                collegeId: true,
                college: { select: { name: true, domain: true } },
                isVerified: true,
                createdAt: true,
            }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, user });
    } catch (error) {
        console.error("Get Profile Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};