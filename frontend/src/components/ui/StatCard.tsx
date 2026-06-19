import React from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  highlight?: boolean;
  colorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  unit,
  highlight = false,
  colorClass = 'text-amber-400',
}) => {
  return (
    <div
      className={`glass-card p-4 flex items-center gap-4 transition-all duration-300 hover:border-slate-600/80 hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 ${
        highlight ? 'border-amber-500/30 bg-amber-500/5' : ''
      }`}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${highlight ? 'bg-amber-500/10' : 'bg-slate-700/50'}`}>
        <span className={`${highlight ? 'text-amber-400' : colorClass}`}>{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-0.5 truncate">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className={`text-xl font-bold ${highlight ? 'text-amber-400' : 'text-slate-50'}`}>
            {value}
          </span>
          {unit && <span className="text-slate-400 text-sm">{unit}</span>}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
