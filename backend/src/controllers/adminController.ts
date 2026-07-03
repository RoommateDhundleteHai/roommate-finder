import { Request, Response } from 'express';
import { prisma } from '../db.js';

// ─── HELPER: Extract admin's collegeId from JWT ───
const getAdminCollegeId = async (req: Request) => {
    const userPayload = (req as any).user;
    const adminId = userPayload?.id || userPayload?._id || userPayload?.userId;
    if (!adminId) return null;
    
    const admin = await prisma.user.findUnique({ where: { id: adminId } });
    return admin?.collegeId || null;
};

// ═══════════════════════════════════════════
//  QUESTION MANAGEMENT
// ═══════════════════════════════════════════

export const addQuestion = async (req: Request, res: Response): Promise<any> => {
    try {
        const collegeId = await getAdminCollegeId(req);
        if (!collegeId) {
            return res.status(400).json({ success: false, message: "Admin account is not linked to any College! Please link it in DB." });
        }

        // GUARD: Cannot add questions while cycle is OPEN
        const openCycle = await prisma.matchingCycle.findFirst({
            where: { collegeId, status: 'OPEN' }
        });
        if (openCycle) {
            return res.status(403).json({ success: false, message: "Cannot modify questions while a cycle is OPEN." });
        }

        const { text, type, matchType, weight, order, options } = req.body;

        if (!text || !type || !matchType) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        let finalOrder = order;
        if (!finalOrder) {
            const lastQuestion = await prisma.question.findFirst({
                where: { collegeId },
                orderBy: { order: 'desc' } 
            });
            finalOrder = lastQuestion ? lastQuestion.order + 1 : 1; 
        }

        const newQuestion = await prisma.question.create({
            data: {
                text,
                type,            
                matchType,       
                options: options || [],
                weight: weight || 1.0, 
                isActive: true, 
                collegeId,
                order: finalOrder 
            }
        });

        res.json({ success: true, message: "Question added successfully!", question: newQuestion });
    } catch (error) {
        console.error("Add Question Error:", error);
        res.status(500).json({ success: false, message: "Failed to add question" });
    }
};

export const getAllQuestions = async (req: Request, res: Response): Promise<any> => {
    try {
        const collegeId = await getAdminCollegeId(req);
        if (!collegeId) return res.json({ success: true, questions: [] });

        const questions = await prisma.question.findMany({
            where: { collegeId },
            orderBy: { order: 'asc' }
        });
        res.json({ success: true, questions });
    } catch (error) {
        console.error("Get Admin Questions Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch questions" });
    }
};

export const toggleQuestionStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) return res.status(400).json({ success: false, message: "Question id is required" });
        
        // GUARD: Cannot toggle while OPEN
        const collegeId = await getAdminCollegeId(req);
        const openCycle = await prisma.matchingCycle.findFirst({
            where: { collegeId: collegeId!, status: 'OPEN' }
        });
        if (openCycle) {
            return res.status(403).json({ success: false, message: "Cannot modify questions while a cycle is OPEN." });
        }

        const { isActive } = req.body;
        const updatedQuestion = await prisma.question.update({
            where: { id },
            data: { isActive }
        });
        res.json({ success: true, message: `Question is now ${isActive ? 'LIVE' : 'HIDDEN'}`, question: updatedQuestion });
    } catch (error) {
        console.error("Toggle Status Error:", error);
        res.status(500).json({ success: false, message: "Failed to update question status" });
    }
};

export const updateQuestion = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) return res.status(400).json({ success: false, message: "Question id is required" });
        const { text, weight, matchType, options } = req.body;

        const existingQuestion = await prisma.question.findUnique({ where: { id } });
        if (!existingQuestion) return res.status(404).json({ success: false, message: "Question not found" });
        if (existingQuestion.type === 'FIXED') return res.status(400).json({ success: false, message: "Core FIXED parameters cannot be modified." });

        // GUARD: Cannot edit while OPEN
        const collegeId = await getAdminCollegeId(req);
        const openCycle = await prisma.matchingCycle.findFirst({
            where: { collegeId: collegeId!, status: 'OPEN' }
        });
        if (openCycle) {
            return res.status(403).json({ success: false, message: "Cannot modify questions while a cycle is OPEN." });
        }

        const updated = await prisma.question.update({
            where: { id },
            data: {
                text,
                weight: parseFloat(weight),
                matchType,
                options: matchType === 'STRICT' ? options : []
            }
        });

        res.json({ success: true, message: "Parameter updated successfully", question: updated });
    } catch (error) {
        console.error("Update Question Error:", error);
        res.status(500).json({ success: false, message: "Server error during update" });
    }
};

