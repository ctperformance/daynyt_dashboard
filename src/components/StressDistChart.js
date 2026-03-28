'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function StressDistChart({ data }) {
  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Stress-Level Verteilung</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data}>
          <XAxis dataKey="label" stroke="#404040" tick={{ fill: '#888', fontSize: 11 }} />
          <YAxis stroke="none" tick={{ fill: '#888', fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fbf8f1',
            }}
          />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Nutzer">
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
