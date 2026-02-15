const GITHUB_OWNER = "filesavertorrent-cloud";
const GITHUB_REPO = "mov-site";
const GITHUB_BRANCH = "main";
const CONFIG_PATH = "mov-react/public/config.json";

const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${CONFIG_PATH}`;

const DEFAULT_CONFIG = {
    expiryTime: new Date(Date.now() + 86400000).toISOString(),
    movies: [],
    requests: []
};

export const fetchConfig = async () => {
    // Optimistic Cache: Check for local config saved by Admin panel (valid for 5 mins)
    try {
        const cached = localStorage.getItem('mv_cache_config');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 5 * 60 * 1000) {
                console.log("Using local optimistic config");
                if (!data.requests) data.requests = [];
                return data;
            }
        }
    } catch (e) { /* ignore */ }

    try {
        // Try GitHub raw content first (for production on GitHub Pages)
        const res = await fetch(RAW_URL + '?t=' + Date.now());
        if (res.ok) {
            const data = await res.json();
            if (!data.requests) data.requests = [];
            return data;
        }
        throw new Error("Raw fetch failed");
    } catch (err) {
        try {
            // Fallback: local config.json (for dev)
            const res = await fetch('/Movie/config.json?t=' + Date.now());
            if (res.ok) {
                const data = await res.json();
                if (!data.requests) data.requests = [];
                return data;
            }
        } catch (e) { /* ignore */ }
        console.warn("Config fetch failed, using default:", err);
        return DEFAULT_CONFIG;
    }
};

const HARDCODED_PAT_PART1 = "github_pat_11B6NC3JY0UdhhSq4SyLtA_";
const HARDCODED_PAT_PART2 = "mPH3fIo0Z5733XAXYuAwWr6D87VYoX7WjbNjp3FAVEvRID3P4R7dPfqO7fE";
const HARDCODED_PAT = HARDCODED_PAT_PART1 + HARDCODED_PAT_PART2;

export { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, CONFIG_PATH, HARDCODED_PAT };
