import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BuyCreditsModal from './BuyCreditsModal';
import { packages } from '../services/api';

const Pricing = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);


    // Dynamic Plans State
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            try {

                // Fetch Plans
                const pkgRes = await packages.getAll();

                // Defensive check: ensure data is an array
                const pkgData = Array.isArray(pkgRes.data) ? pkgRes.data : [];

                const formattedPlans = pkgData.map(p => {
                    let features = [];
                    try {
                        features = JSON.parse(p.features);
                    } catch (e) {
                        features = [p.features];
                    }
                    return { ...p, features };
                });
                setPlans(formattedPlans);

            } catch (error) {
                console.error("Failed to fetch pricing data", error);
                console.error("Response data:", error.response?.data);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleChoosePlan = (plan) => {
        const token = localStorage.getItem('token');

        if (!token) {
            navigate('/register');
        } else {
            setSelectedPlan(plan);
            setShowModal(true);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedPlan(null);
    };

    const handlePaymentSuccess = () => {
        navigate('/dashboard');
    };

    return (
        <section className="section pricing" id="pricing">
            <BuyCreditsModal
                isOpen={showModal}
                onClose={handleModalClose}
                onSuccess={handlePaymentSuccess}
                preSelectedPackage={selectedPlan}
            />

            <div className="container">
                <h2 className="section-title">Simple, Transparent Pricing</h2>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>Loading plans...</div>
                ) : (
                    <div className="grid grid-3">
                        {plans.map((plan, index) => {
                            const isSoldOut = plan.available_slots <= 0;
                            const isDisabled = plan.unavailable || isSoldOut;

                            return (
                                <div key={index} className={`card pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                                    {plan.offer && <div className="offer-badge">{plan.offer}</div>}
                                    {isSoldOut && <div className="offer-badge" style={{ background: '#ef4444' }}>SOLD OUT</div>}
                                    <h3 className="card-title">{plan.name}</h3>
                                    <div className="price">
                                        <span className="currency">{plan.currency}</span>
                                        <span className="amount">{plan.price}</span>
                                    </div>
                                    {!isSoldOut && plan.available_slots > 0 && (
                                        <div style={{
                                            fontSize: '0.85rem',
                                            color: plan.available_slots <= 3 ? '#ef4444' : '#10b981',
                                            fontWeight: '600',
                                            marginBottom: '10px'
                                        }}>
                                            {plan.available_slots} slot{plan.available_slots > 1 ? 's' : ''} remaining
                                        </div>
                                    )}
                                    <ul className="features-list">
                                        {plan.features.map((feature, i) => (
                                            <li key={i}>{feature}</li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => !isDisabled && handleChoosePlan(plan)}
                                        disabled={isDisabled}
                                        className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                                        style={{
                                            opacity: isDisabled ? 0.5 : 1,
                                            cursor: isDisabled ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {plan.unavailable ? 'Unavailable' : (isSoldOut ? 'Sold Out' : 'Choose Plan')}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Pricing;
