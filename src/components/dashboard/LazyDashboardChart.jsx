import React, { Suspense, useEffect, useRef, useState } from 'react';

export const LazyDashboardChart = ({ children, label, className }) => {
  const containerRef = useRef(null);
  const [isNearViewport, setIsNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined'
  );

  useEffect(() => {
    if (isNearViewport) return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setIsNearViewport(true);
      observer.disconnect();
    }, { rootMargin: '240px 0px' });

    observer.observe(container);
    return () => observer.disconnect();
  }, [isNearViewport]);

  return (
    <div ref={containerRef} className={className}>
      {isNearViewport ? (
        <Suspense fallback={<div className="dash-chart-lazy-placeholder" role="status">{label}</div>}>
          {children}
        </Suspense>
      ) : (
        <div className="dash-chart-lazy-placeholder" aria-hidden="true" />
      )}
    </div>
  );
};
