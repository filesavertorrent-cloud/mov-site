import React from 'react';
import DownloadButton from './DownloadButton';

const DownloadSection = ({ qualities, onDownload, now, downloadCounts, comingSoon }) => {
    // Check if movie is "Coming Soon"
    if (comingSoon) {
        const releaseDate = new Date(comingSoon + 'T00:00:00');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (releaseDate > today) {
            const formattedDate = releaseDate.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
            });
            
            // Calculate days remaining
            const diffTime = releaseDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return (
                <div className="download-section coming-soon-section">
                    <div className="coming-soon-banner">
                        <div className="coming-soon-banner__icon">🎬</div>
                        <div className="coming-soon-banner__text">
                            <span className="coming-soon-banner__label">Coming on</span>
                            <span className="coming-soon-banner__date">{formattedDate}</span>
                        </div>
                        <div className="coming-soon-banner__countdown">
                            <span className="coming-soon-banner__days">{diffDays}</span>
                            <span className="coming-soon-banner__days-label">{diffDays === 1 ? 'day left' : 'days left'}</span>
                        </div>
                    </div>
                </div>
            );
        }
    }

    return (
        <div className="download-section">
            <h2 className="download-section__title">Choose Download Quality</h2>
            <div className="download-section__buttons">
                {qualities.map((q) => {
                    const expired = q.expiresAt && now >= q.expiresAt;
                    const timeLeft = q.expiresAt ? Math.max(0, Math.ceil((q.expiresAt - now) / 1000)) : 0;
                    const count = downloadCounts ? (downloadCounts[q.label] || 0) : 0;
                    return <DownloadButton key={q.label} quality={q} onDownload={onDownload} expired={expired} timeLeft={timeLeft} downloadCount={count} />;
                })}
            </div>
        </div>
    );
};

export default DownloadSection;
