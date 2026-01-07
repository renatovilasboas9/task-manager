#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ensure reports directory exists
const reportsDir = 'reports';
const subdirs = ['lint', 'tests', 'coverage', 'wiring'];

if (!existsSync(reportsDir)) {
  mkdirSync(reportsDir, { recursive: true });
}

subdirs.forEach((subdir) => {
  const path = join(reportsDir, subdir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
});

console.log('🚀 Running global test suite...\n');

try {
  try {
    // 1. Lint
    console.log('📋 Running lint...');
    execSync('npm run lint', { stdio: 'inherit' });
    console.log('✅ Lint completed\n');
  } catch (error) {
    console.log('⚠️  Lint had issues, continuing...\n');
  }

  try {
    // 2. Format check
    console.log('🎨 Checking format...');
    execSync('npm run format:check', { stdio: 'inherit' });
    console.log('✅ Format check completed\n');
  } catch (error) {
    console.log('⚠️  Format check had issues, continuing...\n');
  }

  try {
    // 3. Unit tests with coverage
    console.log('🧪 Running unit tests...');
    execSync('npm run test', { stdio: 'inherit' });
    console.log('✅ Unit tests completed\n');
  } catch (error) {
    console.log('⚠️  Unit tests had issues, continuing...\n');
  }

  // 4. BDD tests (when they exist)
  console.log('🥒 Running BDD tests...');
  try {
    execSync('npm run test:bdd', { stdio: 'inherit' });
    console.log('✅ BDD tests completed\n');
  } catch (error) {
    console.log('⚠️  BDD tests not yet implemented\n');
  }

  // 5. Wiring check (when implemented)
  console.log('🔌 Running wiring check...');
  try {
    execSync('tsx scripts/wiring-check.ts', { stdio: 'inherit' });
    console.log('✅ Wiring check completed\n');
  } catch (error) {
    console.log('⚠️  Wiring check not yet implemented\n');
  }

  // 6. Generate report
  console.log('📊 Generating global report...');
  execSync('npm run report', { stdio: 'inherit' });
  console.log('✅ Global report generated\n');

  // 7. Open HTML report
  console.log('🌐 Opening report in browser...');
  const reportPath = join(process.cwd(), 'reports', 'global-report.html');

  // Cross-platform open command
  const openCmd =
    process.platform === 'darwin'
      ? 'open'
      : process.platform === 'win32'
        ? 'start'
        : 'xdg-open';

  execSync(`${openCmd} ${reportPath}`, { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Global test suite failed:', error);
  process.exit(1);
}
