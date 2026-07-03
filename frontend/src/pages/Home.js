import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../utils';
import { ToastContainer } from 'react-toastify';
import './Home.css';

function Home() {
  const [loggedInUser, setLoggedInUser] = useState('');
  const [matches, setMatches] = useState([]);
  const [pageState, setPageState] = useState('LOADING');
  
  // Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatPartner, setChatPartner] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const chatEndRef = useRef(null);
  
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');
  const token = localStorage.getItem('token');

  useEffect(() => {
    setLoggedInUser(localStorage.getItem('loggedInUser') || '');
  }, []);

  const fetchMatches = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:8080/matches', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 400) {
        setPageState('NEEDS_FORM');
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.matches && result.matches.length > 0) {
          setMatches(result.matches);
          setPageState('MATCHES_READY');
        } 
        else if (result.message === "No matches found for you in this cycle.") {
          setPageState('NO_MATCHES');
        } 
        else {
          setPageState('WAITING_FOR_ENGINE');
        }
      }
    } catch (err) {
      handleError(err);
      setPageState('WAITING_FOR_ENGINE');
    }
  };

  useEffect(() => { 
    if(isAuthenticated) fetchMatches(); 
  }, [isAuthenticated]);

  // ─── CHAT FUNCTIONS ───
  const openChat = async (match) => {
    setChatPartner(match);
    setChatOpen(true);
    setLoadingChat(true);
    
    try {
      const response = await fetch(`http://localhost:8080/chat/history/${match.id}?cycleId=${match.cycleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Failed to load chat:', err);
    } finally {
      setLoadingChat(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !chatPartner) return;
    
    try {
      const response = await fetch('http://localhost:8080/chat/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          receiverId: chatPartner.id,
          content: newMessage.trim(),
          cycleId: chatPartner.cycleId,
        })
      });
      const data = await response.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setNewMessage('');
      } else {
        handleError(data.message);
      }
    } catch (err) {
      handleError('Failed to send message');
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogout = () => {
    localStorage.clear();
    handleSuccess('Logged out successfully');
    setTimeout(() => navigate('/login'), 1000);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;

  return (
    <div className="home-container">

      {/* ── NAV ── */}
      <nav className="vs-nav">
        <div className="vs-logo" onClick={() => navigate('/')}>
          <div className="vs-logo-mark">VS</div>
          <span className="vs-logo-name">VibeSync <span>2026</span></span>
        </div>
        {!isAuthenticated && (
          <div className="vs-nav-links">
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
          </div>
        )}
        <div className="vs-nav-right">
          {isAuthenticated ? (
            <>
              <span className="vs-nav-user">Hey, <strong>{loggedInUser}</strong></span>
              <button onClick={handleLogout} className="vs-btn-danger">Logout</button>
            </>
          ) : (
            <>
              <button onClick={() => navigate('/login')} className="vs-btn-ghost">Log in</button>
              <button onClick={() => navigate('/signup')} className="vs-btn-primary">Get started free</button>
            </>
          )}
        </div>
      </nav>

      {isAuthenticated ? (
        <div className="vs-dashboard">
          <div className="vs-db-card">
            <div className="vs-db-header">
              <div className="vs-db-avatar">{loggedInUser?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <h1 className="vs-db-title">Welcome back, {loggedInUser}</h1>
                <p className="vs-db-sub">Your roommate matching engine is active.</p>
              </div>
            </div>
            
            <p className="vs-db-section-label">Status Overview</p>
            
            <div className="vs-product-list">
              
              {/* STATE: LOADING */}
              {pageState === 'LOADING' && (
                <div className="vs-empty">
                  <div className="vs-empty-icon">⏳</div>
                  <p>Loading your vibe data...</p>
                </div>
              )}

              {/* STATE: NEEDS_FORM */}
              {pageState === 'NEEDS_FORM' && (
                <div className="vs-empty" style={{ border: '2px dashed #ef4444', backgroundColor: '#fef2f2' }}>
                  <div className="vs-empty-icon">🛑</div>
                  <h3 style={{ color: '#b91c1c', margin: '10px 0', fontSize: '1.2rem' }}>Profile Incomplete</h3>
                  <p style={{ marginBottom: '20px', color: '#7f1d1d' }}>
                    You haven't filled out your roommate preferences yet. The engine needs your data to find your perfect match!
                  </p>
                  <button onClick={() => navigate('/onboarding')} className="vs-btn-primary">
                    Fill Preference Form Now
                  </button>
                </div>
              )}

              {/* STATE: WAITING_FOR_ENGINE */}
              {pageState === 'WAITING_FOR_ENGINE' && (
                <div className="vs-empty">
                  <div className="vs-empty-icon">🧬</div>
                  <p>Form submitted! Calculating your perfect match... Check back soon.</p>
                </div>
              )}

              {/* 🔥 STATE: NO_MATCHES (ADDED THIS BLOCK) 🔥 */}
              {pageState === 'NO_MATCHES' && (
                <div className="vs-empty" style={{ border: '2px dashed #9ca3af', backgroundColor: '#1f2937', textAlign: 'center' }}>
                  <div className="vs-empty-icon" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🤷‍♂️</div>
                  <h3 style={{ color: '#f3f4f6', margin: '10px 0', fontSize: '1.2rem' }}>No Matches Found</h3>
                  <p style={{ marginBottom: '20px', color: '#9ca3af' }}>
                    We couldn't find any highly compatible roommates for you in your specific degree and year. Try adjusting your STRICT preferences next time!
                  </p>
                </div>
              )}

              {/* STATE: MATCHES_READY */}
              {pageState === 'MATCHES_READY' && matches.map((match) => (
                <div key={match.id} className="vs-match-card" style={{ marginBottom: '24px', width: '100%' }}>
                  <div className="vs-mc-header">
                    <div className="vs-mc-user">
                      <div className="vs-mc-av">{getInitials(match.name)}</div>
                      <div>
                        <div className="vs-mc-name">{match.name}</div>
                        <div className="vs-mc-meta">
                          {match.email}
                          {match.degree && ` · ${match.degree}`}
                          {match.passingYear && ` · ${match.passingYear}`}
                        </div>
                      </div>
                    </div>
                    <div className="vs-mc-score">
                      <span style={{ color: match.compatibility >= 80 ? '#10b981' : match.compatibility >= 50 ? '#f59e0b' : '#ef4444' }}>
                        {match.compatibility}%
                      </span> match
                      {match.isSuperMatch && <span style={{ marginLeft: '8px', background: '#a855f7', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem' }}>⭐ SUPER MATCH</span>}
                    </div>
                  </div>
                  
                  <div className="vs-bar-row" style={{ marginTop: '16px' }}>
                    <span className="vs-bar-label">Compatibility Level</span>
                    <div className="vs-bar-track">
                      <div 
                        className="vs-bar-fill" 
                        style={{ 
                          width: `${match.compatibility}%`, 
                          backgroundColor: match.compatibility >= 80 ? '#10b981' : match.compatibility >= 50 ? '#f59e0b' : '#ef4444' 
                        }} 
                      />
                    </div>
                    <span className="vs-bar-pct">{match.compatibility}%</span>
                  </div>

                  {/* Connect / Chat Button */}
                  <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <button 
                      onClick={() => openChat(match)}
                      style={{ 
                        background: 'linear-gradient(135deg, #a855f7, #6366f1)', 
                        color: 'white', border: 'none', padding: '10px 24px', 
                        borderRadius: '8px', cursor: 'pointer', fontWeight: '600',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
                      onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                    >
                      💬 Connect & Chat
                    </button>
                  </div>
                </div>
              ))}

            </div>
          </div>

          {/* ── CHAT MODAL ── */}
          {chatOpen && chatPartner && (
            <div style={{
              position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
              background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
              backdropFilter: 'blur(4px)'
            }}>
              <div style={{
                background: '#111827', borderRadius: '16px', width: '480px', maxHeight: '600px',
                display: 'flex', flexDirection: 'column', border: '1px solid #374151', overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}>
                {/* Chat Header */}
                <div style={{ 
                  padding: '16px 20px', borderBottom: '1px solid #374151', 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1f2937',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#a855f7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}>
                      {getInitials(chatPartner.name)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#f3f4f6' }}>{chatPartner.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{chatPartner.compatibility}% match</div>
                    </div>
                  </div>
                  <button onClick={() => { setChatOpen(false); setChatPartner(null); setMessages([]); }} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.5rem', cursor: 'pointer' }}>✕</button>
                </div>

                {/* Messages */}
                <div style={{ flex: 1, padding: '16px', overflowY: 'auto', minHeight: '300px', maxHeight: '400px' }}>
                  {loadingChat ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>Loading messages...</div>
                  ) : messages.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#6b7280', padding: '40px 0' }}>
                      <div style={{ fontSize: '2rem', marginBottom: '8px' }}>👋</div>
                      <p>Say hello to your match!</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div key={msg.id} style={{
                        display: 'flex',
                        justifyContent: msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                        marginBottom: '10px',
                      }}>
                        <div style={{
                          maxWidth: '75%', padding: '10px 14px', borderRadius: '12px',
                          background: msg.senderId === currentUserId ? '#a855f7' : '#374151',
                          color: '#f3f4f6', fontSize: '0.9rem', lineHeight: '1.4',
                        }}>
                          {msg.content}
                          <div style={{ fontSize: '0.65rem', color: msg.senderId === currentUserId ? '#e9d5ff' : '#9ca3af', marginTop: '4px', textAlign: 'right' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Message Input */}
                <div style={{ padding: '12px 16px', borderTop: '1px solid #374151', display: 'flex', gap: '8px', background: '#1f2937' }}>
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #374151', background: '#111827', color: '#f3f4f6', outline: 'none', fontSize: '0.9rem' }}
                  />
                  <button onClick={sendMessage} style={{ background: '#a855f7', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── HERO & MARKETING SECTIONS (Logged Out) ── */
        <>
          <section className="vs-hero">
            <div className="vs-hero-left">
              <div className="vs-badge">
                <span className="vs-badge-dot" />
                Smart roommate matching for India
              </div>
              <h1 className="vs-h1">
                Stop gambling<br />on your<br />
                <em>roommate.</em>
              </h1>
              <p className="vs-hero-sub">
                VibeSync matches hostel students on sleep schedules, study habits,
                dietary preferences and 12 other compatibility factors — so you can
                actually enjoy your college years.
              </p>
              <div className="vs-hero-cta">
                <button onClick={() => navigate('/signup')} className="vs-btn-big">Find my match →</button>
                <button onClick={() => navigate('/login')} className="vs-btn-text">I have an account ↗</button>
              </div>
            </div>

            <div className="vs-hero-right">
              <div className="vs-match-card">
                <div className="vs-mc-header">
                  <div className="vs-mc-user">
                    <div className="vs-mc-av">AK</div>
                    <div>
                      <div className="vs-mc-name">Aryan Kapoor</div>
                      <div className="vs-mc-meta">B.Tech CSE · Year 2 · IIT Delhi</div>
                    </div>
                  </div>
                  <div className="vs-mc-score"><span>94%</span> match</div>
                </div>
                <div className="vs-mc-tags">
                  <span className="vs-tag green">Vegetarian</span>
                  <span className="vs-tag purple">Night owl</span>
                  <span className="vs-tag blue">Coder</span>
                  <span className="vs-tag amber">AC at 22°</span>
                </div>
                <div className="vs-mc-factors">
                  {[
                    ['Sleep schedule', '12 AM – 8 AM'],
                    ['Cleanliness', 'Very clean'],
                    ['Study hours', '9 PM – 2 AM'],
                    ['Guests policy', 'Rarely'],
                  ].map(([label, val]) => (
                    <div key={label} className="vs-factor">
                      <div className="vs-factor-label">{label}</div>
                      <div className="vs-factor-val">{val}</div>
                    </div>
                  ))}
                </div>
                <div className="vs-bar-row">
                  <span className="vs-bar-label">Compatibility</span>
                  <div className="vs-bar-track"><div className="vs-bar-fill" style={{ width: '94%' }} /></div>
                  <span className="vs-bar-pct">94%</span>
                </div>
              </div>

              {[
                { initials: 'PS', color: 'green', name: 'Priya Sharma', sub: 'B.Tech ECE · Year 2 · Night owl · Veg', score: '89%' },
                { initials: 'RV', color: 'amber', name: 'Rahul Verma', sub: 'MCA · Year 1 · Early riser · Non-veg', score: '81%' },
              ].map((m) => (
                <div key={m.name} className="vs-mini-card">
                  <div className={`vs-mini-av ${m.color}`}>{m.initials}</div>
                  <div className="vs-mini-info">
                    <div className="vs-mini-name">{m.name}</div>
                    <div className="vs-mini-sub">{m.sub}</div>
                  </div>
                  <div className="vs-mini-score">{m.score}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="vs-features" id="features">
            <p className="vs-sec-eye">Features</p>
            <h2 className="vs-sec-title">Everything you need to find the right fit</h2>
            <p className="vs-sec-sub">Not just vibes — real compatibility, measured.</p>
            <div className="vs-feat-grid">
              {[
                { icon: '🧬', color: 'p', title: '12-factor matching', desc: 'From sleep cycles and cleanliness to keyboard noise tolerance and AC temperature targets.' },
                { icon: '🍽️', color: 't', title: 'Dietary filters', desc: 'Veg, non-veg, Jain, vegan — handled before you even see a match. No awkward surprises.' },
                { icon: '📅', color: 'b', title: 'Schedule sync', desc: 'Your room stays quiet during your study hours. We match your timetable, not just your personality.' },
                { icon: '✅', color: 'y', title: 'Verified profiles', desc: 'College email verification so you know exactly who you\'re talking to before committing.' },
                { icon: '💬', color: 'r', title: 'In-app chat', desc: 'Message your matches directly. Ask the real questions before you agree to share a room.' },
                { icon: '🔒', color: 'g', title: 'Privacy first', desc: 'Your contact info stays private until you decide to share it. You\'re always in control.' },
              ].map(f => (
                <div key={f.title} className="vs-feat">
                  <div className={`vs-feat-icon fi-${f.color}`}>{f.icon}</div>
                  <div className="vs-feat-title">{f.title}</div>
                  <div className="vs-feat-desc">{f.desc}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="vs-steps" id="how-it-works">
            <p className="vs-sec-eye">How it works</p>
            <h2 className="vs-sec-title" style={{ marginBottom: '36px' }}>Up and matched in minutes</h2>
            <div className="vs-steps-row">
              {[
                ['01', 'Build your profile', 'Set your sleep time, diet, study habits, AC temp — the details that matter when sharing a room.'],
                ['02', 'See your matches', 'We score compatibility across all factors and show your best fits with a clear percentage.'],
                ['03', 'Connect & confirm', 'Chat in-app, ask the hard questions, and lock in your room with full confidence.'],
              ].map(([num, title, desc], i) => (
                <React.Fragment key={num}>
                  <div className="vs-step">
                    <div className="vs-step-num">{num}</div>
                    <div className="vs-step-title">{title}</div>
                    <div className="vs-step-desc">{desc}</div>
                  </div>
                  {i < 2 && <div className="vs-step-arrow">→</div>}
                </React.Fragment>
              ))}
            </div>
          </section>

          <div className="vs-cta-wrap">
            <div className="vs-cta">
              <h2>Ready to meet your match?</h2>
              <p>Create a free profile in under 3 minutes. No credit card, no nonsense.</p>
              <div className="vs-cta-btns">
                <button onClick={() => navigate('/signup')} className="vs-btn-big">Create account</button>
                <button onClick={() => navigate('/login')} className="vs-btn-ghost">Log in instead</button>
              </div>
            </div>
          </div>

          <footer className="vs-footer">
            <div className="vs-footer-logo">
              <div className="vs-logo-mark sm">VS</div>
              <span className="vs-footer-name">VibeSync 2026</span>
            </div>
            <div className="vs-footer-links">
              <a href="#how-it-works">Privacy</a>
              <a href="#how-it-works">Terms</a>
              <a href="#how-it-works">Contact</a>
            </div>
          </footer>
        </>
      )}

      <ToastContainer />
    </div>
  );
}

export default Home;