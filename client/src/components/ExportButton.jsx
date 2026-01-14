// ============================================
// FILE: client/src/components/ExportButton.jsx
// Reusable Multi-Format Export Button
// ============================================

import { useState, useRef, useEffect } from 'react';
import { Download, ChevronDown, FileText, Table, FileSpreadsheet } from 'lucide-react';

export default function ExportButton({ 
  onExport, 
  data, 
  filename = 'export',
  disabled = false,
  className = '',
  size = 'default' // 'sm', 'default', 'lg'
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

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

  const handleExport = (format) => {
    setShowDropdown(false);
    if (onExport) {
      onExport(format, data, filename);
    }
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    default: 'px-4 py-2.5',
    lg: 'px-6 py-3 text-lg'
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    default: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        className={`
          flex items-center gap-2 bg-green-600 text-white rounded-lg
          hover:bg-green-700 transition-colors font-medium
          disabled:bg-gray-400 disabled:cursor-not-allowed
          ${sizeClasses[size]}
          ${className}
        `}
      >
        <Download className={iconSizes[size]} />
        <span>Export</span>
        <ChevronDown className={`${iconSizes[size]} transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && !disabled && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          <button
            onClick={() => handleExport('pdf')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4 text-red-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Export as PDF</p>
              <p className="text-xs text-gray-500">Portable document format</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('excel')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Export as Excel</p>
              <p className="text-xs text-gray-500">.xlsx spreadsheet</p>
            </div>
          </button>

          <button
            onClick={() => handleExport('csv')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
          >
            <Table className="w-4 h-4 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">Export as CSV</p>
              <p className="text-xs text-gray-500">Comma-separated values</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}