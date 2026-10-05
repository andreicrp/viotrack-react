import { Search, X } from 'lucide-react';
import styles from './DataSearchField.module.css';

export const DataSearchField = ({
  value,
  onChange,
  onClear,
  placeholder,
  label,
  maxWidth = 420
}) => (
  <div className={styles.searchField} style={{ '--search-max-width': `${maxWidth}px` }}>
    <Search className={styles.searchIcon} size={16} aria-hidden="true" />
    <input
      className={styles.input}
      type="search"
      aria-label={label}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
    {value && (
      <button
        className={styles.clearButton}
        type="button"
        aria-label={`Clear ${label.toLowerCase()}`}
        onClick={onClear}
      >
        <X size={15} aria-hidden="true" />
      </button>
    )}
  </div>
);
