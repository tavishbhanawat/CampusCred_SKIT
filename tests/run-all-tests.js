/* ============================================================
   CampusCred — tests/run-all-tests.js
   ------------------------------------------------------------
   Node.js CLI Test Runner for Team Collaboration.
   Usage:
     node tests/run-all-tests.js
   ============================================================ */
const { execSync } = require('child_process');
const path = require('path');

console.log('\n============================================================');
console.log('  CampusCred (SKIT021) — Modular Test Suite Runner');
console.log('============================================================\n');

try {
  const result = execSync('node --test tests/*.test.js', {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'inherit'
  });
  console.log('\n============================================================');
  console.log('  [PASS] All Modular Test Suites Completed Successfully!  ');
  console.log('============================================================\n');
  process.exit(0);
} catch (err) {
  console.error('\n============================================================');
  console.error('  [FAIL] One or more test suites failed! Check logs above.  ');
  console.error('============================================================\n');
  process.exit(1);
}
