import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
      </svg>
    ),
    title: 'Smart Route Planning',
    description: 'Optimized multi-day routes with automatic fuel stop placement every 1,000 miles and HOS-compliant rest breaks.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'HOS Compliance',
    description: 'Automatic 11-hour driving limit enforcement, 30-minute break requirements, and 70-hour/8-day cycle management.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: 'ELD Log Generation',
    description: 'Instant FMCSA-compliant daily driver logs in standard grid format. Download as PDF or view in-browser.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/20',
  },
];

const STATS = [
  { value: '11h', label: 'Driving Limit', sub: 'per day' },
  { value: '70h', label: 'Cycle Limit', sub: '8 days' },
  { value: '1,000mi', label: 'Fuel Intervals', sub: 'max' },
  { value: 'FMCSA', label: 'Compliant', sub: '49 CFR Part 395' },
];

const Home: React.FC = () => {
  return (
    <div className="relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(245,158,11,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Ambient glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-48 right-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* ─────────── HERO ─────────── */}
      <section className="relative min-h-[calc(100vh-64px)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto py-20 animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 mb-8 animate-slide-up">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-amber-400 text-sm font-medium tracking-wide">Powered by AI · FMCSA Compliant</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-slate-50 leading-tight tracking-tight mb-6">
            Plan Routes.{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
              Stay Compliant.
            </span>
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Automated long-haul trip planning with instant ELD log generation. Enter your route, get a
            fully compliant multi-day plan with FMCSA driver logs — in seconds.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link to="/planner" className="btn-primary flex items-center gap-2 text-base w-full sm:w-auto justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
              </svg>
              Plan Your Trip
            </Link>
            <Link to="/logs" className="btn-secondary flex items-center gap-2 text-base w-full sm:w-auto justify-center">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              View Sample Logs
            </Link>
          </div>

          {/* Animated Truck SVG */}
          <div className="flex justify-center mb-16 opacity-60">
            <svg
              viewBox="0 0 200 80"
              fill="none"
              className="w-48 h-auto"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Road */}
              <rect y="60" width="200" height="4" rx="2" fill="#1e293b" />
              <rect x="20" y="61.5" width="20" height="1" rx="0.5" fill="#334155" />
              <rect x="60" y="61.5" width="20" height="1" rx="0.5" fill="#334155" />
              <rect x="100" y="61.5" width="20" height="1" rx="0.5" fill="#334155" />
              <rect x="140" y="61.5" width="20" height="1" rx="0.5" fill="#334155" />
              {/* Truck body */}
              <rect x="10" y="30" width="100" height="30" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
              {/* Cab */}
              <rect x="105" y="38" width="45" height="22" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="1.5" />
              {/* Cab window */}
              <rect x="118" y="42" width="18" height="12" rx="2" fill="#0f172a" stroke="#475569" strokeWidth="1" />
              <rect x="119" y="43" width="7" height="10" rx="1" fill="#1d4ed8" opacity="0.4" />
              {/* Headlight */}
              <circle cx="148" cy="52" r="3" fill="#f59e0b" opacity="0.8" />
              <line x1="151" y1="52" x2="160" y2="52" stroke="#f59e0b" strokeWidth="1.5" opacity="0.5" />
              {/* Wheels */}
              <circle cx="35" cy="62" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
              <circle cx="35" cy="62" r="4" fill="#1e293b" />
              <circle cx="85" cy="62" r="8" fill="#0f172a" stroke="#475569" strokeWidth="2" />
              <circle cx="85" cy="62" r="4" fill="#1e293b" />
              <circle cx="130" cy="62" r="7" fill="#0f172a" stroke="#475569" strokeWidth="2" />
              <circle cx="130" cy="62" r="3.5" fill="#1e293b" />
              {/* Amber accent stripe */}
              <rect x="10" y="30" width="100" height="3" rx="1.5" fill="#f59e0b" opacity="0.6" />
            </svg>
          </div>
        </div>
      </section>

      {/* ─────────── STATS BAR ─────────── */}
      <section className="border-y border-slate-700/50 bg-slate-900/50 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-black text-amber-400 mb-0.5">{stat.value}</div>
                <div className="text-slate-300 text-sm font-semibold">{stat.label}</div>
                <div className="text-slate-500 text-xs">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── FEATURES ─────────── */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-3">
              Everything a dispatcher needs
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              End-to-end trip management from origin to destination, fully automated and FMCSA-ready.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`glass-card p-6 border transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 ${feature.border}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.bg} ${feature.border} border`}>
                  <span className={feature.color}>{feature.icon}</span>
                </div>
                <h3 className="text-slate-50 font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────── CTA FOOTER ─────────── */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="glass-card p-8 border border-amber-500/20 bg-amber-500/5">
            <h2 className="text-2xl font-bold text-slate-50 mb-3">Ready to hit the road?</h2>
            <p className="text-slate-400 mb-6 text-sm">
              Plan your first route in under 30 seconds. No signup required.
            </p>
            <Link to="/planner" className="btn-primary inline-flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
              Get Started Free
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
