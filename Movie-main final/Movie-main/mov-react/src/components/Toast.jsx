import React from 'react';

const Toast = ({ message, visible }) => {
    return (
        <div className={`toast ${visible ? "toast--visible" : ""}`} role="alert">
            {message}
        </div>
    );
};

export default Toast;
