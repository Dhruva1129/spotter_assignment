import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import type { TripResponse, DailyLog } from '../types';
import LogSheet from '../components/ELDLog/LogSheet';
import { formatHours, formatDate } from '../utils/formatters';
import { tripsApi } from '../services/api';

interface LocationState {
  tripResponse?: TripResponse;
}

// Sample data for when user navigates directly (no state)
const SAMPLE_LOG: DailyLog = {
  date: new Date().toISOString().split('T')[0],
  day_number: 1,
  driver_name: 'Sample Driver',
  events: [
    { status: 'off_duty', start_hour: 0, end_hour: 6, start_time: '00:00', end_time: '06:00' },
    { status: 'on_duty', start_hour: 6, end_hour: 7, start_time: '06:00', end_time: '07:00' },
    { status: 'driving', start_hour: 7, end_hour: 11, start_time: '07:00', end_time: '11:00' },
    { status: 'off_duty', start_hour: 11, end_hour: 11.5, start_time: '11:00', end_time: '11:30' },
    { status: 'driving', start_hour: 11.5, end_hour: 15, start_time: '11:30', end_time: '15:00' },
    { status: 'on_duty', start_hour: 15, end_hour: 15.5, start_time: '15:00', end_time: '15:30' },
    { status: 'driving', start_hour: 15.5, end_hour: 18, start_time: '15:30', end_time: '18:00' },
    { status: 'off_duty', start_hour: 18, end_hour: 24, start_time: '18:00', end_time: '24:00' },
  ],
  totals: { off_duty: 13, sleeper_berth: 0, driving: 9.5, on_duty: 1.5 },
  remarks: [
    'Pre-trip inspection completed',
    'Loaded at Gary, IN distribution center',
    'Fuel stop at Iowa 80 Truckstop',
  ],
};

const SAMPLE_TRIP_ID = 'SAMPLE-001';

