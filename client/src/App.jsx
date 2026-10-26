import React, { useState } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Analytics from './pages/Analytics';
import RedirectHandler from './pages/RedirectHandler';
import NotFound from './pages/NotFound';
import PokemonWalker from './components/PokemonWalker';
import BackgroundPaths from './components/BackgroundPaths';
import IntroAnimation from './components/IntroAnimation';

// Short-link paths (e.g. /aB3x) must redirect immediately, so the intro only plays on app pages
const INTRO_PATHS = /^\/(dashboard|analytics\/[^/]+)?\/?$/;

export default function App() {
  const { pathname } = useLocation();
  const [showIntro, setShowIntro] = useState(() => INTRO_PATHS.test(pathname));

  return (
    <div className="app-layout">
      {showIntro && <IntroAnimation onDone={() => setShowIntro(false)} />}

      {/* Interactive flowing background paths */}
      <BackgroundPaths />

      {/* Toast notifications container */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(15, 23, 42, 0.95)',
            color: '#FFFFFF',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            fontFamily: 'var(--font-body)',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: {
              primary: '#10B981',
              secondary: '#FFFFFF',
            },
          },
          error: {
            iconTheme: {
              primary: '#EF4444',
              secondary: '#FFFFFF',
            },
          },
        }}
      />

      {/* Top Navigation */}
      <Navbar />

      {/* Page Routing */}
      <main className="main-content">
        <div className="page-body">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analytics/:id" element={<Analytics />} />
            <Route path="/:shortCode" element={<RedirectHandler />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>

        {/* Interactive Walking Pokémon docked edge-to-edge covering the bottom */}
        <PokemonWalker />
      </main>
    </div>
  );
}
