import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify';
import { handleError, handleSuccess } from '../utils';

function Signup() {
    const [signupInfo, setSignupInfo] = useState({ 
        name: '', email: '', password: '', 
        role: 'USER', degree: '', passingYear: '' 
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSignupInfo({ ...signupInfo, [name]: value });
    }

    const handleSignup = async (e) => {
        e.preventDefault();
        const { name, email, password, role, degree, passingYear } = signupInfo;
        if (!name || !email || !password) return handleError('Name, email and password are required');
        
        // Student-specific validation
        if (role === 'USER' && (!degree || !passingYear)) {
            return handleError('Degree and Passing Year are required for students');
        }

        try {
            const url = `http://localhost:8080/auth/signup`;
            const response = await fetch(url, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(signupInfo)
            });
            const result = await response.json();
            const { success, message, error } = result;
            
            if (success) {
                handleSuccess(message);
                setTimeout(() => navigate('/verify-otp', { state: { email: signupInfo.email } }), 1000);
            } else if (error?.details) {
                handleError(error.details[0].message);
            } else {
                handleError(message);
            }
        } catch (err) { handleError("Server Error"); }
    }

    return (
        <div className='container'>
            <h1>Join VibeSync</h1>
            <form onSubmit={handleSignup}>
                <div>
                    <label htmlFor='name'>Full Name</label>
                    <input onChange={handleChange} type='text' name='name' autoFocus placeholder='Enter your name...' value={signupInfo.name} />
                </div>
                <div>
                    <label htmlFor='email'>Email</label>
                    <input onChange={handleChange} type='email' name='email' placeholder='Enter your college email...' value={signupInfo.email} />
                </div>
                <div>
                    <label htmlFor='password'>Password</label>
                    <input onChange={handleChange} type='password' name='password' placeholder='Enter your password...' value={signupInfo.password} />
                </div>

                {/* Role Selection */}
                <div>
                    <label htmlFor='role'>I am a</label>
                    <select name='role' value={signupInfo.role} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#f3f4f6' }}>
                        <option value='USER'>Student</option>
                        <option value='ADMIN'>College Admin</option>
                    </select>
                </div>

                {/* Student-only fields */}
                {signupInfo.role === 'USER' && (
                    <>
                        <div>
                            <label htmlFor='degree'>Degree Program</label>
                            <select name='degree' value={signupInfo.degree} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#f3f4f6' }}>
                                <option value=''>Select Degree...</option>
                                <option value='B.Tech'>B.Tech</option>
                                <option value='M.Tech'>M.Tech</option>
                                <option value='PhD'>PhD</option>
                                <option value='MBA'>MBA</option>
                                <option value='B.Sc'>B.Sc</option>
                                <option value='M.Sc'>M.Sc</option>
                                <option value='BBA'>BBA</option>
                                <option value='MCA'>MCA</option>
                                <option value='BCA'>BCA</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor='passingYear'>Passing Year</label>
                            <select name='passingYear' value={signupInfo.passingYear} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #374151', background: '#1f2937', color: '#f3f4f6' }}>
                                <option value=''>Select Year...</option>
                                {[2025, 2026, 2027, 2028, 2029, 2030].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {/* Admin info notice */}
                {signupInfo.role === 'ADMIN' && (
                    <div style={{ background: '#1e3a5f', border: '1px solid #3b82f6', borderRadius: '8px', padding: '12px', marginTop: '8px', fontSize: '0.85rem', color: '#93c5fd' }}>
                        <strong>ℹ️ Admin Signup:</strong> Use your official college email (e.g., admin@iitp.ac.in). 
                        Your domain will be matched to a registered college. A Super Admin must approve your account before you can log in.
                    </div>
                )}

                <button type='submit'>Create Account</button>
                <span>Already have an account? <Link to="/login">Login</Link></span>
            </form>
            <ToastContainer />
        </div>
    )
}
export default Signup;