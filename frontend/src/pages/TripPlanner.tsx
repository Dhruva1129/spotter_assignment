import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCalculateTrip } from '../hooks/useTrip';
import type { TripRequest } from '../types';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import ErrorMessage from '../components/ui/ErrorMessage';

interface FormState {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

const INITIAL_FORM: FormState = {
  current_location: '',
  pickup_location: '',
  dropoff_location: '',
  current_cycle_used: 0,
};

const InputWithIcon: React.FC<{
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  icon: React.ReactNode;
  required?: boolean;
  error?: string;
}> = ({ id, label, placeholder, value, onChange, icon, required, error }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-300">
      {label} {required && <span className="text-amber-500">*</span>}
    </label>
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        {icon}
      </div>
      <input
        id={id}
        type="text"
        className={`input-field pl-10 ${error ? 'border-red-500 focus:ring-red-500' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete="off"
      />
    </div>
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const TripPlanner: React.FC = () => {
  const navigate = useNavigate();
  const { mutate, isPending, error, reset } = useCalculateTrip();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (validationErrors[key]) {
      setValidationErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const errors: Partial<Record<keyof FormState, string>> = {};
    if (!form.current_location.trim()) errors.current_location = 'Current location is required';
    if (!form.pickup_location.trim()) errors.pickup_location = 'Pickup location is required';
    if (!form.dropoff_location.trim()) errors.dropoff_location = 'Dropoff location is required';
    if (form.current_cycle_used < 0 || form.current_cycle_used > 70) {
      errors.current_cycle_used = 'Cycle hours must be between 0 and 70';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    reset();

    const request: TripRequest = {
      current_location: form.current_location.trim(),
      pickup_location: form.pickup_location.trim(),
      dropoff_location: form.dropoff_location.trim(),
      current_cycle_used: form.current_cycle_used,
    };

    mutate(request, {
      onSuccess: (data) => {
        navigate('/result', { state: { tripResponse: data } });
      },
    });
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
            <Link to="/" className="hover:text-amber-400 transition-colors">Home</Link>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-slate-300">Plan Trip</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 mb-2">Plan Your Route</h1>
          <p className="text-slate-400">
            Enter your trip details and our AI will calculate an optimized, HOS-compliant route with full ELD logs.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 animate-slide-up">
          {/* Form */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
              <div className="flex items-center gap-2 pb-4 border-b border-slate-700/50">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
                  </svg>
                </div>
                <span className="text-slate-50 font-semibold">Trip Details</span>
              </div>

              <InputWithIcon
                id="current_location"
                label="Current Location"
                placeholder="e.g. Chicago, IL"
                value={form.current_location}
                onChange={(v) => setField('current_location', v)}
                required
                error={validationErrors.current_location}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                }
              />

              <InputWithIcon
                id="pickup_location"
                label="Pickup Location"
                placeholder="e.g. Gary, IN"
                value={form.pickup_location}
                onChange={(v) => setField('pickup_location', v)}
                required
                error={validationErrors.pickup_location}
                icon={
                  <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                }
              />

              <InputWithIcon
                id="dropoff_location"
                label="Dropoff Location"
                placeholder="e.g. Los Angeles, CA"
                value={form.dropoff_location}
                onChange={(v) => setField('dropoff_location', v)}
                required
                error={validationErrors.dropoff_location}
                icon={
                  <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l1.664 9.14a2.25 2.25 0 002.988 1.598l1.116-.418a2.25 2.25 0 012.446.618l.925 1.088A2.25 2.25 0 0013.5 16.125l.093-.046A2.25 2.25 0 0015 13.875V12.75a2.25 2.25 0 00-.662-1.588l-2.644-2.415A2.25 2.25 0 0010.5 8.1V5.25" />
                  </svg>
                }
              />

              {/* Cycle hours with slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label htmlFor="cycle_hours" className="text-sm font-medium text-slate-300">
                    Current Cycle Hours Used <span className="text-amber-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-amber-400 font-bold text-lg">{form.current_cycle_used}</span>
                    <span className="text-slate-400 text-sm">/ 70h</span>
                  </div>
                </div>

                {/* Slider */}
                <input
                  id="cycle_hours"
                  type="range"
                  min={0}
                  max={70}
                  step={0.5}
                  value={form.current_cycle_used}
                  onChange={(e) => setField('current_cycle_used', parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700"
                  style={{
                    background: `linear-gradient(to right, #f59e0b ${(form.current_cycle_used / 70) * 100}%, #334155 ${(form.current_cycle_used / 70) * 100}%)`,
                  }}
                />

                {/* Manual input */}
                <input
                  type="number"
                  min={0}
                  max={70}
                  step={0.5}
                  value={form.current_cycle_used}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (!isNaN(v) && v >= 0 && v <= 70) setField('current_cycle_used', v);
                  }}
                  className="input-field text-sm"
                  placeholder="Enter cycle hours (0–70)"
                />

                {/* Visual cycle gauge */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(form.current_cycle_used / 70) * 100}%`,
                        background: form.current_cycle_used > 60
                          ? '#ef4444'
                          : form.current_cycle_used > 45
                          ? '#f97316'
                          : '#f59e0b',
                      }}
                    />
                  </div>
                  <span className="text-slate-400 text-xs whitespace-nowrap">
                    {(70 - form.current_cycle_used).toFixed(1)}h remaining
                  </span>
                </div>

                {validationErrors.current_cycle_used && (
                  <p className="text-red-400 text-xs">{validationErrors.current_cycle_used}</p>
                )}
              </div>

              {/* Error display */}
              {error && (
                <ErrorMessage
                  message={error.message}
                  onRetry={() => {
                    reset();
                  }}
                />
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full flex items-center justify-center gap-3 text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                    Calculating Route...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    Calculate Route
                  </>
                )}
              </button>

              {isPending && (
                <div className="text-center">
                  <LoadingSpinner message="Calculating optimal route & generating ELD logs..." />
                </div>
              )}
            </form>
          </div>

          {/* Right panel: route preview + info */}
          <div className="lg:col-span-2 space-y-4">
            {/* Connected route preview */}
            <div className="glass-card p-6">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-5">Route Preview</h3>
              <div className="flex flex-col items-center gap-0">
                {/* Current */}
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-full bg-blue-500/10 border-2 border-blue-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-xs">Current</p>
                    <p className="text-slate-200 font-medium text-sm truncate">
                      {form.current_location || 'Enter location…'}
                    </p>
                  </div>
                </div>

                {/* Connector */}
                <div className="ml-4 flex flex-col items-center py-1">
                  <div className="w-0.5 h-3 bg-slate-600" />
                  <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 15.5l-7-7 1.41-1.41L12 12.67l5.59-5.58L19 8.5z" />
                  </svg>
                  <div className="w-0.5 h-3 bg-slate-600" />
                </div>

                {/* Pickup */}
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-full bg-green-500/10 border-2 border-green-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-xs">Pickup</p>
                    <p className="text-slate-200 font-medium text-sm truncate">
                      {form.pickup_location || 'Enter pickup…'}
                    </p>
                  </div>
                </div>

                {/* Connector */}
                <div className="ml-4 flex flex-col items-center py-1">
                  <div className="w-0.5 h-3 bg-slate-600" />
                  <svg className="w-3 h-3 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 15.5l-7-7 1.41-1.41L12 12.67l5.59-5.58L19 8.5z" />
                  </svg>
                  <div className="w-0.5 h-3 bg-slate-600" />
                </div>

                {/* Dropoff */}
                <div className="flex items-center gap-3 w-full">
                  <div className="w-9 h-9 rounded-full bg-red-500/10 border-2 border-red-500/40 flex items-center justify-center flex-shrink-0">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-xs">Dropoff</p>
                    <p className="text-slate-200 font-medium text-sm truncate">
                      {form.dropoff_location || 'Enter dropoff…'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* HOS info card */}
            <div className="glass-card p-5 space-y-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">HOS Regulations Applied</h3>
              {[
                { label: '11-Hour Driving Limit', desc: 'Max 11h driving after 10h off', color: 'bg-amber-500' },
                { label: '30-Min Break Rule', desc: 'Required after 8h of driving', color: 'bg-blue-500' },
                { label: '10-Hour Off Duty', desc: 'Min 10h reset between shifts', color: 'bg-purple-500' },
                { label: '70-Hour/8-Day Cycle', desc: 'Federal property carrier limit', color: 'bg-green-500' },
              ].map((rule) => (
                <div key={rule.label} className="flex items-start gap-2.5">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${rule.color}`} />
                  <div>
                    <p className="text-slate-300 text-xs font-semibold">{rule.label}</p>
                    <p className="text-slate-500 text-xs">{rule.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* ELD Logs link */}
            <Link
              to="/logs"
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              View ELD Logs
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripPlanner;
