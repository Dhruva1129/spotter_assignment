import React from 'react';
import type { DailyLog, DutyStatus } from '../../types';
import { getDutyStatusColor, getDutyStatusLabel, formatDate, formatHours } from '../../utils/formatters';

interface LogSheetProps {
  log: DailyLog;
}

const DUTY_ROWS: { status: DutyStatus; label: string }[] = [
  { status: 'off_duty', label: 'Off Duty' },
  { status: 'sleeper_berth', label: 'Sleeper' },
  { status: 'driving', label: 'Driving' },
  { status: 'on_duty', label: 'On Duty' },
];

const GRID_HOURS = 24;
const ROW_HEIGHT = 40;
const LABEL_WIDTH = 90;
const TOTAL_GRID_WIDTH = 672; // 28px per hour × 24 hours
const HOUR_WIDTH = TOTAL_GRID_WIDTH / GRID_HOURS;
const SVG_HEIGHT = DUTY_ROWS.length * ROW_HEIGHT + 60; // rows + header + footer padding

const LogSheet: React.FC<LogSheetProps> = ({ log }) => {
  return (
    <div className="glass-card p-5 space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <h3 className="text-slate-50 font-semibold">
              Day {log.day_number} — {formatDate(log.date)}
            </h3>
          </div>
          <p className="text-slate-400 text-sm">Driver: <span className="text-slate-200 font-medium">{log.driver_name}</span></p>
        </div>
        {/* Totals chips */}
        <div className="flex flex-wrap gap-2">
          {DUTY_ROWS.map(({ status, label }) => {
            const total = log.totals[status] ?? 0;
            const color = getDutyStatusColor(status);
            return (
              <div
                key={status}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                style={{
                  color,
                  borderColor: `${color}40`,
                  background: `${color}12`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
                {label}: {formatHours(total)}
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG ELD Grid */}
      <div className="overflow-x-auto">
        <svg
          width={LABEL_WIDTH + TOTAL_GRID_WIDTH + 1}
          height={SVG_HEIGHT}
          style={{ display: 'block', minWidth: LABEL_WIDTH + TOTAL_GRID_WIDTH }}
        >
          {/* Column hour headers */}
          {Array.from({ length: GRID_HOURS + 1 }, (_, i) => (
            <g key={`header-${i}`}>
              <line
                x1={LABEL_WIDTH + i * HOUR_WIDTH}
                y1={0}
                x2={LABEL_WIDTH + i * HOUR_WIDTH}
                y2={12}
                stroke="#475569"
                strokeWidth={1}
              />
              <text
                x={LABEL_WIDTH + i * HOUR_WIDTH}
                y={10}
                textAnchor="middle"
                fontSize={9}
                fill="#64748b"
                fontFamily="Inter, sans-serif"
                fontWeight={500}
              >
                {i < GRID_HOURS ? (i === 0 ? 'M' : i === 12 ? 'N' : i < 12 ? i : i - 12) : 'M'}
              </text>
            </g>
          ))}

          {/* Half-hour tick marks */}
          {Array.from({ length: GRID_HOURS }, (_, i) => (
            <line
              key={`half-${i}`}
              x1={LABEL_WIDTH + i * HOUR_WIDTH + HOUR_WIDTH / 2}
              y1={16}
              x2={LABEL_WIDTH + i * HOUR_WIDTH + HOUR_WIDTH / 2}
              y2={22}
              stroke="#334155"
              strokeWidth={1}
            />
          ))}

          {/* Duty rows */}
          {DUTY_ROWS.map(({ status, label }, rowIndex) => {
            const y = 22 + rowIndex * ROW_HEIGHT;
            const color = getDutyStatusColor(status);
            const events = log.events.filter((e) => e.status === status);

            return (
              <g key={status}>
                {/* Row background (alternating) */}
                <rect
                  x={LABEL_WIDTH}
                  y={y}
                  width={TOTAL_GRID_WIDTH}
                  height={ROW_HEIGHT}
                  fill={rowIndex % 2 === 0 ? '#1e293b' : '#172033'}
                  opacity={0.7}
                />

                {/* Row label */}
                <text
                  x={LABEL_WIDTH - 6}
                  y={y + ROW_HEIGHT / 2 + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="#94a3b8"
                  fontFamily="Inter, sans-serif"
                  fontWeight={500}
                >
                  {label}
                </text>

                {/* Colored status bar fill for each event */}
                {events.map((event, ei) => {
                  const startX = LABEL_WIDTH + (event.start_hour / GRID_HOURS) * TOTAL_GRID_WIDTH;
                  const endX = LABEL_WIDTH + (event.end_hour / GRID_HOURS) * TOTAL_GRID_WIDTH;
                  const barWidth = Math.max(endX - startX, 1);
                  const barY = y + 8;
                  const barHeight = ROW_HEIGHT - 16;

                  return (
                    <g key={ei}>
                      {/* Glow */}
                      <rect
                        x={startX}
                        y={barY - 2}
                        width={barWidth}
                        height={barHeight + 4}
                        fill={color}
                        opacity={0.15}
                        rx={2}
                      />
                      {/* Main bar */}
                      <rect
                        x={startX}
                        y={barY}
                        width={barWidth}
                        height={barHeight}
                        fill={color}
                        opacity={0.85}
                        rx={2}
                      />
                      {/* Top edge line */}
                      <rect
                        x={startX}
                        y={barY}
                        width={barWidth}
                        height={2}
                        fill={color}
                        opacity={1}
                        rx={1}
                      />
                    </g>
                  );
                })}

                {/* Hour grid lines overlaid on row */}
                {Array.from({ length: GRID_HOURS + 1 }, (_, i) => (
                  <line
                    key={`grid-${i}`}
                    x1={LABEL_WIDTH + i * HOUR_WIDTH}
                    y1={y}
                    x2={LABEL_WIDTH + i * HOUR_WIDTH}
                    y2={y + ROW_HEIGHT}
                    stroke="#2d3f55"
                    strokeWidth={i % 6 === 0 ? 1.5 : 0.5}
                    opacity={i % 6 === 0 ? 1 : 0.6}
                  />
                ))}

                {/* Row bottom border */}
                <line
                  x1={LABEL_WIDTH}
                  y1={y + ROW_HEIGHT}
                  x2={LABEL_WIDTH + TOTAL_GRID_WIDTH}
                  y2={y + ROW_HEIGHT}
                  stroke="#334155"
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* Left border */}
          <line
            x1={LABEL_WIDTH}
            y1={22}
            x2={LABEL_WIDTH}
            y2={22 + DUTY_ROWS.length * ROW_HEIGHT}
            stroke="#475569"
            strokeWidth={1}
          />
          {/* Right border */}
          <line
            x1={LABEL_WIDTH + TOTAL_GRID_WIDTH}
            y1={22}
            x2={LABEL_WIDTH + TOTAL_GRID_WIDTH}
            y2={22 + DUTY_ROWS.length * ROW_HEIGHT}
            stroke="#475569"
            strokeWidth={1}
          />
          {/* Top border */}
          <line
            x1={LABEL_WIDTH}
            y1={22}
            x2={LABEL_WIDTH + TOTAL_GRID_WIDTH}
            y2={22}
            stroke="#475569"
            strokeWidth={1}
          />

          {/* AM/PM midday markers */}
          <text
            x={LABEL_WIDTH + TOTAL_GRID_WIDTH / 4}
            y={SVG_HEIGHT - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#475569"
            fontFamily="Inter, sans-serif"
          >
            A.M.
          </text>
          <text
            x={LABEL_WIDTH + (TOTAL_GRID_WIDTH * 3) / 4}
            y={SVG_HEIGHT - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#475569"
            fontFamily="Inter, sans-serif"
          >
            P.M.
          </text>
          {/* Noon divider */}
          <line
            x1={LABEL_WIDTH + TOTAL_GRID_WIDTH / 2}
            y1={22}
            x2={LABEL_WIDTH + TOTAL_GRID_WIDTH / 2}
            y2={22 + DUTY_ROWS.length * ROW_HEIGHT}
            stroke="#475569"
            strokeWidth={1.5}
            strokeDasharray="4 2"
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-700/50">
        {DUTY_ROWS.map(({ status, label }) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ background: getDutyStatusColor(status) }}
            />
            <span className="text-slate-400 text-xs">{label}: <span className="text-slate-200 font-medium">{getDutyStatusLabel(status)}</span></span>
          </div>
        ))}
      </div>

      {/* Remarks */}
      {log.remarks && log.remarks.length > 0 && (
        <div className="pt-2 border-t border-slate-700/50">
          <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Remarks</p>
          <ul className="space-y-1">
            {log.remarks.map((remark, i) => (
              <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                {remark}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LogSheet;
