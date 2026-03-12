import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import BackgroundGlows from '../components/BackgroundGlows';
import RequestCloud from '../components/RequestCloud';
import RequestModal from '../components/RequestModal';
import MoviePoster from '../components/MoviePoster';
import DownloadSection from '../components/DownloadSection';
import SeriesCard from '../components/SeriesCard';
import LikeButton from '../components/LikeButton';
import { fetchConfig, GITHUB_OWNER, GITHUB_REPO, HARDCODED_PAT } from '../services/configService';
import { createIssue } from '../services/githubService';
import { fetchCounters, incrementDownload, incrementSeriesDownload, toggleLike, hasUserLiked, getItemCounters } from '../services/counterService';
import '../styles/index.css';

function parseConfig(config) {
    const expiresAt = new Date(config.expiryTime).getTime();
    const classMap = { "480p": "dl-btn--480", "720p": "dl-btn--720", "1080p": "dl-btn--1080" };
    return config.movies.map(m => ({
        title: m.title,
        poster: m.poster,
        rating: m.rating,
        year: m.year,
        duration: m.duration,
        genre: m.genre,
        qualities: m.qualities.map(q => ({
            label: q.label,
            size: q.size,
            url: q.url,
            className: classMap[q.label] || "dl-btn--480",
            expiresAt: expiresAt,
        })),
    }));
}

function parseSeries(config) {
    const expiresAt = new Date(config.expiryTime).getTime();
    return (config.series || []).map(s => ({
        title: s.title,
        poster: s.poster,
        genre: s.genre,
        year: s.year,
        episodes: (s.episodes || []).map(ep => ({
            label: ep.label,
            quality: ep.quality || '1080p',
            size: ep.size,
            url: ep.url,
        })),
        expiresAt: expiresAt,
    }));
}

