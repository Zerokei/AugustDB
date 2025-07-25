import React, { useState } from 'react';

function PagePasswordGuard({ pageKey, pagePassword, children }) {
  const storageKey = `page_pass_${pageKey}`;
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(() => {
    return window.localStorage.getItem(storageKey) === '1';
  });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === pagePassword) {
      window.localStorage.setItem(storageKey, '1');
      setUnlocked(true);
      setError('');
    } else {
      setError('密码错误');
      setInput('');
    }
  };

  if (unlocked) return children;

  return (
    <div className="page-container" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card" style={{ maxWidth: 360, width: '100%', textAlign: 'center', padding: '2.5rem 2rem' }}>
        <h2 style={{ marginBottom: 16 }}>请输入访问密码</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={input}
              onChange={e => setInput(e.target.value)}
              className="form-input"
              placeholder="请输入密码"
              style={{ width: '100%', marginBottom: 12, paddingRight: 60 }}
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{
                position: 'absolute',
                right: 6,
                top: 6,
                height: 32,
                padding: '0 12px',
                border: 'none',
                background: 'none',
                color: '#666',
                cursor: 'pointer',
                fontSize: 14
              }}
              tabIndex={-1}
            >
              {showPassword ? '隐藏' : '显示'}
            </button>
          </div>
          {error && <div className="error-message" style={{ marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={!input.trim()}>
            进入页面
          </button>
        </form>
      </div>
    </div>
  );
}

export default PagePasswordGuard; 