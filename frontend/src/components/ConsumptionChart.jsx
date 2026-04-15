import React from 'react';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';

export default function ConsumptionChart({ type, data: chartData }) {
  const isTemp = type === 'temperature';
  const mainColor = isTemp ? '#F59E0B' : '#3B82F6';
  const unit = isTemp ? '°C' : type === 'water' ? 'm³' : 'kWh';
  const seriesLabel = isTemp
    ? 'Temperatur'
    : type === 'water'
      ? 'Wochenverbrauch'
      : 'Verbrauch';

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-full min-h-[16rem] flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 text-gray-400 px-4 text-center">
        Keine Verbrauchsdaten im gewählten Zeitraum.
      </div>
    );
  }

  const formatTick = (value) => {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return value;
    }

    if (numericValue >= 100) return numericValue.toFixed(0);
    if (numericValue >= 10) return numericValue.toFixed(1);
    return numericValue.toFixed(2);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) {
      return null;
    }

    const point = payload[0]?.payload || {};
    const note = point?.note || '';

    return (
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-3 py-2 shadow-sm max-w-xs">
        <p className="text-xs text-gray-500 mb-1">Datum: {label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {seriesLabel}: {formatTick(payload[0].value)} {unit}
        </p>
        {note ? (
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">Bemerkung: {note}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full h-full min-h-[16rem] overflow-hidden">
      <ResponsiveContainer width="100%" height="100%">
        {isTemp ? (
          /* Linien-Diagramm für Temperatur */
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={24}
              interval="preserveStartEnd"
              height={36}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={formatTick}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={mainColor}
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 5, fill: mainColor }}
            />
          </LineChart>
        ) : (
          /* Balken-Diagramm für Strom/Wasser-Verbrauch */
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
              minTickGap={24}
              interval="preserveStartEnd"
              height={36}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={52}
              tickFormatter={formatTick}
            />
            <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
            <Bar dataKey="value" fill={mainColor} radius={[4, 4, 0, 0]} maxBarSize={32}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}