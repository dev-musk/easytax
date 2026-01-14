// ============================================
// FILE: client/src/components/HSNSearch.jsx
// ============================================

import { useState, useEffect, useRef } from 'react';
import { Search, Package, X, TrendingUp } from 'lucide-react';
import api from '../utils/api';

export default function HSNSearch({ 
  value, 
  onChange, 
  itemType = 'PRODUCT',
  onSelect,
  required = false,
  disabled = false,
  placeholder
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Detect type based on itemType prop
  const hsnType = itemType === 'SERVICE' ? 'SERVICES' : 'GOODS';

  // Load popular HSN codes on mount
  useEffect(() => {
    if (!searchTerm && showDropdown) {
      loadPopularCodes();
    }
  }, [showDropdown]);

  // Search HSN codes when user types
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchTerm.trim().length > 0) {
        searchHSN();
      } else if (showDropdown) {
        loadPopularCodes();
      }
    }, 300); // Debounce search

    return () => clearTimeout(delaySearch);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPopularCodes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/hsn/search', {
        params: { type: hsnType, limit: 10 }
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error loading popular HSN codes:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const searchHSN = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/hsn/search', {
        params: { 
          q: searchTerm,
          type: hsnType,
          limit: 20
        }
      });
      setResults(response.data);
    } catch (error) {
      console.error('Error searching HSN:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (hsn) => {
    onChange(hsn.code);
    setSearchTerm('');
    setShowDropdown(false);
    
    // Callback with full HSN data (code, description, GST rate)
    if (onSelect) {
      onSelect(hsn);
    }
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearInput = () => {
    setSearchTerm('');
    onChange('');
    setManualMode(false);
    inputRef.current?.focus();
  };

  // Manual entry mode - direct typing
  const handleManualEntry = (value) => {
    onChange(value.toUpperCase());
    setSearchTerm('');
    setShowDropdown(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Mode Toggle Buttons */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => {
            setManualMode(false);
            setSearchTerm('');
            setShowDropdown(false);
          }}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
            !manualMode
              ? 'bg-blue-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          🔍 Search from Database
        </button>
        <button
          type="button"
          onClick={() => {
            setManualMode(true);
            setShowDropdown(false);
            setSearchTerm('');
            inputRef.current?.focus();
          }}
          className={`flex-1 px-3 py-2 text-xs font-medium rounded-lg transition-all ${
            manualMode
              ? 'bg-green-500 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          ✏️ Manual Entry
        </button>
      </div>

      {/* Search Input */}
      <div className="relative">
        {manualMode ? (
          // Manual Entry Mode
          <div className="space-y-2">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => handleManualEntry(e.target.value)}
                placeholder={placeholder || "Enter HSN/SAC code manually..."}
                className="w-full pl-10 pr-10 py-3 border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50 font-mono text-lg"
                disabled={disabled}
                required={required && !value}
                maxLength="8"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500">
                ✏️
              </div>
              {value && (
                <button
                  type="button"
                  onClick={clearInput}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                💡 <strong>Manual Mode:</strong> Type the HSN/SAC code directly. Example: 8471, 847130, 9983
              </p>
            </div>
          </div>
        ) : (
          // Search/Autocomplete Mode
          <>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
            
            {/* Show value when not searching */}
            {!showDropdown && value ? (
              <div className="w-full pl-10 pr-10 py-3 border-2 border-blue-300 rounded-lg bg-blue-50 flex items-center justify-between">
                <span className="font-mono text-lg font-semibold text-blue-700">{value}</span>
                <button
                  type="button"
                  onClick={clearInput}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder || "Search by HSN/SAC code or product name..."}
                className="w-full pl-10 pr-10 py-3 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-base"
                disabled={disabled}
                required={required && !value}
              />
            )}
            
            {loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dropdown Results - Only in Search Mode */}
      {!manualMode && showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-blue-50 border-b border-blue-200 px-3 py-2">
            <p className="text-xs font-semibold text-blue-900">
              {searchTerm ? `Search Results` : `Popular ${hsnType === 'SERVICES' ? 'SAC' : 'HSN'} Codes`}
            </p>
          </div>

          {/* Results */}
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500">
              <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">
                {searchTerm ? 'No HSN codes found' : 'No HSN codes available'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchTerm ? 'Try a different search term' : 'Import HSN master from Settings'}
              </p>
            </div>
          ) : (
            <ul>
              {results.map((hsn, index) => (
                <li key={hsn._id || hsn.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(hsn)}
                    className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                      index === selectedIndex ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* HSN Code */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-blue-600">
                            {hsn.code}
                          </span>
                          <span className="text-xs text-gray-500">
                            {hsn.type === 'SERVICES' ? 'SAC' : 'HSN'}
                          </span>
                          {hsn.usageCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-green-600">
                              <TrendingUp className="w-3 h-3" />
                              {hsn.usageCount}
                            </span>
                          )}
                        </div>
                        
                        {/* Description */}
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {hsn.description}
                        </p>
                      </div>
                      
                      {/* GST Rate Badge */}
                      <div className="flex-shrink-0">
                        <span className="inline-block px-2 py-1 text-xs font-semibold bg-purple-100 text-purple-700 rounded">
                          {hsn.defaultGstRate}% GST
                        </span>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer Hint */}
          {results.length > 0 && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2 text-xs text-gray-600">
              💡 Use ↑↓ arrows to navigate, Enter to select
            </div>
          )}
        </div>
      )}
    </div>
  );
}