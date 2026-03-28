'use client';

export default function HorizontalBarList({ title, data, color = '#d4a853', maxItems = 7 }) {
  const items = data.slice(0, maxItems);
  const maxCount = Math.max(...items.map((d) => d.count), 1);

  return (
    <div className="bg-ease-card border border-ease-border rounded-xl p-5">
      <h3 className="text-sm font-medium text-gray-400 mb-4">{title}</h3>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ease-cream truncate mr-2">{item.name}</span>
              <span className="text-gray-400 shrink-0">{item.count}</span>
            </div>
            <div className="h-2 bg-ease-border rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${(item.count / maxCount) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
