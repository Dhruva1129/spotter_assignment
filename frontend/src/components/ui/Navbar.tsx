import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const TruckIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-7 h-7 text-amber-500"
  >
    <path d="M1 3h15v13H1z" />
    <path d="M16 8h4l3 3v5h-7V8z" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/planner', label: 'Plan Trip' },
  { to: '/logs', label: 'ELD Logs' },
];

const Navbar: React.FC = () => {
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-amber-500/20 rounded-lg blur-md group-hover:bg-amber-500/30 transition-all" />
              <div className="relative">
                <TruckIcon />
              </div>
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-lg font-bold text-slate-50 tracking-tight">Spotter</span>
              <span className="text-[10px] font-medium text-amber-500/80 uppercase tracking-widest">Route Planner</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-300 hover:text-slate-50 hover:bg-slate-700/50'
                  }`}
                >
                  {label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-amber-500 rounded-full" />
                  )}
                </Link>
              );
            })}
            <Link
              to="/planner"
              className="ml-3 btn-primary !py-2 !px-4 !text-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Trip
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg text-slate-300 hover:text-slate-50 hover:bg-slate-700/50 transition-all"
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-3 space-y-1 border-t border-slate-700/50 animate-slide-up">
            {NAV_LINKS.map(({ to, label }) => {
              const isActive = pathname === to || (to !== '/' && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'text-amber-400 bg-amber-500/10'
                      : 'text-slate-300 hover:text-slate-50 hover:bg-slate-700/50'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
