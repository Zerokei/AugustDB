import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

function LoginPage({ onLogin }) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isShaking, setIsShaking] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (password === 'august') {
      // 登录成功
      localStorage.setItem('augustLogin', 'true');
      onLogin();
      setError('');
    } else {
      // 密码错误
      setError('密码错误，请重试');
      setPassword('');
      setIsShaking(true);
      
      // 移除震动效果
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-particles"></div>
      </div>
      
      <div className={`login-card ${isShaking ? 'shake' : ''}`}>
        <div className="login-header">
          <div className="login-icon">
            <Lock size={48} />
          </div>
          <h1>团队管理系统</h1>
          <p>请输入访问密码</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <div className="input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className={`login-input ${error ? 'error' : ''}`}
                autoFocus
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className="login-btn" disabled={!password.trim()}>
            <Lock size={20} />
            进入系统
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage; 