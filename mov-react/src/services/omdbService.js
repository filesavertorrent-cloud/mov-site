// OMDb + IMDb Suggestion API Service — Fetches movie metadata from IMDb
const OMDB_API_KEY = 'trilogy'; // Free OMDb test key
const OMDB_BASE = 'https://www.omdbapi.com/';
const IMDB_SUGGEST_BASE = 'https://v3.sg.media-imdb.com/suggestion/x/';

/**
 * Parse OMDb response into our format
 */
const parseOmdbResponse = (data) => {
    if (data.Response === 'False') return null;

    // Convert runtime "148 min" → "2h 28m"
    let duration = data.Runtime || 'N/A';
    if (duration !== 'N/A') {
        const mins = parseInt(duration);
        if (!isNaN(mins)) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            duration = h > 0 ? `${h}h ${m}m` : `${m}m`;
        }
    }

    // Format genre: "Action, Drama, Thriller" → "Action/Drama/Thriller"
    let genre = data.Genre || 'N/A';
    if (genre !== 'N/A') {
        genre = genre.split(',').map(g => g.trim()).join('/');
    }

    return {
        rating: data.imdbRating && data.imdbRating !== 'N/A' ? data.imdbRating : '',
        year: data.Year && data.Year !== 'N/A' ? data.Year : '',
        duration: duration !== 'N/A' ? duration : '',
        genre: genre !== 'N/A' ? genre : '',
    };
};

/**
 * Search IMDb suggestion API to find a movie's IMDb ID.
 * This has much better coverage for regional/newer movies.
 */
const searchImdbSuggestion = async (title) => {
    try {
        const url = `${IMDB_SUGGEST_BASE}${encodeURIComponent(title.trim().toLowerCase())}.json`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.d && data.d.length > 0) {
            // Filter for movies only and pick the best match
            const movies = data.d.filter(item => item.qid === 'movie' || item.q === 'feature');
            if (movies.length > 0) {
                return movies[0].id; // Return IMDb ID like "tt1234567"
            }
            // Fallback to first result if no movie-type found
            return data.d[0].id;
        }
        return null;
    } catch (err) {
        console.warn('IMDb suggestion search failed:', err);
        return null;
    }
};

/**
 * Fetch movie metadata by title from OMDb/IMDb.
 * Strategy:
 *   1. Try exact title match on OMDb
 *   2. If not found, search IMDb suggestion API for the IMDb ID
 *   3. Fetch full details from OMDb using the IMDb ID
 *
 * @param {string} title - The movie title to search for
 * @returns {Promise<{rating: string, year: string, duration: string, genre: string} | null>}
 */
export const fetchMovieByTitle = async (title) => {
    if (!title || !title.trim()) return null;

    try {
        // Step 1: Try exact title match on OMDb
        const exactUrl = `${OMDB_BASE}?t=${encodeURIComponent(title.trim())}&apikey=${OMDB_API_KEY}`;
        const exactRes = await fetch(exactUrl);
        if (exactRes.ok) {
            const exactData = await exactRes.json();
            const parsed = parseOmdbResponse(exactData);
            if (parsed) {
                console.log('OMDb: Found via exact title match');
                return parsed;
            }
        }

        // Step 2: Search IMDb suggestion API for the IMDb ID
        console.log('OMDb: Exact match failed, trying IMDb suggestion search...');
        const imdbId = await searchImdbSuggestion(title);
        if (!imdbId) {
            console.warn('IMDb suggestion: No results found for', title);
            return null;
        }

        // Step 3: Fetch full details from OMDb using the IMDb ID
        console.log('OMDb: Found IMDb ID', imdbId, '- fetching full details...');
        const idUrl = `${OMDB_BASE}?i=${imdbId}&apikey=${OMDB_API_KEY}`;
        const idRes = await fetch(idUrl);
        if (idRes.ok) {
            const idData = await idRes.json();
            return parseOmdbResponse(idData);
        }

        return null;
    } catch (err) {
        console.error('Movie fetch error:', err);
        return null;
    }
};
