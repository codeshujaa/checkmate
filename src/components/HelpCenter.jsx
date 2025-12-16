import React from 'react';

const HelpCenter = () => {
    const faqs = [
        {
            question: "Is my work saved in a database?",
            answer: "No. We use a non-repository account, which means your work is checked against the database but is NOT added to it. You can safely check your work without fear of self-plagiarism."
        },
        {
            question: "How long does a check take?",
            answer: "Most checks are completed within 30-60 seconds, depending on the length of the document."
        },
        {
            question: "What file formats do you support?",
            answer: "We support .docx, .pdf, .txt, and most other common document formats."
        },
        {
            question: "How do I purchase more slots?",
            answer: "You can purchase additional slots directly from your dashboard or the Pricing page. Credits are added to your account instantly."
        }
    ];

    return (
        <section className="section">
            <div className="container">
                <h1 className="section-title">Help Center</h1>
                <div className="grid grid-2">
                    {faqs.map((faq, index) => (
                        <div key={index} className="card">
                            <h3 className="card-title">{faq.question}</h3>
                            <p className="card-text">{faq.answer}</p>
                        </div>
                    ))}
                </div>
                <div className="card" style={{ marginTop: '40px', textAlign: 'center' }}>
                    <h3 className="card-title">Still have questions?</h3>
                    <p className="card-text">
                        Our support team is here to help. <a href="mailto:hello@checkmate.io" style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Contact Us</a>
                    </p>
                </div>
            </div>
        </section>
    );
};

export default HelpCenter;
