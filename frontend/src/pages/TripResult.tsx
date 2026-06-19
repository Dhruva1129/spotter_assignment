import React, { useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import type { TripResponse, Stop } from '../types';
import TripMap from '../components/Map/TripMap';
import TripTimeline from '../components/TripTimeline/TripTimeline';
import StatCard from '../components/ui/StatCard';
import { formatHours, formatMiles, formatDateTime, getStopColor, getStopHexColor, getStopLabel } from '../utils/formatters';
import { tripsApi } from '../services/api';

interface LocationState {
  tripResponse?: TripResponse;
}

const StopIcon: React.FC<{ type: Stop['stop_type'] }> = ({ type }) => {
  const icons: Record<Stop['stop_type'], React.ReactNode> = {
    pickup: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    dropoff: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.14a2.25 2.25 0 002.988 1.598l1.116-.418a2.25 2.25 0 012.446.618l.925 1.088A2.25 2.25 0 0013.5 16.125l.093-.046A2.25 2.25 0 0015 13.875V12.75a2.25 2.25 0 00-.662-1.588l-2.644-2.415A2.25 2.25 0 0010.5 8.1V5.25" />
      </svg>
    ),
    fuel: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
    break: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    overnight: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
};

const TripResult: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;
  const trip = state?.tripResponse;

  // Redirect if no trip data
  useEffect(() => {
    if (!trip) {
      navigate('/planner', { replace: true });
    }
  }, [trip, navigate]);

  if (!trip) return null;

  const { route, trip_summary, stops, daily_logs, trip_id } = trip;

  // Compute missing properties
  const total_fuel_stops = stops.filter(s => s.stop_type === 'fuel').length;
  const total_break_stops = stops.filter(s => s.stop_type === 'break').length;
  let total_driving_hours = 0;
  let total_on_duty_hours = 0;
  daily_logs.forEach(log => {
    total_driving_hours += log.totals.driving || 0;
    total_on_duty_hours += log.totals.on_duty || log.totals.driving || 0; // fallback if on_duty not tracked exactly
  });
  const remaining_cycle_hours = (trip_summary as any).cycle_hours_remaining || 0;
  const total_distance_miles = (trip_summary as any).total_distance_miles || 0;

  const handleDownloadPDF = () => {
    window.open(tripsApi.downloadPDF(trip_id), '_blank');
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ─── Breadcrumb + Actions ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <Link to="/planner" className="hover:text-amber-400 transition-colors">Plan Trip</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-slate-300 font-medium">Results</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/logs"
              state={{ tripResponse: trip }}
              className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              View ELD Logs
            </Link>
            <button
              onClick={handleDownloadPDF}
              className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Trip ID badge */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-xs">Trip ID:</span>
          <code className="text-amber-400 text-xs font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {trip_id}
          </code>
          <span className="status-badge bg-green-500/10 text-green-400 border border-green-500/20 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Complete
          </span>
        </div>

        {/* ─── Summary Stats ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" /></svg>}
            label="Total Distance"
            value={formatMiles(total_distance_miles)}
            highlight
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>}
            label="Total Days"
            value={trip_summary.total_days}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Driving Hours"
            value={formatHours(total_driving_hours)}
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>}
            label="Fuel Stops"
            value={total_fuel_stops}
            colorClass="text-orange-400"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>}
            label="Break Stops"
            value={total_break_stops}
            colorClass="text-purple-400"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>}
            label="On Duty Hours"
            value={formatHours(total_on_duty_hours)}
            colorClass="text-red-400"
          />
          <StatCard
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            label="Cycle Remaining"
            value={formatHours(remaining_cycle_hours)}
            colorClass="text-green-400"
          />
        </div>

        {/* ─── Main content: 2-col layout ─── */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left: Summary + Stops */}
          <div className="lg:col-span-1 space-y-4">
            {/* Estimated Arrival */}
            <div className="glass-card p-4 border border-amber-500/20 bg-amber-500/5">
              <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Estimated Arrival</p>
              <p className="text-amber-400 font-bold text-lg">{formatDateTime(trip_summary.estimated_arrival)}</p>
            </div>

            {/* Stops list */}
            <div className="glass-card p-4">
              <h3 className="text-slate-50 font-semibold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
                All Stops ({stops.length})
              </h3>

              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {stops.map((stop, index) => {
                  const colorClasses = getStopColor(stop.stop_type);
                  const hexColor = getStopHexColor(stop.stop_type);

                  return (
                    <div
                      key={index}
                      className={`flex gap-3 p-3 rounded-lg border transition-all hover:border-slate-600/60 ${colorClasses.includes('bg-') ? '' : 'border-slate-700/30'}`}
                      style={{
                        background: `${hexColor}08`,
                        borderColor: `${hexColor}20`,
                      }}
                    >
                      {/* Index + Icon */}
                      <div className="flex-shrink-0 flex flex-col items-center gap-1">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: `${hexColor}20`, color: hexColor, border: `1px solid ${hexColor}40` }}
                        >
                          {index + 1}
                        </div>
                        {index < stops.length - 1 && (
                          <div className="w-px flex-1 bg-slate-700 min-h-[12px]" />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <span
                            className="status-badge text-xs border"
                            style={{ color: hexColor, borderColor: `${hexColor}30`, background: `${hexColor}10` }}
                          >
                            <StopIcon type={stop.stop_type} />
                            {getStopLabel(stop.stop_type)}
                          </span>
                          <span className="text-slate-500 text-xs">Day {stop.day_number}</span>
                        </div>
                        <p className="text-slate-200 text-xs font-medium leading-snug truncate">{stop.location}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>Arr: {formatDateTime(stop.arrival_time)}</span>
                          <span className="text-slate-600">·</span>
                          <span>{formatHours(stop.duration_hours)}</span>
                        </div>
                        {stop.remarks && (
                          <p className="text-slate-500 text-xs mt-0.5 italic truncate">{stop.remarks}</p>
                        )}
                      </div>

                      {/* Mile marker */}
                      <div className="flex-shrink-0 text-right">
                        <p className="text-slate-400 text-xs font-mono">{stop.miles_from_start.toLocaleString()}</p>
                        <p className="text-slate-600 text-xs">mi</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily log summary */}
            {daily_logs.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="text-slate-50 font-semibold mb-3 text-sm">Daily Log Summary</h3>
                <div className="space-y-2">
                  {daily_logs.map((log) => (
                    <div key={log.day_number} className="flex items-center justify-between py-1.5 border-b border-slate-700/30 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                          <span className="text-amber-400 text-xs font-bold">{log.day_number}</span>
                        </div>
                        <span className="text-slate-300 text-xs">{log.date}</span>
                      </div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-amber-400">{formatHours(log.totals.driving)} drive</span>
                        <span className="text-slate-500">{formatHours(log.totals.off_duty)} off</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Map */}
          <div className="lg:col-span-2">
            <div className="glass-card p-4">
              <h3 className="text-slate-50 font-semibold mb-4 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                </svg>
                Route Map
                <span className="ml-auto text-xs text-slate-500 font-normal">
                  {total_distance_miles.toLocaleString()} mi · {stops.length} stops
                </span>
              </h3>
              <TripMap route={route} stops={stops} />

              {/* Map legend */}
              <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-slate-700/30">
                {(['pickup', 'dropoff', 'fuel', 'break', 'overnight'] as const).map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ background: getStopHexColor(type) }}
                    />
                    <span className="text-slate-400 text-xs">{getStopLabel(type)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1.5 ml-auto">
                  <div className="w-5 h-0.5 bg-blue-400 rounded opacity-80" />
                  <span className="text-slate-400 text-xs">Route</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Timeline ─── */}
        <TripTimeline stops={stops} />
      </div>
    </div>
  );
};

export default TripResult;
