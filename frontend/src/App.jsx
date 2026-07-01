import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useUIStore } from './store/uiStore';

// Layouts
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
import Discover from './pages/Discover';
import ToolDetail from './pages/ToolDetail';
import RepoDetail from './pages/RepoDetail';
import Compare from './pages/Compare';
import Bookmarks from './pages/Bookmarks';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function App() {
  const theme = useUIStore((state) => state.theme);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <main className="flex-grow pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/tool/:slug" element={<ToolDetail />} />
            <Route path="/repo/:slug" element={<RepoDetail />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;

