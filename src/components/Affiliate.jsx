
import React from 'react';
import { Lock } from 'lucide-react';

const Affiliate = () => {
    return (
        <div className="dashboard-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                <div style={{ background: '#f3f4f6', padding: '20px', borderRadius: '50%', display: 'inline-flex', marginBottom: '20px' }}>
                    <Lock size={48} color="#9ca3af" />
                </div>
                <h2>Affiliate Program</h2>
                <p className="text-muted" style={{ margin: '10px 0 20px', maxWidth: '400px' }}>
                    Our affiliate program is currently unavailable. Check back later for updates on how to earn rewards by referring friends.
                </p>
                <div style={{
                    padding: '8px 16px',
                    background: '#fee2e2',
                    color: '#991b1b',
                    borderRadius: '20px',
                    display: 'inline-block',
                    fontWeight: '500',
                    fontSize: '14px'
                }}>
                    Currently Unavailable
                </div>
            </div>
        </div>
    );
};

export default Affiliate;
