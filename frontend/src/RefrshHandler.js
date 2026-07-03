import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

function RefrshHandler({ setIsAuthenticated }) {
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        
        if (token) {
            setIsAuthenticated(true);
            // Role-based redirect on auth pages
            if (['/', '/login', '/signup'].includes(location.pathname)) {
                if (role === 'SUPER_ADMIN') {
                    navigate('/super-admin', { replace: true });
                } else if (role === 'ADMIN') {
                    navigate('/admin', { replace: true });
                } else {
                    navigate('/home', { replace: true });
                }
            }
        }
    }, [location, navigate, setIsAuthenticated])

    return null;
}

export default RefrshHandler;