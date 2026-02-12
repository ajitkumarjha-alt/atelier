import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Update state with error details
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Log to external error reporting service if available
    if (window.errorReportingService) {
      window.errorReportingService.logError(error, errorInfo);
    }

    // In production, you might want to send to error tracking service
    // Example: Sentry.captureException(error);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen bg-gradient-to-br from-lodha-sand to-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl border border-lodha-steel/30 overflow-hidden">
            {/* Header */}
            <div className="bg-red-50 border-b border-red-100 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-red-100 p-3 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-garamond font-bold text-red-900">
                    Oops! Something went wrong
                  </h1>
                  <p className="text-sm text-red-700 mt-1">
                    We encountered an unexpected error. Our team has been notified.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Details (only in development) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="p-6 bg-lodha-sand/40 border-b border-lodha-steel/30">
                <h2 className="text-sm font-semibold text-lodha-grey mb-2">Error Details:</h2>
                <div className="bg-white border border-lodha-steel/30 rounded p-4 mb-3">
                  <p className="text-sm font-mono text-red-600 break-all">
                    {this.state.error.toString()}
                  </p>
                </div>
                {this.state.errorInfo && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-lodha-grey hover:text-lodha-black mb-2">
                      Stack Trace
                    </summary>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-auto max-h-64 text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="p-6">
              <p className="text-lodha-grey mb-6">
                You can try one of the following options to continue:
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={this.handleReset}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-lodha-gold text-white rounded-lg hover:bg-lodha-deep transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={this.handleReload}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-lodha-grey text-white rounded-lg hover:bg-lodha-cool-grey transition-colors font-medium"
                >
                  <RefreshCw className="w-4 h-4" />
                  Reload Page
                </button>
                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-lodha-grey border border-lodha-steel rounded-lg hover:bg-lodha-sand/40 transition-colors font-medium"
                >
                  <Home className="w-4 h-4" />
                  Go Home
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-lodha-sand/40 border-t border-lodha-steel/30 px-6 py-4">
              <p className="text-xs text-lodha-grey/70 text-center">
                If this problem persists, please contact support at{' '}
                <a href="mailto:support@atelier.com" className="text-lodha-gold hover:underline">
                  support@atelier.com
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }

    // When there's no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;
