#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync } from 'fs';

interface LintResult {
  filePath: string;
  messages: Array<{
    ruleId: string;
    severity: number;
    message: string;
    line: number;
    column: number;
  }>;
  errorCount: number;
  warningCount: number;
}

interface TestResult {
  numTotalTests: number;
  numPassedTests: number;
  numFailedTests: number;
  numPendingTests: number;
  success: boolean;
}

interface CoverageResult {
  total: {
    lines: { pct: number };
    statements: { pct: number };
    functions: { pct: number };
    branches: { pct: number };
  };
}

interface GlobalReport {
  timestamp: string;
  project: string;
  lint: {
    totalFiles: number;
    totalErrors: number;
    totalWarnings: number;
    passed: boolean;
  };
  tests: {
    unit: TestResult | null;
    bdd: TestResult | null;
    e2e: TestResult | null;
  };
  coverage: {
    lines: number;
    statements: number;
    functions: number;
    branches: number;
    passed: boolean;
  };
  wiring: {
    checked: boolean;
    passed: boolean;
    issues: string[];
  };
  overall: {
    passed: boolean;
    score: number;
  };
}

function readJsonFile<T>(path: string): T | null {
  try {
    if (!existsSync(path)) {
      console.warn(`⚠️  File not found: ${path}`);
      return null;
    }
    const content = readFileSync(path, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.warn(`⚠️  Failed to read ${path}:`, error);
    return null;
  }
}

function generateReport(): GlobalReport {
  console.log('📊 Generating global report...');

  // Read lint results
  const lintResults =
    readJsonFile<LintResult[]>('reports/lint/lint.json') || [];
  const lintSummary = {
    totalFiles: lintResults.length,
    totalErrors: lintResults.reduce(
      (sum, result) => sum + result.errorCount,
      0
    ),
    totalWarnings: lintResults.reduce(
      (sum, result) => sum + result.warningCount,
      0
    ),
    passed: lintResults.every((result) => result.errorCount === 0),
  };

  // Read test results
  const unitTests = readJsonFile<TestResult>('reports/tests/unit.json');
  const bddTests = readJsonFile<TestResult>('reports/tests/bdd.json');
  const e2eTests = readJsonFile<TestResult>('reports/tests/e2e.json');

  // Read coverage
  const coverageData = readJsonFile<CoverageResult>(
    'reports/coverage/coverage-summary.json'
  );
  const coverage = {
    lines: coverageData?.total.lines.pct || 0,
    statements: coverageData?.total.statements.pct || 0,
    functions: coverageData?.total.functions.pct || 0,
    branches: coverageData?.total.branches.pct || 0,
    passed: (coverageData?.total.lines.pct || 0) >= 80,
  };

  // Read wiring check
  const wiringData = readJsonFile<{ passed: boolean; issues: string[] }>(
    'reports/wiring/wiring.json'
  );
  const wiring = {
    checked: wiringData !== null,
    passed: wiringData?.passed || false,
    issues: wiringData?.issues || [],
  };

  // Calculate overall status
  const allTestsPassed = [unitTests, bddTests, e2eTests]
    .filter((test) => test !== null)
    .every((test) => test!.success);

  const overall = {
    passed:
      lintSummary.passed && allTestsPassed && coverage.passed && wiring.passed,
    score: Math.round(
      (lintSummary.passed ? 25 : 0) +
        (allTestsPassed ? 25 : 0) +
        (coverage.passed ? 25 : 0) +
        (wiring.passed ? 25 : 0)
    ),
  };

  const report: GlobalReport = {
    timestamp: new Date().toISOString(),
    project: 'Task Manager',
    lint: lintSummary,
    tests: {
      unit: unitTests,
      bdd: bddTests,
      e2e: e2eTests,
    },
    coverage,
    wiring,
    overall,
  };

  // Write JSON report
  writeFileSync('reports/global-report.json', JSON.stringify(report, null, 2));
  console.log('✅ JSON report written to reports/global-report.json');

  // Generate HTML report
  generateHtmlReport(report);
  console.log('✅ HTML report written to reports/global-report.html');

  return report;
}

function generateHtmlReport(report: GlobalReport): void {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Global Test Report - ${report.project}</title>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Roboto', sans-serif; 
            background: #f5f5f5; 
            color: #333; 
            line-height: 1.6;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: white; 
            padding: 30px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
            margin-bottom: 30px;
            text-align: center;
        }
        .status-badge { 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: 500; 
            margin-left: 10px;
        }
        .passed { background: #e8f5e8; color: #2e7d32; }
        .failed { background: #ffebee; color: #c62828; }
        .grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px;
        }
        .card { 
            background: white; 
            padding: 25px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .card h3 { 
            margin-bottom: 15px; 
            color: #1976d2; 
            font-size: 1.2em;
        }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 10px; 
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .metric:last-child { border-bottom: none; }
        .metric-value { font-weight: 500; }
        .progress-bar { 
            width: 100%; 
            height: 8px; 
            background: #eee; 
            border-radius: 4px; 
            overflow: hidden; 
            margin-top: 10px;
        }
        .progress-fill { 
            height: 100%; 
            background: linear-gradient(90deg, #4caf50, #8bc34a); 
            transition: width 0.3s ease;
        }
        .timestamp { 
            color: #666; 
            font-size: 0.9em; 
            margin-top: 20px;
        }
        .score-circle {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
            font-weight: bold;
            margin: 0 auto 20px;
            color: white;
        }
        .score-100 { background: #4caf50; }
        .score-75 { background: #ff9800; }
        .score-50 { background: #f44336; }
        .score-25 { background: #9e9e9e; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${report.project} - Global Test Report</h1>
            <div class="score-circle score-${report.overall.score >= 100 ? '100' : report.overall.score >= 75 ? '75' : report.overall.score >= 50 ? '50' : '25'}">
                ${report.overall.score}%
            </div>
            <span class="status-badge ${report.overall.passed ? 'passed' : 'failed'}">
                ${report.overall.passed ? '✅ PASSED' : '❌ FAILED'}
            </span>
            <div class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>🔍 Lint Results</h3>
                <div class="metric">
                    <span>Files Checked:</span>
                    <span class="metric-value">${report.lint.totalFiles}</span>
                </div>
                <div class="metric">
                    <span>Errors:</span>
                    <span class="metric-value" style="color: ${report.lint.totalErrors > 0 ? '#c62828' : '#2e7d32'}">${report.lint.totalErrors}</span>
                </div>
                <div class="metric">
                    <span>Warnings:</span>
                    <span class="metric-value" style="color: ${report.lint.totalWarnings > 0 ? '#f57c00' : '#2e7d32'}">${report.lint.totalWarnings}</span>
                </div>
                <div class="metric">
                    <span>Status:</span>
                    <span class="status-badge ${report.lint.passed ? 'passed' : 'failed'}">
                        ${report.lint.passed ? 'PASSED' : 'FAILED'}
                    </span>
                </div>
            </div>

            <div class="card">
                <h3>🧪 Test Results</h3>
                ${
                  report.tests.unit
                    ? `
                <div class="metric">
                    <span>Unit Tests:</span>
                    <span class="metric-value">${report.tests.unit.numPassedTests}/${report.tests.unit.numTotalTests}</span>
                </div>`
                    : '<div class="metric"><span>Unit Tests:</span><span class="metric-value">Not Run</span></div>'
                }
                
                ${
                  report.tests.bdd
                    ? `
                <div class="metric">
                    <span>BDD Tests:</span>
                    <span class="metric-value">${report.tests.bdd.numPassedTests}/${report.tests.bdd.numTotalTests}</span>
                </div>`
                    : '<div class="metric"><span>BDD Tests:</span><span class="metric-value">Not Run</span></div>'
                }
                
                ${
                  report.tests.e2e
                    ? `
                <div class="metric">
                    <span>E2E Tests:</span>
                    <span class="metric-value">${report.tests.e2e.numPassedTests}/${report.tests.e2e.numTotalTests}</span>
                </div>`
                    : '<div class="metric"><span>E2E Tests:</span><span class="metric-value">Not Run</span></div>'
                }
            </div>

            <div class="card">
                <h3>📊 Coverage</h3>
                <div class="metric">
                    <span>Lines:</span>
                    <span class="metric-value">${report.coverage.lines.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.coverage.lines}%"></div>
                </div>
                
                <div class="metric">
                    <span>Statements:</span>
                    <span class="metric-value">${report.coverage.statements.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.coverage.statements}%"></div>
                </div>
                
                <div class="metric">
                    <span>Functions:</span>
                    <span class="metric-value">${report.coverage.functions.toFixed(1)}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${report.coverage.functions}%"></div>
                </div>
                
                <div class="metric">
                    <span>Status:</span>
                    <span class="status-badge ${report.coverage.passed ? 'passed' : 'failed'}">
                        ${report.coverage.passed ? 'PASSED (≥80%)' : 'FAILED (<80%)'}
                    </span>
                </div>
            </div>

            <div class="card">
                <h3>🔌 Wiring Check</h3>
                <div class="metric">
                    <span>Checked:</span>
                    <span class="metric-value">${report.wiring.checked ? 'Yes' : 'No'}</span>
                </div>
                <div class="metric">
                    <span>Status:</span>
                    <span class="status-badge ${report.wiring.passed ? 'passed' : 'failed'}">
                        ${report.wiring.passed ? 'PASSED' : 'FAILED'}
                    </span>
                </div>
                ${
                  report.wiring.issues.length > 0
                    ? `
                <div style="margin-top: 15px;">
                    <strong>Issues:</strong>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${report.wiring.issues.map((issue) => `<li style="color: #c62828;">${issue}</li>`).join('')}
                    </ul>
                </div>`
                    : ''
                }
            </div>
        </div>
    </div>
</body>
</html>`;

  writeFileSync('reports/global-report.html', html);
}

// Run the report generation
generateReport();

export { generateReport };
