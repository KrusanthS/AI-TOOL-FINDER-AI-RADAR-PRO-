import React from 'react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="inline-flex items-center gap-2 font-black text-lg mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold">AI</div>
              <span className="gradient-text">RADAR PRO</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The best AI tools discovery and comparison platform, powered by GPT-4o.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-sm mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {[['Discover', '/discover'], ['Compare', '/compare'], ['Trending', '/discover?sort=trending']].map(([label, to]) => (
                <li key={label}><Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {['Writing', 'Coding', 'Image', 'Video', 'Audio'].map((cat) => (
                <li key={cat}><Link to={`/discover?category=${cat}`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{cat}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4">Account</h4>
            <ul className="space-y-2.5">
              {[['Dashboard', '/dashboard'], ['Bookmarks', '/bookmarks']].map(([label, to]) => (
                <li key={label}><Link to={to} className="text-sm text-muted-foreground hover:text-foreground transition-colors">{label}</Link></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">&copy; {year} AI RADAR PRO. All rights reserved.</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Built with <span className="text-red-500">❤️</span> using React + OpenAI
          </p>
        </div>
      </div>
    </footer>
  );
}
