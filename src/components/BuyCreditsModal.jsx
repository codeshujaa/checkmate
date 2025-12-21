import React, { useState } from 'react';
import { X } from 'lucide-react';
import { payment } from '../services/api';

const BuyCreditsModal = ({ isOpen, onClose, onSuccess, preSelectedSlots = null }) => {
    const [phoneNumber, setPhoneNumber] = useState('254');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');

    // Pricing data
    const pricing = {
        1: 100,
        3: 250,
        5: 480
    };

    const selectedPrice = pricing[preSelectedSlots] || 0;

    const handlePurchase = async () => {
        if (!/^254\d{9}$/.test(phoneNumber)) {
            setError('Enter valid 254XXXXXXXXX number');
            return;
        }

        setError('');
        setIsProcessing(true);

        try {
            const response = await payment.initiate(preSelectedSlots, phoneNumber);
            const { checkout_request_id } = response.data;

            // Wait 5s before first poll (give M-Pesa time to process)
            setTimeout(() => {
                const pollInterval = setInterval(async () => {
                    try {
                        const statusResp = await payment.checkStatus(checkout_request_id);

                        if (statusResp.data.status === 'completed') {
                            clearInterval(pollInterval);
                            setIsProcessing(false);
                            onSuccess();
                            onClose();
                        } else if (statusResp.data.status === 'failed') {
                            clearInterval(pollInterval);
                            setIsProcessing(false);
                            setError(statusResp.data.message || 'Transaction failed or insufficient funds');
                        }
                    } catch (err) {
                        // Silent retry
                    }
                }, 8000); // Poll every 8s 

                // Timeout after 60s
                setTimeout(() => {
                    clearInterval(pollInterval);
                    if (isProcessing) {
                        setIsProcessing(false);
                        setError('Connection timeout. Check M-Pesa for transaction status.');
                    }
                }, 60000);
            }, 5000); // Initial 5s delay

        } catch (err) {
            setIsProcessing(false);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to initiate payment.';
            setError(msg);
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
                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Complete Purchase</h3>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            padding: '4px',
                            opacity: isProcessing ? 0.5 : 1
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Selected Plan Summary */}
                <div style={{
                    backgroundColor: '#f3f4f6',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '20px'
                }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                        You selected:
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                        {preSelectedSlots} Slot{preSelectedSlots > 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '18px', color: '#10b981', fontWeight: '600', marginTop: '4px' }}>
                        KSH {selectedPrice}
                    </div>
                </div>

                {/* Phone Number */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        M-Pesa Phone Number
                    </label>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="254712345678"
                        disabled={isProcessing}
                        style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '16px',
                            opacity: isProcessing ? 0.6 : 1
                        }}
                    />
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>
                        Enter your Safaricom number (format: 254XXXXXXXXX)
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: '#fee2e2',
                        color: '#dc2626',
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                {/* Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        disabled={isProcessing}
                        style={{
                            padding: '10px 20px',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            background: 'white',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            fontWeight: '500',
                            opacity: isProcessing ? 0.6 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handlePurchase}
                        disabled={isProcessing}
                        style={{
                            padding: '10px 20px',
                            border: 'none',
                            borderRadius: '6px',
                            background: isProcessing ? '#9ca3af' : '#10b981',
                            color: 'white',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            fontWeight: '500'
                        }}
                    >
                        {isProcessing ? 'Processing...' : 'Pay with M-Pesa'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BuyCreditsModal;
