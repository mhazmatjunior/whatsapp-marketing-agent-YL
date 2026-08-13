'use client';

import { useState, useEffect } from 'react';
import {
    QrCode,
    Send,
    Users,
    User,
    Image as ImageIcon,
    LogOut,
    Loader2,
    Search,
    AlertCircle,
    X,
    CheckCircle2,
    FileText,
    Video,
    File,
    Calendar,
    Phone,
} from 'lucide-react';
import styles from './BroadcastTool.module.css';

import Modal from './Modal';
import JoinsModal from './JoinsModal';

const BroadcastTool = ({ status, qr, onConnect, onLogout, groups, setGroups, loadingGroups, fetchGroups }) => {
    const [selectedGroups, setSelectedGroups] = useState([]);
    const [message, setMessage] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');

    // Contacts state
    const [contacts, setContacts] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [recipientTab, setRecipientTab] = useState('groups'); // 'groups' | 'contacts' | 'all'

    // Modal State
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [isJoinsModalOpen, setIsJoinsModalOpen] = useState(false);

    const showModal = (title, message, type = 'info') => {
        setModal({ isOpen: true, title, message, type });
    };

    // Reset selection on logout/disconnect
    useEffect(() => {
        if (status !== 'connected') {
            setSelectedGroups([]);
            setContacts([]);
        }
    }, [status]);

    // Fetch contacts when connected
    useEffect(() => {
        if (status === 'connected') {
            fetchContacts();
        }
    }, [status]);

    const fetchContacts = async () => {
        setLoadingContacts(true);
        try {
            const res = await fetch('/api/contacts', {
                headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY }
            });
            if (res.ok) {
                const data = await res.json();
                setContacts(data);
            }
        } catch (e) {
            console.warn('Failed to fetch contacts:', e);
        } finally {
            setLoadingContacts(false);
        }
    };

    // Combined recipients list for "all" tab
    const allRecipients = [
        ...groups.map(g => ({ ...g, type: 'group' })),
        ...contacts.map(c => ({ ...c, type: 'contact' })),
    ];

    // Which list is currently visible based on tab
    const visibleList =
        recipientTab === 'groups' ? groups.map(g => ({ ...g, type: 'group' })) :
        recipientTab === 'contacts' ? contacts.map(c => ({ ...c, type: 'contact' })) :
        allRecipients;

    // Find a recipient by id across both groups and contacts
    const findRecipient = (id) =>
        allRecipients.find(r => r.id === id);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result);
            reader.readAsDataURL(selectedFile);
        }
    };

    const toggleRecipient = (id) => {
        setSelectedGroups(prev =>
            prev.includes(id) ? prev.filter(rid => rid !== id) : [...prev, id]
        );
    };

    const handleSend = async () => {
        if (selectedGroups.length === 0) return showModal('Recipient Required', 'Please select at least one group or contact.');
        if (!message && !file) return showModal('Content Required', 'Please provide a message or a file to broadcast.');

        setSending(true);
        setError(null);

        const formData = new FormData();
        formData.append('message', message);
        formData.append('recipients', JSON.stringify(selectedGroups));
        if (file) formData.append('file', file);

        const isScheduled = !!scheduledTime;
        const endpoint = isScheduled ? '/api/schedules' : '/api/send';
        if (isScheduled) {
            formData.append('scheduledFor', scheduledTime);
        }

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'x-api-key': process.env.NEXT_PUBLIC_API_KEY },
                body: formData
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to deploy broadcast');
            }

            const data = await res.json();
            if (isScheduled) {
                showModal('Broadcast Scheduled', 'Your marketing campaign has been successfully scheduled and queued!', 'success');
            } else {
                showModal('Broadcast Complete', 'Your campaign has been successfully deployed to all selected recipients!', 'success');
            }

            setMessage('');
            setFile(null);
            setPreview(null);
            setSearchQuery('');
            setSelectedGroups([]);
            setScheduledTime('');

            console.log(data.results);
        } catch (err) {
            setError(err.message || 'Failed to deploy broadcast');
        } finally {
            setSending(false);
        }
    };

    const tabStyle = (active) => ({
        padding: '6px 14px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '0.78rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: active ? 'rgba(99,102,241,0.2)' : 'transparent',
        color: active ? 'var(--primary-indigo)' : 'var(--text-dim)',
        minHeight: '32px',
    });

    const filteredVisible = visibleList
        .filter(r =>
            !selectedGroups.includes(r.id) &&
            (r.name || r.phone || '').toLowerCase().includes((searchQuery || '').toLowerCase())
        )
        .slice(0, 8);

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
                                <span className={styles.metricTitle}>Groups</span>
                                <span className={styles.metricValue}>{groups.length}</span>
                            </div>
                            <div className={styles.metricCard}>
                                <span className={styles.metricTitle}>Contacts</span>
                                <span className={styles.metricValue}>{contacts.length}</span>
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

                        <div className={styles.actionRow}>
                            <button
                                onClick={handleSend}
                                disabled={sending || selectedGroups.length === 0}
                                className={styles.sendBtn}
                                style={{ flex: 2 }}
                            >
                                {sending ? (
                                    <><Loader2 className={styles.spinner} /> Processing...</>
                                ) : scheduledTime ? (
                                    <><Calendar size={18} /> Schedule ({selectedGroups.length})</>
                                ) : (
                                    <><Send size={18} /> Send ({selectedGroups.length})</>
                                )}
                            </button>

                            {/* Inline DateTime Picker */}
                            <div className={styles.scheduleWrapper} style={{ flex: 2, display: 'flex', flexDirection: 'column' }}>
                                <input
                                    type="datetime-local"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className={styles.datetimeInput}
                                    title="Set a time to schedule this broadcast"
                                    min={new Date(new Date().getTime() - new Date().getTimezoneOffset()*60000).toISOString().slice(0, 16)}
                                />
                            </div>

                            <button onClick={onLogout} className={styles.logoutBtn} style={{ flex: 1 }}>
                                <LogOut size={16} /> Logout
                            </button>
                        </div>
                    </div>

                    <div className={styles.selectionArea}>
                        <div className={styles.selectionHeader}>
                            <label><Users size={16} /> Recipients</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <button
                                    onClick={() => setIsJoinsModalOpen(true)}
                                    className={styles.joinsBtn}
                                    type="button"
                                >
                                    Joins
                                </button>
                                <span className={styles.count}>{selectedGroups.length}</span>
                            </div>
                        </div>

                        {/* Tab switcher: Groups | Contacts | All */}
                        <div style={{ display: 'flex', gap: '4px', padding: '0 0 10px 0', borderBottom: '1px solid var(--border-premium)', marginBottom: '10px' }}>
                            <button style={tabStyle(recipientTab === 'groups')} onClick={() => setRecipientTab('groups')}>
                                👥 Groups
                            </button>
                            <button style={tabStyle(recipientTab === 'contacts')} onClick={() => setRecipientTab('contacts')}>
                                👤 Contacts
                            </button>
                            <button style={tabStyle(recipientTab === 'all')} onClick={() => setRecipientTab('all')}>
                                🌐 All
                            </button>
                        </div>

                        {/* Selected chips — show name for both groups and contacts */}
                        {selectedGroups.length > 0 && (
                            <div className={styles.selectedList}>
                                {selectedGroups.map(id => {
                                    const r = findRecipient(id);
                                    return (
                                        <div key={id} className={styles.chip}>
                                            {r?.type === 'contact' ? <User size={10} style={{ opacity: 0.6 }} /> : null}
                                            <span>{r?.name || r?.phone || id}</span>
                                            <button
                                                onClick={() => toggleRecipient(id)}
                                                className={styles.removeChip}
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className={styles.searchBox}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder={recipientTab === 'contacts' ? 'Search contacts...' : recipientTab === 'all' ? 'Search all...' : 'Search groups...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className={styles.groupList}>
                            {(loadingGroups && recipientTab !== 'contacts') || (loadingContacts && recipientTab !== 'groups') ? (
                                <div className={styles.loadingList}>Loading...</div>
                            ) : (
                                filteredVisible.map(item => (
                                    <div
                                        key={item.id}
                                        className={styles.groupItem}
                                        onClick={() => toggleRecipient(item.id)}
                                    >
                                        <div className={styles.groupInfo}>
                                            <span className={styles.groupName}>
                                                {item.name || item.phone || item.id}
                                                {item.type === 'contact' ? (
                                                    <span className={styles.groupBadge} title="Individual Contact">
                                                        <Phone size={10} style={{ display: 'inline', marginRight: '3px' }} />Contact
                                                    </span>
                                                ) : item.isCommunityAnnounce ? (
                                                    <span className={styles.announcementBadge} title={item.canPost ? "Community Announcements (Admin)" : "Community Announcements (Read Only)"}>
                                                        {item.canPost ? "📢 Announcement (Admin)" : "📢 Announcement (Read Only)"}
                                                    </span>
                                                ) : item.isAnnounce ? (
                                                    <span className={styles.restrictedBadge} title={item.canPost ? "Admin-Only Group (Admin)" : "Admin-Only Group (Read Only)"}>
                                                        {item.canPost ? "🔒 Admin-Only" : "🔒 Read-Only"}
                                                    </span>
                                                ) : (
                                                    <span className={styles.groupBadge} title="Standard Group">
                                                        👥 Group
                                                    </span>
                                                )}
                                            </span>
                                            {item.type === 'contact' && item.phone && (
                                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '2px' }}>
                                                    +{item.phone}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.addItem}>
                                            <CheckCircle2 size={16} className={styles.addIcon} />
                                        </div>
                                    </div>
                                ))
                            )}
                            {!loadingGroups && !loadingContacts && filteredVisible.length === 0 && (
                                <div className={styles.emptyList}>
                                    {recipientTab === 'contacts'
                                        ? 'No contacts found. Contacts appear after WhatsApp syncs.'
                                        : 'No matching recipients'}
                                </div>
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
            <JoinsModal
                isOpen={isJoinsModalOpen}
                onClose={() => setIsJoinsModalOpen(false)}
                groups={groups}
                onSelectJoin={(recipients) => setSelectedGroups(recipients)}
            />
        </div>
    );
};

export default BroadcastTool;
