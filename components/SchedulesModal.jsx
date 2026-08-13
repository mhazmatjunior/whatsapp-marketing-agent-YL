'use client';

import { useState, useEffect } from 'react';
import { X, Search, Trash2, Edit2, Loader2, Calendar, FileText, AlertCircle } from 'lucide-react';
import styles from './SchedulesModal.module.css';

export default function SchedulesModal({ isOpen, onClose, groups }) {
    const [view, setView] = useState('list'); // 'list' | 'edit'
    const [schedules, setSchedules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Form Edit States
    const [editId, setEditId] = useState(null);
    const [editMessage, setEditMessage] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editRecipients, setEditRecipients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [clearFile, setClearFile] = useState(false);
    const [hasFile, setHasFile] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSchedules();
            setView('list');
        }
    }, [isOpen]);

    const fetchSchedules = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/schedules');
            if (!res.ok) throw new Error('Failed to fetch scheduled broadcasts');
            const data = await res.json();
            setSchedules(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to cancel and delete this scheduled broadcast?')) return;
        try {
            const res = await fetch(`/api/schedules?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete schedule');
            setSchedules(prev => prev.filter(s => s.id !== id));
        } catch (err) {
            alert(err.message);
        }
    };

    const startEdit = (schedule) => {
        setEditId(schedule.id);
        setEditMessage(schedule.message);
        setHasFile(schedule.hasAttachment);
        setClearFile(false);
        
        // Convert Date object to datetime-local input string format (YYYY-MM-DDThh:mm)
        const dateObj = new Date(schedule.scheduledFor);
        const tzOffset = dateObj.getTimezoneOffset() * 60000; // offset in milliseconds
        const localISOTime = (new Date(dateObj - tzOffset)).toISOString().slice(0, 16);
        setEditTime(localISOTime);
        
        setEditRecipients(schedule.recipients);
        setView('edit');
    };

    const handleToggleRecipient = (jid) => {
        setEditRecipients(prev =>
            prev.includes(jid) ? prev.filter(id => id !== jid) : [...prev, jid]
        );
    };

    const handleSaveEdit = async (e) => {
        e.preventDefault();
        if (editRecipients.length === 0) {
            alert('Please select at least one recipient.');
            return;
        }

        const scheduledTime = new Date(editTime);
        if (scheduledTime <= new Date()) {
            alert('Scheduled time must be in the future.');
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('id', editId);
            formData.append('message', editMessage);
            formData.append('recipients', JSON.stringify(editRecipients));
            formData.append('scheduledFor', editTime);
            if (clearFile) {
                formData.append('clearFile', 'true');
            }

            const res = await fetch('/api/schedules', {
                method: 'PUT',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to update schedule');
            }

            await fetchSchedules();
            setView('list');
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    const getRecipientNames = (recipients) => {
        if (!recipients || !Array.isArray(recipients)) return '';
        const names = recipients.map(jid => {
            const g = (groups || []).find(x => x.id === jid);
            return g ? g.name : `Group (${jid.split('@')[0]})`;
        });
        return names.join(', ');
    };

    if (!isOpen) return null;

    // Filtered groups for edit view
    const filteredGroups = (groups || []).filter(g =>
        (g?.name || 'Unnamed Group').toLowerCase().includes((searchQuery || '').toLowerCase())
    );

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h3>
                        {view === 'list' ? 'Scheduled Broadcast Queue' : 'Edit Scheduled Broadcast'}
                    </h3>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className={styles.content}>
                    {view === 'list' && (
                        <>
                            {loading ? (
                                <div className={styles.emptyState}>
                                    <Loader2 className="spinner" size={24} />
                                    Loading schedules...
                                </div>
                            ) : error ? (
                                <div className={styles.emptyState} style={{ color: '#EF4444' }}>
                                    <AlertCircle size={24} />
                                    {error}
                                </div>
                            ) : schedules.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <Calendar size={32} />
                                    <p>No messages are currently scheduled.</p>
                                </div>
                            ) : (
                                <>
                                <div className={styles.tableContainer}>
                                    <table className={styles.table}>
                                        <thead>
                                            <tr>
                                                <th>Scheduled For</th>
                                                <th>Message Preview</th>
                                                <th>Recipients</th>
                                                <th>Attachment</th>
                                                <th>Status</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedules.map(item => (
                                                <tr key={item.id}>
                                                    <td style={{ whiteSpace: 'nowrap' }}>
                                                        {new Date(item.scheduledFor).toLocaleString()}
                                                    </td>
                                                    <td>
                                                        <span className={styles.messageExcerpt} title={item.message}>
                                                            {item.message || '(No Text Caption)'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={styles.recipientExcerpt} title={getRecipientNames(item.recipients)}>
                                                            {getRecipientNames(item.recipients)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {item.hasAttachment ? (
                                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                                                                 <FileText size={14} /> {item.fileName || 'file'}
                                                            </span>
                                                        ) : (
                                                            <span style={{ opacity: 0.4 }}>—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span className={`${styles.badge} ${styles[item.status]}`}>
                                                            {item.status.toUpperCase()}
                                                        </span>
                                                        {item.error && (
                                                            <div style={{ fontSize: '0.65rem', color: '#EF4444', marginTop: '4px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.error}>
                                                                {item.error}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className={styles.actions}>
                                                            {(item.status === 'pending' || item.status === 'failed') && (
                                                                <button
                                                                    onClick={() => startEdit(item)}
                                                                    className={`${styles.actionBtn} ${styles.editBtn}`}
                                                                    title="Edit Schedule"
                                                                >
                                                                    <Edit2 size={14} />
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                                                                title="Delete/Cancel Schedule"
                                                                disabled={item.status === 'processing'}
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Mobile card list */}
                                <div className={styles.mobileCardList}>
                                    {schedules.map(item => (
                                        <div key={item.id} className={styles.scheduleCard}>
                                            <div className={styles.scheduleCardRow}>
                                                <span className={styles.scheduleCardLabel}>Scheduled For</span>
                                                <span className={styles.scheduleCardValue}>{new Date(item.scheduledFor).toLocaleString()}</span>
                                            </div>
                                            <div className={styles.scheduleCardRow}>
                                                <span className={styles.scheduleCardLabel}>Message</span>
                                                <span className={styles.scheduleCardValue} style={{ maxWidth: '60%' }}>{item.message || '(No Text Caption)'}</span>
                                            </div>
                                            <div className={styles.scheduleCardRow}>
                                                <span className={styles.scheduleCardLabel}>Recipients</span>
                                                <span className={styles.scheduleCardValue} style={{ maxWidth: '60%' }}>{getRecipientNames(item.recipients)}</span>
                                            </div>
                                            {item.hasAttachment && (
                                                <div className={styles.scheduleCardRow}>
                                                    <span className={styles.scheduleCardLabel}>Attachment</span>
                                                    <span className={styles.scheduleCardValue} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <FileText size={12} /> {item.fileName || 'file'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className={styles.scheduleCardRow}>
                                                <span className={`${styles.badge} ${styles[item.status]}`}>{item.status.toUpperCase()}</span>
                                                <div className={styles.actions}>
                                                    {(item.status === 'pending' || item.status === 'failed') && (
                                                        <button onClick={() => startEdit(item)} className={`${styles.actionBtn} ${styles.editBtn}`} title="Edit">
                                                            <Edit2 size={15} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleDelete(item.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} disabled={item.status === 'processing'}>
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                </>
                            )}
                        </>
                    )}

                    {view === 'edit' && (
                        <form onSubmit={handleSaveEdit} className={styles.editForm}>
                            <div className={styles.formGroup}>
                                <label>Scheduled Time</label>
                                <input
                                    type="datetime-local"
                                    value={editTime}
                                    onChange={(e) => setEditTime(e.target.value)}
                                    className={styles.input}
                                    required
                                />
                            </div>

                            <div className={styles.formGroup}>
                                <label>Message / Caption</label>
                                <textarea
                                    value={editMessage}
                                    onChange={(e) => setEditMessage(e.target.value)}
                                    className={styles.textarea}
                                    placeholder="Enter schedule caption text..."
                                    maxLength={2048}
                                />
                            </div>

                            {hasFile && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                                    <FileText size={16} />
                                    <span style={{ fontSize: '0.8rem', flex: 1 }}>Message contains an attachment</span>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: '#EF4444' }}>
                                        <input
                                            type="checkbox"
                                            checked={clearFile}
                                            onChange={(e) => setClearFile(e.target.checked)}
                                            className={styles.checkbox}
                                        />
                                        Remove Attachment
                                    </label>
                                </div>
                            )}

                            <div className={styles.formGroup}>
                                <label>Selected Recipients ({editRecipients.length})</label>
                                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 12px', alignItems: 'center', gap: '8px' }}>
                                    <Search size={14} style={{ color: 'var(--text-dim)' }} />
                                    <input
                                        type="text"
                                        placeholder="Filter groups..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        style={{ background: 'none', border: 'none', color: 'white', fontSize: '0.8rem', outline: 'none', width: '100%' }}
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
                                        const isSelected = editRecipients.includes(group.id);
                                        return (
                                            <div
                                                key={group.id}
                                                className={styles.recipientItem}
                                                onClick={() => handleToggleRecipient(group.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {}} // Handled by parent click
                                                    className={styles.checkbox}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: isSelected ? 'white' : 'var(--text-dim)' }}>
                                                    {group.name}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className={styles.footer}>
                                <button
                                    type="button"
                                    onClick={() => setView('list')}
                                    className={styles.secondaryBtn}
                                >
                                    Back to Queue
                                </button>
                                <button
                                    type="submit"
                                    className={styles.primaryBtn}
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Loader2 className="spinner" size={14} /> Saving...
                                        </div>
                                    ) : (
                                        'Save Changes'
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
