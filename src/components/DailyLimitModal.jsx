import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { admin } from '../services/api';

const DailyLimitModal = ({ isOpen, onClose, currentLimit, currentUsage = 0 }) => {
    const [remainingSlots, setRemainingSlots] = useState(0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (currentLimit !== null && currentLimit !== undefined) {
            // Initialize with REMAINING slots (Max - Used)
            // This way, the user sees/edits what is actually available, not the total historical limit.
            setRemainingSlots(Math.max(0, currentLimit - currentUsage));
        }
    }, [currentLimit, currentUsage, isOpen]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // New Total Limit = Current Usage + Desired Remaining
            const newTotalLimit = currentUsage + remainingSlots;
            await admin.setDailyLimit(newTotalLimit);
            alert('Daily limit updated successfully!');
            onClose();
        } catch (error) {
            console.error('Failed to update limit:', error);
            alert('Failed to update limit. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '24px',
                width: '90%',
                maxWidth: '400px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Set Daily Upload Limit</h3>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Slots Allowed for Today (Remaining)
                    </label>
                    <input
                        type="number"
                        min="0"
                        value={remainingSlots}
                        onChange={(e) => setRemainingSlots(parseInt(e.target.value) || 0)}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '16px'
                        }}
                    />
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        This limit will apply to all users for today.
                    </p>
                    <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                            <span style={{ fontSize: '14px', color: '#4b5563' }}>Already Used:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>{currentUsage}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #d1d5db', paddingTop: '5px' }}>
                            <span style={{ fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>Total System Cap:</span>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#3b82f6' }}>
                                {currentUsage + remainingSlots}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 20px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            background: 'white',
                            cursor: 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '6px',
                            background: '#3b82f6',
                            color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: isSaving ? 0.6 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DailyLimitModal;
