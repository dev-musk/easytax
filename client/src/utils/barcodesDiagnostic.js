// ============================================
// FILE: client/src/utils/barcodesDiagnostic.js
// Run this to diagnose barcode scanner issues
// ============================================

export const runBarcodeDiagnostics = async () => {
  console.log("🔍 Starting Barcode Scanner Diagnostics...\n");

  // Check 1: Camera API Support
  console.log("✅ Check 1: Camera API Support");
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log("   ✓ getUserMedia is supported");
  } else {
    console.error("   ✗ getUserMedia is NOT supported");
    return false;
  }

  // Check 2: Permissions API
  console.log("\n✅ Check 2: Permissions API");
  if (navigator.permissions && navigator.permissions.query) {
    console.log("   ✓ Permissions API is supported");
    try {
      const result = await navigator.permissions.query({ name: "camera" });
      console.log(`   Camera permission state: ${result.state}`);
    } catch (error) {
      console.warn(`   ⚠ Could not query permissions: ${error.message}`);
    }
  } else {
    console.warn("   ⚠ Permissions API is NOT supported (some browsers don't support it)");
  }

  // Check 3: Quagga Library
  console.log("\n✅ Check 3: Quagga2 Library");
  if (window.Quagga) {
    console.log("   ✓ Quagga is available globally");
    console.log(`   Version info:`, window.Quagga.version);
  } else {
    console.warn("   ⚠ Quagga is NOT loaded yet");
    console.log("   Attempting to load from CDN...");

    const loaded = await new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.12.1/dist/quagga.min.js";
      script.async = true;
      script.onload = () => {
        console.log("   ✓ Quagga loaded from CDN");
        resolve(true);
      };
      script.onerror = () => {
        console.error("   ✗ Failed to load Quagga from CDN");
        resolve(false);
      };
      document.head.appendChild(script);
    });

    if (!loaded) {
      return false;
    }
  }

  // Check 4: Public Files
  console.log("\n✅ Check 4: Public Folder Files");
  try {
    const response = await fetch("/quagga.min.js", { method: "HEAD" });
    if (response.ok) {
      console.log("   ✓ quagga.min.js exists in public folder");
    } else {
      console.warn("   ⚠ quagga.min.js not found (HTTP " + response.status + ")");
      console.log("   This is OK - library will load from CDN fallback");
    }
  } catch (error) {
    console.warn("   ⚠ Could not check public folder:", error.message);
  }

  // Check 5: API Endpoint
  console.log("\n✅ Check 5: Barcode Lookup API");
  try {
    const response = await fetch("/api/ocr/lookup?code=8471", {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (response.ok) {
      console.log("   ✓ API endpoint is working");
      const data = await response.json();
      console.log(`   Sample response:`, data);
    } else {
      console.warn(`   ⚠ API returned status ${response.status}`);
    }
  } catch (error) {
    console.error(`   ✗ API Error: ${error.message}`);
  }

  // Check 6: Browser Capabilities
  console.log("\n✅ Check 6: Browser Capabilities");
  console.log(`   User Agent: ${navigator.userAgent.substring(0, 50)}...`);
  console.log(`   Vibration API: ${navigator.vibrate ? "✓ Supported" : "✗ Not supported"}`);
  console.log(`   Hardware Concurrency: ${navigator.hardwareConcurrency || "Unknown"}`);

  // Check 7: Local Storage
  console.log("\n✅ Check 7: Storage & Token");
  const token = localStorage.getItem("token");
  console.log(`   Auth Token: ${token ? "✓ Present" : "✗ Missing"}`);

  console.log("\n✅ Diagnostics Complete!\n");
  console.log("If scanner still doesn't work:");
  console.log("1. Check console errors above");
  console.log("2. Ensure camera permissions are granted");
  console.log("3. Try refreshing the page");
  console.log("4. Check that /public/quagga.min.js exists");

  return true;
};

// Usage in component:
// import { runBarcodeDiagnostics } from "../utils/barcodesDiagnostic";
// Then in useEffect or button click:
// const result = await runBarcodeDiagnostics();