function Home() {
    const [movies, setMovies] = useState([]);
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMsg, setToastMsg] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [requests, setRequests] = useState([]);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [requestInput, setRequestInput] = useState("");
    const [activeTab, setActiveTab] = useState('movies');
    const [counters, setCounters] = useState({ movies: {}, series: {} });

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const [data, counterData] = await Promise.all([
                    fetchConfig(),
                    fetchCounters()
                ]);
                setRequests(data.requests || []);
                setMovies(parseConfig(data));
                setSeries(parseSeries(data));
                setCounters(counterData);
                setLoading(false);
            } catch (err) {
                console.error("Failed to load config:", err);
                setError("Failed to load movie data.");
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const showToast = useCallback((msg, duration = 3000) => {
        setToastMsg(msg);
        setToastVisible(true);
        const timer = setTimeout(() => setToastVisible(false), duration);
        return () => clearTimeout(timer);
    }, []);

    const handleDirectRequest = async (title) => {
        if (!title.trim()) return;
        showToast("Submitting request... ⏳", 5000);
        try {
            await createIssue(
                HARDCODED_PAT,
                GITHUB_OWNER,
                GITHUB_REPO,
                `Request: ${title}`,
                `I would like to request the movie: **${title}**.\n\n_Requested via MovieVault Direct_`
            );
            showToast("Request submitted successfully! ✅ Admin will review it.");
        } catch (err) {
            console.error(err);
            showToast("Failed to submit request. Please try again later. ❌");
        }
    };

    const handleHeroRequest = useCallback((e) => {
        e.preventDefault();
        setRequestModalOpen(true);
    }, []);

    const handleModalRequest = useCallback((title) => {
        handleDirectRequest(title);
        setRequestModalOpen(false);
    }, [showToast]);

    const handleDownload = useCallback((quality) => {
        if (!quality.url || quality.url === '#') {
            showToast("Link not available");
            return;
        }
        showToast(`Starting ${quality.label} download (${quality.size})...`);

        // Track download count
        if (quality.seriesTitle && quality.episodeLabel) {
            incrementSeriesDownload(quality.seriesTitle, quality.episodeLabel).then(updated => {
                if (updated) setCounters(updated);
            });
        } else if (quality.movieTitle) {
            incrementDownload(quality.movieTitle, quality.label).then(updated => {
                if (updated) setCounters(updated);
            });
        }

        let count = 3;
        const interval = setInterval(() => {
            count--;
            if (count > 0) {
                showToast(`Download starting in ${count}...`);
            } else {
                clearInterval(interval);
                showToast(`Downloading ${quality.label} version...`);
                window.open(quality.url, "_blank");
                setTimeout(() => showToast(`${quality.label} download started! ✅`, 3500), 2000);
            }
        }, 1000);
    }, [showToast]);

    const handleLike = useCallback(async (type, title) => {
        const result = await toggleLike(type, title);
        // Refresh counters
        const updated = await fetchCounters();
        setCounters(updated);
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner"></div>
                <p>Loading MovieVault...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-screen">
                <div className="error-icon">⚠️</div>
                <div className="error-text">{error}</div>
                <button onClick={() => window.location.reload()} className="error-retry-btn">Retry</button>
            </div>
        );
    }

    const approvedRequests = requests.filter(r => r.status === 'approved');

    return (
        <div className="home-page">
            <BackgroundGlows />
            <Header />

            {/* Hero Request Section */}
            <section className="hero-section fade-in-up">
                <div className="hero-content">
                    <h2 className="hero-title">🎬 Request a Movie</h2>
                    <p className="hero-subtitle">Can't find what you're looking for? Tell us!</p>
                    <form className="hero-form" onSubmit={handleHeroRequest}>
                        <input
                            type="text"
                            value={requestInput}
                            readOnly
                            onClick={() => setRequestModalOpen(true)}
                            placeholder="Enter movie name..."
                            className="hero-input"
                            style={{ cursor: 'pointer' }}
                        />
                        <button type="submit" className="hero-submit-btn">
                            Submit Request
                        </button>
                    </form>
                </div>
            </section>

            {/* Approved Requests Cloud */}
            {approvedRequests.length > 0 && (
                <>
                    <h3 className="requests-title">Requested Movies</h3>
                    <RequestCloud requests={approvedRequests} />
                </>
            )}

            {/* Category Tab Switcher */}
            <div className="category-tabs fade-in-up">
                <button
                    className={`category-tab ${activeTab === 'movies' ? 'category-tab--active' : ''}`}
                    onClick={() => setActiveTab('movies')}
                >
                    <span className="category-tab__icon">🎬</span>
                    <span className="category-tab__label">Movies</span>
                    <span className="category-tab__count">{movies.length}</span>
                </button>
                <button
                    className={`category-tab ${activeTab === 'series' ? 'category-tab--active' : ''}`}
                    onClick={() => setActiveTab('series')}
                >
                    <span className="category-tab__icon">📺</span>
                    <span className="category-tab__label">Series</span>
                    <span className="category-tab__count">{series.length}</span>
                </button>
                <div className={`category-tab__slider ${activeTab === 'series' ? 'category-tab__slider--right' : ''}`} />
            </div>

            {/* Movies Tab */}
            {activeTab === 'movies' && (
                <main className="main fade-in">
                    {movies.length === 0 ? (
                        <div className="tab-empty">No movies available yet</div>
                    ) : (
                        movies.map((movie, i) => {
                            const movieCounters = getItemCounters(counters, 'movies', movie.title);
                            return (
                                <div key={i} className="movie-card fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                                    <MoviePoster movie={movie} />
                                    <div className="movie-card__like-row">
                                        <LikeButton
                                            type="movies"
                                            title={movie.title}
                                            likeCount={movieCounters.likes || 0}
                                            hasLiked={hasUserLiked('movies', movie.title)}
                                            onLike={handleLike}
                                        />
                                    </div>
                                    <DownloadSection
                                        qualities={movie.qualities.map(q => ({ ...q, movieTitle: movie.title }))}
                                        onDownload={handleDownload}
                                        now={now}
                                        downloadCounts={movieCounters.downloads || {}}
                                    />
                                </div>
                            );
                        })
                    )}
                </main>
            )}

            {/* Series Tab */}
            {activeTab === 'series' && (
                <div className="series-tab-content fade-in">
                    {series.length === 0 ? (
                        <div className="tab-empty">No series available yet</div>
                    ) : (
                        <div className="series-grid">
                            {series.map((s, i) => {
                                const seriesCounters = getItemCounters(counters, 'series', s.title);
                                return (
                                    <SeriesCard
                                        key={i}
                                        series={s}
                                        onDownload={handleDownload}
                                        now={now}
                                        expiresAt={s.expiresAt}
                                        counters={seriesCounters}
                                        hasLiked={hasUserLiked('series', s.title)}
                                        onLike={handleLike}
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            <Footer />
            <Toast message={toastMsg} visible={toastVisible} />
            <RequestModal
                visible={requestModalOpen}
                onClose={() => setRequestModalOpen(false)}
                onRequestSubmit={handleModalRequest}
            />
        </div>
    );
}

export default Home;
