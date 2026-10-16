import { useEffect, useRef, useState } from 'react';
import { Check, LoaderCircle, SpellCheck, X } from 'lucide-react';

const API_URL = (import.meta.env.VITE_LANGUAGETOOL_API_URL || '').trim();

export const LanguageToolTextarea = ({ value, onChange, style, rows, placeholder, className }) => {
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState(API_URL ? (value.trim() ? 'waiting' : 'idle') : 'unconfigured');
  const [errorMessage, setErrorMessage] = useState('');
  const requestRef = useRef(null);

  useEffect(() => {
    if (!API_URL || !value.trim()) return undefined;
    let isCurrent = true;
    const controller = new AbortController();
    requestRef.current?.abort();
    requestRef.current = controller;

    const timer = window.setTimeout(async () => {
      setStatus('checking');
      try {
        const body = new URLSearchParams({ text: value, language: 'en-US' });
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: controller.signal,
          credentials: 'omit'
        });
        if (!response.ok) throw new Error(`LanguageTool returned HTTP ${response.status}.`);
        const result = await response.json();
        if (!Array.isArray(result.matches)) throw new Error('LanguageTool returned an invalid response.');
        if (!isCurrent) return;
        setMatches(result.matches);
        setStatus('complete');
      } catch (requestError) {
        if (!isCurrent || requestError.name === 'AbortError') return;
        setErrorMessage(requestError.message || 'Unable to check text with LanguageTool.');
        setStatus('error');
      }
    }, 700);

    return () => {
      isCurrent = false;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const handleChange = (nextValue) => {
    setMatches([]);
    setErrorMessage('');
    setStatus(!API_URL ? 'unconfigured' : (nextValue.trim() ? 'waiting' : 'idle'));
    onChange(nextValue);
  };

  const applySuggestion = (match, replacement) => {
    const start = match.offset;
    const end = start + match.length;
    handleChange(`${value.slice(0, start)}${replacement}${value.slice(end)}`);
  };

  return (
    <div>
      <textarea
        rows={rows}
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        placeholder={placeholder}
        className={className}
        style={style}
      />
      <div
        aria-live="polite"
        style={{
          marginTop: '5px',
          color: status === 'error' ? '#b91c1c' : 'var(--text-secondary, #64748b)',
          fontSize: '10px'
        }}
      >
        {!API_URL && 'Grammar check is unavailable. Configure a trusted, self-hosted LanguageTool server.'}
        {API_URL && (status === 'waiting' || status === 'checking') && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <LoaderCircle size={12} className="lt-spinner" />
            Checking grammar…
          </span>
        )}
        {API_URL && status === 'complete' && matches.length === 0 && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d' }}>
            <Check size={12} />
            No grammar or spelling suggestions.
          </span>
        )}
        {status === 'error' && `Grammar check failed: ${errorMessage}`}
      </div>
      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '6px' }}>
          {matches.map((match, index) => {
            const replacement = match.replacements?.[0]?.value;
            return (
              <div
                key={`${match.offset}-${match.length}-${match.rule?.id || index}`}
                style={{
                  padding: '7px 8px',
                  border: '1px solid var(--border-medium, #e2e8f0)',
                  borderRadius: '6px',
                  background: 'var(--bg-surface-elevated, #f8fafc)',
                  color: 'var(--text-primary, #0f172a)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ fontSize: '10px', lineHeight: 1.4 }}>
                    <SpellCheck size={12} style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} />
                    {match.message}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMatches((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    aria-label="Dismiss suggestion"
                    style={{ border: 0, background: 'transparent', color: 'inherit', cursor: 'pointer', padding: 0, flexShrink: 0 }}
                  >
                    <X size={12} />
                  </button>
                </div>
                {replacement && (
                  <button
                    type="button"
                    onClick={() => applySuggestion(match, replacement)}
                    style={{
                      marginTop: '4px',
                      border: 0,
                      padding: 0,
                      background: 'transparent',
                      color: 'var(--brand-blue, #1d4ed8)',
                      fontSize: '10px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Replace with “{replacement}”
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes lt-spin { to { transform: rotate(360deg); } }
        .lt-spinner { animation: lt-spin 0.8s linear infinite; }
        @media (prefers-reduced-motion: reduce) {
          .lt-spinner { animation: none; }
        }
      `}</style>
    </div>
  );
};
