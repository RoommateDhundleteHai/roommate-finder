import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../utils';
import { ToastContainer } from 'react-toastify';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [questions, setQuestions] = useState([]);
    const [cycle, setCycle] = useState(null);
    const [submissionCount, setSubmissionCount] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
    const [isCycleModalOpen, setIsCycleModalOpen] = useState(false);
    
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);    
    const [capturedCollegeId, setCapturedCollegeId] = useState('');

    const [formData, setFormData] = useState({ text: '', type: 'CUSTOM', matchType: 'SCALE', weight: 1.0, optionsStr: '' });
    const [cycleData, setCycleData] = useState({ name: '', endDate: '' });
    
    const [submitting, setSubmitting] = useState(false);
    const [engineRunning, setEngineRunning] = useState(false);
    const token = localStorage.getItem('token');
    const navigate = useNavigate();

    const fetchData = async () => {
        try {
            const qRes = await fetch('http://localhost:8080/admin/questions', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const qData = await qRes.json();
            
            let currentCollegeId = '';
            if (qData.success) {
                setQuestions(qData.questions);
                if (qData.questions.length > 0) {
                    currentCollegeId = qData.questions[0].collegeId;
                    setCapturedCollegeId(currentCollegeId);
                }
            }

            const cRes = await fetch(`http://localhost:8080/admin/cycle/current/`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const cData = await cRes.json();
            if (cData.success && cData.cycle) {
                setCycle(cData.cycle);
                setSubmissionCount(cData.submissionCount || 0);
            }
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // --- CYCLE LIFECYCLE HANDLERS ---
    
    const handleCreateCycle = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const response = await fetch('http://localhost:8080/admin/cycle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...cycleData })
            });
            const data = await response.json();
            if (data.success) {
                setCycle(data.cycle);
                setIsCycleModalOpen(false);
                handleSuccess(data.message);
            } else handleError(data.message);
        } catch (err) { handleError("Error creating cycle"); }
        finally { setSubmitting(false); }
    };

    const changeCycleStatus = async (newStatus) => {
        if (!window.confirm(`Are you sure you want to change cycle status to ${newStatus}?`)) return;
        try {
            const response = await fetch(`http://localhost:8080/admin/cycle/${cycle.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (data.success) { 
                setCycle(data.cycle); 
                handleSuccess(data.message); 
                fetchData(); // Refresh submission count
            }
            else handleError(data.message);
        } catch (err) { handleError("Error updating status"); }
    };

    const handleRunEngine = async () => {
        if (cycle?.status !== 'CLOSED') {
            return handleError('Engine can only run when cycle status is CLOSED.');
        }
        if (!window.confirm(`🚨 This will run the matching engine on ${submissionCount} submissions. Continue?`)) return;

        setEngineRunning(true);
        try {
            const response = await fetch('http://localhost:8080/admin/engine/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ cycleId: cycle.id, collegeId: capturedCollegeId })
            });
            const data = await response.json();
            if (data.success) { 
                handleSuccess(`✅ ${data.message}`);
                fetchData(); // Refresh cycle status to MATCHED
            }
            else handleError(`❌ ${data.message}`);
        } catch (error) { handleError("Failed to connect to engine."); }
        finally { setEngineRunning(false); }
    };

    // --- QUESTION HANDLERS ---
    
    const isEditingLocked = cycle?.status === 'OPEN';

    const handleToggle = async (id, currentStatus) => {
        if (isEditingLocked) return handleError("Cannot modify questions while cycle is OPEN!");
        setQuestions(questions.map(q => q.id === id ? { ...q, isActive: !currentStatus } : q));
        try {
            await fetch(`http://localhost:8080/admin/questions/${id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ isActive: !currentStatus })
            });
        } catch (error) { setQuestions(questions.map(q => q.id === id ? { ...q, isActive: currentStatus } : q)); }
    };

    const handleEditClick = (q) => {
        if (isEditingLocked) return handleError("Form is Live! You cannot edit questions right now.");
        if (q.type === 'FIXED') return;
        setIsEditing(true); setEditingId(q.id);
        setFormData({ text: q.text, type: q.type, matchType: q.matchType, weight: q.weight, optionsStr: q.options ? q.options.join(', ') : '' });
        setIsQuestionModalOpen(true);
    };

    const handleAddClick = () => {
        setIsEditing(false); setEditingId(null);
        setFormData({ text: '', type: 'CUSTOM', matchType: 'SCALE', weight: 1.0, optionsStr: '' });
        setIsQuestionModalOpen(true);
    };

    const handleQuestionSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const finalOptions = formData.matchType === 'STRICT' ? formData.optionsStr.split(',').map(opt => opt.trim()).filter(opt => opt !== '') : [];
        const payload = { text: formData.text, type: formData.type, matchType: formData.matchType, weight: parseFloat(formData.weight), options: finalOptions };
        
        const url = isEditing ? `http://localhost:8080/admin/questions/${editingId}` : 'http://localhost:8080/admin/questions';
        
        try {
            const response = await fetch(url, {
                method: isEditing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ...payload })
            });
            const data = await response.json();
            if (data.success) {
                setIsQuestionModalOpen(false);
                handleSuccess(data.message);
                fetchData(); 
            } else handleError(data.message);
        } catch (error) { handleError("Server Error"); } 
        finally { setSubmitting(false); }
    };

    const handleLogout = () => {
        localStorage.clear();
        handleSuccess('Logged out');
        setTimeout(() => navigate('/login'), 1000);
    };

    // Status color map
    const statusColor = {
        DRAFT: '#6b7280', OPEN: '#10b981', CLOSED: '#f59e0b', MATCHED: '#3b82f6', RELEASED: '#a855f7'
    };

    if (loading) return <div className="admin-wrapper" style={{ alignItems: 'center' }}><div className="loading-text">INITIALIZING CORE...</div></div>;

    return (
        <div className="admin-wrapper">
            <div className="admin-container">

                {/* TOP BAR */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem', color: 'white' }}>VS</div>
                        <div>
                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#f3f4f6' }}>VibeSync Admin</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>College Dashboard</div>
                        </div>
                    </div>
                    <button onClick={handleLogout} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Logout</button>
                </div>

                {/* LIFECYCLE CONTROL HUB */}
                <div style={{ background: '#1f2937', padding: '20px', borderRadius: '12px', marginBottom: '20px', border: '1px solid #374151' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 style={{ margin: 0, color: '#f3f4f6', fontSize: '1.2rem' }}>Lifecycle Control Hub</h2>
                            {cycle ? (
                                <div style={{ color: '#9ca3af', margin: '5px 0 0 0', fontSize: '0.9rem' }}>
                                    <strong>{cycle.name}</strong> · Deadline: {new Date(cycle.endDate).toLocaleDateString()} · 
                                    <span style={{ color: '#a855f7', fontWeight: 'bold' }}> {submissionCount} submissions</span>
                                </div>
                            ) : (
                                <p style={{ color: '#fbbf24', margin: '5px 0 0 0', fontSize: '0.9rem' }}>No active matching cycle exists.</p>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {!cycle && (
                                <button className="btn-glow" onClick={() => setIsCycleModalOpen(true)} style={{ background: '#3b82f6' }}>➕ Create New Cycle</button>
                            )}
                            
                            {cycle && (
                                <>
                                    <span style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', background: statusColor[cycle.status] || '#374151', color: 'white' }}>
                                        {cycle.status}
                                    </span>

                                    {cycle.status === 'DRAFT' && <button className="btn-glow" onClick={() => changeCycleStatus('OPEN')} style={{ background: '#10b981' }}>🟢 Go Live (OPEN)</button>}
                                    {cycle.status === 'OPEN' && <button className="btn-glow" onClick={() => changeCycleStatus('CLOSED')} style={{ background: '#f59e0b' }}>🛑 Close Form</button>}
                                    {cycle.status === 'CLOSED' && (
                                        <button className="btn-glow" onClick={handleRunEngine} disabled={engineRunning} style={{ background: '#ef4444', opacity: engineRunning ? 0.6 : 1 }}>
                                            {engineRunning ? '⏳ Running...' : '⚙️ Run Engine'}
                                        </button>
                                    )}
                                    {cycle.status === 'MATCHED' && <button className="btn-glow" onClick={() => changeCycleStatus('RELEASED')} style={{ background: '#8b5cf6' }}>🎉 Declare Results</button>}
                                    {cycle.status === 'RELEASED' && (
                                        <span style={{ color: '#a855f7', fontWeight: 'bold', fontSize: '0.85rem' }}>✅ Results Published</span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* QUESTION MANAGEMENT HEADER */}
                <div className="admin-header">
                    <div className="admin-title-box">
                        <h1>Core Algorithm Config</h1>
                        {isEditingLocked && <p style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '5px' }}>⚠️ Form is LIVE. Modifying questions is temporarily locked.</p>}
                    </div>

                    <button 
                        className="btn-glow" 
                        onClick={handleAddClick} 
                        disabled={isEditingLocked}
                        style={{ opacity: isEditingLocked ? 0.5 : 1, cursor: isEditingLocked ? 'not-allowed' : 'pointer' }}
                    >
                        ➕ Add Parameter
                    </button>
                </div>

                {/* Questions Table */}
                <div className="table-container">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>Parameter</th>
                                <th>Type</th>
                                <th>Logic</th>
                                <th>Weight</th>
                                <th>Active</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {questions.map((q) => (
                                <tr key={q.id}>
                                    <td className="q-text">{q.text}</td>
                                    <td><span className={`badge ${q.type.toLowerCase()}`}>{q.type}</span></td>
                                    <td><span className={`badge ${q.matchType.toLowerCase()}`}>{q.matchType === 'SCALE' ? '📊 SCALE' : '🔒 STRICT'}</span></td>
                                    <td style={{fontFamily: 'monospace', color: '#a855f7'}}>{q.weight.toFixed(1)}x</td>
                                    <td style={{textAlign: 'center'}}>
                                        <label className="switch">
                                            <input type="checkbox" checked={q.isActive} disabled={isEditingLocked} onChange={() => handleToggle(q.id, q.isActive)} />
                                            <span className="slider"></span>
                                        </label>
                                    </td>
                                    <td style={{textAlign: 'center'}}>
                                        <button 
                                            onClick={() => handleEditClick(q)} 
                                            disabled={q.type === 'FIXED' || isEditingLocked}
                                            style={{ opacity: (q.type === 'FIXED' || isEditingLocked) ? 0.3 : 1, cursor: 'pointer', backgroundColor: '#a855f7', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px' }}
                                        >
                                            Edit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CYCLE CREATION MODAL */}
            {isCycleModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Initialize New Cycle</h2>
                            <button className="close-btn" onClick={() => setIsCycleModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleCreateCycle}>
                            <div className="form-group">
                                <label>Cycle Name</label>
                                <input type="text" required className="form-input" placeholder="e.g. Fall 2026 Roommate Matching" value={cycleData.name} onChange={(e) => setCycleData({...cycleData, name: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Submission Deadline</label>
                                <input type="datetime-local" required className="form-input" value={cycleData.endDate} onChange={(e) => setCycleData({...cycleData, endDate: e.target.value})} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsCycleModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Creating...' : 'Create Draft Cycle'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QUESTION MODAL */}
            {isQuestionModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{isEditing ? 'Modify Core Parameter' : 'Inject New Parameter'}</h2>
                            <button className="close-btn" onClick={() => setIsQuestionModalOpen(false)}>×</button>
                        </div>
                        <form onSubmit={handleQuestionSubmit}>
                            <div className="form-group">
                                <label>Parameter Text (Question)</label>
                                <input type="text" required className="form-input" value={formData.text} onChange={(e) => setFormData({...formData, text: e.target.value})} />
                            </div>
                            <div style={{display: 'flex', gap: '1rem'}}>
                                <div className="form-group" style={{flex: 1}}>
                                    <label>Category</label>
                                    <select className="form-select" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}>
                                        <option value="CUSTOM">Custom (Added by you)</option>
                                        <option value="EDITABLE">Editable Core</option>
                                        <option value="FIXED">Fixed Core</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{flex: 1}}>
                                    <label>Logic Core</label>
                                    <select className="form-select" value={formData.matchType} onChange={(e) => setFormData({...formData, matchType: e.target.value})}>
                                        <option value="SCALE">Scale (1 to 5)</option>
                                        <option value="STRICT">Strict (Exact Match)</option>
                                    </select>
                                </div>
                            </div>
                            {formData.matchType === 'STRICT' && (
                                <div className="form-group" style={{ marginTop: '15px' }}>
                                    <label>Provide Options (Comma Separated) *</label>
                                    <input type="text" required className="form-input" value={formData.optionsStr} onChange={(e) => setFormData({...formData, optionsStr: e.target.value})} />
                                </div>
                            )}                            
                            <div className="form-group" style={{marginTop: '15px'}}>
                                <label>Algorithm Weightage (Multiplier)</label>
                                <input type="number" step="0.1" min="0.1" required className="form-input" value={formData.weight} onChange={(e) => setFormData({...formData, weight: e.target.value})} />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-secondary" onClick={() => setIsQuestionModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Compiling...' : isEditing ? 'Update Parameter' : 'Deploy to Network'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ToastContainer />
        </div>
    );
};

export default AdminDashboard;