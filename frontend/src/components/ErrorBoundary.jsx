import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-rose-50 p-6 flex items-center justify-center">
          <div className="bg-white border border-rose-200 rounded-xl p-6 max-w-2xl w-full shadow">
            <h2 className="text-rose-700 font-bold text-lg mb-2">⚠️ Error en la aplicación</h2>
            <p className="text-sm text-slate-600 mb-3">Copia este texto y compártelo para poder corregirlo:</p>
            <pre className="bg-slate-100 border border-slate-200 rounded p-3 text-xs text-rose-600 overflow-auto whitespace-pre-wrap select-all">
              {this.state.error.message}{'\n'}{this.state.error.stack}
            </pre>
            <button
              onClick={() => { this.setState({ error: null }); }}
              className="mt-3 px-4 py-2 rounded-lg bg-rose-600 text-white text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}