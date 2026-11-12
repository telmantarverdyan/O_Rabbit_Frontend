import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Window } from './Window';

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
          <div className="bevel-out my-2 flex items-center justify-between gap-4 bg-card p-3 text-xs">
            <div className="flex items-center gap-3 text-danger">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <span className="block font-bold text-fg">
                  {this.props.fallbackTitle || 'Widget failed to render'}
                </span>
                <span className="text-[11px] text-fg-muted">
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
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <Window title={this.props.fallbackTitle || 'Error'} className="w-full max-w-lg shadow-[4px_4px_0_rgba(0,0,0,0.45)]" bodyClassName="space-y-3 p-4">
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-8 w-8 flex-shrink-0 text-danger" aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className="font-bold">This part of the console stopped working.</p>
                <p className="break-words text-[13px]">{this.state.error?.message || 'A component encountered a fatal error.'}</p>
              </div>
            </div>
            {this.state.errorInfo && (
              <pre className="bevel-in max-h-40 overflow-y-auto whitespace-pre-wrap bg-canvas p-2 font-mono text-[11px] text-danger">{this.state.errorInfo.componentStack}</pre>
            )}
            <div className="flex justify-end">
              <Button icon={RotateCcw} onClick={this.handleReset}>Reload</Button>
            </div>
          </Window>
        </div>
      );
    }

    return this.props.children;
  }
}
