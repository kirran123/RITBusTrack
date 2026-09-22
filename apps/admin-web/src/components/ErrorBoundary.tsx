import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-900 border border-slate-800 rounded-3xl text-center space-y-4 my-4">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shadow-lg shadow-rose-500/10">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white">
              {this.props.fallbackTitle || 'Component Rendering Recovered'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md">
              A temporary rendering issue occurred. Click reload below to refresh the state or return to overview.
            </p>
          </div>
          {this.state.error && (
            <div className="max-w-xl text-left bg-slate-950 p-3.5 rounded-xl border border-rose-500/30 font-mono text-[11px] text-rose-300 overflow-x-auto">
              {this.state.error.toString()}
            </div>
          )}
          <button
            onClick={this.handleReload}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-2 shadow-lg shadow-blue-600/30"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload & Refresh Page</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
