import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

const createTrendPoint = (color) => ({ cx, cy, value, index, payload }) => (
  Number(value) > 0 && cx != null && cy != null
    ? (
      <circle
        key={`${payload?.time ?? index}-${color}`}
        className="dash-trend-point"
        cx={cx}
        cy={cy}
        r={4}
        fill={color}
        stroke="#ffffff"
        strokeWidth={2}
      />
    )
    : null
);

export const DashboardTrendChart = ({
  data,
  chartFilter,
  chartYDomain,
  showMinor,
  showSerious,
  showMajor
}) => (
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 14, right: 12, left: -20, bottom: 0 }}>
      <defs>
        <linearGradient id="minorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="seriousGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="majorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
          <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 5" vertical={false} stroke="#e8eef5" />
      <XAxis
        dataKey="time"
        stroke="#94a3b8"
        fontSize={11}
        tickLine={false}
        axisLine={false}
        interval={chartFilter === 'month' ? 4 : chartFilter === 'today' ? 'preserveStartEnd' : 0}
        minTickGap={chartFilter === 'month' ? 0 : 16}
      />
      <YAxis
        stroke="#94a3b8"
        fontSize={11}
        tickLine={false}
        axisLine={false}
        domain={chartYDomain}
        allowDecimals={false}
      />
      <Tooltip
        cursor={{ stroke: 'var(--dash-chart-cursor)', strokeDasharray: '4 4', strokeWidth: 1.5 }}
        content={({ active, payload, label }) => {
          const row = payload?.[0]?.payload;
          if (!active || !row) return null;
          const series = [
            { key: 'minor', label: 'Minor', color: '#10b981', visible: showMinor },
            { key: 'serious', label: 'Serious', color: '#f59e0b', visible: showSerious },
            { key: 'major', label: 'Major', color: '#ef4444', visible: showMajor }
          ].filter(item => item.visible);
          const total = series.reduce((sum, item) => sum + (Number(row[item.key]) || 0), 0);

          return (
            <div className="dash-trend-tooltip" role="tooltip">
              <div className="dash-trend-tooltip-heading">
                <span>{label}</span>
                <strong>{total}</strong>
              </div>
              <div className="dash-trend-tooltip-total-label">Total incidents</div>
              <div className="dash-trend-tooltip-series">
                {series.map(item => (
                  <div className="dash-trend-tooltip-row" key={item.key}>
                    <span className="dash-trend-tooltip-label">
                      <i style={{ '--series-color': item.color }} />
                      {item.label}
                    </span>
                    <strong>{Number(row[item.key]) || 0}</strong>
                  </div>
                ))}
              </div>
            </div>
          );
        }}
      />
      {showMinor && (
        <Area
          type="monotone"
          dataKey="minor"
          name="Minor"
          stroke="#10b981"
          strokeWidth={2.4}
          fillOpacity={1}
          fill="url(#minorGrad)"
          dot={createTrendPoint('#10b981')}
          activeDot={{ r: 6, stroke: 'var(--dash-active-point-stroke)', strokeWidth: 2 }}
        />
      )}
      {showSerious && (
        <Area
          type="monotone"
          dataKey="serious"
          name="Serious"
          stroke="#f59e0b"
          strokeWidth={2.4}
          fillOpacity={1}
          fill="url(#seriousGrad)"
          dot={createTrendPoint('#f59e0b')}
          activeDot={{ r: 6, stroke: 'var(--dash-active-point-stroke)', strokeWidth: 2 }}
        />
      )}
      {showMajor && (
        <Area
          type="monotone"
          dataKey="major"
          name="Major"
          stroke="#ef4444"
          strokeWidth={2.4}
          fillOpacity={1}
          fill="url(#majorGrad)"
          dot={createTrendPoint('#ef4444')}
          activeDot={{ r: 6, stroke: 'var(--dash-active-point-stroke)', strokeWidth: 2 }}
        />
      )}
    </AreaChart>
  </ResponsiveContainer>
);
