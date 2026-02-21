import React, { useState } from 'react';

function RequestModal({ visible, onClose, onRequestSubmit }) {
    const [title, setTitle] = useState("");
    const [step, setStep] = useState(1);

    // Reset step when modal opens/closes
    React.useEffect(() => {
        if (visible) setStep(1);
    }, [visible]);

    if (!visible) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;
        onRequestSubmit(title);
        setTitle("");
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-card fade-in-up" onClick={e => e.stopPropagation()}>
                {step === 1 ? (
                    <>
                        <h2 className="modal-card__title">📢 Request Guidelines</h2>
                        <div className="modal-rules">
                            <p>Please follow these rules before requesting:</p>
                            <ul className="rules-list">
                                <li>✅ <strong>Only request new movies</strong></li>
                                <li>🚫 <strong>Don't ask theater friend (cam) movies</strong></li>
                                <li>🚫 <strong>Don't ask outdated movies</strong></li>
                                <li>⭐ <strong>Only ask popular movies</strong></li>
                            </ul>
                        </div>
                        <div className="modal-actions">
                            <button type="button" onClick={onClose} className="modal-btn modal-btn--cancel">
                                Cancel
                            </button>
                            <button type="button" onClick={() => setStep(2)} className="modal-btn modal-btn--submit">
                                Okay, I Understand
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 className="modal-card__title">🎬 Request a Movie</h2>
                        <p className="modal-card__subtitle">
                            Tell us what movie you'd like to see added!
                        </p>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter movie name..."
                                className="modal-input"
                                autoFocus
                            />
                            <div className="modal-actions">
                                <button type="button" onClick={onClose} className="modal-btn modal-btn--cancel">
                                    Cancel
                                </button>
                                <button type="submit" className="modal-btn modal-btn--submit">
                                    Submit Request
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}

export default RequestModal;
