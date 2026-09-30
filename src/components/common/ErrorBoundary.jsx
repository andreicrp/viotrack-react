import React, { Component } from 'react';
import { ServerErrorPage } from '../../pages/ServerErrorPage';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
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
          standalone={this.props.standalone || false}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
