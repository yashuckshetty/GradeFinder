import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AnalysisPage from './pages/AnalysisPage';
import ComparisonPage from './pages/ComparisonPage';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <header className="app-header">
        <h1>⛰ GradeFinder</h1>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Home
          </NavLink>
          <NavLink to="/compare" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            ⚔️ Compare Routes
          </NavLink>
        </nav>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/analyze/:routeId" element={<AnalysisPage />} />
        <Route path="/compare" element={<ComparisonPage />} />
      </Routes>
    </BrowserRouter>
  );
}
