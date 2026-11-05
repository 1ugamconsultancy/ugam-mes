import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, Home, Copy, Check } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleCopyDiagnostics = () => {
    const text = `Error: ${this.state.error?.toString()}\n\nStack:\n${this.state.error?.stack}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack}`;
    navigator.clipboard.writeText(text);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 3000);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4 font-sans">
          <div className="max-w-xl w-full bg-[#142A45] border-2 border-red-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-left animate-scaleUp">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <AlertOctagon size={28} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">System Runtime Exception</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  An unexpected error was intercepted by the UGAM MES Error Boundary.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-red-300 space-y-2 overflow-x-auto max-h-48">
              <p className="font-bold">{this.state.error?.name || 'Error'}: {this.state.error?.message}</p>
              {this.state.errorInfo?.componentStack && (
                <p className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {this.state.errorInfo.componentStack.trim().substring(0, 500)}...
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-w-[130px] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <RefreshCw size={14} /> Reload Page
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex-1 min-w-[130px] px-4 py-2.5 bg-[#102237] hover:bg-[#1a365d] border border-[#1F3A5C] text-slate-200 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Home size={14} /> Back to Dashboard
              </button>

              <button
                type="button"
                onClick={this.handleCopyDiagnostics}
                className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition flex items-center gap-1 cursor-pointer"
                title="Copy error trace to clipboard"
              >
                {this.state.copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{this.state.copied ? 'Copied' : 'Diagnostics'}</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
