import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-grid flex items-center justify-center" style={{ background: '#04060f' }}>
          <div className="text-center max-w-md px-6">
            <div className="text-5xl mb-4">💀</div>
            <div className="font-orbitron font-bold text-xl text-red-400 mb-2">FATAL ERROR</div>
            <div className="font-mono text-xs text-slate-500 mb-6 break-all">{this.state.error?.message}</div>
            <button
              onClick={() => { window.location.href = '/'; }}
              className="px-6 py-2 rounded font-orbitron text-xs font-bold"
              style={{ background: '#00d4ff', color: '#04060f' }}
            >
              RETURN TO SAFETY
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
