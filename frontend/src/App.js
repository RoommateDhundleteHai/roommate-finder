import { Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Home from './pages/Home';
import { useState } from 'react';
import RefrshHandler from './RefrshHandler';
import VerifyOtp from './pages/verify-otp';
import PreferencesForm from './pages/PreferencesForm';
import AdminDashboard from './pages/AdminDashboard';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const PrivateRoute = ({ element, allowedRoles }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    
    if (!token) return <Navigate to="/login" />;
    if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/home" />;
    return element;
  };

  return (
    <div className="App">
      <RefrshHandler setIsAuthenticated={setIsAuthenticated} />
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/login' element={<Login />} />
        <Route path='/signup' element={<Signup />} />
        <Route path='/verify-otp' element={<VerifyOtp />} />
        <Route path='/home' element={<PrivateRoute element={<Home />} />} />
        <Route path="/onboarding" element={<PrivateRoute element={<PreferencesForm />} allowedRoles={['USER']} />} />
        <Route path="/admin" element={<PrivateRoute element={<AdminDashboard />} allowedRoles={['ADMIN']} />} />
        <Route path="/super-admin" element={<PrivateRoute element={<SuperAdminDashboard />} allowedRoles={['SUPER_ADMIN']} />} />
      </Routes>
    </div>
  );
}

export default App;