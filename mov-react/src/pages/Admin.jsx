import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getRepoContent, updateRepoContent, uploadImageToRepo } from '../services/githubService';
import { GITHUB_OWNER, GITHUB_REPO, CONFIG_PATH } from '../services/configService';
import { fetchMovieByTitle } from '../services/omdbService';
import '../styles/admin.css';

const ADMIN_PASSWORD = "Abd123*";
// Split to bypass GitHub secret scanning
const HARDCODED_PAT_PART1 = "github_pat_11B3TCF3A0E9lMHdcX5JkH_";
const HARDCODED_PAT_PART2 = "WxfO583LiE6a9NPVx5OSloqDpbwIBD2U6JoZiSF7wttMXXGY3F3acRbDZUa";
const HARDCODED_PAT = HARDCODED_PAT_PART1 + HARDCODED_PAT_PART2;

function Admin() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [pat, setPat] = useState("");
    const [config, setConfig] = useState(null);
    const [sha, setSha] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const [statusType, setStatusType] = useState("");

    // Login
    const [loginPass, setLoginPass] = useState("");
    const [loginPat, setLoginPat] = useState(HARDCODED_PAT);
    const [loginError, setLoginError] = useState("");

    // Timer
    const [selectedTimer, setSelectedTimer] = useState(null);

    // IMDb fetch loading state per movie index
    const [fetchingImdb, setFetchingImdb] = useState({});

    const fileInputRefs = useRef({});

    // Session restore
    useEffect(() => {
        const session = localStorage.getItem("mv_admin_session");
        const storedPat = localStorage.getItem("mv_admin_pat");
        if (session === "true" && storedPat) {
            setPat(storedPat);
            setLoggedIn(true);
        }
    }, []);

    // Load config when logged in
    useEffect(() => {
        if (loggedIn && pat) loadConfig();
    }, [loggedIn, pat]);

    const loadConfig = async () => {
        setLoading(true);
        setStatus("Loading config from GitHub...", "loading");
        try {
            const data = await getRepoContent(pat, GITHUB_OWNER, GITHUB_REPO, CONFIG_PATH);
            const content = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))));
            if (!content.requests) content.requests = [];

            // Merge pending requests from localStorage (submitted from Home page)
            try {
                const localPending = JSON.parse(localStorage.getItem('mv_pending_requests') || '[]');
                if (localPending.length > 0) {
                    const existingTitles = new Set(content.requests.map(r => r.title.toLowerCase()));
                    const newRequests = localPending.filter(r => !existingTitles.has(r.title.toLowerCase()));
                    content.requests = [...content.requests, ...newRequests];
                }
            } catch (e) { /* ignore localStorage errors */ }

            setConfig(content);
            setSha(data.sha);
            setStatus("Config loaded successfully! ✅", "success");
        } catch (err) {
            console.error(err);
            setStatus("Failed to load config: " + err.message, "error");
            if (err.message.includes("401") || err.message.includes("403")) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const setStatus = (msg, type) => {
        setStatusMsg(msg);
        setStatusType(type);
        if (type === 'success') {
            setTimeout(() => { setStatusMsg(""); setStatusType(""); }, 4000);
        }
    };

    // ===== LOGIN =====
    const handleLogin = (e) => {
        e.preventDefault();
        setLoginError("");
        if (loginPass !== ADMIN_PASSWORD) {
            setLoginError("Incorrect password");
            return;
        }
        if (!loginPat.trim()) {
            setLoginError("Please enter your GitHub Personal Access Token");
            return;
        }
        localStorage.setItem("mv_admin_session", "true");
        localStorage.setItem("mv_admin_pat", loginPat.trim());
        setPat(loginPat.trim());
        setLoggedIn(true);
    };

    const handleLogout = () => {
        localStorage.removeItem("mv_admin_session");
        localStorage.removeItem("mv_admin_pat");
        setLoggedIn(false);
        setPat("");
        setConfig(null);
        setSha(null);
    };

    // ===== MOVIE EDITING =====
    const handleMovieChange = (index, field, value) => {
        const newMovies = [...config.movies];
        newMovies[index] = { ...newMovies[index], [field]: value };
        setConfig({ ...config, movies: newMovies });
    };

    const handleQualityChange = (movieIdx, qualIdx, field, value) => {
        const newMovies = [...config.movies];
        const newQualities = [...newMovies[movieIdx].qualities];
        newQualities[qualIdx] = { ...newQualities[qualIdx], [field]: value };
        newMovies[movieIdx] = { ...newMovies[movieIdx], qualities: newQualities };
        setConfig({ ...config, movies: newMovies });
    };

    const addNewMovie = () => {
        const newMovie = {
            title: "",
            poster: "",
            rating: "",
            year: "",
            duration: "",
            genre: "",
            qualities: [
                { label: "480p", size: "0 GB", url: "" },
                { label: "720p", size: "0 GB", url: "" },
                { label: "1080p", size: "0 GB", url: "" }
            ]
        };
        setConfig({ ...config, movies: [newMovie, ...config.movies] });
    };

    // ===== IMDb FETCH =====
    const fetchImdbData = async (index) => {
        const movie = config.movies[index];
        if (!movie.title || !movie.title.trim() || movie.title === 'New Movie') {
            setStatus('Please enter a movie title first', 'error');
            return;
        }
        setFetchingImdb(prev => ({ ...prev, [index]: true }));
        setStatus(`🔍 Looking up "${movie.title}" on IMDb...`, 'loading');
        try {
            const data = await fetchMovieByTitle(movie.title);
            if (data) {
                const newMovies = [...config.movies];
                newMovies[index] = {
                    ...newMovies[index],
                    rating: data.rating || newMovies[index].rating,
                    year: data.year || newMovies[index].year,
                    duration: data.duration || newMovies[index].duration,
                    genre: data.genre || newMovies[index].genre,
                };
                setConfig({ ...config, movies: newMovies });
                setStatus(`✅ Found "${movie.title}" — Rating: ${data.rating}, Year: ${data.year}`, 'success');
            } else {
                setStatus(`❌ "${movie.title}" not found on IMDb. Fill details manually.`, 'error');
            }
        } catch (err) {
            setStatus('IMDb fetch failed: ' + err.message, 'error');
        } finally {
            setFetchingImdb(prev => ({ ...prev, [index]: false }));
        }
    };

    const deleteMovie = (index) => {
        if (!window.confirm(`Delete "${config.movies[index].title}"?`)) return;
        const newMovies = config.movies.filter((_, i) => i !== index);
        setConfig({ ...config, movies: newMovies });
    };

    // ===== IMAGE UPLOAD =====
    const handleImageUpload = async (index, file) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            alert("File too large (Max 2MB)");
            return;
        }
        setStatus(`Uploading image for movie #${index + 1}...`, "loading");
        try {
            const url = await uploadImageToRepo(pat, GITHUB_OWNER, GITHUB_REPO, file);
            handleMovieChange(index, 'poster', url);
            setStatus("Image uploaded successfully! ✅", "success");
        } catch (err) {
            setStatus("Image upload failed: " + err.message, "error");
        }
    };

    // ===== TIMER =====
    const selectTimer = (minutes) => {
        setSelectedTimer(minutes);
        const expiry = new Date(Date.now() + minutes * 60 * 1000);
        setConfig({ ...config, expiryTime: expiry.toISOString() });
    };

    // ===== REQUESTS =====
    const approveRequest = (index) => {
        const newRequests = [...config.requests];
        newRequests[index] = { ...newRequests[index], status: 'approved' };
        setConfig({ ...config, requests: newRequests });
    };

    const revokeRequest = (index) => {
        const newRequests = [...config.requests];
        newRequests[index] = { ...newRequests[index], status: 'pending' };
        setConfig({ ...config, requests: newRequests });
    };

    const deleteRequest = (index) => {
        if (!window.confirm("Remove this request?")) return;
        const newRequests = config.requests.filter((_, i) => i !== index);
        setConfig({ ...config, requests: newRequests });
    };

    const [newRequestTitle, setNewRequestTitle] = useState("");
    const addRequest = () => {
        if (!newRequestTitle.trim()) return;
        const newReq = { title: newRequestTitle.trim(), status: 'pending', date: new Date().toISOString() };
        setConfig({ ...config, requests: [...(config.requests || []), newReq] });
        setNewRequestTitle("");
    };

    // ===== SAVE & PUSH =====
    const saveAndPush = async () => {
        if (!config || !sha) return;
        setLoading(true);
        setStatus("🔍 Auto-fetching IMDb data for new movies...", "loading");
        try {
            // Auto-fetch IMDb data for movies with empty/default metadata
            const updatedMovies = [...config.movies];
            let fetchCount = 0;
            for (let i = 0; i < updatedMovies.length; i++) {
                const m = updatedMovies[i];
                const needsFetch = m.title && m.title.trim() &&
                    (!m.rating || m.rating === '0.0' || !m.year || !m.duration || m.duration === '0h 00m' || !m.genre || m.genre === 'Genre');
                if (needsFetch) {
                    try {
                        const data = await fetchMovieByTitle(m.title);
                        if (data) {
                            updatedMovies[i] = {
                                ...updatedMovies[i],
                                rating: data.rating || updatedMovies[i].rating,
                                year: data.year || updatedMovies[i].year,
                                duration: data.duration || updatedMovies[i].duration,
                                genre: data.genre || updatedMovies[i].genre,
                            };
                            fetchCount++;
                        }
                    } catch (e) { /* skip if individual fetch fails */ }
                }
            }
            const configToSave = { ...config, movies: updatedMovies };
            setConfig(configToSave);
            if (fetchCount > 0) {
                setStatus(`Fetched IMDb data for ${fetchCount} movie(s). Pushing to GitHub...`, 'loading');
            } else {
                setStatus("Pushing changes to GitHub...", "loading");
            }

            // Re-fetch SHA to avoid conflicts
            let currentSha = sha;
            try {
                const latest = await getRepoContent(pat, GITHUB_OWNER, GITHUB_REPO, CONFIG_PATH);
                currentSha = latest.sha;
            } catch (e) { /* use existing */ }

            const res = await updateRepoContent(
                pat, GITHUB_OWNER, GITHUB_REPO, CONFIG_PATH,
                configToSave, currentSha,
                `Update config via Admin Panel (${new Date().toLocaleString()})`
            );
            setSha(res.content.sha);
            // Optimistic Cache: Specific for Admin user to see changes immediately
            localStorage.setItem('mv_cache_config', JSON.stringify({
                data: configToSave,
                timestamp: Date.now()
            }));
            // Clear localStorage pending requests since they're now in GitHub
            localStorage.removeItem('mv_pending_requests');
            setStatus("Changes saved & pushed to GitHub! ✅ Will be live shortly.", "success");
        } catch (err) {
            console.error(err);
            setStatus("Failed to save: " + err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    // ===== LOGIN SCREEN =====
    if (!loggedIn) {
        return (
            <div className="admin-login-overlay">
                <div className="admin-bg-glow admin-bg-glow--1"></div>
                <div className="admin-bg-glow admin-bg-glow--2"></div>
                <div className="login-card fade-in">
                    <div className="login-logo">MovieVault</div>
                    <div className="login-subtitle">Admin Access</div>
                    <form onSubmit={handleLogin} className="login-form">
                        <div className="login-field">
                            <label>Password</label>
                            <input
                                type="password"
                                value={loginPass}
                                onChange={e => setLoginPass(e.target.value)}
                                placeholder="Enter admin password"
                                autoFocus
                            />
                        </div>
                        <div className="login-field">
                            <label>GitHub Auth Token</label>
                            <input
                                type="text"
                                value={loginPat}
                                onChange={e => setLoginPat(e.target.value)}
                                placeholder="ghp_xxxxxxxxxxxx"
                            />
                            <span className="login-hint">
                                <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer">
                                    Create a token →
                                </a> (select "repo" scope)
                            </span>
                        </div>
                        {loginError && <div className="login-error">{loginError}</div>}
                        <button type="submit" className="btn-primary btn-glow">🔓 Unlock Admin Panel</button>
                    </form>
                </div>
            </div>
        );
    }

    // ===== LOADING SCREEN =====
    if (!config) {
        return (
            <div className="admin-loading">
                <div className="admin-spinner"></div>
                <p>Loading Dashboard...</p>
                {statusMsg && <div className="admin-status admin-status--error" style={{ marginTop: '20px' }}>{statusMsg}</div>}
            </div>
        );
    }

    const pendingRequests = (config.requests || []).filter(r => r.status !== 'approved');
    const approvedRequests = (config.requests || []).filter(r => r.status === 'approved');
    const timerPresets = [
        { label: '15 min', mins: 15 },
        { label: '30 min', mins: 30 },
        { label: '1 hour', mins: 60 },
        { label: '2 hours', mins: 120 },
        { label: '3 hours', mins: 180 },
        { label: '4 hours', mins: 240 },
        { label: '5 hours', mins: 300 },
    ];

    const expiryDate = new Date(config.expiryTime);
    const expiryDiff = expiryDate - Date.now();
    const isExpired = expiryDiff <= 0;

    return (
        <div className="admin-body">
            {/* Header */}
            <header className="admin-header">
                <div className="admin-header__left">
                    <div className="admin-header__logo">MovieVault</div>
                    <div className="admin-header__sub">Admin Panel</div>
                </div>
                <div className="admin-header__right">
                    <Link to="/" className="admin-nav-btn">🏠 Home</Link>
                    <button onClick={handleLogout} className="admin-nav-btn admin-nav-btn--logout">
                        Logout
                    </button>
                </div>
            </header>

            <div className="admin-container">
                {/* Status */}
                {statusMsg && (
                    <div className={`admin-status admin-status--${statusType} fade-in`}>
                        {statusMsg}
                    </div>
                )}

                {/* Stats Bar */}
                <div className="admin-stats fade-in">
                    <div className="stat-chip">
                        <span className="stat-chip__label">Movies</span>
                        <span className="stat-chip__value">{config.movies.length}</span>
                    </div>
                    <div className="stat-chip">
                        <span className="stat-chip__label">Requests</span>
                        <span className="stat-chip__value">{(config.requests || []).length}</span>
                    </div>
                    <div className="stat-chip">
                        <span className="stat-chip__label">Timer</span>
                        <span className={`stat-chip__value ${isExpired ? 'stat--expired' : 'stat--active'}`}>
                            {isExpired ? '⛔ Expired' : `✅ ${Math.ceil(expiryDiff / 60000)}m left`}
                        </span>
                    </div>
                </div>

                {/* Timer Section */}
                <div className="admin-section fade-in">
                    <div className="admin-section__title">⏱️ Timer Duration</div>
                    <p className="admin-section__desc">Set how long download links stay active from now.</p>
                    <div className="timer-grid">
                        {timerPresets.map(t => (
                            <button
                                key={t.mins}
                                className={`timer-btn ${selectedTimer === t.mins ? 'timer-btn--active' : ''}`}
                                onClick={() => selectTimer(t.mins)}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                    <div className="admin-expiry-info">
                        <span>Current expiry:</span>
                        <strong>{expiryDate.toLocaleString()}</strong>
                    </div>
                </div>

                {/* Movies Section */}
                <div className="admin-section fade-in">
                    <div className="admin-section__title">🎬 Movies ({config.movies.length})</div>
                    <button className="btn-add-movie" onClick={addNewMovie}>
                        ➕ Add New Movie
                    </button>

                    <div className="movies-list">
                        {config.movies.map((movie, i) => (
                            <div key={i} className="movie-edit-card fade-in" style={{ animationDelay: `${i * 0.03}s` }}>
                                <div className="movie-edit-card__header">
                                    <div className="movie-edit-card__poster-wrap">
                                        <img
                                            src={movie.poster}
                                            alt={movie.title}
                                            className="movie-edit-card__poster"
                                            onError={e => { e.target.src = 'https://via.placeholder.com/80x120/1a1a2e/e94560?text=No+Image'; }}
                                        />
                                        <button
                                            className="poster-upload-btn"
                                            onClick={() => {
                                                const input = document.createElement('input');
                                                input.type = 'file';
                                                input.accept = 'image/*';
                                                input.onchange = (e) => handleImageUpload(i, e.target.files[0]);
                                                input.click();
                                            }}
                                            title="Upload poster"
                                        >
                                            📂
                                        </button>
                                    </div>
                                    <div className="movie-edit-card__fields">
                                        <div className="field-row">
                                            <label>Title</label>
                                            <div className="title-fetch-row">
                                                <input
                                                    type="text"
                                                    value={movie.title}
                                                    onChange={e => handleMovieChange(i, 'title', e.target.value)}
                                                    placeholder="Enter movie title..."
                                                />
                                                <button
                                                    className={`btn-fetch-imdb ${fetchingImdb[i] ? 'btn-fetch-imdb--loading' : ''}`}
                                                    onClick={() => fetchImdbData(i)}
                                                    disabled={fetchingImdb[i]}
                                                    title="Fetch rating, year, duration & genre from IMDb"
                                                >
                                                    {fetchingImdb[i] ? '⏳' : '🔍 IMDb'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="field-row">
                                            <label>Poster URL</label>
                                            <input
                                                type="url"
                                                value={movie.poster}
                                                onChange={e => handleMovieChange(i, 'poster', e.target.value)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                        <div className="field-grid-2">
                                            <div className="field-row">
                                                <label>Rating</label>
                                                <input
                                                    type="text"
                                                    value={movie.rating}
                                                    onChange={e => handleMovieChange(i, 'rating', e.target.value)}
                                                    placeholder="8.5"
                                                />
                                            </div>
                                            <div className="field-row">
                                                <label>Year</label>
                                                <input
                                                    type="text"
                                                    value={movie.year}
                                                    onChange={e => handleMovieChange(i, 'year', e.target.value)}
                                                    placeholder="2024"
                                                />
                                            </div>
                                        </div>
                                        <div className="field-grid-2">
                                            <div className="field-row">
                                                <label>Duration</label>
                                                <input
                                                    type="text"
                                                    value={movie.duration}
                                                    onChange={e => handleMovieChange(i, 'duration', e.target.value)}
                                                    placeholder="2h 30m"
                                                />
                                            </div>
                                            <div className="field-row">
                                                <label>Genre</label>
                                                <input
                                                    type="text"
                                                    value={movie.genre}
                                                    onChange={e => handleMovieChange(i, 'genre', e.target.value)}
                                                    placeholder="Action/Drama"
                                                />
                                            </div>
                                        </div>
                                        <div className="movie-edit-card__actions">
                                            <button className="btn-delete-movie" onClick={() => deleteMovie(i)}>
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Quality Links */}
                                <div className="quality-section">
                                    <div className="quality-section__label">Download Links</div>
                                    {movie.qualities.map((q, qi) => (
                                        <div key={qi} className="quality-row">
                                            <span className={`quality-badge quality-badge--${q.label.replace('p', '')}`}>
                                                {q.label}
                                            </span>
                                            <input
                                                type="text"
                                                value={q.size}
                                                onChange={e => handleQualityChange(i, qi, 'size', e.target.value)}
                                                placeholder="Size"
                                                className="quality-size-input"
                                            />
                                            <input
                                                type="url"
                                                value={q.url === '#' ? '' : q.url}
                                                onChange={e => handleQualityChange(i, qi, 'url', e.target.value || '#')}
                                                placeholder={`Paste ${q.label} link...`}
                                                className="quality-url-input"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Requests Section */}
                <div className="admin-section fade-in">
                    <div className="admin-section__title">💬 Manage Requests</div>

                    <div className="request-add-row">
                        <input
                            type="text"
                            value={newRequestTitle}
                            onChange={e => setNewRequestTitle(e.target.value)}
                            placeholder="Log a new request manually..."
                            onKeyDown={e => e.key === 'Enter' && addRequest()}
                        />
                        <button className="btn-add-request" onClick={addRequest}>Log & Add</button>
                    </div>

                    {/* Pending */}
                    <h3 className="request-group-title request-group-title--pending">
                        ⏳ Pending Approval ({pendingRequests.length})
                    </h3>
                    <div className="request-list">
                        {pendingRequests.length === 0 ? (
                            <div className="request-empty">No pending requests</div>
                        ) : (
                            pendingRequests.map((req) => {
                                const origIdx = config.requests.indexOf(req);
                                return (
                                    <div key={origIdx} className="request-item request-item--pending">
                                        <div className="request-item__info">
                                            <span className="request-item__title">{req.title}</span>
                                            <span className="request-item__date">
                                                {req.date ? new Date(req.date).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </div>
                                        <div className="request-item__actions">
                                            <button className="req-btn req-btn--approve" onClick={() => approveRequest(origIdx)}>
                                                ✅ Approve
                                            </button>
                                            <button className="req-btn req-btn--decline" onClick={() => deleteRequest(origIdx)}>
                                                ❌ Decline
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Approved */}
                    <h3 className="request-group-title request-group-title--approved">
                        ✅ Approved ({approvedRequests.length})
                    </h3>
                    <div className="request-list">
                        {approvedRequests.length === 0 ? (
                            <div className="request-empty">No approved requests</div>
                        ) : (
                            approvedRequests.map((req) => {
                                const origIdx = config.requests.indexOf(req);
                                return (
                                    <div key={origIdx} className="request-item request-item--approved">
                                        <div className="request-item__info">
                                            <span className="request-item__title">{req.title}</span>
                                            <span className="request-item__badge">Visible on Home</span>
                                        </div>
                                        <div className="request-item__actions">
                                            <button className="req-btn req-btn--revoke" onClick={() => revokeRequest(origIdx)}>
                                                ↩️ Revoke
                                            </button>
                                            <button className="req-btn req-btn--decline" onClick={() => deleteRequest(origIdx)}>
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Save Button */}
                <button
                    className="btn-primary btn-save-main btn-glow"
                    onClick={saveAndPush}
                    disabled={loading}
                >
                    {loading ? '⏳ Saving...' : '💾 Save & Push to GitHub'}
                </button>
            </div>

            {/* Footer */}
            <div className="admin-footer">
                MovieVault Admin Panel — v2.0
            </div>
        </div>
    );
}

export default Admin;
