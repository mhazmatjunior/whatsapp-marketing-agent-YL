'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession, signIn, signOut } from "next-auth/react";
import BroadcastTool from '@/components/BroadcastTool';
import Modal from '@/components/Modal';
import SchedulesModal from '@/components/SchedulesModal';

export default function Home() {
    const { data: session, status: authStatus } = useSession();
    const [statusData, setStatusData] = useState({ status: 'disconnected', qr: null });
    const [loading, setLoading] = useState(true);
    const lastConnectedAt = useRef(null); // timestamp of last known 'connected' state

    // Login Form State (Moved to top level to follow Rules of Hooks)
    const [isSignUp, setIsSignUp] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);

    // Raised state & modal state
    const [groups, setGroups] = useState([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [isSchedulesModalOpen, setIsSchedulesModalOpen] = useState(false);

    // Modal State
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info', onConfirm: null });

    const showModal = (title, message, type = 'info', onConfirm = null) => {
        setModal({ isOpen: true, title, message, type, onConfirm });
    };

    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

    const fetchStatus = async () => {
        if (authStatus !== "authenticated") return;
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (data.status === 'connected') {
                lastConnectedAt.current = Date.now();
            }
            setStatusData(data);
        } catch (err) {
            console.error('[WhatsApp Home] Failed to fetch status:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchGroups = async () => {
        if (authStatus !== "authenticated" || statusData.status !== "connected") return;
        setLoadingGroups(true);
        try {
            const res = await fetch('/api/groups', {
                headers: { 'x-api-key': API_KEY }
            });
            if (!res.ok) throw new Error('Failed to fetch groups');
            const data = await res.json();
            const safeData = (data || []).map(g => ({
                ...g,
                name: g?.name || 'Unnamed Group',
                id: g?.id || `unknown-${Math.random()}`
            }));
            setGroups(safeData);
        } catch (err) {
            console.error('[WhatsApp Home] Failed to fetch groups:', err);
        } finally {
            setLoadingGroups(false);
        }
    };

    useEffect(() => {
        if (authStatus === "authenticated") {
            fetchStatus();
            const interval = setInterval(fetchStatus, 3000);
            return () => clearInterval(interval);
        }
    }, [authStatus]);

    useEffect(() => {
        if (statusData.status === 'connected' && groups.length === 0) {
            fetchGroups();
        } else if (statusData.status !== 'connected' && statusData.status !== 'connecting') {
            // Only clear groups if we're not just briefly reconnecting
            const msSinceConnected = lastConnectedAt.current ? Date.now() - lastConnectedAt.current : Infinity;
            if (msSinceConnected > 20000) {
                setGroups([]);
            }
        }
    }, [statusData.status]);

    // Compute the effective display status:
    // If we just lost connection but were connected <15s ago, show 'connecting' (grace period)
    // to avoid flashing the "Get QR Code" screen during normal auto-reconnect
    const effectiveStatus = (() => {
        if (statusData.status !== 'disconnected') return statusData.status;
        const msSinceConnected = lastConnectedAt.current ? Date.now() - lastConnectedAt.current : Infinity;
        if (msSinceConnected < 15000) return 'connecting'; // grace period
        return 'disconnected';
    })();

    const handleConnect = async () => {
        if (!API_KEY) {
            alert('Config Error: NEXT_PUBLIC_API_KEY is missing.');
            return;
        }

        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Error ${res.status}`);
            }

            fetchStatus();
        } catch (err) {
            showModal('Connection Error', err.message, 'warning');
        }
    };

    const handleLogout = async () => {
        showModal(
            'WhatsApp Logout',
            'Are you sure you want to unlink your device? This will stop all active broadcasts.',
            'confirm',
            async () => {
                try {
                    const res = await fetch('/api/logout', {
                        method: 'POST',
                        headers: { 'x-api-key': API_KEY }
                    });

                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({}));
                        throw new Error(errorData.error || `Error ${res.status}`);
                    }

                    fetchStatus();
                } catch (err) {
                    showModal('Logout Error', err.message, 'warning');
                }
            }
        );
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoggingIn(true);

        if (isSignUp) {
            // Handle Registration
            try {
                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password })
                });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Registration failed');
                }

                showModal('Account Created!', `Welcome to Elite Broadcaster, ${name}! You can now access your infrastructure.`, 'success');
                setIsSignUp(false);
            } catch (err) {
                showModal('Registration Failed', err.message, 'warning');
                setLoggingIn(false);
                return;
            }
        }

        // Handle Login (Directly or after successful registration)
        const result = await signIn("credentials", {
            email,
            password,
            redirect: false
        });

        if (result?.error) {
            showModal('Access Denied', 'The email or secure key provided is incorrect. Please try again.', 'warning');
        }
        setLoggingIn(false);
    };

    if (authStatus === "loading") {
        return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="glass premium-border" style={{ padding: '40px', borderRadius: '24px', textAlign: 'center' }}>
                    <div className="spinner" style={{ marginBottom: '16px' }}>⏳</div>
                    Authenticating Secure Session...
                </div>
            </div>
        );
    }

    if (authStatus === "unauthenticated") {
        const inputStyle = {
            width: '100%',
            padding: '14px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--border-premium)',
            borderRadius: '12px',
            color: 'white',
            outline: 'none',
            boxSizing: 'border-box',
        };
        return (
            <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="premium-card login-card">
                    <h1 className="gold-glow" style={{ fontSize: 'clamp(1.6rem, 6vw, 2.4rem)', color: 'var(--primary-indigo)', fontWeight: '800', marginBottom: '20px', letterSpacing: '-0.04em' }}>
                        ELITE <span style={{ color: 'var(--text-pure)', fontWeight: '300' }}>BROADCASTER</span>
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '28px', lineHeight: '1.6', fontSize: 'clamp(0.85rem, 3vw, 0.95rem)' }}>
                        {isSignUp
                            ? "Join the elite marketing network and start automating your reach today."
                            : "Provide your secure credentials to unleash the marketing machine."
                        }
                    </p>

                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {isSignUp && (
                            <div style={{ textAlign: 'left' }}>
                                <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Full Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    style={inputStyle}
                                    placeholder="M. Hassan Azmat"
                                    required
                                />
                            </div>
                        )}
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Email Address</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                style={inputStyle}
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>Secure Key</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={inputStyle}
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loggingIn}
                            className="primaryBtn"
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loggingIn ? (
                                <><div className="spinner" style={{ marginRight: '10px' }}>⏳</div> Authenticating...</>
                            ) : (isSignUp ? "Initialize Identity" : "Access Infrastructure")}
                        </button>
                    </form>

                    <div style={{ marginTop: '20px' }}>
                        <button
                            onClick={() => setIsSignUp(!isSignUp)}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--primary-indigo)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                fontWeight: '500',
                                padding: '8px 0',
                                minHeight: '44px',
                            }}
                        >
                            {isSignUp ? "Already part of the elite? Login" : "New to the network? Join now"}
                        </button>
                    </div>

                    <div style={{ marginTop: '16px', fontSize: '0.7rem', color: 'var(--text-dim)', letterSpacing: '0.08em' }}>
                        PROTECTED BY NEXTAUTH.JS & BCRYPT
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="app-header-left">
                    <div className={`status-dot ${effectiveStatus}`} />
                    <h1 className="gold-glow" style={{ fontSize: 'clamp(1rem, 4vw, 1.4rem)', color: 'var(--primary-indigo)', fontWeight: '700', letterSpacing: '-0.03em', margin: 0, whiteSpace: 'nowrap' }}>
                        ELITE <span style={{ color: 'var(--text-pure)', fontWeight: '300' }}>BROADCASTER</span>
                    </h1>
                    {statusData.status === 'connected' && (
                        <button
                            onClick={() => setIsSchedulesModalOpen(true)}
                            className="nav-btn"
                            style={{
                                background: 'rgba(99, 102, 241, 0.1)',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                color: 'var(--primary-indigo)',
                                padding: '6px 10px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.2s ease',
                                whiteSpace: 'nowrap',
                                minHeight: '36px',
                            }}
                        >
                            📅 Schedules
                        </button>
                    )}
                </div>
                <div className="app-header-right">
                    <div style={{ textAlign: 'right', minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-pure)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>{session.user.name}</div>
                        <button
                            onClick={() => showModal('Sign Out Account', 'Do you want to sign out of your Elite SaaS account?', 'confirm', () => signOut())}
                            style={{ background: 'none', border: 'none', color: 'var(--primary-indigo)', fontSize: '0.75rem', cursor: 'pointer', padding: '4px 0', minHeight: '28px' }}
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <BroadcastTool
                    status={effectiveStatus}
                    qr={statusData.qr}
                    onConnect={handleConnect}
                    onLogout={handleLogout}
                    groups={groups}
                    setGroups={setGroups}
                    loadingGroups={loadingGroups}
                    fetchGroups={fetchGroups}
                />
            </main>
            <footer className="app-footer">
                <p style={{
                    fontSize: '0.8rem',
                    color: 'var(--text-dim)',
                    letterSpacing: '0.05em',
                    fontWeight: '500'
                }}>
                    DESIGNED & ENGINEERED BY <span style={{ color: 'var(--primary-indigo)', fontWeight: '700' }}>M. HASSAN AZMAT</span>
                </p>
                <div style={{ marginTop: '4px', fontSize: '0.65rem', color: 'var(--text-dim)', opacity: 0.6 }}>
                    © 2026 ELITE BROADCASTER • PREMIUM SAAS INFRASTRUCTURE
                </div>
            </footer>

            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                onConfirm={modal.onConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
            <SchedulesModal
                isOpen={isSchedulesModalOpen}
                onClose={() => setIsSchedulesModalOpen(false)}
                groups={groups}
            />
        </div>
    );
}
