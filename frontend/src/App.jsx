import { NavLink, Route, Routes } from 'react-router-dom';
import ShortenerPage from './pages/ShortenerPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';

function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Distributed Systems Demo</p>
          <h1>Velocity Short Links</h1>
        </div>
        <nav className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Shortener
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => (isActive ? 'active' : '')}>
            Analytics
          </NavLink>
        </nav>
      </header>

      <main className="content-grid">
        <Routes>
          <Route path="/" element={<ShortenerPage />} />
          <Route path="/analytics/:shortCode?" element={<AnalyticsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
