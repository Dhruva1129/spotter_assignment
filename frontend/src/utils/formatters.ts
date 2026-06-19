/**
 * Format hours to a readable string: 8.5 -> '8h 30m'
 */
export const formatHours = (hours: number): string => {
  if (isNaN(hours) || hours < 0) return '0h 0m';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Format miles with comma separator: 1312.5 -> '1,312.5 mi'
 */
export const formatMiles = (miles: number): string => {
  if (isNaN(miles)) return '0 mi';
  return `${miles.toLocaleString('en-US', { maximumFractionDigits: 1 })} mi`;
};

/**
 * Format ISO datetime to readable: '2026-06-19T14:30:00' -> 'Jun 19, 2:30 PM'
 */
export const formatDateTime = (iso: string): string => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};

/**
 * Format just time portion: '2026-06-19T14:30:00' -> '2:30 PM'
 */
export const formatTime = (iso: string): string => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
};

/**
 * Format date portion: '2026-06-19T14:30:00' -> 'Jun 19, 2026'
 */
export const formatDate = (iso: string): string => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
};

/**
 * Get Tailwind color classes for stop type
 */
export const getStopColor = (type: string): string => {
  const colors: Record<string, string> = {
    pickup: 'text-green-400 bg-green-500/10 border-green-500/30',
    dropoff: 'text-red-400 bg-red-500/10 border-red-500/30',
    fuel: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    break: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    overnight: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  };
  return colors[type] ?? 'text-slate-400 bg-slate-500/10 border-slate-500/30';
};

/**
 * Get dot/circle fill color for stop type (hex)
 */
export const getStopHexColor = (type: string): string => {
  const colors: Record<string, string> = {
    pickup: '#22c55e',
    dropoff: '#ef4444',
    fuel: '#f97316',
    break: '#eab308',
    overnight: '#a855f7',
  };
  return colors[type] ?? '#94a3b8';
};

/**
 * Get human-readable label for stop type
 */
export const getStopLabel = (type: string): string => {
  const labels: Record<string, string> = {
    pickup: 'Pickup',
    dropoff: 'Dropoff',
    fuel: 'Fuel Stop',
    break: 'Rest Break',
    overnight: 'Overnight Rest',
  };
  return labels[type] ?? type;
};

/**
 * Get human-readable label for duty status
 */
export const getDutyStatusLabel = (status: string): string => {
  const labels: Record<string, string> = {
    off_duty: 'Off Duty',
    sleeper_berth: 'Sleeper Berth',
    driving: 'Driving',
    on_duty: 'On Duty (Not Driving)',
  };
  return labels[status] ?? status;
};

/**
 * Get color for duty status (for SVG ELD grid)
 */
export const getDutyStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    off_duty: '#22c55e',
    sleeper_berth: '#3b82f6',
    driving: '#f59e0b',
    on_duty: '#ef4444',
  };
  return colors[status] ?? '#94a3b8';
};
