import React from 'react';
import type { Stop } from '../../types';
import { getStopColor, getStopHexColor, getStopLabel, formatTime } from '../../utils/formatters';

interface TripTimelineProps {
  stops: Stop[];
}

const StopIcon: React.FC<{ type: Stop['stop_type'] }> = ({ type }) => {
  const icons: Record<Stop['stop_type'], React.ReactNode> = {
    pickup: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    dropoff: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.14a2.25 2.25 0 002.988 1.598l1.116-.418a2.25 2.25 0 012.446.618l.925 1.088A2.25 2.25 0 0013.5 16.125l.093-.046A2.25 2.25 0 0015 13.875V12.75a2.25 2.25 0 00-.662-1.588l-2.644-2.415A2.25 2.25 0 0110.5 8.1V5.25" />
      </svg>
    ),
    fuel: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
    break: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    overnight: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
      </svg>
    ),
  };
  return <>{icons[type]}</>;
};

const TripTimeline: React.FC<TripTimelineProps> = ({ stops }) => {
  if (!stops || stops.length === 0) return null;

  // Group stops by day
  const stopsByDay = stops.reduce<Record<number, Stop[]>>((acc, stop) => {
    const day = stop.day_number;
    if (!acc[day]) acc[day] = [];
    acc[day].push(stop);
    return acc;
  }, {});

  const days = Object.keys(stopsByDay).map(Number).sort((a, b) => a - b);

  return (
    <div className="glass-card p-5">
      <h3 className="text-slate-50 font-semibold mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
        </svg>
        Trip Timeline
      </h3>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-0 min-w-max">
          {days.map((day, dayIndex) => (
            <div key={day} className="flex">
              {/* Day label column */}
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-2">
                  <div className="w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <span className="text-amber-400 text-xs font-bold">{day}</span>
                  </div>
                  <span className="text-slate-400 text-xs font-medium whitespace-nowrap">Day {day}</span>
                </div>

                {/* Stops for this day */}
                <div className="flex gap-0">
                  {stopsByDay[day].map((stop, stopIndex) => {
                    const isLast = dayIndex === days.length - 1 && stopIndex === stopsByDay[day].length - 1;
                    const hexColor = getStopHexColor(stop.stop_type);
                    const colorClasses = getStopColor(stop.stop_type);

                    return (
                      <div key={stopIndex} className="flex items-center">
                        {/* Stop card */}
                        <div className={`flex flex-col items-center group cursor-default`}>
                          {/* Stop dot */}
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-200 group-hover:scale-110 shadow-lg`}
                            style={{
                              borderColor: hexColor,
                              background: `${hexColor}18`,
                              boxShadow: `0 0 12px ${hexColor}30`,
                            }}
                          >
                            <span style={{ color: hexColor }}>
                              <StopIcon type={stop.stop_type} />
                            </span>
                          </div>

                          {/* Stop info below */}
                          <div className="mt-2 flex flex-col items-center text-center max-w-[90px]">
                            <span
                              className={`status-badge border mb-1 ${colorClasses}`}
                              style={{ fontSize: '9px', padding: '1px 6px' }}
                            >
                              {getStopLabel(stop.stop_type)}
                            </span>
                            <span className="text-slate-300 text-[10px] font-medium leading-snug line-clamp-2 px-1">
                              {stop.location.split(',')[0]}
                            </span>
                            <span className="text-slate-500 text-[10px] mt-0.5">
                              {formatTime(stop.arrival_time)}
                            </span>
                          </div>
                        </div>

                        {/* Connector line */}
                        {!isLast && (
                          <div className="flex items-center mx-1" style={{ paddingBottom: '2.5rem' }}>
                            <div className="w-8 flex items-center">
                              <div
                                className="flex-1 border-t-2 border-dashed"
                                style={{ borderColor: 'rgba(71,85,105,0.6)' }}
                              />
                              <svg
                                className="w-3 h-3 text-slate-600 flex-shrink-0 ml-0.5"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z" />
                              </svg>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day separator */}
              {dayIndex < days.length - 1 && (
                <div className="flex items-center mx-3" style={{ paddingTop: '2rem', paddingBottom: '2.5rem' }}>
                  <div className="flex flex-col items-center">
                    <div className="w-px flex-1 bg-gradient-to-b from-slate-600 to-transparent" style={{ minHeight: 40 }} />
                    <div className="my-1 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500 bg-slate-800 border border-slate-700 whitespace-nowrap">
                      Day {days[dayIndex + 1]}
                    </div>
                    <div className="w-px flex-1 bg-gradient-to-t from-slate-600 to-transparent" style={{ minHeight: 40 }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TripTimeline;
