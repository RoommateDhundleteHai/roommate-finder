import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const signupValidation = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        name: Joi.string().min(3).max(100).required(),
        email: Joi.string().email().required(),
        password: Joi.string().min(4).max(100).required(),
        role: Joi.string().valid('USER', 'ADMIN').optional(),  // SUPER_ADMIN blocked at controller level
        degree: Joi.string().optional(),     // Required for students (validated in controller)
        passingYear: Joi.number().integer().min(2020).max(2035).optional(),
    });
    const { error } = schema.validate(req.body);
    if (error) { res.status(400).json({ message: "Bad request", error }); return; }
    next();
};

export const loginValidation = (req: Request, res: Response, next: NextFunction): void => {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        password: Joi.string().min(4).max(100).required()
    });
    const { error } = schema.validate(req.body);
    if (error) { res.status(400).json({ message: "Bad request", error }); return; }
    next();
};