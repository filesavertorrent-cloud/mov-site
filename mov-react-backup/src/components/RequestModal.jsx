import React, { useState } from 'react';

function RequestModal({ visible, onClose, onRequestSubmit }) {
    const [title, setTitle] = useState("");

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
            </div>
        </div>
    );
}

export default RequestModal;
