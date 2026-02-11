import { useState, useEffect } from 'react';
import {
    QrCode,
    Link as LinkIcon,
    Send,
    Users,
    Image as ImageIcon,
    Video as VideoIcon,
    LogOut,
    RotateCcw,
    CheckCircle2,
    Loader2,
    Search,
    AlertCircle,
    X
} from 'lucide-react';
import styles from './BroadcastTool.module.css';

const API_KEY = import.meta.env.VITE_API_KEY || '';

const BroadcastTool = () => {
    const [status, setStatus] = useState('disconnected'); // disconnected, connecting, connected
    const [qr, setQr] = useState(null);
    const [groups, setGroups] = useState([]);
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Poll for status and QR
    useEffect(() => {
        let interval;
        if (status === 'connecting' || status === 'disconnected') {
            interval = setInterval(fetchStatus, 3000);
        }
        return () => clearInterval(interval);
    }, [status]);

    // Fetch groups when connected
    useEffect(() => {
        if (status === 'connected') {
            fetchGroups();
        }
    }, [status]);

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

    const handleConnect = async () => {
        setError(null);
        try {
            await fetch('/connect', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY }
            });
            setStatus('connecting');
        } catch (err) {
            setError('Failed to initiate connection');
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
            setGroups([]);
        } catch (err) {
            setError('Logout failed');
        }
    };


    const fetchGroups = async () => {
        setLoadingGroups(true);
        try {
            const res = await fetch('/groups', {
                headers: { 'x-api-key': API_KEY }
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
            const res = await fetch('/send', {
                method: 'POST',
                headers: { 'x-api-key': API_KEY },
                body: formData
            });
            const data = await res.json();
            alert('Broadcast finished! Check results in console.');
            console.log(data.results);
        } catch (err) {
            setError('Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.card}>
            {/* Header Section */}
            <div className={styles.cardHeader}>
                <div className={styles.statusInfo}>
                    <div className={`${styles.statusDot} ${styles[status || 'disconnected']}`} />
                    <span className={styles.statusText}>
                        WhatsApp: {(status || 'disconnected').charAt(0).toUpperCase() + (status || 'disconnected').slice(1)}
                    </span>
                </div>
                <div className={styles.headerActions}>
                    {status === 'connected' && (
                        <button onClick={handleLogout} className={styles.logoutBtn}>
                            <LogOut size={16} />
                            Logout
                        </button>
                    )}
                </div>
            </div>

            {error && (
                <div className={styles.errorAlert}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}

            {status === 'disconnected' && !qr && (
                <div className={styles.emptyState}>
                    <QrCode size={48} className={styles.icon} />
                    <h3>Connect WhatsApp</h3>
                    <p>Link your device to start broadcasting marketing messages.</p>
                    <button onClick={handleConnect} className={styles.primaryBtn}>
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
                    {/* Left: Configuration */}
                    <div className={styles.configArea}>
                        <div className={styles.formGroup}>
                            <label>Campaign Poster (Image/Video)</label>
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
                                        <span>Click to upload poster</span>
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Message / Caption</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Enter your marketing message here..."
                                className={styles.textarea}
                            />
                        </div>

                        <button
                            onClick={handleSend}
                            disabled={sending || selectedGroups.length === 0}
                            className={styles.sendBtn}
                        >
                            {sending ? (
                                <><Loader2 className={styles.spinner} /> Sending...</>
                            ) : (
                                <><Send size={18} /> Send Broadcast ({selectedGroups.length})</>
                            )}
                        </button>
                    </div>

                    {/* Right: Group Selection */}
                    <div className={styles.selectionArea}>
                        <div className={styles.selectionHeader}>
                            <label><Users size={16} /> Select Groups</label>
                            <span className={styles.count}>{selectedGroups.length} Selected</span>
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
