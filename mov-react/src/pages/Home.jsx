import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Toast from '../components/Toast';
import BackgroundGlows from '../components/BackgroundGlows';
import RequestCloud from '../components/RequestCloud';
import RequestModal from '../components/RequestModal';
import MoviePoster from '../components/MoviePoster';
import DownloadSection from '../components/DownloadSection';
import { fetchConfig } from '../services/configService';
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

function Home() {
    const [movies, setMovies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toastMsg, setToastMsg] = useState("");
    const [toastVisible, setToastVisible] = useState(false);
    const [now, setNow] = useState(Date.now());
    const [requests, setRequests] = useState([]);
    const [requestModalOpen, setRequestModalOpen] = useState(false);
    const [requestInput, setRequestInput] = useState("");

    // Helper: get pending requests from localStorage
    const getLocalRequests = () => {
        try {
            return JSON.parse(localStorage.getItem('mv_pending_requests') || '[]');
        } catch { return []; }
    };

    // Helper: save pending requests to localStorage
    const saveLocalRequests = (reqs) => {
        localStorage.setItem('mv_pending_requests', JSON.stringify(reqs));
    };

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const data = await fetchConfig();
                // Merge: GitHub config requests (approved ones) + localStorage pending requests
                const configRequests = data.requests || [];
                const localPending = getLocalRequests();
                // Combine: config requests first, then local pending (avoiding duplicates)
                const configTitles = new Set(configRequests.map(r => r.title.toLowerCase()));
                const uniqueLocal = localPending.filter(r => !configTitles.has(r.title.toLowerCase()));
                setRequests([...configRequests, ...uniqueLocal]);
                setMovies(parseConfig(data));
                setLoading(false);
            } catch (err) {
                console.error("Failed to load config:", err);
                // Still load local requests even if config fails
                setRequests(getLocalRequests());
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

    const handleHeroRequest = useCallback((e) => {
        e.preventDefault();
        if (!requestInput.trim()) return;
        const newRequest = { title: requestInput.trim(), status: 'pending', date: new Date().toISOString() };
        setRequests(prev => {
            const updated = [newRequest, ...prev];
            // Save all pending to localStorage
            saveLocalRequests(updated.filter(r => r.status === 'pending'));
            return updated;
        });
        setRequestInput("");
        showToast("Movie request submitted! 🎬 Awaiting admin approval.");
    }, [requestInput, showToast]);

    const handleModalRequest = useCallback((title) => {
        const newRequest = { title, status: 'pending', date: new Date().toISOString() };
        setRequests(prev => {
            const updated = [newRequest, ...prev];
            saveLocalRequests(updated.filter(r => r.status === 'pending'));
            return updated;
        });
        setRequestModalOpen(false);
        showToast("Movie request submitted! 🎬 Awaiting admin approval.");
    }, [showToast]);

    const handleDownload = useCallback((quality) => {
        if (!quality.url || quality.url === '#') {
            showToast("Link not available");
            return;
        }
        showToast(`Starting ${quality.label} download (${quality.size})...`);
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
                            onChange={e => setRequestInput(e.target.value)}
                            placeholder="Enter movie name..."
                            className="hero-input"
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

            {/* Movies Grid */}
            <main className="main">
                {movies.map((movie, i) => (
                    <div key={i} className="movie-card fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                        <MoviePoster movie={movie} />
                        <DownloadSection qualities={movie.qualities} onDownload={handleDownload} now={now} />
                    </div>
                ))}
            </main>

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
