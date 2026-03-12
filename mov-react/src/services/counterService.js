import { getRepoContent, updateRepoContent } from './githubService';
import { GITHUB_OWNER, GITHUB_REPO, HARDCODED_PAT } from './configService';

const COUNTERS_PATH = 'mov-react/public/counters.json';
const GITHUB_BRANCH = 'main';
const RAW_COUNTERS_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${COUNTERS_PATH}`;
const CACHE_KEY = 'mv_cache_counters';
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

const DEFAULT_COUNTERS = { movies: {}, series: {} };

// Fetch counters with caching
export const fetchCounters = async () => {
    try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                return data;
            }
        }
    } catch (e) { /* ignore */ }

    try {
        const res = await fetch(RAW_COUNTERS_URL + '?t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
            return data;
        }
    } catch (e) { /* ignore */ }

    return DEFAULT_COUNTERS;
};

// Increment a counter on GitHub with retry on SHA conflict
export const incrementCounter = async (type, title, counterPath) => {
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
            // Fetch latest from API (not raw, so we get SHA)
            let data, sha;
            try {
                const repoContent = await getRepoContent(HARDCODED_PAT, GITHUB_OWNER, GITHUB_REPO, COUNTERS_PATH);
                data = JSON.parse(decodeURIComponent(escape(atob(repoContent.content.replace(/\n/g, '')))));
                sha = repoContent.sha;
            } catch (e) {
                // File doesn't exist yet — create it
                data = { ...DEFAULT_COUNTERS };
                sha = null;
            }

            // Ensure structure exists
            if (!data[type]) data[type] = {};
            if (!data[type][title]) data[type][title] = { likes: 0, downloads: {} };

            // Increment the specific counter
            const keys = counterPath.split('.');
            let target = data[type][title];
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) target[keys[i]] = {};
                target = target[keys[i]];
            }
            const lastKey = keys[keys.length - 1];
            target[lastKey] = (target[lastKey] || 0) + 1;

            // Push back
            if (sha) {
                await updateRepoContent(
                    HARDCODED_PAT, GITHUB_OWNER, GITHUB_REPO, COUNTERS_PATH,
                    data, sha,
                    `Update counters: ${type}/${title}/${counterPath}`
                );
            } else {
                // Create file for the first time
                const body = {
                    message: 'Initialize counters.json',
                    content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
                    branch: GITHUB_BRANCH
                };
                const res = await fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${COUNTERS_PATH}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${HARDCODED_PAT}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body)
                });
                if (!res.ok) throw new Error('Failed to create counters.json');
            }

            // Update local cache
            localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
            return data;
        } catch (err) {
            if (attempt < MAX_RETRIES - 1 && (err.message.includes('409') || err.message.includes('sha'))) {
                // SHA conflict — retry
                await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
                continue;
            }
            console.warn('Counter increment failed:', err);
            // Update locally even if GitHub fails
            try {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data } = JSON.parse(cached);
                    if (!data[type]) data[type] = {};
                    if (!data[type][title]) data[type][title] = { likes: 0, downloads: {} };
                    const keys = counterPath.split('.');
                    let target = data[type][title];
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!target[keys[i]]) target[keys[i]] = {};
                        target = target[keys[i]];
                    }
                    target[keys[keys.length - 1]] = (target[keys[keys.length - 1]] || 0) + 1;
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
                    return data;
                }
            } catch (e) { /* ignore */ }
            return null;
        }
    }
};

// Convenience: increment download for a movie quality
export const incrementDownload = (movieTitle, quality) => {
    return incrementCounter('movies', movieTitle, `downloads.${quality}`);
};

// Convenience: increment download for a series episode
export const incrementSeriesDownload = (seriesTitle, episodeLabel) => {
    return incrementCounter('series', seriesTitle, `downloads.${episodeLabel}`);
};

// Like system with localStorage dedup
const LIKED_KEY = 'mv_user_likes';

const getLikedItems = () => {
    try {
        return JSON.parse(localStorage.getItem(LIKED_KEY) || '{}');
    } catch { return {}; }
};

export const hasUserLiked = (type, title) => {
    const liked = getLikedItems();
    return !!(liked[`${type}:${title}`]);
};

export const toggleLike = async (type, title) => {
    const key = `${type}:${title}`;
    const liked = getLikedItems();

    if (liked[key]) {
        // Already liked — unlike (decrement)
        delete liked[key];
        localStorage.setItem(LIKED_KEY, JSON.stringify(liked));
        // Note: we don't decrement on GitHub to keep it simple
        // and prevent gaming. The count represents total likes received.
        return false;
    }

    // Not liked — like it
    liked[key] = true;
    localStorage.setItem(LIKED_KEY, JSON.stringify(liked));
    await incrementCounter(type, title, 'likes');
    return true;
};

// Get counters for a specific item
export const getItemCounters = (counters, type, title) => {
    if (!counters || !counters[type] || !counters[type][title]) {
        return { likes: 0, downloads: {} };
    }
    return counters[type][title];
};

// Auto file size detection via HEAD request
export const detectFileSize = async (url) => {
    if (!url || url === '#' || !url.startsWith('http')) return null;

    // Skip Google Drive links because they return HTML warning pages (~100KB) instead of the actual file size
    if (url.includes('drive.google.com')) {
        return null; // Prevents overwriting manual size (like 2.3 GB) with 105 KB
    }

    try {
        const res = await fetch(url, { method: 'HEAD', mode: 'cors' });
        if (res.ok) {
            const contentLength = res.headers.get('content-length');
            if (contentLength) {
                const bytes = parseInt(contentLength, 10);
                if (bytes > 1073741824) {
                    return `${(bytes / 1073741824).toFixed(1)} GB`;
                } else if (bytes > 1048576) {
                    return `${(bytes / 1048576).toFixed(0)} MB`;
                } else {
                    return `${(bytes / 1024).toFixed(0)} KB`;
                }
            }
        }
    } catch (e) {
        // CORS blocked or network error — silently fail
    }
    return null;
};
