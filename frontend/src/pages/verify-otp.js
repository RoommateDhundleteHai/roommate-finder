import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { handleError, handleSuccess } from '../utils';

function VerifyOtp() {
    const [otp, setOtp] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email || '';

    useEffect(() => { if (!email) navigate('/signup'); }, [email, navigate]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) return handleError('Please enter a valid 6-digit OTP');

        try {
            const url = `http://localhost:8080/auth/verify-otp`;
            const response = await fetch(url, {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp })
            });
            const result = await response.json();
            
            if (result.success) {
                handleSuccess(result.message);
                setTimeout(() => navigate('/login'), 1500);
            } else {
                handleError(result.message);
            }
        } catch (err) { handleError("Something went wrong"); }
    }

    return (
        <div className='container'>
            <h1>Verify Email</h1>
            <p style={{marginBottom: "20px"}}>OTP sent to: <strong>{email}</strong></p>
            <form onSubmit={handleVerify}>
                <div>
                    <label htmlFor='otp'>Enter OTP Code</label>
                    <input onChange={(e) => setOtp(e.target.value)} type='text' name='otp' maxLength="6" autoFocus placeholder='000000' value={otp} />
                </div>
                <button type='submit'>Verify</button>
            </form>
            <ToastContainer />
        </div>
    )
}
export default VerifyOtp;