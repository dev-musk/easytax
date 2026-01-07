// ============================================
// FILE: client/src/components/InvoiceTemplateSettings.jsx
// ✅ FEATURE #20: Invoice Design Customization Component
// ============================================

import { useState } from "react";
import { X, Palette, Type, Layout, Frame, AlignLeft, Save } from "lucide-react";

const THEME_COLORS = {
  BLUE: {
    primary: "bg-blue-600",
    light: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-600",
    hex: "#2563eb",
  },
  PURPLE: {
    primary: "bg-purple-600",
    light: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-600",
    hex: "#9333ea",
  },
  GREEN: {
    primary: "bg-green-600",
    light: "bg-green-50",
    border: "border-green-500",
    text: "text-green-600",
    hex: "#16a34a",
  },
  ORANGE: {
    primary: "bg-orange-600",
    light: "bg-orange-50",
    border: "border-orange-500",
    text: "text-orange-600",
    hex: "#ea580c",
  },
  RED: {
    primary: "bg-red-600",
    light: "bg-red-50",
    border: "border-red-500",
    text: "text-red-600",
    hex: "#dc2626",
  },
  INDIGO: {
    primary: "bg-indigo-600",
    light: "bg-indigo-50",
    border: "border-indigo-500",
    text: "text-indigo-600",
    hex: "#4f46e5",
  },
};

export default function InvoiceTemplateSettings({
  initialSettings = {},
  onSave,
  onClose,
}) {
  const [settings, setSettings] = useState({
    fontFamily: initialSettings.fontFamily || "Roboto",
    headerStyle: initialSettings.headerStyle || "BOXED",
    borderStyle: initialSettings.borderStyle || "PARTIAL",
    themeColor: initialSettings.themeColor || "BLUE",
    textAlignment: initialSettings.textAlignment || "LEFT",
  });

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Palette className="w-6 h-6 text-blue-600" />
              Customize Invoice Design
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Personalize the appearance of your invoice
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Font Family */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Type className="w-5 h-5 text-blue-600" />
              Font Family
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {["Roboto", "Arial", "Times New Roman", "Inter", "Georgia"].map(
                (font) => (
                  <button
                    key={font}
                    type="button"
                    onClick={() =>
                      setSettings({ ...settings, fontFamily: font })
                    }
                    className={`px-4 py-3 border-2 rounded-lg text-left transition-all ${
                      settings.fontFamily === font
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    style={{ fontFamily: font }}
                  >
                    <div className="font-semibold text-gray-900">{font}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      The quick brown fox
                    </div>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Header Style */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Layout className="w-5 h-5 text-blue-600" />
              Header Style
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, headerStyle: "BOXED" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.headerStyle === "BOXED"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="bg-gray-200 border-2 border-gray-400 rounded p-2 mb-2">
                  <div className="h-2 bg-gray-400 rounded mb-1"></div>
                  <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Boxed Header
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Header with border and background
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, headerStyle: "PLAIN" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.headerStyle === "PLAIN"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="p-2 mb-2">
                  <div className="h-2 bg-gray-400 rounded mb-1"></div>
                  <div className="h-2 bg-gray-300 rounded w-3/4"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">
                  Plain Header
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Simple header without box
                </div>
              </button>
            </div>
          </div>

          {/* Border Style */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Frame className="w-5 h-5 text-blue-600" />
              Border Style
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, borderStyle: "FULL" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.borderStyle === "FULL"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="border-2 border-gray-400 rounded p-3 mb-2 bg-white">
                  <div className="h-1.5 bg-gray-300 rounded mb-1"></div>
                  <div className="h-1.5 bg-gray-200 rounded"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Full</div>
                <div className="text-xs text-gray-500 mt-1">
                  Complete border
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, borderStyle: "PARTIAL" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.borderStyle === "PARTIAL"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="border-t-2 border-b-2 border-gray-400 rounded p-3 mb-2 bg-white">
                  <div className="h-1.5 bg-gray-300 rounded mb-1"></div>
                  <div className="h-1.5 bg-gray-200 rounded"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Partial</div>
                <div className="text-xs text-gray-500 mt-1">
                  Top & bottom only
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, borderStyle: "NONE" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.borderStyle === "NONE"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="p-3 mb-2 bg-white">
                  <div className="h-1.5 bg-gray-300 rounded mb-1"></div>
                  <div className="h-1.5 bg-gray-200 rounded"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">None</div>
                <div className="text-xs text-gray-500 mt-1">Clean look</div>
              </button>
            </div>
          </div>

          {/* Theme Color */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Palette className="w-5 h-5 text-blue-600" />
              Theme Color
            </label>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {Object.entries(THEME_COLORS).map(([colorName, colorClasses]) => (
                <button
                  key={colorName}
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, themeColor: colorName })
                  }
                  className={`relative p-4 border-2 rounded-lg transition-all ${
                    settings.themeColor === colorName
                      ? "border-gray-900 shadow-lg scale-105"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div
                    className={`w-full h-12 ${colorClasses.primary} rounded mb-2`}
                  ></div>
                  <div className="text-xs font-medium text-gray-900 text-center">
                    {colorName}
                  </div>
                  {settings.themeColor === colorName && (
                    <div className="absolute -top-2 -right-2 bg-gray-900 text-white rounded-full p-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Text Alignment */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <AlignLeft className="w-5 h-5 text-blue-600" />
              Text Alignment
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, textAlignment: "LEFT" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.textAlignment === "LEFT"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-left mb-2">
                  <div className="h-1.5 bg-gray-400 rounded w-3/4 mb-1"></div>
                  <div className="h-1.5 bg-gray-300 rounded w-1/2"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Left</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, textAlignment: "CENTER" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.textAlignment === "CENTER"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-center mb-2">
                  <div className="h-1.5 bg-gray-400 rounded w-3/4 mb-1 mx-auto"></div>
                  <div className="h-1.5 bg-gray-300 rounded w-1/2 mx-auto"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Center</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, textAlignment: "RIGHT" })
                }
                className={`p-4 border-2 rounded-lg transition-all ${
                  settings.textAlignment === "RIGHT"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="text-right mb-2">
                  <div className="h-1.5 bg-gray-400 rounded w-3/4 mb-1 ml-auto"></div>
                  <div className="h-1.5 bg-gray-300 rounded w-1/2 ml-auto"></div>
                </div>
                <div className="text-sm font-medium text-gray-900">Right</div>
              </button>
            </div>
          </div>

          {/* Preview Note */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-sm text-blue-900">
              <strong>Note:</strong> These settings only affect the visual appearance
              of your invoice. Calculations, totals, and data remain unchanged.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Design
          </button>
        </div>
      </div>
    </div>
  );
}

// Export theme colors for use in InvoiceView
export { THEME_COLORS };