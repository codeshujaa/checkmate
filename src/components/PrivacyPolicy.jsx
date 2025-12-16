import React from 'react';

const PrivacyPolicy = () => {
    return (
        <section className="section">
            <div className="container">
                <h1 className="section-title">Privacy Policy</h1>
                <div className="card">
                    <div className="card-text">
                        <h3>1. Data Collection</h3>
                        <p>We collect only the information necessary to provide our services, such as your email address for account management.</p>
                        <br />
                        <h3>2. Document Security</h3>
                        <p><strong>Your work is safe with us.</strong> We use a non-repository system, meaning your documents are processed for similarity checking and then immediately discarded. We do not store your essays, papers, or assignments in any database.</p>
                        <br />
                        <h3>3. Third-Party Services</h3>
                        <p>We use secure third-party payment processors. We do not store your credit card information on our servers.</p>
                        <br />
                        <h3>4. Cookies</h3>
                        <p>We use cookies to improve your experience on our site, such as keeping you logged in.</p>
                        <br />
                        <h3>5. Contact Us</h3>
                        <p>If you have any questions about our privacy practices, please contact us at hello@checkmate.io.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default PrivacyPolicy;
