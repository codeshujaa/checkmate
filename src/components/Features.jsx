import React from 'react';

const Features = () => {
    const features = [
        {
            title: 'Official Turnitin Reports',
            description: "Get the exact same AI and similarity reports your professors see, powered by genuine Turnitin technology.",
        },
        {
            title: 'Non-Repository Safe Check',
            description: 'We use a non-repository setting, meaning your work is NOT stored in the Turnitin database. Checking with us will never cause plagiarism matches later.',
        },
        {
            title: 'Real-time Analysis',
            description: 'Get instant feedback on your documents. Our optimized engine processes reports in seconds, not minutes.',
        },
        {
            title: '100% Private & Secure',
            description: 'Your privacy is paramount. Documents are processed securely and then immediately discarded from our systems.',
        },
    ];

    return (
        <section className="section features" id="features">
            <div className="container">
                <h2 className="section-title">Why Choose Checkmate Essays?</h2>
                <div className="grid grid-2">
                    {features.map((feature, index) => (
                        <div key={index} className="card feature-card">
                            <h3 className="card-title">{feature.title}</h3>
                            <p className="card-text">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default Features;
