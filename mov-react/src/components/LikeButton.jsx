import React, { useState, useEffect } from 'react';

const LikeButton = ({ type, title, likeCount, hasLiked, onLike }) => {
    const [animating, setAnimating] = useState(false);
    const [liked, setLiked] = useState(hasLiked);
    const [count, setCount] = useState(likeCount || 0);

    useEffect(() => {
        setLiked(hasLiked);
        setCount(likeCount || 0);
    }, [hasLiked, likeCount]);

    const handleClick = async (e) => {
        e.stopPropagation();
        setAnimating(true);
        setTimeout(() => setAnimating(false), 600);

        const newLiked = !liked;
        setLiked(newLiked);
        setCount(prev => newLiked ? prev + 1 : Math.max(0, prev - 1));

        if (onLike) {
            onLike(type, title);
        }
    };

    return (
        <button
            className={`like-btn ${liked ? 'like-btn--liked' : ''} ${animating ? 'like-btn--animating' : ''}`}
            onClick={handleClick}
            title={liked ? 'Unlike' : 'Like this'}
        >
            <span className="like-btn__icon">{liked ? '❤️' : '🤍'}</span>
            {count > 0 && <span className="like-btn__count">{count}</span>}
        </button>
    );
};

export default LikeButton;
