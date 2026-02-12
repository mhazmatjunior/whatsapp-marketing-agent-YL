'use client';

import { useState, useEffect } from 'react';
import {
    QrCode,
    Send,
    Users,
    Image as ImageIcon,
    LogOut,
    Loader2,
    Search,
    AlertCircle,
    X,
    CheckCircle2
} from 'lucide-react';
import styles from './BroadcastTool.module.css';

const BroadcastTool = ({ status, qr, onConnect, onLogout }) => {
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Fetch groups when connected
    useEffect(() => {
        if (status === 'connected') {
            fetchGroups();
        } else {
            setGroups([]);
            setSelectedGroups([]);
        }
    }, [status]);

    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const res = await fetch('/api/groups', {
                headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY }
            });
            if (!res.ok) throw new Error('Failed to fetch groups');
            const data = await res.json();
            setGroups(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoadingGroups(false);
        }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(selectedFile);
        }
    };

    const toggleGroup = (id) => {
        setSelectedGroups(prev =>
            prev.includes(id) ? prev.filter(gid => gid !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (selectedGroups.length === 0) return alert('Select at least one group');
        if (!message && !file) return alert('Message or image is required');

        setSending(true);
        setError(null);

        const formData = new FormData();
        formData.append('message', message);
        formData.append('recipients', JSON.stringify(selectedGroups));
        if (file) formData.append('file', file);

        try {
            const res = await fetch('/api/send', {
                method: 'POST',
                headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY },
                body: formData
            });
            if (!res.ok) throw new Error('Failed to send broadcast');
            const data = await res.json();
            alert('Broadcast finished!');
            console.log(data.results);
        } catch (err) {
            setError('Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    const filteredGroups = groups
        .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5);

    return (
        <div className={styles.card}>
            {error && (
                <div className={styles.errorAlert}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            <div className={styles.metricsGrid}>
                <div className={`${styles.metricCard} ${styles.primary}`}>
                    <span className={styles.metricTitle}>Connected Devices</span>
                    <span className={styles.metricValue}>{status === 'connected' ? '1' : '0'}</span>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.metricTitle}>Total Groups</span>
                    <span className={styles.metricValue}>{groups.length}</span>
                </div>
                <div className={styles.metricCard}>
                    <span className={styles.metricTitle}>Selected Groups</span>
                    <span className={styles.metricValue}>{selectedGroups.length}</span>
                </div>
            </div>

            {status === 'disconnected' && !qr && (
                <div className={styles.emptyState}>
                    <QrCode size={48} className={styles.icon} />
                    <h3>Connect WhatsApp</h3>
                    <p>Link your device to start broadcasting marketing messages.</p>
                    <button onClick={onConnect} className={styles.primaryBtn}>
                        Get QR Code
                    </button>
                </div>
            )}

            {(status === 'connecting' || qr) && status !== 'connected' && (
                <div className={styles.qrSection}>
                    {qr ? (
                        <>
                            <div className={styles.qrWrapper}>
                                <img src={qr} alt="WhatsApp QR Code" />
                            </div>
                            <p>Scan this QR code with your WhatsApp app.</p>
                            <p className={styles.small}>Go to Settings {'>'} Linked Devices {'>'} Link a Device</p>
                        </>
                    ) : (
                        <div className={styles.loading}>
                            <Loader2 className={styles.spinner} />
                            <p>Generating QR code...</p>
                        </div>
                    )}
                </div>
            )}

            {status === 'connected' && (
                <div className={styles.broadcastGrid}>
                    <div className={styles.configArea}>
                        <div className={styles.formGroup}>
                            <label>Campaign Poster</label>
                            <div className={styles.fileUpload}>
                                {preview ? (
                                    <div className={styles.preview}>
                                        {file?.type.startsWith('video/') ? (
                                            <video src={preview} controls />
                                        ) : (
                                            <img src={preview} alt="Preview" />
                                        )}
                                        <button onClick={() => { setFile(null); setPreview(null); }} className={styles.clearFile}>
                                            <X size={14} /> Clear
                                        </button>
                                    </div>
                                ) : (
                                    <label className={styles.dropzone}>
                                        <input type="file" hidden onChange={handleFileChange} accept="image/*,video/*" />
                                        <ImageIcon size={24} />
                                        <span>Upload poster</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <label>Message / Caption</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Enter your marketing message here..."
                                className={styles.textarea}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleSend}
                                disabled={sending || selectedGroups.length === 0}
                                className={styles.sendBtn}
                                style={{ flex: 2 }}
                            >
                                {sending ? (
                                    <><Loader2 className={styles.spinner} /> Sending...</>
                                ) : (
                                    <><Send size={18} /> Send Broadcast ({selectedGroups.length})</>
                                )}
                            </button>
                            <button onClick={onLogout} className={styles.logoutBtn} style={{ flex: 1 }}>
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>

                    <div className={styles.selectionArea}>
                        <div className={styles.selectionHeader}>
                            <label><Users size={16} /> Select Groups</label>
                            <span className={styles.count}>{selectedGroups.length}</span>
                        </div>

                        <div className={styles.searchBox}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search groups..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className={styles.groupList}>
                            {loadingGroups ? (
                                <div className={styles.loadingList}>Fetching groups...</div>
                            ) : filteredGroups.length > 0 ? (
                                filteredGroups.map(group => (
                                    <div
                                        key={group.id}
                                        className={`${styles.groupItem} ${selectedGroups.includes(group.id) ? styles.selected : ''}`}
                                        onClick={() => toggleGroup(group.id)}
                                    >
                                        <div className={styles.groupInfo}>
                                            <span className={styles.groupName}>{group.name}</span>
                                            <span className={styles.groupMeta}>{group.participants} participants</span>
                                        </div>
                                        <div className={styles.checkbox}>
                                            {selectedGroups.includes(group.id) && <CheckCircle2 size={18} />}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className={styles.emptyList}>No groups found</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BroadcastTool;
