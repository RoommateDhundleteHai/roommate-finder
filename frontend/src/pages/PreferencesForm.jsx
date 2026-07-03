import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './PreferencesForm.css'; 

const PreferencesForm = () => {
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // UI State
    const [currentStep, setCurrentStep] = useState(0); // 0 index based for chunks
    const [isReviewing, setIsReviewing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const navigate = useNavigate();
    const token = localStorage.getItem('token'); 

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const response = await fetch('http://localhost:8080/user/questions', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await response.json();

                if (data.success) {
                    setQuestions(data.questions);
                    // Pre-fill default values for SCALE questions (default to 3)
                    const initialAnswers = {};
                    data.questions.forEach(q => {
                        if (q.matchType === 'SCALE') initialAnswers[q.id] = 3;
                    });
                    setAnswers(initialAnswers);
                } else {
                    setError(data.message || 'No active questions found.');
                }
            } catch (err) {
                setError('Server connection failed.');
            } finally {
                setLoading(false);
            }
        };
        fetchQuestions();
    }, [token]);

    const handleOptionChange = (questionId, value) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    // --- SMART CHUNKING LOGIC (3 Questions Per Page) ---
    const chunkArray = (arr, size) => {
        const chunked = [];
        for (let i = 0; i < arr.length; i += size) {
            chunked.push(arr.slice(i, i + size));
        }
        return chunked;
    };
    const questionChunks = chunkArray(questions, 3);
    const totalSteps = questionChunks.length;

    // --- NAVIGATION ---
    const handleNext = () => {
        // Validate if all STRICT questions in current chunk are answered
        const currentQuestions = questionChunks[currentStep];
        const unanswered = currentQuestions.find(q => q.matchType === 'STRICT' && !answers[q.id]);
        
        if (unanswered) {
            alert("Please answer all questions before proceeding.");
            return;
        }

        if (currentStep < totalSteps - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            setIsReviewing(true); // Go to review screen
        }
    };

    const handleBack = () => {
        if (isReviewing) {
            setIsReviewing(false);
            setCurrentStep(totalSteps - 1);
        } else if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const jumpToStep = (stepIndex) => {
        setIsReviewing(false);
        setCurrentStep(stepIndex);
    };

    // --- SUBMISSION LOGIC ---
    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');

        // Transform answers into exactly what the Schema needs: [{ questionId, value }]
        const formattedAnswers = Object.entries(answers).map(([questionId, value]) => ({
            questionId,
            value: questions.find(q => q.id === questionId)?.matchType === 'SCALE' ? Number(value) : value
        }));

        try {
            const response = await fetch('http://localhost:8080/user/preferences', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ answers: formattedAnswers })
            });

            const data = await response.json();

            if (data.success) {
                navigate('/home'); 
            } else {
                setError(data.message || 'Failed to save preferences');
            }
        } catch (err) {
            setError('Server error while saving preferences');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDERERS ---
    if (loading) return <div className="pf-wrapper"><div className="pf-loading">INITIALIZING ENGINE...</div></div>;
    if (error) return <div className="pf-wrapper"><div className="pf-error">{error}</div></div>;
    if (questions.length === 0) return <div className="pf-wrapper"><h3>No active form available right now. Come back later!</h3></div>;

    // --- FINAL REVIEW SCREEN ---
    if (isReviewing) {
        return (
            <div className="pf-wrapper">
                <div className="pf-card">
                    <div className="pf-header">
                        <h1 className="pf-title">Review Your Vibe</h1>
                        <p style={{color: '#9ca3af', marginTop: '10px'}}>Make sure everything is accurate before locking it in.</p>
                    </div>

                    <div className="pf-review-list">
                        {questions.map((q, index) => {
                            // Find which chunk this question belongs to for the Edit button
                            const chunkIndex = Math.floor(index / 3);
                            return (
                                <div key={q.id} className="pf-review-item" style={{ borderBottom: '1px solid #374151', padding: '15px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{fontSize: '0.9rem', color: '#d1d5db', marginBottom: '5px'}}>{q.text}</div>
                                        <div style={{fontWeight: 'bold', color: '#a855f7'}}>
                                            {q.matchType === 'SCALE' ? `Level: ${answers[q.id]}` : answers[q.id]}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => jumpToStep(chunkIndex)} 
                                        style={{background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline'}}
                                    >
                                        Edit
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="pf-actions" style={{ marginTop: '20px' }}>
                        <button onClick={handleBack} className="pf-btn pf-btn-back">Back</button>
                        <button onClick={handleSubmit} disabled={isSubmitting} className="pf-btn pf-btn-next" style={{background: '#10b981', color: 'white'}}>
                            {isSubmitting ? 'Locking...' : '🔒 Lock My Vibe & Submit'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- MULTI-STEP WIZARD SCREEN ---
    const currentQuestions = questionChunks[currentStep];

    return (
        <div className="pf-wrapper">
            <div className="pf-card">
                
                {/* Header & Progress */}
                <div className="pf-header">
                    <h1 className="pf-title">Vibe Sync 2026</h1>
                    <div className="pf-step-badge">Step {currentStep + 1} of {totalSteps}</div>
                    
                    {/* Progress Bar */}
                    <div style={{ width: '100%', background: '#374151', height: '6px', borderRadius: '3px', marginTop: '15px' }}>
                        <div style={{ width: `${((currentStep + 1) / totalSteps) * 100}%`, background: '#a855f7', height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' }}></div>
                    </div>
                </div>

                {/* Questions Container */}
                <div className="pf-questions-container" style={{ marginTop: '20px' }}>
                    {currentQuestions.map((q) => (
                        <div key={q.id} style={{ marginBottom: '2rem', background: '#1f2937', padding: '20px', borderRadius: '12px' }}>
                            <h3 style={{ margin: '0 0 15px 0', fontSize: '1.1rem', color: '#f3f4f6' }}>{q.text}</h3>
                            
                            {/* STRICT (Buttons based on Dynamic Options) */}
                            {q.matchType === 'STRICT' && (
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {q.options && q.options.map(opt => (
                                        <button 
                                            key={opt}
                                            onClick={() => handleOptionChange(q.id, opt)}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                border: answers[q.id] === opt ? '2px solid #a855f7' : '2px solid #4b5563',
                                                background: answers[q.id] === opt ? '#3b0764' : 'transparent',
                                                color: answers[q.id] === opt ? '#e9d5ff' : '#9ca3af',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* SCALE (1 to 5 Slider) */}
                            {q.matchType === 'SCALE' && (
                                <div className="pf-slider-box">
                                    <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 'bold', color: '#a855f7', fontSize: '1.2rem' }}>
                                        {answers[q.id]}
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        value={answers[q.id]}
                                        onChange={(e) => handleOptionChange(q.id, e.target.value)}
                                        style={{ width: '100%', cursor: 'pointer' }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.8rem', marginTop: '8px' }}>
                                        <span>Level 1</span>
                                        <span>Level 5</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Navigation Buttons */}
                <div className="pf-actions" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <button onClick={handleBack} disabled={currentStep === 0} className="pf-btn pf-btn-back" style={{ opacity: currentStep === 0 ? 0 : 1 }}>
                        Back
                    </button>
                    <button onClick={handleNext} className="pf-btn pf-btn-next" style={{ background: '#a855f7', color: 'white', padding: '10px 24px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                        {currentStep === totalSteps - 1 ? 'Review Answers →' : 'Next Step →'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PreferencesForm;