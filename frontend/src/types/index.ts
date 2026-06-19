export interface TripRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface Stop {
  stop_type: 'pickup' | 'dropoff' | 'fuel' | 'break' | 'overnight';
  location: string;
  coordinates: [number, number]; // [lat, lon]
  arrival_time: string;
  departure_time: string;
  duration_hours: number;
  miles_from_start: number;
  day_number: number;
  remarks: string;
}

export interface RouteInfo {
  total_distance_miles: number;
  total_driving_hours: number;
  geometry: [number, number][]; // array of [lat, lon] pairs
  waypoints: unknown[];
}

export interface TripSummary {
  total_days: number;
  total_fuel_stops: number;
  total_break_stops: number;
  total_driving_hours: number;
  total_on_duty_hours: number;
  remaining_cycle_hours: number;
  estimated_arrival: string;
}

export type DutyStatus = 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty';

export interface DutyEvent {
  status: DutyStatus;
  start_hour: number;
  end_hour: number;
  start_time: string;
  end_time: string;
}

export interface DailyLogTotals {
  off_duty: number;
  sleeper_berth: number;
  driving: number;
  on_duty: number;
}

export interface DailyLog {
  date: string;
  day_number: number;
  driver_name: string;
  events: DutyEvent[];
  totals: DailyLogTotals;
  remarks: string[];
}

export interface TripResponse {
  trip_id: string;
  route: RouteInfo;
  trip_summary: TripSummary;
  stops: Stop[];
  daily_logs: DailyLog[];
}
