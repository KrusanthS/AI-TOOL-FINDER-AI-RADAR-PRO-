import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useUIStore } from './store/uiStore';
import { useAuthStore } from './store/authStore';

// Layouts
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import Home from './pages/Home';
import Discover from './pages/Discover';
import ToolDetail from './pages/ToolDetail';
import Compare from './pages/Compare';
import Bookmarks from './pages/Bookmarks';
import Dashboard from './pages/Dashboard';
import Admin from './pages/Admin';

function App() {
  useAuth(); // Initialize Firebase auth listener
  const theme = useUIStore((state) => state.theme);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Loading AI RADAR PRO...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
        <Navbar />
        <main className="flex-grow pt-16">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/tool/:slug" element={<ToolDetail />} />
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

