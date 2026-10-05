import styles from './DataTableFrame.module.css';

export const DataTableFrame = ({ children, className = '', label = 'Data table' }) => (
  <div
    className={`${styles.frame} ${className}`.trim()}
    role="region"
    aria-label={label}
    tabIndex={0}
  >
    {children}
  </div>
);
