// ErrorBoundary component
import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary text-text-primary p-8">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-text-muted mb-4 text-sm">{this.state.error?.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            className="btn-primary"
          >
            Reload App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
