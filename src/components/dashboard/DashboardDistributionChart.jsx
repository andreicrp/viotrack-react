import React from 'react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip
} from 'recharts';

export const DashboardDistributionChart = ({
  violationDistribution,
  selectedPieSlice,
  hoveredPieSlice,
  setSelectedPieSlice,
  setHoveredPieSlice
}) => {
  const maxValue = Math.max(...violationDistribution.map(item => item.value), 1);

  return (
    <div className="dash-distribution-content">
      <div className="dash-distribution-chart-box">
        {selectedPieSlice && (
          <div className="dash-pie-center-label" title={selectedPieSlice.name}>
            <span className="dash-pie-center-value">{selectedPieSlice.value}</span>
            <span className="dash-pie-center-name">{selectedPieSlice.name}</span>
            <button
              type="button"
              className="dash-pie-center-clear"
              onClick={() => setSelectedPieSlice(null)}
              aria-label="Clear selection"
              title="Clear selection"
            >
              &#10005;
            </button>
          </div>
        )}
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={violationDistribution}
              cx="50%"
              cy="50%"
              outerRadius={92}
              innerRadius={50}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={false}
              onClick={(entry) => setSelectedPieSlice(previous => previous?.name === entry.name ? null : entry)}
              onMouseLeave={() => setHoveredPieSlice(null)}
              style={{ cursor: 'pointer' }}
            >
              {violationDistribution.map((entry, index) => (
                <Cell
                  key={`dist-cell-${index}`}
                  fill={entry.color}
                  stroke={selectedPieSlice?.name === entry.name || hoveredPieSlice === entry.name
                    ? 'var(--dash-donut-selected-stroke)'
                    : entry.color}
                  strokeWidth={selectedPieSlice?.name === entry.name || hoveredPieSlice === entry.name ? 3 : 0.5}
                  opacity={(selectedPieSlice || hoveredPieSlice)
                    && selectedPieSlice?.name !== entry.name
                    && hoveredPieSlice !== entry.name ? 0.35 : 1}
                  onMouseEnter={() => setHoveredPieSlice(entry.name)}
                />
              ))}
            </Pie>
            <Tooltip
              wrapperClassName="dash-pie-tooltip-wrap"
              wrapperStyle={{ pointerEvents: 'none', zIndex: 100 }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const item = payload[0].payload;
                const severityColor = item.severity === 'Major'
                  ? '#ef4444'
                  : item.severity === 'Serious'
                    ? '#f59e0b'
                    : '#10b981';
                return (
                  <div className="dash-pie-tooltip-box">
                    <div className="dash-pie-tooltip-title">
                      <span className="dash-pie-tooltip-dot" style={{ background: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <div className="dash-pie-tooltip-sub">
                      Incidents: <strong>{item.value}</strong> {item.value === 1 ? 'case' : 'cases'}
                    </div>
                    <div className="dash-pie-tooltip-severity">
                      Severity: <span style={{ color: severityColor }}>{item.severity}</span>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="dash-distribution-list">
        {violationDistribution.map((item, index) => {
          const barWidth = Math.max(12, Math.round((item.value / maxValue) * 100));
          return (
            <button
              key={`${item.name}-${index}`}
              type="button"
              className="dash-distribution-item"
              aria-pressed={selectedPieSlice?.name === item.name}
              style={{ '--dist-color': item.color }}
              onMouseEnter={() => setHoveredPieSlice(item.name)}
              onMouseLeave={() => setHoveredPieSlice(null)}
              onFocus={() => setHoveredPieSlice(item.name)}
              onBlur={() => setHoveredPieSlice(null)}
              onClick={() => setSelectedPieSlice(previous => previous?.name === item.name ? null : item)}
            >
              <span className="dash-dist-row-top">
                <span className="dash-dist-name-group">
                  <span className="dash-dist-dot" style={{ background: item.color }} />
                  <span className="dash-dist-name" title={item.name}>{item.name}</span>
                </span>
                <span className="dash-dist-stat">
                  {item.value} <span className="dash-dist-stat-label">{item.value === 1 ? 'incident' : 'incidents'}</span>
                </span>
              </span>
              <span className="dash-dist-bar-track">
                <span
                  className="dash-dist-bar-fill"
                  style={{
                    width: `${barWidth}%`,
                    background: item.color,
                    '--dist-color': item.color
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
