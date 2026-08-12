'use client';

import { useState, useEffect } from 'react';
import { X, Search, Trash2, Edit2, Plus, Users, Loader2 } from 'lucide-react';
import styles from './JoinsModal.module.css';

export default function JoinsModal({ isOpen, onClose, groups, onSelectJoin }) {
    const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create' | 'edit'
    const [joins, setJoins] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Form States
    const [joinName, setJoinName] = useState('');
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingJoin, setEditingJoin] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchJoins();
            resetForm();
            setActiveTab('list');
        }
    }, [isOpen]);

    const fetchJoins = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/joins');
            if (!res.ok) throw new Error('Failed to fetch joins');
            const data = await res.json();
            setJoins(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setJoinName('');
        setSelectedRecipients([]);
        setSearchQuery('');
        setEditingJoin(null);
    };

    const handleToggleRecipient = (jid) => {
        setSelectedRecipients(prev =>
            prev.includes(jid) ? prev.filter(id => id !== jid) : [...prev, jid]
        );
    };

    const handleCreateJoin = async (e) => {
        e.preventDefault();
        if (!joinName.trim()) return;
        if (selectedRecipients.length === 0) {
            alert('Please select at least one recipient group.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/joins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: joinName,
                    recipients: selectedRecipients
                })
            });

            if (!res.ok) throw new Error('Failed to create join');
            
            await fetchJoins();
            resetForm();
            setActiveTab('list');
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (join) => {
        setEditingJoin(join);
        setJoinName(join.name);
        setSelectedRecipients(join.recipients);
        setSearchQuery('');
        setActiveTab('edit');
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (!joinName.trim() || !editingJoin) return;
        if (selectedRecipients.length === 0) {
            alert('Please select at least one recipient group.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/joins', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingJoin.id,
                    name: joinName,
                    recipients: selectedRecipients
                })
            });

            if (!res.ok) throw new Error('Failed to update join');
            
            await fetchJoins();
            resetForm();
            setActiveTab('list');
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteJoin = async (id, e) => {
        e.stopPropagation(); // Prevent selecting the join when clicking delete
        if (!confirm('Are you sure you want to delete this Join?')) return;

        try {
            const res = await fetch(`/api/joins?id=${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Failed to delete join');
            setJoins(prev => prev.filter(j => j.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    if (!isOpen) return null;

    // Filter WhatsApp groups based on search query
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>
                        {activeTab === 'list' && 'My Joins'}
                        {activeTab === 'create' && 'Create New Join'}
                        {activeTab === 'edit' && 'Edit Join'}
                    </h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'list' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('list'); resetForm(); }}
                    >
                        My Joins
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'create' ? styles.activeTab : ''}`}
                        onClick={() => { setActiveTab('create'); resetForm(); }}
                    >
                        Create Join
                    </button>
                    {activeTab === 'edit' && (
                        <button className={`${styles.tab} ${styles.activeTab}`} disabled>
                            Edit Join
                        </button>
                    )}
                </div>

                <div className={styles.content}>
                    {activeTab === 'list' && (
                        <div className={styles.joinsList}>
                            {loading ? (
                                <div className={styles.emptyState}>
                                    <Loader2 className="spinner" size={24} />
                                    Loading Joins...
                                </div>
                            ) : error ? (
                                <div className={styles.emptyState} style={{ color: '#EF4444' }}>
                                    Error loading joins: {error}
                                </div>
                            ) : joins.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Users size={32} />
                                    <p>No Joins defined yet.</p>
                                    <button 
                                        className={styles.secondaryBtn}
                                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                                        onClick={() => setActiveTab('create')}
                                    >
                                        Create one now
                                    </button>
                                </div>
                            ) : (
                                joins.map(join => (
                                    <div
                                        key={join.id}
                                        className={styles.joinItem}
                                        onClick={() => {
                                            onSelectJoin(join.recipients);
                                            onClose();
                                        }}
                                    >
                                        <div className={styles.joinInfo}>
                                            <span className={styles.joinName}>{join.name}</span>
                                            <span className={styles.joinMeta}>
                                                {join.recipients.length} {join.recipients.length === 1 ? 'recipient' : 'recipients'}
                                            </span>
                                        </div>
                                        <div className={styles.actions}>
                                            <button
                                                className={`${styles.iconBtn} ${styles.editBtn}`}
                                                onClick={(e) => { e.stopPropagation(); handleStartEdit(join); }}
                                                title="Edit Join"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                            <button
                                                className={`${styles.iconBtn} ${styles.deleteBtn}`}
                                                onClick={(e) => handleDeleteJoin(join.id, e)}
                                                title="Delete Join"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {(activeTab === 'create' || activeTab === 'edit') && (
                        <form onSubmit={activeTab === 'create' ? handleCreateJoin : handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className={styles.formGroup}>
                                <label>Join Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g. VIP Broadcasters"
                                    value={joinName}
                                    onChange={(e) => setJoinName(e.target.value)}
                                    className={styles.input}
                                    required
                                    maxLength={30}
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Select Recipients ({selectedRecipients.length})</label>
                                <div className={styles.searchBox}>
                                    <Search size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search groups..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className={styles.recipientSelector}>
                                {filteredGroups.length === 0 ? (
                                    <div style={{ padding: '20px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                                        No groups found
                                    </div>
                                ) : (
                                    filteredGroups.map(group => {
                                        const isSelected = selectedRecipients.includes(group.id);
                                        return (
                                            <div
                                                key={group.id}
                                                className={`${styles.recipientItem} ${isSelected ? styles.recipientSelected : ''}`}
                                                onClick={() => handleToggleRecipient(group.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // Handled by div onClick
                                                    className={styles.checkbox}
                                                />
                                                <span className={styles.recipientName}>
                                                    {group.name} ({group.participants || 0} members)
                                                    {group.isCommunityAnnounce ? (
                                                        <span className={styles.announcementBadge} title={group.canPost ? "Community Announcements (Admin)" : "Community Announcements (Read Only)"}>
                                                            {group.canPost ? "📢 Announcement (Admin)" : "📢 Announcement (Read Only)"}
                                                        </span>
                                                    ) : group.isAnnounce ? (
                                                        <span className={styles.restrictedBadge} title={group.canPost ? "Admin-Only Group (Admin)" : "Admin-Only Group (Read Only)"}>
                                                            {group.canPost ? "🔒 Admin-Only" : "🔒 Read-Only"}
                                                        </span>
                                                    ) : (
                                                        <span className={styles.groupBadge} title="Standard Group (All participants can post)">
                                                            👥 Group
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className={styles.footer}>
                                <button
                                    type="button"
                                    className={styles.secondaryBtn}
                                    onClick={() => { setActiveTab('list'); resetForm(); }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className={styles.primaryBtn}
                                    disabled={saving || !joinName.trim() || selectedRecipients.length === 0}
                                >
                                    {saving ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Loader2 className="spinner" size={14} /> Saving...
                                        </div>
                                    ) : (
                                        activeTab === 'create' ? 'Create Join' : 'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
