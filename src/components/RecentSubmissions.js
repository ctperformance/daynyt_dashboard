'use client';

import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

export default function RecentSubmissions({ submissions, limit = 10 }) {
  const recent = submissions.slice(0, limit);

  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">Letzte Submissions</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-ease-border">
              <th className="pb-2 pr-4">Datum</th>
              <th className="pb-2 pr-4">E-Mail</th>
              <th className="pb-2 pr-4">Stress</th>
              <th className="pb-2 pr-4">Symptome</th>
              <th className="pb-2">Wunsch</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((s) => (
              <tr key={s.id} className="border-b border-ease-border/50 hover:bg-white/5">
                <td className="py-2 pr-4 text-gray-400 whitespace-nowrap">
                  {format(parseISO(s.submitted_at), 'dd.MM. HH:mm', { locale: de })}
                </td>
                <td className="py-2 pr-4 text-ease-cream truncate max-w-[180px]">
                  {s.email || '—'}
                </td>
                <td className="py-2 pr-4">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      s.stress_score >= 70
                        ? 'bg-red-500/20 text-red-400'
                        : s.stress_score >= 40
                          ? 'bg-orange-500/20 text-orange-400'
                          : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {s.stress_score}
                  </span>
                </td>
                <td className="py-2 pr-4 text-gray-400 text-xs truncate max-w-[200px]">
                  {(s.q4_answers || []).join(', ') || '—'}
                </td>
                <td className="py-2 text-gray-400 text-xs truncate max-w-[150px]">
                  {s.q7_answer || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
