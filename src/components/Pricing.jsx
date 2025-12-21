import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BuyCreditsModal from './BuyCreditsModal';
import api, { dailyLimit } from '../services/api';

const Pricing = () => {
    const navigate = useNavigate();
    const [showModal, setShowModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [systemLimitReached, setSystemLimitReached] = useState(false);

    useEffect(() => {
        const checkSystemLimit = async () => {
            try {
                const response = await dailyLimit.get();
                if (response.data.remaining === 0) {
                    setSystemLimitReached(true);
                }
            } catch (error) {
                console.error("Failed to check system limit", error);
            }
        };
        checkSystemLimit();
    }, []);

    const plans = [
        {
            name: '1 Slot',
            price: '100',
            currency: 'KSH',
            slots: 1,
            features: [
                '1 Document Check',
                'AI Detection',
                'Plagiarism Scan',
                'Instant Results'
            ],
            highlight: false
        },
        {
            name: '3 Slots',
            price: '250',
            currency: 'KSH',
            slots: 3,
            features: [
                '3 Document Checks',
                'AI Detection',
                'Plagiarism Scan',
                'Best Value'
            ],
            highlight: true,
            offer: 'POPULAR'
        },
        {
            name: '5 Slots',
            price: '480',
            currency: 'KSH',
            slots: 5,
            unavailable: true,
            features: [
                '5 Document Checks',
                'AI Detection',
                'Plagiarism Scan',
                'Priority Support'
            ],
            highlight: false
        }
    ];

    const handleChoosePlan = (plan) => {
        const token = localStorage.getItem('token');

        if (!token) {
            // Not logged in - redirect to register
            navigate('/register');
        } else {
            // Logged in - open modal directly
            setSelectedPlan(plan.slots);
            setShowModal(true);
        }
    };

    const handleModalClose = () => {
        setShowModal(false);
        setSelectedPlan(null);
    };

    const handlePaymentSuccess = () => {
        // After successful payment, redirect to dashboard
        navigate('/dashboard');
    };

    return (
        <section className="section pricing" id="pricing">
            <BuyCreditsModal
                isOpen={showModal}
                onClose={handleModalClose}
                onSuccess={handlePaymentSuccess}
                preSelectedSlots={selectedPlan}
            />

            <div className="container">
                <h2 className="section-title">Simple, Transparent Pricing</h2>
                <div className="grid grid-3">
                    {plans.map((plan, index) => (
                        <div key={index} className={`card pricing-card ${plan.highlight ? 'highlight' : ''}`}>
                            {plan.offer && <div className="offer-badge">{plan.offer}</div>}
                            <h3 className="card-title">{plan.name}</h3>
                            <div className="price">
                                <span className="currency">{plan.currency}</span>
                                <span className="amount">{plan.price}</span>
                            </div>
                            <ul className="features-list">
                                {plan.features.map((feature, i) => (
                                    <li key={i}>{feature}</li>
                                ))}
                            </ul>
                            <button
                                onClick={() => !plan.unavailable && handleChoosePlan(plan)}
                                disabled={systemLimitReached || plan.unavailable}
                                className={`btn ${plan.highlight ? 'btn-primary' : 'btn-outline'}`}
                                style={{
                                    opacity: (systemLimitReached || plan.unavailable) ? 0.5 : 1,
                                    cursor: (systemLimitReached || plan.unavailable) ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {plan.unavailable ? 'Unavailable' : (systemLimitReached ? 'Sold Out Today' : 'Choose Plan')}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Pricing;
