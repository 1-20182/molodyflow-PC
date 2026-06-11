import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100%', padding: 40, textAlign: 'center', gap: 16,
        }}>
          <AlertTriangle size={48} style={{ color: '#FF6B9D', opacity: 0.6 }} />
          <h2 style={{ color: '#fff', fontSize: 18 }}>页面出现异常</h2>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, maxWidth: 400 }}>
            {this.state.error?.message || '未知错误'}
          </p>
          <button onClick={this.handleRetry} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 20px',
            border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, #FF6B9D, #C44EFF)',
            color: '#fff', cursor: 'pointer', fontSize: 13, marginTop: 8,
          }}>
            <RefreshCw size={14} /> 重试
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
