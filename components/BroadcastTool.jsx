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
    CheckCircle2,
    FileText,
    Video,
    File
} from 'lucide-react';
import styles from './BroadcastTool.module.css';

import Modal from './Modal';

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

    // Modal State
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });

    const showModal = (title, message, type = 'info') => {
        setModal({ isOpen: true, title, message, type });
    };

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
            // Normalize data for stability
            const safeData = (data || []).map(g => ({
                ...g,
                name: g?.name || 'Unnamed Group',
                id: g?.id || `unknown-${Math.random()}`
            }));
            setGroups(safeData);
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
        if (selectedGroups.length === 0) return showModal('Recipient Required', 'Please select at least one marketing group.');
        if (!message && !file) return showModal('Content Required', 'Please provide a message or a poster to broadcast.');

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
            showModal('Broadcast Complete', 'Your campaign has been successfully deployed to all selected groups!', 'success');

            // Clear state for clean slate
            setMessage('');
            setFile(null);
            setPreview(null);
            setSearchQuery('');
            setSelectedGroups([]);

            console.log(data.results);
        } catch (err) {
            setError('Failed to send broadcast');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className={styles.card}>
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
                        <div className={styles.metricsGrid}>
                            <div className={`${styles.metricCard} ${styles.primary}`}>
                                <span className={styles.metricTitle}>Connected Devices</span>
                                <span className={styles.metricValue}>{status === 'connected' ? '1' : '0'}</span>
                            </div>
                            <div className={styles.metricCard}>
                                <span className={styles.metricTitle}>Total Groups</span>
                                <span className={styles.metricValue}>{groups.length}</span>
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label>Campaign Attachment</label>
                            <div className={styles.fileUpload}>
                                {file ? (
                                    <div className={styles.fileSelected}>
                                        <div className={styles.fileInfo}>
                                            {file.type.startsWith('image/') ? (
                                                <ImageIcon size={20} className={styles.fileIcon} />
                                            ) : file.type.startsWith('video/') ? (
                                                <Video size={20} className={styles.fileIcon} />
                                            ) : (
                                                <File size={20} className={styles.fileIcon} />
                                            )}
                                            <div className={styles.fileMeta}>
                                                <span className={styles.fileName}>{file.name}</span>
                                                <span className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                                            </div>
                                        </div>
                                        <button onClick={() => { setFile(null); setPreview(null); }} className={styles.clearFile}>
                                            <X size={14} /> Remove
                                        </button>
                                    </div>
                                ) : (
                                    <label className={styles.dropzone}>
                                        <input type="file" hidden onChange={handleFileChange} />
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ImageIcon size={20} />
                                            <Video size={20} />
                                            <FileText size={20} />
                                        </div>
                                        <span>Upload media or document</span>
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
                            <label><Users size={16} /> Recipients</label>
                            <span className={styles.count}>{selectedGroups.length}</span>
                        </div>

                        {/* Selected Groups Chips */}
                        {selectedGroups.length > 0 && (
                            <div className={styles.selectedList}>
                                {groups
                                    .filter(g => selectedGroups.includes(g.id))
                                    .map(group => (
                                        <div key={group.id} className={styles.chip}>
                                            <span>{group.name || 'Unnamed Group'}</span>
                                            <button
                                                onClick={() => toggleGroup(group.id)}
                                                className={styles.removeChip}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                            </div>
                        )}

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
                            ) : (
                                groups
                                    .filter(g =>
                                        !selectedGroups.includes(g?.id) &&
                                        (g?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
                                    )
                                    .slice(0, 5)
                                    .map(group => (
                                        <div
                                            key={group.id}
                                            className={styles.groupItem}
                                            onClick={() => toggleGroup(group.id)}
                                        >
                                            <div className={styles.groupInfo}>
                                                <span className={styles.groupName}>{group.name || 'Unnamed Group'}</span>
                                            </div>
                                            <div className={styles.addItem}>
                                                <CheckCircle2 size={16} className={styles.addIcon} />
                                            </div>
                                        </div>
                                    ))
                            )}
                            {!loadingGroups && groups.filter(g => !selectedGroups.includes(g?.id) && (g?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())).length === 0 && (
                                <div className={styles.emptyList}>No matching groups</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </div>
    );
};

export default BroadcastTool;
