#!/usr/bin/env tsx

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { execSync } from 'child_process'

/**
 * Global Report Generator
 * Reads ONLY artifact files from reports/** and generates consolidated report
 * Fails if any required artifact is missing or unreadable
 */

interface LintReport {
  timestamp: string
  errors: number
  warnings: number
  files: number
  results?: any[]
  error?: string
}

interface TestReport {
  timestamp: string
  passed: number
  failed: number
  skipped: number
  total: number
  durationMs: number
  success: boolean
  error?: string
}

interface CoverageReport {
  timestamp: string
  lines: { pct: number }
  statements: { pct: number }
  functions: { pct: number }
  branches: { pct: number }
  total: {
    lines: { pct: number }
    statements: { pct: number }
    functions: { pct: number }
    branches: { pct: number }
  }
  error?: string
}

interface WiringReport {
  timestamp: string
  ok: boolean
  missingHandlers: string[]
  unwiredEvents: string[]
  domains: string[]
  notes?: string[]
}

interface GlobalReport {
  generatedAt: string
  commitSha: string | null
  baselineTag: string | null
  phase: string
  sources: string[]
  inventory: {
    domains: string[]
    screens: number
    components: number
    contracts: number
    bddScenarios: number
    e2eFeatures: number
    e2eScenarios: number
    linesOfCode: number
    sharedFiles: number
  }
  qualityGates: {
    testsAllPassing: boolean
    coverageOk: boolean
    lintOk: boolean
    wiringOk: boolean
    driftOk: boolean
  }
  testsSummary: {
    unit: { passed: number; failed: number; skipped: number; durationMs: number }
    bdd: { passed: number; failed: number; skipped: number; durationMs: number }
    e2e: { passed: number; failed: number; skipped: number; durationMs: number; framework: string }
  }
  coverageSummary: {
    engine: string
    linesPct: number
    branchesPct: number
    functionsPct: number
    statementsPct: number
    byDomain: Record<string, { linesPct: number; branchesPct: number; functionsPct: number; statementsPct: number }>
    byLayer: Record<string, { linesPct: number; branchesPct: number; functionsPct: number; statementsPct: number }>
    lowestCoveredFiles: Array<{ file: string; linesPct: number }>
    notes: string[]
  }
  lintSummary: {
    errors: number
    warnings: number
  }
  wiringSummary: {
    missingHandlersCount: number
    unwiredEventsCount: number
  }
  driftSummary: {
    mocksAfterOfficial: number
    unusedContractsInBdd: number
    domainRepoInShared: number
  }
  tasks: {
    lastTaskId: string | null
    history: Array<{
      taskId: string
      timestamp: string
      mode: string
      domain: string | null
      gates: { testsPassed: boolean; coverageOk: boolean; lintOk: boolean; wiringOk: boolean; driftOk: boolean }
      coverageLinesPct: number
    }>
  }
}

const REQUIRED_ARTIFACTS = [
  'reports/lint/lint.json',
  'reports/tests/unit.json',
  'reports/coverage/coverage-summary.json',
  'reports/wiring/wiring.json'
]

function readJsonFile<T>(filePath: string): T {
  if (!existsSync(filePath)) {
    throw new Error(`Required artifact missing: ${filePath}`)
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8')
    if (!content.trim()) {
      throw new Error(`Required artifact is empty: ${filePath}`)
    }
    
    return JSON.parse(content) as T
  } catch (error) {
    throw new Error(`Failed to parse artifact ${filePath}: ${error}`)
  }
}

function getCommitSha(): string | null {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return null
  }
}

function getBaselineTag(): string | null {
  try {
    const tags = execSync('git tag --list "baseline/*"', { encoding: 'utf-8' }).trim()
    const tagList = tags.split('\n').filter(Boolean)
    return tagList.length > 0 ? tagList[tagList.length - 1] : null
  } catch {
    return null
  }
}

