import React from 'react';

const TermsOfService = () => {
    return (
        <section className="section">
            <div className="container">
                <h1 className="section-title">Terms of Service</h1>
                <div className="card">
                    <div className="card-text">
                        <h3>1. Introduction</h3>
                        <p>Welcome to Checkmate Essays. By accessing our website and using our services, you agree to be bound by these Terms of Service.</p>
                        <br />
                        <h3>2. Use of Service</h3>
                        <p>Our service allows you to check your academic work for similarity and AI content. You agree to use this service for personal, educational purposes only.</p>
                        <br />
                        <h3>3. Privacy & Data</h3>
                        <p>We respect your privacy. Documents submitted for checking are processed securely and are not stored in any repository.</p>
                        <br />
                        <h3>4. Disclaimer</h3>
                        <p>While we strive for accuracy, our reports are for informational purposes. We are not responsible for academic outcomes based on these reports.</p>
                        <br />
                        <h3>5. Changes to Terms</h3>
                        <p>We reserve the right to modify these terms at any time. Continued use of the service constitutes agreement to the new terms.</p>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TermsOfService;
