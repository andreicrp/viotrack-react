import React, { Component } from 'react';
import { ServerErrorPage } from '../../pages/ServerErrorPage';

export const isChunkLoadError = (error) => {
  if (!error) return false;
  const msg = `${error.message || ''} ${error.stack || ''}`;
  return (
    msg.includes('dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('error loading dynamically imported module') ||
    msg.includes('is not a supported stylesheet MIME type') ||
    msg.includes('Strict MIME type checking') ||
    error.name === 'ChunkLoadError'
  );
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isChunkError: false
    };
  }

  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error,
      isChunkError: isChunkLoadError(error)
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });

    if (isChunkLoadError(error)) {
      const lastReload = parseInt(sessionStorage.getItem('eb_chunk_reload') || '0', 10);
      const now = Date.now();
      // Automatically reload once to fetch the latest application build
      if (now - lastReload > 12000) {
        sessionStorage.setItem('eb_chunk_reload', String(now));
        window.location.reload();
      }
    }
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      isChunkError: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function' 
          ? this.props.fallback(this.state.error, this.resetError)
          : this.props.fallback;
      }
      return (
        <ServerErrorPage
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          resetError={this.resetError}
          isChunkError={this.state.isChunkError}
          standalone={this.props.standalone || false}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
