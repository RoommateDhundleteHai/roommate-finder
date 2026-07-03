import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const verifyAdmin = (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ success: false, message: "Access Denied. No token provided." });
        }

        // CHOR YAHAN THA: "Bearer " ko hatakar asli token nikalna zaroori hai!
        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

        // Ab asli token decode hoga
        const decoded: any = jwt.verify(token, JWT_SECRET);

        if (decoded.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: "Security Breach: Only Admins can access this command center."
            });
        }

        (req as any).user = decoded;
        next();

    } catch (error) {
        console.error("JWT Verification Failed:", error); // Terminal me error dekhne ke liye
        return res.status(401).json({ success: false, message: "Invalid or Expired Token." });
    }
};

export const verifySuperAdmin = (req: Request, res: Response, next: NextFunction): any => {
    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(403).json({ success: false, message: 'Unauthorized, JWT token is required' });
        }

        const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        // NEW: Strictly block anyone who is not a SUPER_ADMIN
        if (decoded.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Forbidden, Super Admin access strictly required' });
        }

        (req as any).user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Unauthorized, token wrong or expired' });
    }
};