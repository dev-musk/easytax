// ============================================
// DIAGNOSTIC: Find which package is failing on Linux
// File: server/diagnose.js
// Run: node diagnose.js
// ============================================

console.log('🔍 Diagnosing package compatibility...\n');

const packages = [
  'pdf-poppler',
  'pdf2pic', 
  'tesseract.js',
  'puppeteer',
  'sharp',
  'archiver',
  'pdf-parse'
];

async function testPackage(packageName) {
  try {
    console.log(`Testing ${packageName}...`);
    const pkg = await import(packageName);
    console.log(`✅ ${packageName} - Loaded successfully`);
    return true;
  } catch (error) {
    console.log(`❌ ${packageName} - FAILED`);
    console.log(`   Error: ${error.message}`);
    console.log(`   This might be the culprit!\n`);
    return false;
  }
}

async function runDiagnostics() {
  console.log('Testing all packages...\n');
  
  for (const pkg of packages) {
    await testPackage(pkg);
    console.log('');
  }
  
  console.log('\n========================================');
  console.log('System Information:');
  console.log('========================================');
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Node Version: ${process.version}`);
  console.log(`Current Directory: ${process.cwd()}`);
  console.log('\n');
  
  // Check if we can find server.js
  try {
    const fs = await import('fs');
    if (fs.existsSync('./server.js')) {
      console.log('✅ server.js found in current directory');
      
      // Read server.js and look for problematic imports
      const content = fs.readFileSync('./server.js', 'utf-8');
      
      console.log('\n📋 Checking server.js imports...');
      const importMatches = content.match(/import .* from ['"].*['"]/g) || [];
      const requireMatches = content.match(/require\(['"].*['"]\)/g) || [];
      
      console.log('\nImports found:');
      [...importMatches, ...requireMatches].forEach(imp => {
        console.log(`  ${imp}`);
      });
    }
  } catch (e) {
    console.log('Could not read server.js');
  }
}

runDiagnostics().catch(err => {
  console.error('Diagnostic failed:', err);
});