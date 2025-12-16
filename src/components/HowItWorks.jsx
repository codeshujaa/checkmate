import React from 'react';

const HowItWorks = () => {
    const steps = [
        {
            title: 'Upload File',
            description: 'Drag and drop your essay, paper, or assignment into our secure dashboard. We support all major file formats.',
        },
        {
            title: 'Turnitin Processing',
            description: 'We anonymously submit your document to Turnitin using a non-repository account to check for AI and plagiarism without saving your work.',
        },
        {
            title: 'View Report',
            description: 'Receive a detailed, color-coded report highlighting potential issues and providing a uniqueness score.',
        },
        {
            title: 'Refine & Submit',
            description: 'Use our insights to paraphrase and improve your work, ensuring it meets all academic integrity standards.',
        },
    ];

    return (
        <section className="section how-it-works" id="how-it-works">
            <div className="container">
                <h2 className="section-title">Simple 4-Step Process</h2>
                <div className="grid grid-4">
                    {steps.map((step, index) => (
                        <div key={index} className="card step-card">
                            <h3 className="card-title">{step.title}</h3>
                            <p className="card-text">{step.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorks;
