'use client';

import { useState, useEffect } from 'react';
import BroadcastTool from '../components/BroadcastTool';

export default function Home() {
    const [statusData, setStatusData] = useState({ status: 'disconnected', qr: null });
    const [loading, setLoading] = useState(true);

    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

    useEffect(() => {
        if (!API_KEY) {
            console.error('[WhatsApp Home] NEXT_PUBLIC_API_KEY is missing! Connection will fail.');
        }
    }, [API_KEY]);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            setStatusData(data);
        } catch (err) {
            console.error('[WhatsApp Home] Failed to fetch status:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        if (!API_KEY) {
            alert('Config Error: NEXT_PUBLIC_API_KEY is missing in the production build.');
            return;
        }

        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const msg = errorData.error || `Error ${res.status}`;
                throw new Error(msg);
            }

            fetchStatus();
        } catch (err) {
            alert(`Connection Error: ${err.message}`);
            console.error('[WhatsApp Home] handleConnect failed:', err);
        }
    };

    const handleLogout = async () => {
        if (!confirm('Are you sure you want to logout?')) return;
        try {
            const res = await fetch('/api/logout', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY }
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                const msg = errorData.error || `Error ${res.status}`;
                throw new Error(msg);
            }

            fetchStatus();
        } catch (err) {
            alert(`Logout Error: ${err.message}`);
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h1 style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                        Whatsapp-Agent-YL
                    </h1>
                    <div className={`status-dot ${statusData.status}`} />
                </div>
            </header>
            <main>
                {loading && statusData.status === 'disconnected' ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                        Loading dashboard...
                    </div>
                ) : (
                    <BroadcastTool
                        status={statusData.status}
                        qr={statusData.qr}
                        onConnect={handleConnect}
                        onLogout={handleLogout}
                    />
                )}
            </main>
        </div>
    );
}
