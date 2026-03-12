import React from 'react';

function DownloadIcon() {
    return (
        <svg className="dl-btn__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
        </svg>
    );
}

function formatTime(totalSeconds) {
    if (totalSeconds <= 0) return "0s";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

const DownloadButton = ({ quality, onDownload, expired, timeLeft }) => {
    const hasLink = quality.url && quality.url !== "#" && quality.url.trim() !== "";
    const isEffectiveExpired = expired || !hasLink;

    return (
        <button
            className={`dl-btn ${quality.className}${isEffectiveExpired ? " dl-btn--disabled" : ""}`}
            onClick={() => !isEffectiveExpired && onDownload(quality)}
            disabled={isEffectiveExpired}
        >
            <DownloadIcon />
            <span className="dl-btn__quality">{quality.label}</span>
            {isEffectiveExpired
                ? <span className="dl-btn__expired">Link Expired</span>
                : <span className="dl-btn__size">{quality.size} • {formatTime(timeLeft)}</span>
            }
        </button>
    );
};

export default DownloadButton;
