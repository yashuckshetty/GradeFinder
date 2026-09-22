import { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import BrandLogo from './components/BrandLogo';
import './index.css';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobile = () => setMobileMenuOpen(false);

  return (
    <BrowserRouter>
      <header className="app-header">
        <NavLink to="/" className="brand-wrapper" onClick={closeMobile} aria-label="GradeFinder Home">
          <BrandLogo size={30} showWordmark={true} />
        </NavLink>

        {/* Center: Intentionally empty per Section 7 */}

        {/* Right: Four text links per Section 7 */}
        <nav className="nav-links" aria-label="Main Navigation">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Analyze
          </NavLink>
          <NavLink to="/#routes" className="nav-link" onClick={() => {
            const el = document.getElementById('routes-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            Routes
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Compare
          </NavLink>
          <a href="#about" className="nav-link" onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById('about-section');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}>
            About
          </a>
        </nav>

        {/* Mobile menu toggle: 3 stacked elevation-profile line segments */}
        <button
          className="mobile-nav-toggle"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle navigation menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Mobile Full-Screen Overlay */}
        {mobileMenuOpen && (
          <div className="mobile-overlay" role="dialog" aria-label="Mobile Menu">
            <NavLink
              to="/"
              end
              className="nav-link"
              onClick={closeMobile}
              style={{ animationDelay: '40ms' }}
            >
              Analyze
            </NavLink>
            <NavLink
              to="/#routes"
              className="nav-link"
              onClick={() => {
                closeMobile();
                const el = document.getElementById('routes-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ animationDelay: '80ms' }}
            >
              Routes
            </NavLink>
            <NavLink
              to="/compare"
              className="nav-link"
              onClick={closeMobile}
              style={{ animationDelay: '120ms' }}
            >
              Compare
            </NavLink>
            <a
              href="#about"
              className="nav-link"
              onClick={(e) => {
                e.preventDefault();
                closeMobile();
                const el = document.getElementById('about-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              style={{ animationDelay: '160ms' }}
            >
              About
            </a>
          </div>
        )}
      </header>

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/analyze/:routeId" element={<AnalysisPage />} />
        <Route path="/compare" element={<ComparisonPage />} />
      </Routes>
    </BrowserRouter>
  );
}
