import React from 'react';
import DownloadButton from './DownloadButton';

const DownloadSection = ({ qualities, onDownload, now }) => {
    return (
        <div className="download-section">
            <h2 className="download-section__title">Choose Download Quality</h2>
            <div className="download-section__buttons">
                {qualities.map((q) => {
                    const expired = q.expiresAt && now >= q.expiresAt;
                    const timeLeft = q.expiresAt ? Math.max(0, Math.ceil((q.expiresAt - now) / 1000)) : 0;
                    return <DownloadButton key={q.label} quality={q} onDownload={onDownload} expired={expired} timeLeft={timeLeft} />;
                })}
            </div>
        </div>
    );
};

export default DownloadSection;
