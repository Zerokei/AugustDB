import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import LoginPage from './components/LoginPage';
import HomePage from './pages/HomePage';
import RegistrationPage from './pages/RegistrationPage';
import AttributePage from './pages/AttributePage';
import FriendshipPage from './pages/FriendshipPage';
import LiveRankingPage from './pages/LiveRankingPage';
import MomentsPage from './pages/MomentsPageSimple';
import './App.css';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // 检查登录状态
    const loginStatus = localStorage.getItem('augustLogin');
    if (loginStatus === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('augustLogin');
    setIsLoggedIn(false);
  };

  // 如果未登录，显示登录页面
  if (!isLoggedIn) {
    return (
      <ErrorBoundary>
        <LoginPage onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  // 已登录，显示正常应用
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<HomePage onLogout={handleLogout} />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/attributes" element={<AttributePage />} />
            <Route path="/friendship" element={<FriendshipPage />} />
            <Route path="/ranking/live" element={<LiveRankingPage />} />
            <Route path="/moments" element={<MomentsPage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App; 