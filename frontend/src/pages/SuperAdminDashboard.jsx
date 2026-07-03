import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { handleError, handleSuccess } from '../utils';

const SuperAdminDashboard = () => {
    const [stats, setStats] = useState(null);
    const [admins, setAdmins] = useState([]);
    const [colleges, setColleges] = useState([]);
    const [activeTab, setActiveTab] = useState('pending');
    const [loading, setLoading] = useState(true);

    // New college form
    const [showCollegeForm, setShowCollegeForm] = useState(false);
    const [collegeForm, setCollegeForm] = useState({ name: '', domain: '' });

    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    const fetchAll = async () => {
        try {
            const [statsRes, adminsRes, collegesRes] = await Promise.all([
                fetch('http://localhost:8080/super-admin/stats', { headers }),
                fetch('http://localhost:8080/super-admin/admins', { headers }),
                fetch('http://localhost:8080/super-admin/colleges', { headers }),
            ]);

            const statsData = await statsRes.json();
            const adminsData = await adminsRes.json();
            const collegesData = await collegesRes.json();

            if (statsData.success) setStats(statsData.stats);
            if (adminsData.success) setAdmins(adminsData.admins);
            if (collegesData.success) setColleges(collegesData.colleges);
        } catch (err) {
            handleError('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleApprove = async (id) => {
        try {
            const res = await fetch(`http://localhost:8080/super-admin/admins/${id}/approve`, { method: 'PATCH', headers });
            const data = await res.json();
            if (data.success) { handleSuccess(data.message); fetchAll(); }
            else handleError(data.message);
        } catch (err) { handleError('Failed to approve'); }
    };

    const handleReject = async (id) => {
        if (!window.confirm('Are you sure you want to reject this admin?')) return;
        try {
            const res = await fetch(`http://localhost:8080/super-admin/admins/${id}/reject`, { method: 'PATCH', headers });
            const data = await res.json();
            if (data.success) { handleSuccess(data.message); fetchAll(); }
            else handleError(data.message);
        } catch (err) { handleError('Failed to reject'); }
    };

    const handleCreateCollege = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('http://localhost:8080/super-admin/colleges', {
                method: 'POST', headers,
                body: JSON.stringify(collegeForm),
            });
            const data = await res.json();
            if (data.success) { 
                handleSuccess(data.message); 
                setShowCollegeForm(false); 
                setCollegeForm({ name: '', domain: '' });
                fetchAll(); 
            } else handleError(data.message);
        } catch (err) { handleError('Failed to create college'); }
    };

    const handleLogout = () => {
        localStorage.clear();
        handleSuccess('Logged out');
        setTimeout(() => navigate('/login'), 1000);
    };

    const pendingAdmins = admins.filter(a => a.adminStatus === 'PENDING');
    const approvedAdmins = admins.filter(a => a.adminStatus === 'APPROVED');
    const rejectedAdmins = admins.filter(a => a.adminStatus === 'REJECTED');

    if (loading) return (
        <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a855f7', fontSize: '1.2rem' }}>
            Loading Platform Dashboard...
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f3f4f6' }}>
            {/* Header */}
            <div style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '16px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: 'white' }}>VS</div>
                    <div>
                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>VibeSync Platform Admin</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Super Admin Dashboard</div>
                    </div>
                </div>
                <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
            </div>

            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
                {/* Stats Cards */}
                {stats && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                        {[
                            { label: 'Colleges', value: stats.totalColleges, icon: '🏫', color: '#3b82f6' },
                            { label: 'Students', value: stats.totalStudents, icon: '👥', color: '#10b981' },
                            { label: 'Admins', value: stats.totalAdmins, icon: '🛡️', color: '#f59e0b' },
                            { label: 'Pending Approvals', value: stats.pendingAdmins, icon: '⏳', color: '#ef4444' },
                            { label: 'Total Cycles', value: stats.totalCycles, icon: '🔄', color: '#a855f7' },
                        ].map(s => (
                            <div key={s.label} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                                <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{s.icon}</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                    {[
                        { key: 'pending', label: `Pending (${pendingAdmins.length})` },
                        { key: 'approved', label: `Approved (${approvedAdmins.length})` },
                        { key: 'rejected', label: `Rejected (${rejectedAdmins.length})` },
                        { key: 'colleges', label: `Colleges (${colleges.length})` },
                    ].map(tab => (
                        <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                            padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem',
                            background: activeTab === tab.key ? '#a855f7' : '#1e293b',
                            color: activeTab === tab.key ? 'white' : '#94a3b8',
                        }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Pending Admins */}
                {activeTab === 'pending' && (
                    <div>
                        {pendingAdmins.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
                                <div style={{ fontSize: '3rem', marginBottom: '12px' }}>✅</div>
                                <p>No pending approvals</p>
                            </div>
                        ) : pendingAdmins.map(admin => (
                            <div key={admin.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{admin.name}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{admin.email}</div>
                                    <div style={{ color: '#60a5fa', fontSize: '0.8rem', marginTop: '4px' }}>
                                        {admin.college ? `${admin.college.name} (${admin.college.domain})` : 'No college linked'}
                                    </div>
                                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
                                        Applied: {new Date(admin.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleApprove(admin.id)} style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>✅ Approve</button>
                                    <button onClick={() => handleReject(admin.id)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>❌ Reject</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Approved Admins */}
                {activeTab === 'approved' && (
                    <div>
                        {approvedAdmins.map(admin => (
                            <div key={admin.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '12px', border: '1px solid #334155' }}>
                                <div style={{ fontWeight: 'bold' }}>{admin.name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{admin.email}</div>
                                <div style={{ color: '#10b981', fontSize: '0.8rem', marginTop: '4px' }}>
                                    {admin.college ? admin.college.name : 'No college'} — <strong>APPROVED</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Rejected Admins */}
                {activeTab === 'rejected' && (
                    <div>
                        {rejectedAdmins.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>No rejected admins</div>
                        ) : rejectedAdmins.map(admin => (
                            <div key={admin.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '12px', border: '1px solid #ef4444', opacity: 0.7 }}>
                                <div style={{ fontWeight: 'bold' }}>{admin.name}</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{admin.email} — REJECTED</div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Colleges */}
                {activeTab === 'colleges' && (
                    <div>
                        <button onClick={() => setShowCollegeForm(!showCollegeForm)} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', marginBottom: '20px' }}>
                            {showCollegeForm ? 'Cancel' : '➕ Register New College'}
                        </button>

                        {showCollegeForm && (
                            <form onSubmit={handleCreateCollege} style={{ background: '#1e293b', padding: '24px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #334155' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '0.85rem' }}>College Name</label>
                                    <input type="text" required value={collegeForm.name} onChange={e => setCollegeForm({ ...collegeForm, name: e.target.value })}
                                        placeholder="e.g., Indian Institute of Technology Delhi"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '6px', fontSize: '0.85rem' }}>Email Domain</label>
                                    <input type="text" required value={collegeForm.domain} onChange={e => setCollegeForm({ ...collegeForm, domain: e.target.value })}
                                        placeholder="e.g., iitd.ac.in"
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #475569', background: '#0f172a', color: '#f3f4f6', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Create College</button>
                            </form>
                        )}

                        {colleges.map(c => (
                            <div key={c.id} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '12px', border: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>{c.name}</div>
                                    <div style={{ color: '#60a5fa', fontSize: '0.85rem' }}>@{c.domain}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '16px', color: '#94a3b8', fontSize: '0.8rem' }}>
                                    <span>👥 {c._count.users} users</span>
                                    <span>🔄 {c._count.cycles} cycles</span>
                                    <span>📝 {c._count.questions} questions</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <ToastContainer />
        </div>
    );
};

export default SuperAdminDashboard;
