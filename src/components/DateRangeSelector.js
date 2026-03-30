'use client';

import { DATE_RANGES } from '@/lib/date-ranges';

export default function DateRangeSelector({ selected, onChange }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {Object.entries(DATE_RANGES).map(([key, { label }]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selected === key
              ? 'bg-ease-accent text-black'
              : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-ease-cream'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
