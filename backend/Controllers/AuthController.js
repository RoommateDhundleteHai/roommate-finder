
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const UserModel = require("../Models/User");
const nodemailer = require('nodemailer'); // Make sure to install this
//const { signup, login, verifyOtp } = require('../Controllers/AuthController');
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
        user: 'ashritapatel333@gmail.com',
        pass: 'jovnhxgmyrsmgwvp'
    }
});

const signup = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        const user = await UserModel.findOne({ email });
        if (user) {
            return res.status(409).json({ message: 'User already exists', success: false });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Verify your Account',
            text: `Your OTP is ${otp}. It expires in 10 minutes.Hey this is Ashrita Patel this is just a project trial i am putting your email ids to see if project is working ,if u get otp u can mail me back`
        });

        const hashedPassword = await bcrypt.hash(password, 10);
        const userModel = new UserModel({ 
            name, 
            email, 
            password: hashedPassword, 
            isVerified: false, 
            otp, 
            otpExpiresAt 
        });
        
        await userModel.save();

        res.status(201).json({ 
            message: "Signup successful. Check email for OTP.", 
            success: true 
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await UserModel.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: "User not found", success: false });
        }

        if (user.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP", success: false });
        }

        if (new Date() > user.otpExpiresAt) {
            return res.status(400).json({ message: "OTP expired", success: false });
        }

        user.isVerified = true;
        user.otp = null;
        user.otpExpiresAt = null;
        await user.save();

        res.status(200).json({ message: "Account verified successfully", success: true });
    } catch (err) {
        res.status(500).json({ message: "Server error", success: false });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await UserModel.findOne({ email });
        const errorMsg = 'Auth failed, email or password is wrong';
        
        if (!user) {
            return res.status(403).json({ message: errorMsg, success: false });
        }

        // --- NEW: Check if email is verified ---
        if (!user.isVerified) {
            return res.status(403).json({ message: "Please verify your email before logging in", success: false });
        }

        const isPassEqual = await bcrypt.compare(password, user.password);
        if (!isPassEqual) {
            return res.status(403).json({ message: errorMsg, success: false });
        }
        
        const jwtToken = jwt.sign(
            { email: user.email, _id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: "Login Success",
            success: true,
            jwtToken,
            email,
            name: user.name
        });
    } catch (err) {
        res.status(500).json({ message: "Internal server error", success: false });
    }
}

module.exports = {
    signup,
    login,
    verifyOtp // Export the new controller
}