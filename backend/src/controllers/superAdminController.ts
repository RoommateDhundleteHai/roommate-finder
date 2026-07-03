import { Request, Response } from 'express';
import { prisma } from '../db.js';

// ─── GET PENDING ADMINS ───
// Lists all college admins awaiting approval
export const getPendingAdmins = async (req: Request, res: Response): Promise<any> => {
    try {
        const pendingAdmins = await prisma.user.findMany({
            where: { role: 'ADMIN', adminStatus: 'PENDING' },
            select: {
                id: true,
                name: true,
                email: true,
                adminStatus: true,
                createdAt: true,
                college: { select: { id: true, name: true, domain: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, admins: pendingAdmins });
    } catch (error) {
        console.error("Get Pending Admins Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch pending admins." });
    }
};

// ─── GET ALL ADMINS ───
export const getAllAdmins = async (req: Request, res: Response): Promise<any> => {
    try {
        const admins = await prisma.user.findMany({
            where: { role: 'ADMIN' },
            select: {
                id: true,
                name: true,
                email: true,
                adminStatus: true,
                isVerified: true,
                createdAt: true,
                college: { select: { id: true, name: true, domain: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, admins });
    } catch (error) {
        console.error("Get All Admins Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch admins." });
    }
};

// ─── APPROVE ADMIN ───
export const approveAdmin = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) return res.status(400).json({ success: false, message: "Admin ID is required." });

        const admin = await prisma.user.findUnique({ where: { id } });
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });
        if (admin.role !== 'ADMIN') return res.status(400).json({ success: false, message: "User is not an admin." });
        if (admin.adminStatus === 'APPROVED') {
            return res.status(400).json({ success: false, message: "Admin is already approved." });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { adminStatus: 'APPROVED' }
        });

        res.json({ success: true, message: `Admin ${updated.name} has been approved.`, admin: updated });
    } catch (error) {
        console.error("Approve Admin Error:", error);
        res.status(500).json({ success: false, message: "Failed to approve admin." });
    }
};

// ─── REJECT ADMIN ───
export const rejectAdmin = async (req: Request, res: Response): Promise<any> => {
    try {
        const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        if (!id) return res.status(400).json({ success: false, message: "Admin ID is required." });

        const admin = await prisma.user.findUnique({ where: { id } });
        if (!admin) return res.status(404).json({ success: false, message: "Admin not found." });
        if (admin.role !== 'ADMIN') return res.status(400).json({ success: false, message: "User is not an admin." });

        const updated = await prisma.user.update({
            where: { id },
            data: { adminStatus: 'REJECTED' }
        });

        res.json({ success: true, message: `Admin ${updated.name} has been rejected.`, admin: updated });
    } catch (error) {
        console.error("Reject Admin Error:", error);
        res.status(500).json({ success: false, message: "Failed to reject admin." });
    }
};

// ─── GET ALL COLLEGES ───
export const getAllColleges = async (req: Request, res: Response): Promise<any> => {
    try {
        const colleges = await prisma.college.findMany({
            include: {
                _count: { select: { users: true, cycles: true, questions: true } }
            },
            orderBy: { createdAt: 'desc' }
        });

        res.json({ success: true, colleges });
    } catch (error) {
        console.error("Get Colleges Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch colleges." });
    }
};

// ─── CREATE COLLEGE ───
export const createCollege = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, domain } = req.body;
        if (!name || !domain) {
            return res.status(400).json({ success: false, message: "College name and domain are required." });
        }

        // Check uniqueness
        const existing = await prisma.college.findFirst({
            where: { OR: [{ name }, { domain }] }
        });
        if (existing) {
            return res.status(409).json({ success: false, message: "A college with this name or domain already exists." });
        }

        const college = await prisma.college.create({
            data: { name, domain }
        });

        res.status(201).json({ success: true, message: `College "${college.name}" created.`, college });
    } catch (error) {
        console.error("Create College Error:", error);
        res.status(500).json({ success: false, message: "Failed to create college." });
    }
};

// ─── PLATFORM STATS ───
export const getPlatformStats = async (req: Request, res: Response): Promise<any> => {
    try {
        const [totalColleges, totalStudents, totalAdmins, pendingAdmins, totalCycles] = await Promise.all([
            prisma.college.count(),
            prisma.user.count({ where: { role: 'USER' } }),
            prisma.user.count({ where: { role: 'ADMIN' } }),
            prisma.user.count({ where: { role: 'ADMIN', adminStatus: 'PENDING' } }),
            prisma.matchingCycle.count(),
        ]);

        res.json({
            success: true,
            stats: { totalColleges, totalStudents, totalAdmins, pendingAdmins, totalCycles }
        });
    } catch (error) {
        console.error("Platform Stats Error:", error);
        res.status(500).json({ success: false, message: "Failed to fetch stats." });
    }
};
