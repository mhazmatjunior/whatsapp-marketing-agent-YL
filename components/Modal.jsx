'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, CheckCircle2, HelpCircle } from 'lucide-react';
import styles from './Modal.module.css';

const Modal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    type = 'info', // 'info', 'success', 'warning', 'confirm'
    confirmText = 'OK',
    cancelText = 'Cancel'
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen || !mounted) return null;

    const icons = {
        info: <AlertCircle className={styles.infoIcon} />,
        success: <CheckCircle2 className={styles.successIcon} />,
        warning: <AlertCircle className={styles.warningIcon} />,
        confirm: <HelpCircle className={styles.confirmIcon} />
    };

    const modalContent = (
        <div className={styles.overlay} onClick={onClose}>
            <div className={`${styles.modal} glass`} onClick={e => e.stopPropagation()}>
                <button className={styles.closeBtn} onClick={onClose}>
                    <X size={20} />
                </button>

                <div className={styles.content}>
                    <div className={styles.iconWrapper}>
                        {icons[type]}
                    </div>
                    <div className={styles.textWrapper}>
                        <h3 className={styles.title}>{title}</h3>
                        <p className={styles.message}>{message}</p>
                    </div>
                </div>

                <div className={styles.actions}>
                    {type === 'confirm' && (
                        <button className={styles.cancelBtn} onClick={onClose}>
                            {cancelText}
                        </button>
                    )}
                    <button
                        className={styles.confirmBtn}
                        onClick={() => {
                            if (onConfirm) onConfirm();
                            onClose();
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default Modal;
