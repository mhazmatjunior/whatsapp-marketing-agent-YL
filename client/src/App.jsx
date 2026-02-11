import { useState, useEffect } from 'react';
import BroadcastTool from './components/BroadcastTool';
import { Bell, MessageSquare, Mail, User } from 'lucide-react';
import './App.css';

const API_KEY = import.meta.env.VITE_API_KEY || '';

function App() {
    const [status, setStatus] = useState('disconnected');
    const [qr, setQr] = useState(null);

    const fetchStatus = async () => {
        try {
            const res = await fetch('/status');
            const data = await res.json();
            if (data && data.status) {
                setStatus(data.status);
                setQr(data.qr);
            }
        } catch (err) {
            console.error('Status check failed', err);
        }
    };

    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleConnect = async () => {
        try {
            await fetch('/connect', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY }
            });
            setStatus('connecting');
        } catch (err) {
            console.error('Failed to initiate connection');
        }
    };

    const handleLogout = async () => {
        if (!confirm('Are you sure you want to disconnect WhatsApp?')) return;
        try {
            await fetch('/logout', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY }
            });
            setStatus('disconnected');
            setQr(null);
        } catch (err) {
            console.error('Logout failed');
        }
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-left">
                    <div className="logo">
                        <span className="logo-icon">Pm</span>
                        <span className="logo-text">MEDIA</span>
                    </div>
                </div>
                
                <div className="header-center">
                    <h1 className="nav-title">Dashboard <span className="dot" style={{ background: status === 'connected' ? '#22c55e' : '#666' }}></span></h1>
                </div>

                <div className="header-right">
                    <div className="header-icons">
                        <MessageSquare size={20} className="icon-btn" />
                        <Mail size={20} className="icon-btn" />
                        <Bell size={20} className="icon-btn" />
                    </div>
                    <div className="user-profile">
                        <div className="user-info">
                            <span className="user-name">Main Team User 1</span>
                            <span className="user-email">main1@media.com</span>
                        </div>
                        <div className="user-avatar">M1</div>
                    </div>
                </div>
            </header>
            
            <main>
                <BroadcastTool 
                    status={status} 
                    qr={qr} 
                    onConnect={handleConnect} 
                    onLogout={handleLogout} 
                />
            </main>
        </div>
    );
}

export default App;
