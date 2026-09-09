import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  compact?: boolean;
  fallbackTitle?: string;
  onReset?: () => void;
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
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else if (!this.props.compact) {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.compact) {
        return (
          <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md flex items-center justify-between gap-4 font-mono text-xs my-2">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <span className="font-bold text-white block">
                  {this.props.fallbackTitle || 'Widget failed to render'}
                </span>
                <span className="text-slate-400 text-[11px]">
                  {this.state.error?.message || 'Rendering error'}
                </span>
              </div>
            </div>
            <Button
              variant="secondary"
              icon={RotateCcw}
              size="sm"
              onClick={this.handleReset}
            >
              Retry
            </Button>
          </div>
        );
      }

      return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-8 rounded-2xl border border-rose-500/20 bg-rose-500/5 backdrop-blur-md text-center space-y-4 my-8 font-mono">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white tracking-tight">
              {this.props.fallbackTitle || 'An unexpected render error occurred'}
            </h3>
            <p className="text-xs text-slate-400 max-w-md">
              {this.state.error?.message || 'A component in the application encountered a fatal error.'}
            </p>
          </div>

          {this.state.errorInfo && (
            <div className="w-full max-w-lg p-3 rounded-lg bg-slate-950 border border-slate-800 text-left font-mono text-[11px] text-rose-300 max-h-40 overflow-y-auto">
              <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
            </div>
          )}

          <Button
            variant="secondary"
            icon={RotateCcw}
            size="sm"
            onClick={this.handleReset}
          >
            Reload Dashboard
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
