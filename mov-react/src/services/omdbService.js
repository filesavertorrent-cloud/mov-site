// OMDb API Service — Fetches movie metadata from IMDb via OMDb
const OMDB_API_KEY = 'trilogy'; // Free OMDb test key
const OMDB_BASE = 'https://www.omdbapi.com/';

/**
 * Fetch movie metadata by title from OMDb (IMDb data).
 * @param {string} title - The movie title to search for
 * @returns {Promise<{rating: string, year: string, duration: string, genre: string} | null>}
 */
export const fetchMovieByTitle = async (title) => {
    if (!title || !title.trim()) return null;

    try {
        const url = `${OMDB_BASE}?t=${encodeURIComponent(title.trim())}&apikey=${OMDB_API_KEY}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OMDb request failed: ${res.status}`);

        const data = await res.json();

        if (data.Response === 'False') {
            console.warn('OMDb: Movie not found -', data.Error);
            return null;
        }

        // Convert runtime "148 min" → "2h 28m"
        let duration = data.Runtime || '0 min';
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
    } catch (err) {
        console.error('OMDb fetch error:', err);
        return null;
    }
};
