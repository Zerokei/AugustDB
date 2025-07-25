import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // 在开发环境下打印错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-container">
          <div className="page-content" style={{ maxWidth: '600px' }}>
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <AlertTriangle 
                size={64} 
                color="#e74c3c" 
                style={{ marginBottom: '1rem' }} 
              />
              
              <h1 style={{ 
                color: '#e74c3c', 
                marginBottom: '1rem',
                fontSize: '1.5rem'
              }}>
                抱歉，出现了错误
              </h1>
              
              <p style={{ 
                color: '#666', 
                marginBottom: '2rem',
                lineHeight: '1.6'
              }}>
                应用遇到了意外错误。您可以尝试刷新页面或返回首页。
                {process.env.NODE_ENV === 'development' && (
                  <details style={{ 
                    marginTop: '1rem', 
                    textAlign: 'left',
                    background: '#f8f9fa',
                    padding: '1rem',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      错误详情（开发模式）
                    </summary>
                    <pre style={{ 
                      marginTop: '0.5rem',
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {this.state.error && this.state.error.toString()}
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </p>
              
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <button 
                  onClick={this.handleReload}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <RefreshCw size={16} />
                  刷新页面
                </button>
                
                <button 
                  onClick={this.handleGoHome}
                  className="btn btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Home size={16} />
                  返回首页
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 