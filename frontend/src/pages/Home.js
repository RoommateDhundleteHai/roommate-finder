import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleError, handleSuccess } from '../utils';
import { ToastContainer } from 'react-toastify';
import './Home.css';

function Home() {
  const [loggedInUser, setLoggedInUser] = useState('');
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const isAuthenticated = !!localStorage.getItem('token');

  useEffect(() => {
    setLoggedInUser(localStorage.getItem('loggedInUser') || '');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('loggedInUser');
    handleSuccess('User Logged out successfully');
    setTimeout(() => navigate('/login'), 1000);
  };

  const fetchProducts = async () => {
    if (!localStorage.getItem('token')) return;
    try {
      const response = await fetch('http://localhost:8080/products', {
        headers: { Authorization: localStorage.getItem('token') },
      });
      const result = await response.json();
      setProducts(Array.isArray(result) ? result : []);
    } catch (err) {
      handleError(err);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

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
        /* ── DASHBOARD ── */
        <div className="vs-dashboard">
          <div className="vs-db-card">
            <div className="vs-db-header">
              <div className="vs-db-avatar">{loggedInUser?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <h1 className="vs-db-title">Welcome back, {loggedInUser}</h1>
                <p className="vs-db-sub">Your roommate session is active.</p>
              </div>
            </div>
            <p className="vs-db-section-label">Listings</p>
            <div className="vs-product-list">
              {products.length > 0 ? products.map((item, i) => (
                <div key={i} className="vs-product-item">
                  <span className="vs-product-name">{item.name}</span>
                  <span className="vs-product-badge">₹{item.price}</span>
                </div>
              )) : (
                <div className="vs-empty">
                  <div className="vs-empty-icon">🏠</div>
                  <p>No listings yet. Check back soon.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── HERO ── */}
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
              <div className="vs-trust">
                <div className="vs-avatars">
                  <div className="vs-av av1">RK</div>
                  <div className="vs-av av2">PS</div>
                  <div className="vs-av av3">AM</div>
                  <div className="vs-av av4">VT</div>
                </div>
                <span className="vs-trust-text"><strong>2,400+ students</strong> found their match</span>
              </div>
            </div>

            <div className="vs-hero-right">
              {/* Main match card */}
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

              {/* Mini match cards */}
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

          {/* ── FEATURES ── */}
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

          {/* ── HOW IT WORKS ── */}
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

          {/* ── CTA BANNER ── */}
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

          {/* ── FOOTER ── */}
          <footer className="vs-footer">
            <div className="vs-footer-logo">
              <div className="vs-logo-mark sm">VS</div>
              <span className="vs-footer-name">VibeSync 2026</span>
            </div>
            <div className="vs-footer-links">
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
              <a href="#">Contact</a>
            </div>
          </footer>
        </>
      )}

      <ToastContainer />
    </div>
  );
}

export default Home;