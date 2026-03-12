import React, { useState } from 'react';
import LikeButton from './LikeButton';

const SeriesCard = ({ series, onDownload, now, expiresAt, counters, hasLiked, onLike }) => {
    const [expanded, setExpanded] = useState(false);
    const downloads = counters?.downloads || {};

    return (
        <div className="series-card fade-in-up">
            <div className="series-card__header" onClick={() => setExpanded(!expanded)}>
                <div className="series-card__poster-wrap">
                    <img
                        className="series-card__poster"
                        src={series.poster}
                        alt={`${series.title} Poster`}
                        loading="lazy"
                        onError={e => { e.target.src = 'https://via.placeholder.com/120x170/1a1a2e/e94560?text=No+Image'; }}
                    />
                </div>
                <div className="series-card__info">
                    <h2 className="series-card__title">{series.title}</h2>
                    <div className="series-card__meta">
                        {series.year && <span className="series-card__tag">📅 {series.year}</span>}
                        {series.genre && <span className="series-card__tag">🎬 {series.genre}</span>}
                        <span className="series-card__tag">📺 {series.episodes.length} Episode{series.episodes.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="series-card__actions-row">
                        <button className={`series-card__toggle ${expanded ? 'series-card__toggle--open' : ''}`}>
                            {expanded ? '▲ Hide Episodes' : '▼ Show Episodes'}
                        </button>
                        <LikeButton
                            type="series"
                            title={series.title}
                            likeCount={counters?.likes || 0}
                            hasLiked={hasLiked}
                            onLike={onLike}
                        />
                    </div>
                </div>
            </div>
            {expanded && (
                <div className="series-card__episodes">
                    <div className="episodes-list">
                        {series.episodes.map((ep, i) => {
                            const hasLink = ep.url && ep.url !== '#' && ep.url.trim() !== '';
                            const expired = expiresAt && now >= expiresAt;
                            const isDisabled = expired || !hasLink;
                            const epDownloads = downloads[ep.label] || 0;

                            return (
                                <div key={i} className="episode-row">
                                    <div className="episode-row__info">
                                        <span className="episode-row__label">{ep.label}</span>
                                        <span className={`episode-row__quality quality-badge quality-badge--1080`}>
                                            {ep.quality || '1080p'}
                                        </span>
                                        <span className="episode-row__size">{ep.size}</span>
                                        {epDownloads > 0 && (
                                            <span className="episode-row__dl-count">⬇ {epDownloads}</span>
                                        )}
                                    </div>
                                    <button
                                        className={`episode-row__dl-btn ${isDisabled ? 'episode-row__dl-btn--disabled' : ''}`}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isDisabled) onDownload({ label: `${series.title} - ${ep.label}`, size: ep.size, url: ep.url, seriesTitle: series.title, episodeLabel: ep.label });
                                        }}
                                        disabled={isDisabled}
                                    >
                                        {isDisabled
                                            ? '🔒 Expired'
                                            : <>⬇️ Download</>
                                        }
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeriesCard;
