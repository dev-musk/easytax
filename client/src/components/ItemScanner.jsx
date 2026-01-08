// ============================================
// FILE: client/src/components/ItemScanner.jsx
// ✅ FEATURE #30: ITEM SCANNING/OCR
// ============================================

import { useState, useRef, useEffect } from "react";
import { Camera, X, Search, Package } from "lucide-react";
import api from "../utils/api";

export default function ItemScanner({ onItemScanned, onClose }) {
  const [scanning, setScanning] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Check camera permission on mount
  useEffect(() => {
    checkCameraPermission();
    return () => {
      stopCamera();
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: "camera" });
      setCameraPermission(result.state);
    } catch (error) {
      console.log("Permission API not supported");
      setCameraPermission("prompt");
    }
  };

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Use back camera on mobile
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setScanning(true);
      setCameraPermission("granted");
    } catch (error) {
      console.error("Camera access error:", error);
      setError(
        "Camera access denied. Please enable camera permission in your browser settings."
      );
      setCameraPermission("denied");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScanning(false);
  };

  const captureImage = () => {
    if (!videoRef.current) return;

    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0);

    // Convert to base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    // In production, send to OCR API
    // For now, show success and allow manual entry
    alert(
      "Image captured! OCR processing would happen here. Please enter barcode manually for now."
    );
    stopCamera();
  };

  const handleManualLookup = async () => {
    if (!manualCode.trim()) {
      setError("Please enter a barcode/SKU");
      return;
    }

    try {
      setError(null);

      // ✅ FEATURE #30: Use OCR lookup API
      const response = await api.get("/api/ocr/lookup", {
        params: { code: manualCode.trim() },
      });

      if (response.data.found) {
        const product = response.data.product;
        onItemScanned(product);
        onClose();
      } else {
        setError(
          response.data.message || `No item found with code: ${manualCode}`
        );
      }
    } catch (error) {
      console.error("Lookup error:", error);
      setError("Failed to find item. Try manual entry instead.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Scan Item</h3>
              <p className="text-sm text-gray-600">
                Use camera or enter barcode manually
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">
                Camera access is blocked. Please enable camera permission in
                your browser settings to use the scanner. You can still enter
                barcodes manually below.
              </p>
            </div>
          )}

          {/* Camera View */}
          {scanning ? (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="border-2 border-blue-500 w-48 h-32 rounded-lg"></div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={captureImage}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
                >
                  Capture & Scan
                </button>
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startCamera}
              disabled={cameraPermission === "denied"}
              className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Start Camera to Scan Barcode
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Position the barcode within the frame
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
              Barcode / SKU / Item Code
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
                  if (e.key === "Enter") {
                    handleManualLookup();
                  }
                }}
                placeholder="Enter barcode or item code"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleManualLookup}
                disabled={!manualCode.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 font-medium transition-colors flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                Search
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900 mb-1">
                  How to use:
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>
                    • Click "Start Camera" to scan barcodes using your device
                    camera
                  </li>
                  <li>
                    • Or enter the barcode/SKU manually and click "Search"
                  </li>
                  <li>
                    • Item details will be automatically filled in the form
                  </li>
                  <li>
                    • Note: OCR feature requires camera permission and works
                    best in good lighting
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Coming Soon Badge */}
          <div className="text-center">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              🚀 AI-powered OCR coming soon with Google Vision API
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
