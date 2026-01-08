// ============================================
// FILE: client/src/components/ItemScanner.jsx
// ✅ FIXED VERSION - Barcode Scanning with Quagga2
// ============================================

import { useState, useRef, useEffect } from "react";
import {
  Camera,
  X,
  Search,
  Package,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import api from "../utils/api";

export default function ItemScanner({ onItemScanned, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const [loading, setLoading] = useState(false);
  const [detectedCode, setDetectedCode] = useState(null);
  const scannerRef = useRef(null);

  const quaggaStartedRef = useRef(false);
  const quaggaRef = useRef(null);
  const scannerInitializedRef = useRef(false);

  // Check camera permission on mount
  useEffect(() => {
    loadQuagga();
    checkCameraPermission();
    return () => {
      cleanupQuagga();
    };
  }, []);

  // ✅ LOAD QUAGGA DYNAMICALLY
  const loadQuagga = async () => {
    try {
      if (window.Quagga) {
        quaggaRef.current = window.Quagga;
        console.log("✅ Quagga already loaded globally");
        return;
      }

      // Try to load from public folder
      const script = document.createElement("script");
      script.src = "/quagga.min.js";
      script.async = true;
      script.onload = () => {
        if (window.Quagga) {
          quaggaRef.current = window.Quagga;
          console.log("✅ Quagga loaded from public folder");
        }
      };
      script.onerror = () => {
        console.warn(
          "⚠️ Could not load Quagga from public folder, trying CDN..."
        );
        // Fallback to CDN
        const cdnScript = document.createElement("script");
        cdnScript.src =
          "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.12.1/dist/quagga.min.js";
        cdnScript.async = true;
        cdnScript.onload = () => {
          if (window.Quagga) {
            quaggaRef.current = window.Quagga;
            console.log("✅ Quagga loaded from CDN");
          }
        };
        cdnScript.onerror = () => {
          console.error("❌ Failed to load Quagga from both sources");
          setError(
            "Failed to load barcode scanner library. Please refresh and try again."
          );
        };
        document.head.appendChild(cdnScript);
      };
      document.head.appendChild(script);
    } catch (error) {
      console.error("Error loading Quagga:", error);
    }
  };

  const checkCameraPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const result = await navigator.permissions.query({ name: "camera" });
        setCameraPermission(result.state);

        // Listen for permission changes
        result.addEventListener("change", () => {
          setCameraPermission(result.state);
        });
      } else {
        setCameraPermission("prompt");
      }
    } catch (error) {
      console.log("Permission API not supported");
      setCameraPermission("prompt");
    }
  };

  const cleanupQuagga = () => {
    try {
      if (quaggaStartedRef.current && quaggaRef.current) {
        console.log("🧹 Cleaning up Quagga...");
        quaggaRef.current.offDetected(handleBarcodeDetected);
        quaggaRef.current.offProcessed();
        quaggaRef.current.stop();
        quaggaStartedRef.current = false;
        scannerInitializedRef.current = false;
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  const startCamera = async () => {
    if (!quaggaRef.current) {
      setError("Scanner not loaded");
      return;
    }

    if (scannerInitializedRef.current) return;
    scannerInitializedRef.current = true;

    setError(null);
    setDetectedCode(null);

    // 🔥 FORCE DOM RENDER FIRST
    setScanning(true);
    await new Promise((r) => setTimeout(r, 100));

    if (!scannerRef.current) {
      console.error("❌ Scanner DOM still missing");
      scannerInitializedRef.current = false;
      setError("Scanner container not ready. Refresh page.");
      return;
    }

    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        },

        decoder: {
          readers: ["ean_reader", "code_128_reader"],
        },
      },
      (err) => {
        if (err) {
          console.error(err);
          scannerInitializedRef.current = false;
          setError("Camera initialization failed");
          return;
        }

        Quagga.start();
        quaggaStartedRef.current = true;
        Quagga.onDetected(handleBarcodeDetected);
      }
    );
  };

  const handleBarcodeDetected = (result) => {
    if (!result || !result.codeResult || !result.codeResult.code) {
      return;
    }

    const code = result.codeResult.code;

    // Check confidence (optional - helps reduce false positives)
    if (result.codeResult.decodedCodes) {
      const avgConfidence =
        result.codeResult.decodedCodes.reduce(
          (sum, c) => sum + (c.error || 0),
          0
        ) / result.codeResult.decodedCodes.length;

      // Skip low confidence reads
      if (avgConfidence > 0.3) {
        console.log("⚠️ Low confidence detection, skipping:", avgConfidence);
        return;
      }
    }

    console.log("✅ Barcode detected:", code);
    setDetectedCode(code);

    // Vibrate if supported (mobile)
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    // Auto-lookup with debounce
    setTimeout(() => {
      lookupProduct(code);
    }, 500);
  };

  const stopCamera = () => {
    cleanupQuagga();
    setScanning(false);
    setDetectedCode(null);
    scannerInitializedRef.current = false;
  };

  const lookupProduct = async (code) => {
    if (!code || !code.trim()) {
      setError("Invalid barcode");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await api.get("/api/ocr/lookup", {
        params: { code: code.trim() },
      });

      if (response.data.found) {
        setSuccess(`✅ Found: ${response.data.product.name}`);

        // Stop camera
        stopCamera();

        // Callback to parent
        onItemScanned(response.data.product);

        // Close after 1 second
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        setError(response.data.message || `No item found with code: ${code}`);

        // Show suggestions if available
        if (response.data.suggestions && response.data.suggestions.length > 0) {
          console.log("💡 Suggestions:", response.data.suggestions);
        }
      }
    } catch (error) {
      console.error("Lookup error:", error);
      setError("Failed to find item. Try another barcode.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) {
      setError("Please enter a barcode/SKU");
      return;
    }

    await lookupProduct(manualCode);
    if (!error) {
      setManualCode("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                📦 Scan Product Barcode
              </h3>
              <p className="text-sm text-gray-600">
                Scan a barcode or enter code manually
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Camera Permission Status */}
          {cameraPermission === "denied" && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  🚫 Camera Access Blocked
                </p>
                <p className="text-xs text-red-700 mt-1">
                  Enable camera permission in your browser settings. Go to
                  Settings → Privacy & Security → Camera. You can still enter
                  barcodes manually below.
                </p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-green-900">{success}</p>
            </div>
          )}

          {/* Camera View */}
          {scanning ? (
            <div className="space-y-4">
              {/* Video Stream - CORRECT: This is where Quagga renders */}
              <div className="relative bg-black rounded-lg overflow-hidden">
                <div
                  ref={scannerRef}
                  id="scanner"
                  className="w-full"
                  style={{ minHeight: "320px" }}
                />

                {/* Overlay Guide */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative">
                    <div className="border-4 border-blue-500 w-64 h-40 rounded-lg bg-blue-500 bg-opacity-10">
                      {/* Corner markers */}
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400"></div>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white text-sm font-medium drop-shadow-lg bg-black bg-opacity-50 px-3 py-1 rounded">
                        Align barcode within frame
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detected Code Display */}
                {detectedCode && (
                  <div className="absolute bottom-4 left-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg text-center font-medium shadow-lg">
                    ✓ Detected: {detectedCode}
                  </div>
                )}

                {/* Loading Indicator */}
                {loading && (
                  <div className="absolute top-4 left-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-center font-medium shadow-lg">
                    🔍 Looking up product...
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="flex gap-3">
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium transition-colors flex-1"
                >
                  Stop Scanning
                </button>
              </div>

              {/* Status */}
              <p className="text-xs text-center text-gray-500">
                {loading
                  ? "🔍 Looking up product..."
                  : "🎯 Point camera at barcode"}
              </p>
            </div>
          ) : (
            <button
              onClick={startCamera}
              disabled={cameraPermission === "denied" || loading}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Start Camera to Scan Barcode
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Supports EAN, UPC, Code128, Code39, and more
              </p>
            </button>
          )}

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500 font-medium">
                OR ENTER MANUALLY
              </span>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Barcode / SKU / HSN Code
            </label>
            <div className="flex gap-3">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value);
                  setError(null);
                }}
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !loading) {
                    handleManualLookup();
                  }
                }}
                placeholder="e.g., 8471, EAN123456789, SKU-001"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleManualLookup}
                disabled={!manualCode.trim() || loading}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Search
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  ✨ How to use:
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>
                    ✓ Click "Start Camera" to scan barcodes from your products
                  </li>
                  <li>
                    ✓ Supported: EAN, UPC, Code128, Code39, Code93, Codabar
                  </li>
                  <li>
                    ✓ Or enter the barcode/SKU manually and click "Search"
                  </li>
                  <li>✓ Product details will auto-fill in the form</li>
                  <li>✓ Good lighting and steady hand recommended</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