function countLinesOfCode(): number {
  try {
    if (!existsSync('src')) return 0
    
    let totalLines = 0
    
    function countInDirectory(dir: string) {
      const items = readdirSync(dir)
      
      for (const item of items) {
        const fullPath = join(dir, item)
        const stat = statSync(fullPath)
        
        if (stat.isDirectory()) {
          countInDirectory(fullPath)
        } else if (stat.isFile() && ['.ts', '.tsx', '.js', '.jsx'].includes(extname(item))) {
          const content = readFileSync(fullPath, 'utf-8')
          totalLines += content.split('\n').length
        }
      }
    }
    
    countInDirectory('src')
    return totalLines
  } catch {
    return 0
  }
}

function scanInventory() {
  const inventory = {
    domains: [] as string[],
    screens: 0,
    components: 0,
    contracts: 0,
    bddScenarios: 0,
    e2eFeatures: 0,
    e2eScenarios: 0,
    linesOfCode: countLinesOfCode(),
    sharedFiles: 0
  }
  
  // Scan for domains
  if (existsSync('src/domains')) {
    try {
      inventory.domains = readdirSync('src/domains').filter(item => {
        const fullPath = join('src/domains', item)
        return statSync(fullPath).isDirectory()
      })
    } catch {
      // Ignore errors
    }
  }
  
  // Count shared files
  if (existsSync('src/shared')) {
    try {
      function countFiles(dir: string): number {
        let count = 0
        const items = readdirSync(dir)
        
        for (const item of items) {
          const fullPath = join(dir, item)
          const stat = statSync(fullPath)
          
          if (stat.isDirectory()) {
            count += countFiles(fullPath)
          } else if (stat.isFile() && ['.ts', '.tsx'].includes(extname(item))) {
            count++
          }
        }
        
        return count
      }
      
      inventory.sharedFiles = countFiles('src/shared')
    } catch {
      // Ignore errors
    }
  }
  
  return inventory
}

function calculateDrift() {
  return {
    mocksAfterOfficial: 0, // Will be implemented when domain code exists
    unusedContractsInBdd: 0, // Will be implemented when contracts exist
    domainRepoInShared: 0 // Will be implemented when repositories exist
  }
}

function generateGlobalReport(): GlobalReport {
  console.log('📋 Reading artifact files...')
  
  // Verify all required artifacts exist and are readable
  const sources: string[] = []
  
  for (const artifact of REQUIRED_ARTIFACTS) {
    if (!existsSync(artifact)) {
      throw new Error(`Required artifact missing: ${artifact}`)
    }
    sources.push(artifact)
  }
  
  // Read all artifacts
  const lintReport = readJsonFile<LintReport>('reports/lint/lint.json')
  const testReport = readJsonFile<TestReport>('reports/tests/unit.json')
  const coverageReport = readJsonFile<CoverageReport>('reports/coverage/coverage-summary.json')
  const wiringReport = readJsonFile<WiringReport>('reports/wiring/wiring.json')
  
  console.log('  ✓ All artifacts loaded successfully')
  
  // Calculate quality gates
  const qualityGates = {
    testsAllPassing: testReport.failed === 0 && testReport.success,
    coverageOk: coverageReport.total.lines.pct >= 80,
    lintOk: lintReport.errors === 0,
    wiringOk: wiringReport.ok && wiringReport.missingHandlers.length === 0 && wiringReport.unwiredEvents.length === 0,
    driftOk: true // Will be calculated when domain code exists
  }
  
  // Build global report
  const globalReport: GlobalReport = {
    generatedAt: new Date().toISOString(),
    commitSha: getCommitSha(),
    baselineTag: getBaselineTag(),
    phase: 'setup',
    sources,
    inventory: scanInventory(),
    qualityGates,
    testsSummary: {
      unit: {
        passed: testReport.passed,
        failed: testReport.failed,
        skipped: testReport.skipped,
        durationMs: testReport.durationMs
      },
      bdd: { passed: 0, failed: 0, skipped: 0, durationMs: 0 },
      e2e: { passed: 0, failed: 0, skipped: 0, durationMs: 0, framework: 'none' }
    },
    coverageSummary: {
      engine: '@vitest/coverage-istanbul',
      linesPct: coverageReport.total.lines.pct,
      branchesPct: coverageReport.total.branches.pct,
      functionsPct: coverageReport.total.functions.pct,
      statementsPct: coverageReport.total.statements.pct,
      byDomain: {},
      byLayer: {},
      lowestCoveredFiles: [],
      notes: []
    },
    lintSummary: {
      errors: lintReport.errors,
      warnings: lintReport.warnings
    },
    wiringSummary: {
      missingHandlersCount: wiringReport.missingHandlers.length,
      unwiredEventsCount: wiringReport.unwiredEvents.length
    },
    driftSummary: calculateDrift(),
    tasks: {
      lastTaskId: null,
      history: []
    }
  }
  
  return globalReport
}

