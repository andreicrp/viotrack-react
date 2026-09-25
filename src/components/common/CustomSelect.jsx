import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import './CustomSelect.css';

/**
 * Premium Custom Dropdown Component
 * Replaces native <select> elements across tables, filters, and forms.
 */
export const CustomSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select option...',
  className = '',
  disabled = false,
  icon: Icon = null,
  name,
  id,
  style = {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize options array: supports strings or { value, label, icon }
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value !== undefined ? String(opt.value) : '',
        label: opt.label !== undefined ? String(opt.label) : String(opt.value || ''),
        icon: opt.icon || null,
        badge: opt.badge || null,
        disabled: !!opt.disabled
      };
    }
    return {
      value: String(opt),
      label: String(opt),
      icon: null,
      badge: null,
      disabled: false
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => String(opt.value) === String(value)
  );

  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  const [menuAlign, setMenuAlign] = useState('left');

  // Handle outside clicks and dynamic alignment calculation
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      
      // Auto-detect if menu should align to the right to avoid edge overflow
      if (rect.right + 70 > viewportWidth || rect.left > viewportWidth * 0.55) {
        setMenuAlign('right');
      } else {
        setMenuAlign('left');
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleSelect = (opt) => {
    if (opt.disabled) return;
    setIsOpen(false);
    if (onChange) {
      // Create synthetic event for compatibility with standard form handlers
      const syntheticEvent = {
        target: {
          name: name || id || '',
          value: opt.value
        }
      };
      onChange(syntheticEvent);
    }
  };

  return (
    <div
      className={`custom-select-root ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'is-open' : ''}`}
      ref={dropdownRef}
      style={style}
    >
      <button
        type="button"
        id={id}
        className={`custom-select-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <div className="custom-select-label-wrap">
          {Icon && <Icon size={14} className="custom-select-prefix-icon" />}
          {selectedOption?.icon && (
            <selectedOption.icon size={14} className="custom-select-prefix-icon" />
          )}
          <span className={`custom-select-label ${!selectedOption ? 'is-placeholder' : ''}`}>
            {displayLabel}
          </span>
        </div>

        <ChevronDown
          size={14}
          strokeWidth={2.2}
          className={`custom-select-chevron ${isOpen ? 'rotate' : ''}`}
        />
      </button>

      {isOpen && (
        <div className={`custom-select-menu align-${menuAlign}`} role="listbox">
          <div className="custom-select-options-list">
            {normalizedOptions.length === 0 ? (
              <div className="custom-select-empty">No options available</div>
            ) : (
              normalizedOptions.map((opt, idx) => {
                const isSelected = String(opt.value) === String(value);
                const OptIcon = opt.icon;

                return (
                  <button
                    key={`${opt.value}-${idx}`}
                    type="button"
                    className={`custom-select-option ${isSelected ? 'selected' : ''} ${opt.disabled ? 'opt-disabled' : ''}`}
                    onClick={() => handleSelect(opt)}
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                  >
                    <div className="custom-select-option-left">
                      {OptIcon && <OptIcon size={14} className="custom-select-opt-icon" />}
                      <span className="custom-select-option-text">{opt.label}</span>
                      {opt.badge && <span className="custom-select-badge">{opt.badge}</span>}
                    </div>

                    {isSelected && (
                      <Check size={14} strokeWidth={2.4} className="custom-select-check-icon" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
