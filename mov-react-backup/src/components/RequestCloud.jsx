import React from 'react';

const RequestCloud = ({ requests }) => {
    if (!requests || requests.length === 0) return null;

    return (
        <div className="floating-cloud fade-in-up fade-in-up--d2">
            {requests.map((req, i) => (
                <div key={i} className="cloud-tag" style={{
                    animationDuration: `${5 + (i % 4)}s`,
                    animationDelay: `${i * 0.5}s`
                }}>
                    ✨ {req.title}
                </div>
            ))}
        </div>
    );
};

export default RequestCloud;