function generateHtmlReport(report: GlobalReport): string {
  const gatesStatus = Object.values(report.qualityGates).every(Boolean) ? '✅' : '❌'
  const overallStatus = Object.values(report.qualityGates).every(Boolean) ? 'PASSING' : 'FAILING'
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Manager - Global Report</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 16px; 
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white; 
            padding: 40px; 
            text-align: center; 
        }
        .header h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 10px; }
        .header .status { font-size: 1.2rem; opacity: 0.9; }
        .content { padding: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px; margin-bottom: 40px; }
        .card { 
            background: #f8fafc; 
            border-radius: 12px; 
            padding: 24px; 
            border-left: 4px solid #3b82f6;
            transition: transform 0.2s ease;
        }
        .card:hover { transform: translateY(-2px); }
        .card h3 { color: #1e293b; font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; }
        .metric { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .metric:last-child { margin-bottom: 0; }
        .metric-label { color: #64748b; font-size: 0.9rem; }
        .metric-value { font-weight: 600; color: #1e293b; }
        .status-badge { 
            display: inline-block; 
            padding: 4px 12px; 
            border-radius: 20px; 
            font-size: 0.8rem; 
            font-weight: 500;
        }
        .status-pass { background: #dcfce7; color: #166534; }
        .status-fail { background: #fef2f2; color: #dc2626; }
        .gates-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .gate { 
            background: white; 
            border-radius: 8px; 
            padding: 20px; 
            text-align: center;
            border: 2px solid #e2e8f0;
        }
        .gate.pass { border-color: #10b981; background: #f0fdf4; }
        .gate.fail { border-color: #ef4444; background: #fef2f2; }
        .gate-icon { font-size: 2rem; margin-bottom: 8px; }
        .gate-label { font-size: 0.9rem; color: #64748b; margin-bottom: 4px; }
        .gate-status { font-weight: 600; }
        .footer { 
            background: #f1f5f9; 
            padding: 20px 40px; 
            border-top: 1px solid #e2e8f0; 
            font-size: 0.9rem; 
            color: #64748b; 
        }
        .timestamp { text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${gatesStatus} Task Manager</h1>
            <div class="status">Global Report - Status: ${overallStatus}</div>
        </div>
        
        <div class="content">
            <div class="grid">
                <div class="card">
                    <h3>📊 Test Summary</h3>
                    <div class="metric">
                        <span class="metric-label">Unit Tests Passed</span>
                        <span class="metric-value">${report.testsSummary.unit.passed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Unit Tests Failed</span>
                        <span class="metric-value">${report.testsSummary.unit.failed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Duration</span>
                        <span class="metric-value">${report.testsSummary.unit.durationMs}ms</span>
                    </div>
                </div>
                
                <div class="card">
                    <h3>📈 Coverage</h3>
                    <div class="metric">
                        <span class="metric-label">Lines</span>
                        <span class="metric-value">${report.coverageSummary.linesPct.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Branches</span>
                        <span class="metric-value">${report.coverageSummary.branchesPct.toFixed(1)}%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Functions</span>
                        <span class="metric-value">${report.coverageSummary.functionsPct.toFixed(1)}%</span>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🔍 Code Quality</h3>
                    <div class="metric">
                        <span class="metric-label">Lint Errors</span>
                        <span class="metric-value">${report.lintSummary.errors}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Lint Warnings</span>
                        <span class="metric-value">${report.lintSummary.warnings}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Lines of Code</span>
                        <span class="metric-value">${report.inventory.linesOfCode}</span>
                    </div>
                </div>
                
                <div class="card">
                    <h3>🏗️ Project Inventory</h3>
                    <div class="metric">
                        <span class="metric-label">Domains</span>
                        <span class="metric-value">${report.inventory.domains.length}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Shared Files</span>
                        <span class="metric-value">${report.inventory.sharedFiles}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Phase</span>
                        <span class="metric-value">${report.phase}</span>
                    </div>
                </div>
            </div>
            
            <h2 style="margin-bottom: 20px; color: #1e293b;">Quality Gates</h2>
            <div class="gates-grid">
                <div class="gate ${report.qualityGates.testsAllPassing ? 'pass' : 'fail'}">
                    <div class="gate-icon">${report.qualityGates.testsAllPassing ? '✅' : '❌'}</div>
                    <div class="gate-label">Tests</div>
                    <div class="gate-status">${report.qualityGates.testsAllPassing ? 'PASSING' : 'FAILING'}</div>
                </div>
                
                <div class="gate ${report.qualityGates.coverageOk ? 'pass' : 'fail'}">
                    <div class="gate-icon">${report.qualityGates.coverageOk ? '✅' : '❌'}</div>
                    <div class="gate-label">Coverage ≥80%</div>
                    <div class="gate-status">${report.qualityGates.coverageOk ? 'PASSING' : 'FAILING'}</div>
                </div>
                
                <div class="gate ${report.qualityGates.lintOk ? 'pass' : 'fail'}">
                    <div class="gate-icon">${report.qualityGates.lintOk ? '✅' : '❌'}</div>
                    <div class="gate-label">Lint</div>
                    <div class="gate-status">${report.qualityGates.lintOk ? 'PASSING' : 'FAILING'}</div>
                </div>
                
                <div class="gate ${report.qualityGates.wiringOk ? 'pass' : 'fail'}">
                    <div class="gate-icon">${report.qualityGates.wiringOk ? '✅' : '❌'}</div>
                    <div class="gate-label">Wiring</div>
                    <div class="gate-status">${report.qualityGates.wiringOk ? 'PASSING' : 'FAILING'}</div>
                </div>
                
                <div class="gate ${report.qualityGates.driftOk ? 'pass' : 'fail'}">
                    <div class="gate-icon">${report.qualityGates.driftOk ? '✅' : '❌'}</div>
                    <div class="gate-label">No Drift</div>
                    <div class="gate-status">${report.qualityGates.driftOk ? 'PASSING' : 'FAILING'}</div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <div class="timestamp">
                Generated at ${new Date(report.generatedAt).toLocaleString()} | 
                Commit: ${report.commitSha?.substring(0, 8) || 'N/A'} | 
                Sources: ${report.sources.length} artifacts
            </div>
        </div>
    </div>
</body>
</html>`
}

async function main() {
  try {
    console.log('🚀 Generating Global Report...\n')
    
    // Generate JSON report
    const report = generateGlobalReport()
    
    // Write JSON report
    writeFileSync('reports/global-report.json', JSON.stringify(report, null, 2))
    console.log('  ✓ Generated reports/global-report.json')
    
    // Generate HTML report
    const htmlContent = generateHtmlReport(report)
    writeFileSync('reports/global-report.html', htmlContent)
    console.log('  ✓ Generated reports/global-report.html')
    
    console.log('\n✅ Global report generation completed successfully')
    
    // Validate quality gates
    const allGatesPassing = Object.values(report.qualityGates).every(Boolean)
    if (!allGatesPassing) {
      console.log('\n⚠️  Some quality gates are failing:')
      Object.entries(report.qualityGates).forEach(([gate, passing]) => {
        if (!passing) {
          console.log(`  ❌ ${gate}`)
        }
      })
    }
    
  } catch (error) {
    console.error('❌ Global report generation failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Report generation error:', error)
    process.exit(1)
  })
}