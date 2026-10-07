import React from 'react';

/**
 * Basic Skeleton Box / Text line
 */
export const Skeleton = ({
  width = '100%',
  height = '16px',
  borderRadius = '6px',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`skeleton-pulse ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style
      }}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton Table with header and animated placeholder rows
 */
export const SkeletonTable = ({ rows = 5, columns = 6, showHeader = true }) => {
  return (
    <div className="skeleton-table-wrapper" aria-busy="true" aria-label="Loading data">
      <div className="skeleton-table">
        {showHeader && (
          <div className="skeleton-table-head">
            <div className="skeleton-table-row header">
              {Array.from({ length: columns }).map((_, i) => (
                <div key={`th-${i}`} className="skeleton-table-cell">
                  <Skeleton height="14px" width={i === 0 ? '40%' : i === columns - 1 ? '50%' : '70%'} />
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="skeleton-table-body">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div key={`row-${rowIndex}`} className="skeleton-table-row">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <div key={`cell-${rowIndex}-${colIndex}`} className="skeleton-table-cell">
                  {colIndex === 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Skeleton width="32px" height="32px" borderRadius="50%" />
                      <div style={{ flex: 1 }}>
                        <Skeleton height="14px" width="85%" style={{ marginBottom: '4px' }} />
                        <Skeleton height="11px" width="55%" />
                      </div>
                    </div>
                  ) : colIndex === columns - 1 ? (
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <Skeleton width="28px" height="28px" borderRadius="6px" />
                      <Skeleton width="28px" height="28px" borderRadius="6px" />
                    </div>
                  ) : (
                    <Skeleton
                      height="13px"
                      width={
                        colIndex % 3 === 0
                          ? '60%'
                          : colIndex % 2 === 0
                          ? '80%'
                          : '45%'
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Skeleton Card Grid for grid views and dashboards
 */
export const SkeletonCardGrid = ({ cards = 6, columns = 3 }) => {
  return (
    <div
      className="skeleton-card-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(280px, 1fr))`,
        gap: '16px'
      }}
      aria-busy="true"
    >
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="skeleton-card-item">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
            <Skeleton width="44px" height="44px" borderRadius="10px" />
            <div style={{ flex: 1 }}>
              <Skeleton height="16px" width="70%" style={{ marginBottom: '6px' }} />
              <Skeleton height="12px" width="40%" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <Skeleton height="12px" width="100%" />
            <Skeleton height="12px" width="85%" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
            <Skeleton height="22px" width="60px" borderRadius="12px" />
            <Skeleton height="28px" width="80px" borderRadius="6px" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton List for Notification feed or Activity logs
 */
export const SkeletonList = ({ items = 4 }) => {
  return (
    <div className="skeleton-list-container" aria-busy="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="skeleton-list-item">
          <Skeleton width="40px" height="40px" borderRadius="10px" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <Skeleton height="15px" width="35%" />
              <Skeleton height="12px" width="15%" />
            </div>
            <Skeleton height="13px" width="90%" style={{ marginBottom: '4px' }} />
            <Skeleton height="11px" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};