// ═══════════════════════════════════════════
//  CYCLE LIFECYCLE STATE MACHINE
// ═══════════════════════════════════════════

// Strict transition map — only these transitions are legal
const VALID_TRANSITIONS: Record<string, string[]> = {
    'DRAFT':    ['OPEN'],
    'OPEN':     ['CLOSED'],
    'CLOSED':   ['MATCHED'],   // Only set by the matching engine, not directly
    'MATCHED':  ['RELEASED'],
    'RELEASED': [],             // Terminal state — no further transitions
};

export const getCurrentCycle = async (req: Request, res: Response): Promise<any> => {
    try {
        const collegeId = await getAdminCollegeId(req);
        if (!collegeId) return res.json({ success: true, cycle: null });

        const cycle = await prisma.matchingCycle.findFirst({
            where: { collegeId },
            orderBy: { endDate: 'desc' } 
        });
        
        if (!cycle) return res.json({ success: true, cycle: null });
        
        // Include submission count for admin dashboard
        const submissionCount = await prisma.submission.count({
            where: { cycleId: cycle.id }
        });

        res.status(200).json({ success: true, cycle, submissionCount });
    } catch (error) {
        console.error("Fetch Current Cycle Error:", error);
        res.status(500).json({ success: false, message: "Server error fetching cycle." });
    }
};

export const createCycle = async (req: Request, res: Response): Promise<any> => {
    try {
        const collegeId = await getAdminCollegeId(req);
        if (!collegeId) {
            return res.status(400).json({ success: false, message: "Admin account is not linked to any College!" });
        }

        // GUARD: Cannot create new cycle if an active one exists (not RELEASED)
        const activeCycle = await prisma.matchingCycle.findFirst({
            where: { 
                collegeId, 
                status: { notIn: ['RELEASED'] }
            }
        });
        if (activeCycle) {
            return res.status(409).json({ 
                success: false, 
                message: `A cycle "${activeCycle.name}" is already active in ${activeCycle.status} state. Complete or release it before creating a new one.` 
            });
        }

        const { name, endDate } = req.body;
        if (!name || !endDate) {
            return res.status(400).json({ success: false, message: "Name and End Date are required." });
        }

        // Validate endDate is in the future
        const deadline = new Date(endDate);
        if (deadline <= new Date()) {
            return res.status(400).json({ success: false, message: "End date must be in the future." });
        }

        const newCycle = await prisma.matchingCycle.create({
            data: {
                name,
                collegeId,
                status: 'DRAFT',
                endDate: deadline
            }
        });

        res.status(201).json({ success: true, message: "New Cycle created in DRAFT mode.", cycle: newCycle });
    } catch (error) {
        console.error("Create Cycle Error:", error);
        res.status(500).json({ success: false, message: "Failed to create cycle." });
    }
};

export const updateCycleStatus = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) return res.status(400).json({ success: false, message: "Cycle id is required" });
        const { status: newStatus } = req.body;

        // 1. Fetch current cycle
        const cycle = await prisma.matchingCycle.findUnique({ where: { id } });
        if (!cycle) {
            return res.status(404).json({ success: false, message: "Cycle not found." });
        }

        // 2. Validate transition
        const allowed = VALID_TRANSITIONS[cycle.status];
        if (!allowed || !allowed.includes(newStatus)) {
            return res.status(400).json({ 
                success: false, 
                message: `Illegal transition: ${cycle.status} → ${newStatus}. Allowed transitions: [${allowed?.join(', ') || 'none'}]` 
            });
        }

        // 3. Block CLOSED→MATCHED via this endpoint (engine sets that)
        if (newStatus === 'MATCHED') {
            return res.status(400).json({ 
                success: false, 
                message: "MATCHED status can only be set by the matching engine. Use the 'Run Engine' button." 
            });
        }

        // 4. OPEN→CLOSED: Use transaction to atomically close + prevent race conditions
        if (newStatus === 'CLOSED') {
            const updatedCycle = await prisma.$transaction(async (tx) => {
                const updated = await tx.matchingCycle.update({
                    where: { id },
                    data: { status: 'CLOSED' }
                });
                return updated;
            });

            return res.json({ success: true, message: `Cycle status updated to CLOSED. Form submissions are now locked.`, cycle: updatedCycle });
        }

        // 5. All other valid transitions
        const updatedCycle = await prisma.matchingCycle.update({
            where: { id },
            data: { status: newStatus }
        });

        res.json({ success: true, message: `Cycle status updated to ${newStatus}`, cycle: updatedCycle });
    } catch (error) {
        console.error("Update Cycle Status Error:", error);
        res.status(500).json({ success: false, message: "Failed to update cycle status." });
    }
};