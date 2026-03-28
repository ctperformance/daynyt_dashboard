'use client';

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export default function TimeSeriesChart({ data, title = 'Submissions pro Tag' }) {
  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={data} margin={{ left: 0, right: 10 }}>
          <defs>
            <linearGradient id="colorSubmissions" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
          <XAxis
            dataKey="date"
            stroke="#404040"
            tick={{ fill: '#888', fontSize: 11 }}
            tickFormatter={(d) => {
              try { return format(parseISO(d), 'dd.MM', { locale: de }); }
              catch { return d; }
            }}
            interval="preserveStartEnd"
          />
          <YAxis stroke="none" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fbf8f1',
            }}
            labelFormatter={(d) => {
              try { return format(parseISO(d), 'dd. MMMM yyyy', { locale: de }); }
              catch { return d; }
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#d4a853"
            strokeWidth={2}
            fill="url(#colorSubmissions)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
