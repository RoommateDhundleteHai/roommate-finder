import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { prisma } from '../db.js';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS 
    }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("🔥 FATAL ERROR: JWT_SECRET is missing in .env file!");
    process.exit(1); 
}

// ─── SIGNUP ───
// Handles 3 roles: USER (student), ADMIN (college admin), SUPER_ADMIN is seed-only
export const signup = async (req: Request, res: Response): Promise<any> => {
    try {
        const { name, email, password, role, degree, passingYear } = req.body;
        
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(409).json({ message: 'User already exists', success: false });

        let collegeId: string | undefined = undefined;
        let adminStatus: 'PENDING' | undefined = undefined;

        // ─── ADMIN DOMAIN LOCKING ───
        if (role === 'ADMIN') {
            const emailDomain = email.split('@')[1]; // e.g., "iitp.ac.in"
            if (!emailDomain) {
                return res.status(400).json({ message: 'Invalid email format for Admin', success: false });
            }

            const college = await prisma.college.findUnique({ where: { domain: emailDomain } });
            if (!college) {
                return res.status(400).json({ 
                    message: `No college registered with domain "@${emailDomain}". Contact the platform admin to register your college.`, 
                    success: false 
                });
            }

            const existingAdmin = await prisma.user.findFirst({
                where: { collegeId: college.id, role: 'ADMIN' }
            });
            if (existingAdmin) {
                return res.status(409).json({ 
                    message: 'An admin already exists for this college. Only one admin per college is allowed.', 
                    success: false 
                });
            }

            collegeId = college.id;
            adminStatus = 'PENDING';
        }

        // ─── STUDENT VALIDATION & AUTO-ASSIGNMENT ───
        if (role === 'USER' || !role) {
            if (!degree || !passingYear) {
                return res.status(400).json({ 
                    message: 'Degree and Passing Year are required for student signup.', 
                    success: false 
                });
            }

            // Automatically find and assign the college based on the student's email domain
            const emailDomain = email.split('@')[1]; 
            const studentCollege = await prisma.college.findUnique({ where: { domain: emailDomain } });
            
            if (studentCollege) {
                collegeId = studentCollege.id; 
            } else {
                return res.status(400).json({ 
                    message: `Your college domain (@${emailDomain}) is not registered yet.`, 
                    success: false 
                });
            }
        }

        if (role === 'SUPER_ADMIN') {
            return res.status(403).json({ message: 'Cannot register as Super Admin.', success: false });
        }

        // ─── OTP GENERATION ───
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // 🚨 SECURED: Uses env variable for sender address
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'VibeSync — Verify your Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2 style="color: #a855f7;">VibeSync 2026</h2>
                    <p>Your verification code is:</p>
                    <div style="background: #1f2937; color: #a855f7; font-size: 32px; letter-spacing: 8px; padding: 20px; text-align: center; border-radius: 12px; font-weight: bold;">
                        ${otp}
                    </div>
                    <p style="color: #6b7280; margin-top: 16px;">This code expires in 10 minutes.</p>
                </div>
            `
        });

        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.user.create({
            data: { 
                name, 
                email, 
                passwordHash: hashedPassword, 
                isVerified: false, 
                otp, 
                otpExpiresAt,
                role: role || 'USER',
                ...(collegeId && { collegeId }),
                ...(adminStatus && { adminStatus }),
                ...(degree && { degree }),
                ...(passingYear && { passingYear: parseInt(passingYear) }),
            }
        });

        const roleLabel = role === 'ADMIN' ? 'Admin (Pending Approval)' : 'Student';
        res.status(201).json({ 
            message: `Signup successful as ${roleLabel}. Check email for OTP.`, 
            success: true 
        });
    } catch (err) { 
        console.error("🔥 SIGNUP ERROR: ", err); 
        res.status(500).json({ message: "Internal server error", success: false }); 
    }
};

// ─── VERIFY OTP ───
export const verifyOtp = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, otp } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user) return res.status(404).json({ message: "User not found", success: false });
        if (user.otp !== otp) return res.status(400).json({ message: "Invalid OTP", success: false });
        if (user.otpExpiresAt && new Date() > user.otpExpiresAt) {
            return res.status(400).json({ message: "OTP expired", success: false });
        }

        await prisma.user.update({ 
            where: { email }, 
            data: { isVerified: true, otp: null, otpExpiresAt: null } 
        });
        
        res.status(200).json({ message: "Account verified successfully", success: true });
    } catch (err) { 
        console.error("🔥 OTP VERIFY ERROR: ", err);
        res.status(500).json({ message: "Server error", success: false }); 
    }
};

// ─── LOGIN ───
export const login = async (req: Request, res: Response): Promise<any> => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) return res.status(403).json({ message: "Account not found", success: false });
        if (!user.isVerified) return res.status(403).json({ message: "Email not verified. Please check your email for OTP.", success: false });

        const isPassEqual = await bcrypt.compare(password, user.passwordHash);
        if (!isPassEqual) return res.status(403).json({ message: "Incorrect password", success: false });

        // ─── ADMIN APPROVAL CHECK ───
        if (user.role === 'ADMIN' && user.adminStatus !== 'APPROVED') {
            const statusMsg = user.adminStatus === 'REJECTED' 
                ? 'Your admin account has been rejected by the platform admin.'
                : 'Your admin account is pending approval from the platform admin. Please wait.';
            return res.status(403).json({ 
                message: statusMsg, 
                success: false,
                adminStatus: user.adminStatus 
            });
        }
        
        const jwtToken = jwt.sign(
            { 
                email: user.email, 
                id: user.id, 
                role: user.role,
                collegeId: user.collegeId,
            }, 
            JWT_SECRET as string, 
            { expiresIn: '24h' }
        );

        res.status(200).json({ 
            message: "Login Success", 
            success: true, 
            jwtToken, 
            email: user.email, 
            name: user.name, 
            role: user.role,
            collegeId: user.collegeId,
            degree: user.degree,
            passingYear: user.passingYear,
        });
    } catch (err) { 
        console.error("🔥 LOGIN ERROR: ", err);
        res.status(500).json({ message: "Internal server error", success: false }); 
    }
};