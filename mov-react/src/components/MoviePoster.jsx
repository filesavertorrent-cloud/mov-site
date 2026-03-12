import React from 'react';

const MoviePoster = ({ movie }) => {
    return (
        <div className="movie-poster">
            <img className="movie-poster__img" src={movie.poster} alt={`${movie.title} Poster`} loading="lazy" />
            <div className="movie-poster__overlay" />
            <div className="movie-poster__info">
                <h1 className="movie-poster__title">{movie.title}</h1>
                <div className="movie-poster__meta">
                    <span className="movie-poster__tag">⭐ {movie.rating}/10</span>
                    <span className="movie-poster__tag">📅 {movie.year}</span>
                    <span className="movie-poster__tag">⏱️ {movie.duration}</span>
                    <span className="movie-poster__tag">🎬 {movie.genre}</span>
                </div>
            </div>
        </div>
    );
};

export default MoviePoster;
