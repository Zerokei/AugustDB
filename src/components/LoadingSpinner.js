import React from 'react';

const LoadingSpinner = ({ 
  size = 20, 
  text = '加载中...', 
  centered = false,
  fullPage = false 
}) => {
  const spinnerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #667eea',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    ...(centered && {
      justifyContent: 'center',
      textAlign: 'center'
    }),
    ...(fullPage && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(255, 255, 255, 0.9)',
      zIndex: 9999,
      justifyContent: 'center'
    })
  };

  return (
    <div style={containerStyle} className="loading">
      <div style={spinnerStyle} className="spinner"></div>
      {text && <span>{text}</span>}
    </div>
  );
};

export default LoadingSpinner; 