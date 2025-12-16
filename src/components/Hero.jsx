import React from 'react';

const Hero = () => {
    return (
        <section className="hero">
            <div className="container hero-content">
                <h1 className="hero-title">Secure Your Academic Future.</h1>
                <p className="hero-subtitle">
                    We use <strong>Turnitin</strong> to check your papers before you submit. Our <strong>non-repository</strong> system ensures your work is never saved or shared, so you can check safely without fear of self-plagiarism.
                </p>
                <a href="/register" className="btn btn-primary">Start Checking Now</a>
            </div>
        </section>
    );
};

export default Hero;
