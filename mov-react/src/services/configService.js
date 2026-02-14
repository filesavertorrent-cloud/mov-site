const GITHUB_OWNER = "connectwithmreditor-tech";
const GITHUB_REPO = "Movie";
const GITHUB_BRANCH = "main";
const CONFIG_PATH = "public/config.json";

const RAW_URL = `https://raw.githubusercontent.com/${GITHUB_OWNER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${CONFIG_PATH}`;

const DEFAULT_CONFIG = {
    expiryTime: new Date(Date.now() + 86400000).toISOString(),
    movies: [],
    requests: []
};

export const fetchConfig = async () => {
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

export { GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH, CONFIG_PATH };
