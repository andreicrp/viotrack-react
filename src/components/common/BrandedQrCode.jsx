import React from 'react';

export const BrandedQrCode = ({ src, alt, size, style }) => {
  const backingSize = '23%';

  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        flexShrink: 0,
        ...style
      }}
    >
      <img src={src} alt={alt} style={{ display: 'block', width: '100%', height: '100%' }} />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: backingSize,
          height: backingSize,
          transform: 'translate(-50%, -50%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '5px',
          background: '#ffffff',
          boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.08)'
        }}
      >
        <img
          src="/images/viotrack-qr-logo.png"
          alt=""
          style={{ display: 'block', width: '78%', height: '78%', objectFit: 'contain' }}
        />
      </span>
    </div>
  );
};
