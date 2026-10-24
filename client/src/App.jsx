import { Link, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Stats from './pages/Stats.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="wrap">
          <Link to="/" className="brand">LinkVault</Link>
        </div>
      </header>
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/stats/:code" element={<Stats />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
