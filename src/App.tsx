import React, { Component, ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { Team } from './pages/Team';
import { Achievements } from './pages/Achievements';
import { AdminDashboard } from './pages/AdminDashboard';
import { RegisterPage } from './pages/Register';
import { PosterGenerator } from './pages/PosterGenerator';
import { EventRegister } from './pages/EventRegister';
import { RegistrationNotification } from './components/RegistrationNotification';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught runtime error:", error, errorInfo);

    // Auto-recover from stale deployment chunk errors across releases
    const isChunkError = 
      error?.message?.includes('dynamically imported module') || 
      error?.message?.includes('Loading chunk') ||
      error?.message?.includes('Failed to fetch');

    if (isChunkError) {
      const reloadKey = 'erise_chunk_reload_ts';
      const lastReload = Number(sessionStorage.getItem(reloadKey) || 0);
      const now = Date.now();
      if (now - lastReload > 15000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a1628] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
          <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-slate-400 text-sm max-w-md mb-4">
            An unexpected error occurred while loading the application.
          </p>
          {this.state.error && (
            <div className="p-3 mb-6 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs font-mono max-w-md text-left overflow-auto max-h-32">
              {this.state.error.message || String(this.state.error)}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => {
                sessionStorage.clear();
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-[#00e5ff] text-[#0a1628] font-bold text-sm hover:bg-[#5ef0ff] transition-colors"
            >
              Reload Page
            </button>
            <button
              onClick={() => {
                localStorage.removeItem('erise_admin_session');
                localStorage.removeItem('erise_auth_session_v2');
                sessionStorage.clear();
                window.location.href = '/#/admin';
                window.location.reload();
              }}
              className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 font-bold text-sm hover:bg-slate-700 transition-colors"
            >
              Clear Session & Return to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <Router>
            <div className="flex flex-col min-h-screen font-sans relative">
              <Navbar />
              <main className="flex-grow">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/events/:eventId/register" element={<EventRegister />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/achievements" element={<Achievements />} />
                  <Route path="/register" element={<RegisterPage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/:portalSlug" element={<AdminDashboard />} />
                  <Route path="/poster" element={<PosterGenerator />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <Footer />
              <RegistrationNotification />
            </div>
          </Router>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
