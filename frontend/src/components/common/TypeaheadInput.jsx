import { useState, useEffect, useRef } from 'react';

export default function TypeaheadInput({
  placeholder = 'Search...',
  value = '',
  onChange,
  onSearch,
  fetchSuggestions,
  className = '',
  style = {}
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch suggestions dynamically as query changes
  useEffect(() => {
    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const list = await fetchSuggestions(value);
        setSuggestions(list || []);
      } catch (err) {
        console.error('Typeahead fetch error:', err);
      } finally {
        setLoading(false);
      }
    }, 250); // Debounce API requests

    return () => clearTimeout(delayDebounce);
  }, [value, fetchSuggestions]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault();
        selectSuggestion(suggestions[activeIndex]);
      } else if (onSearch) {
        e.preventDefault();
        onSearch(value);
        setShowDropdown(false);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const selectSuggestion = (item) => {
    const stringVal = typeof item === 'object' ? item.value : item;
    onChange(stringVal);
    setShowDropdown(false);
    if (onSearch) {
      onSearch(stringVal);
    }
  };

  return (
    <div 
      className={`search-wrapper ${className}`} 
      ref={containerRef}
      style={{ position: 'relative', display: 'inline-block', ...style }}
    >
      <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', zIndex: 10 }}></i>
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setShowDropdown(true)}
        onKeyDown={handleKeyDown}
        style={{ paddingLeft: '34px', width: '100%' }}
      />

      {showDropdown && (suggestions.length > 0 || loading) && (
        <ul 
          className="typeahead-dropdown"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: '4px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            boxShadow: 'var(--shadow-card)',
            listStyle: 'none',
            padding: '4px 0',
            margin: 0,
            maxHeight: '220px',
            overflowY: 'auto',
            zIndex: 1050
          }}
        >
          {loading && (
            <li className="text-muted text-center py-2" style={{ fontSize: '12.5px' }}>
              <i className="fa-solid fa-circle-notch fa-spin me-2"></i> Loading suggestions...
            </li>
          )}
          {!loading && suggestions.map((item, idx) => {
            const label = typeof item === 'object' ? item.label : item;
            const subLabel = typeof item === 'object' ? item.subLabel : null;
            const isHovered = activeIndex === idx;

            return (
              <li
                key={idx}
                onClick={() => selectSuggestion(item)}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: '8px 14px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  background: isHovered ? 'var(--primary)' : 'transparent',
                  color: isHovered ? '#fff' : 'var(--text-primary)',
                  display: 'flex',
                  flexDirection: 'column',
                  borderBottom: idx < suggestions.length - 1 ? '1px solid var(--border-color)' : 'none'
                }}
              >
                <span className="fw-semibold">{label}</span>
                {subLabel && (
                  <small 
                    style={{ 
                      fontSize: '11px', 
                      color: isHovered ? 'rgba(255,255,255,0.7)' : 'var(--text-secondary)',
                      marginTop: '2px'
                    }}
                  >
                    {subLabel}
                  </small>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
