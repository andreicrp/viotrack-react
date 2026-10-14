import React from 'react';
import { Loader2, MapPin } from 'lucide-react';

export const ScannerLocationOverlay = ({ isCapturingLocation, locationStatus }) => {
  if (!isCapturingLocation) return null;

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '65vh', padding: '20px' }}>
      <div style={{ background: '#ffffff', borderRadius: '24px', padding: '48px 36px', boxShadow: '0 25px 60px -15px rgba(7, 52, 95, 0.2)', border: '1px solid #e2e8f0', textAlign: 'center', maxWidth: '440px', width: '100%' }}>
        <div style={{ width: '76px', height: '76px', margin: '0 auto 24px', background: 'linear-gradient(135deg, #07345f 0%, #0b192c 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(7, 52, 95, 0.3)', color: '#ffffff' }}>
          <Loader2 size={36} className="spinner" style={{ animation: 'spin 1.2s linear infinite' }} />
        </div>

        <h2 style={{ color: '#07345f', margin: '0 0 10px 0', fontSize: '22px', fontWeight: 800 }}>
          Capturing GPS Location...
        </h2>
        <p style={{ color: '#64748b', margin: '0 0 20px 0', fontSize: '14px', lineHeight: 1.5 }}>
          Acquiring device coordinates from Student QR Scan for disciplinary audit logging.
        </p>

        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#f0fdf4', color: '#15803d', fontSize: '13px', fontWeight: 600, border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <MapPin size={15} color="#16a34a" /> {locationStatus}
        </div>
      </div>
    </div>
  );
};
