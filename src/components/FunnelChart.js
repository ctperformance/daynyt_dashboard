'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#d4a853', '#c99b45', '#be8e38', '#b3812b', '#a8741e', '#9d6711', '#925a04', '#876000', '#7c5800', '#715000', '#664800'];

export default function FunnelChart({ data }) {
  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Quiz-Completion-Funnel</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 30 }}>
          <XAxis type="number" stroke="#404040" tick={{ fill: '#888', fontSize: 12 }} />
          <YAxis
            dataKey="label"
            type="category"
            stroke="none"
            tick={{ fill: '#ccc', fontSize: 12 }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fbf8f1',
            }}
            formatter={(value, name, props) => [
              `${value} (${props.payload.rate}%)`,
              'Nutzer',
            ]}
          />
          <Bar dataKey="count" radius={[0, 6, 6, 0]}>
            {data.map((entry, index) => (
              <Cell key={entry.step} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