const ELDLogViewer: React.FC = () => {
  const location = useLocation();
  const state = location.state as LocationState | null;
  const trip = state?.tripResponse;

  const [activeDay, setActiveDay] = useState(1);
  const [exportingAll, setExportingAll] = useState(false);

  const dailyLogs: DailyLog[] = trip?.daily_logs && trip.daily_logs.length > 0
    ? trip.daily_logs
    : [SAMPLE_LOG];

  const tripId = trip?.trip_id ?? SAMPLE_TRIP_ID;
  const isSample = !trip;

  const activeLog = dailyLogs.find((l) => l.day_number === activeDay) ?? dailyLogs[0];

  useEffect(() => {
    if (dailyLogs.length > 0) {
      setActiveDay(dailyLogs[0].day_number);
    }
  }, [dailyLogs]);

  const handleDownloadPDF = () => {
    if (isSample) {
      alert('This is sample data. Run a real trip calculation to download PDF.');
      return;
    }
    window.open(tripsApi.downloadPDF(tripId), '_blank');
  };

  const handleExportAll = async () => {
    if (isSample) {
      alert('This is sample data. Run a real trip calculation to export logs.');
      return;
    }
    setExportingAll(true);
    try {
      window.open(tripsApi.downloadPDF(tripId), '_blank');
    } finally {
      setTimeout(() => setExportingAll(false), 2000);
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 animate-fade-in">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-3">
              <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              {trip && (
                <>
                  <Link to="/result" state={{ tripResponse: trip }} className="hover:text-amber-400 transition-colors">
                    Results
                  </Link>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </>
              )}
              <span className="text-slate-300 font-medium">ELD Logs</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-1">Driver Daily Logs</h1>
            <p className="text-slate-400 text-sm">
              FMCSA-compliant Hours of Service records · {dailyLogs.length} day{dailyLogs.length !== 1 ? 's' : ''}
              {isSample && (
                <span className="ml-2 status-badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Sample Data
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              disabled={exportingAll}
              className="btn-secondary flex items-center gap-2 !py-2 !px-4 text-sm disabled:opacity-60"
            >
              {exportingAll ? (
                <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-50 rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              Export All Logs
            </button>
            <button
              onClick={handleDownloadPDF}
              className="btn-primary flex items-center gap-2 !py-2 !px-4 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>

        {/* Sample notice */}
        {isSample && (
          <div className="glass-card p-4 border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            <div>
              <p className="text-amber-400 text-sm font-semibold">Viewing sample ELD log</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Navigate here from a completed trip to see real driver logs.{' '}
                <Link to="/planner" className="text-amber-400 hover:underline">Plan a trip →</Link>
              </p>
            </div>
          </div>
        )}

        {/* Trip info */}
        {trip && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-card p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Trip ID</p>
              <code className="text-amber-400 text-xs font-mono">{tripId}</code>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Total Days</p>
              <p className="text-slate-50 font-bold">{trip.trip_summary.total_days}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">Total Driving</p>
              <p className="text-amber-400 font-bold">{formatHours(trip.trip_summary.total_driving_hours)}</p>
            </div>
            <div className="glass-card p-3 text-center">
              <p className="text-slate-400 text-xs mb-1">On Duty</p>
              <p className="text-slate-50 font-bold">{formatHours(trip.trip_summary.total_on_duty_hours)}</p>
            </div>
          </div>
        )}

        {/* Day selector tabs */}
        <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-700/50 pb-0">
          {dailyLogs.map((log) => (
            <button
              key={log.day_number}
              onClick={() => setActiveDay(log.day_number)}
              className={`relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 ${
                activeDay === log.day_number
                  ? 'text-amber-400 border-b-2 border-amber-500 -mb-px'
                  : 'text-slate-400 hover:text-slate-200 border-b-2 border-transparent -mb-px'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  activeDay === log.day_number
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {log.day_number}
              </div>
              <span>{formatDate(log.date)}</span>
              <span className={`text-xs ${activeDay === log.day_number ? 'text-amber-400/70' : 'text-slate-500'}`}>
                {formatHours(log.totals.driving)}
              </span>
            </button>
          ))}
        </div>

        {/* Active day log */}
        {activeLog && (
          <div className="animate-slide-up">
            <LogSheet log={activeLog} />
          </div>
        )}

        {/* All days totals summary table */}
        <div className="glass-card p-5">
          <h3 className="text-slate-50 font-semibold mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            Multi-Day Summary
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left text-slate-400 text-xs font-medium py-2 pr-4">Day</th>
                  <th className="text-left text-slate-400 text-xs font-medium py-2 pr-4">Date</th>
                  <th className="text-right text-green-400 text-xs font-medium py-2 pr-4">Off Duty</th>
                  <th className="text-right text-blue-400 text-xs font-medium py-2 pr-4">Sleeper</th>
                  <th className="text-right text-amber-400 text-xs font-medium py-2 pr-4">Driving</th>
                  <th className="text-right text-red-400 text-xs font-medium py-2">On Duty</th>
                </tr>
              </thead>
              <tbody>
                {dailyLogs.map((log) => (
                  <tr
                    key={log.day_number}
                    onClick={() => setActiveDay(log.day_number)}
                    className={`border-b border-slate-700/20 cursor-pointer transition-all ${
                      activeDay === log.day_number
                        ? 'bg-amber-500/5'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          activeDay === log.day_number ? 'bg-amber-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                        }`}>
                          {log.day_number}
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-300">{formatDate(log.date)}</td>
                    <td className="py-2.5 pr-4 text-right text-green-400 font-mono">{formatHours(log.totals.off_duty)}</td>
                    <td className="py-2.5 pr-4 text-right text-blue-400 font-mono">{formatHours(log.totals.sleeper_berth)}</td>
                    <td className="py-2.5 pr-4 text-right text-amber-400 font-bold font-mono">{formatHours(log.totals.driving)}</td>
                    <td className="py-2.5 text-right text-red-400 font-mono">{formatHours(log.totals.on_duty)}</td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="border-t border-slate-600/50 bg-slate-800/30">
                  <td colSpan={2} className="py-2.5 pr-4 text-slate-300 font-semibold text-xs">TOTALS</td>
                  <td className="py-2.5 pr-4 text-right text-green-400 font-bold font-mono text-xs">
                    {formatHours(dailyLogs.reduce((s, l) => s + l.totals.off_duty, 0))}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-blue-400 font-bold font-mono text-xs">
                    {formatHours(dailyLogs.reduce((s, l) => s + l.totals.sleeper_berth, 0))}
                  </td>
                  <td className="py-2.5 pr-4 text-right text-amber-400 font-bold font-mono text-xs">
                    {formatHours(dailyLogs.reduce((s, l) => s + l.totals.driving, 0))}
                  </td>
                  <td className="py-2.5 text-right text-red-400 font-bold font-mono text-xs">
                    {formatHours(dailyLogs.reduce((s, l) => s + l.totals.on_duty, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ELDLogViewer;
