import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs'
import { execSync } from 'child_process'

describe('Global Report Generator', () => {
  const testReportsDir = 'test-reports'
  const originalReportsDir = 'reports'
  
  beforeEach(() => {
    // Create test reports directory structure
    if (existsSync(testReportsDir)) {
      rmSync(testReportsDir, { recursive: true })
    }
    
    mkdirSync(`${testReportsDir}/lint`, { recursive: true })
    mkdirSync(`${testReportsDir}/tests`, { recursive: true })
    mkdirSync(`${testReportsDir}/coverage`, { recursive: true })
    mkdirSync(`${testReportsDir}/wiring`, { recursive: true })
    
    // Backup original reports if they exist
    if (existsSync(originalReportsDir)) {
      execSync(`cp -r ${originalReportsDir} ${originalReportsDir}-backup`)
    }
    
    // Replace reports with test reports
    if (existsSync(originalReportsDir)) {
      rmSync(originalReportsDir, { recursive: true })
    }
    execSync(`cp -r ${testReportsDir} ${originalReportsDir}`)
  })
  
  afterEach(() => {
    // Restore original reports
    if (existsSync(originalReportsDir)) {
      rmSync(originalReportsDir, { recursive: true })
    }
    
    if (existsSync(`${originalReportsDir}-backup`)) {
      execSync(`mv ${originalReportsDir}-backup ${originalReportsDir}`)
    }
    
    // Clean up test directory
    if (existsSync(testReportsDir)) {
      rmSync(testReportsDir, { recursive: true })
    }
  })
  
  it('should generate valid global report with all required artifacts', () => {
    // Create valid test artifacts
    const lintReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      errors: 0,
      warnings: 2,
      files: 5,
      results: []
    }
    
    const testReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      passed: 10,
      failed: 0,
      skipped: 1,
      total: 11,
      durationMs: 1500,
      success: true
    }
    
    const coverageReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      lines: { pct: 85 },
      statements: { pct: 87 },
      functions: { pct: 90 },
      branches: { pct: 82 },
      total: {
        lines: { pct: 85 },
        statements: { pct: 87 },
        functions: { pct: 90 },
        branches: { pct: 82 }
      }
    }
    
    const wiringReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      ok: true,
      missingHandlers: [],
      unwiredEvents: [],
      domains: ['task-manager']
    }
    
    // Write test artifacts
    writeFileSync('reports/lint/lint.json', JSON.stringify(lintReport, null, 2))
    writeFileSync('reports/tests/unit.json', JSON.stringify(testReport, null, 2))
    writeFileSync('reports/coverage/coverage-summary.json', JSON.stringify(coverageReport, null, 2))
    writeFileSync('reports/wiring/wiring.json', JSON.stringify(wiringReport, null, 2))
    
    // Run report generator
    execSync('npm run generate-report')
    
    // Verify JSON report was generated
    expect(existsSync('reports/global-report.json')).toBe(true)
    
    // Verify HTML report was generated
    expect(existsSync('reports/global-report.html')).toBe(true)
    
    // Parse and validate JSON report structure
    const globalReport = JSON.parse(readFileSync('reports/global-report.json', 'utf-8'))
    
    // Validate required fields
    expect(globalReport).toHaveProperty('generatedAt')
    expect(globalReport).toHaveProperty('sources')
    expect(globalReport).toHaveProperty('qualityGates')
    expect(globalReport).toHaveProperty('testsSummary')
    expect(globalReport).toHaveProperty('coverageSummary')
    expect(globalReport).toHaveProperty('lintSummary')
    expect(globalReport).toHaveProperty('wiringSummary')
    
    // Validate quality gates calculation
    expect(globalReport.qualityGates.testsAllPassing).toBe(true) // 0 failed tests
    expect(globalReport.qualityGates.coverageOk).toBe(true) // 85% >= 80%
    expect(globalReport.qualityGates.lintOk).toBe(true) // 0 errors
    expect(globalReport.qualityGates.wiringOk).toBe(true) // no missing handlers
    
    // Validate data aggregation
    expect(globalReport.testsSummary.unit.passed).toBe(10)
    expect(globalReport.testsSummary.unit.failed).toBe(0)
    expect(globalReport.coverageSummary.linesPct).toBe(85)
    expect(globalReport.lintSummary.errors).toBe(0)
    expect(globalReport.lintSummary.warnings).toBe(2)
    
    // Validate sources tracking
    expect(globalReport.sources).toContain('reports/lint/lint.json')
    expect(globalReport.sources).toContain('reports/tests/unit.json')
    expect(globalReport.sources).toContain('reports/coverage/coverage-summary.json')
    expect(globalReport.sources).toContain('reports/wiring/wiring.json')
  })
  
  it('should fail when required artifacts are missing', () => {
    // Create incomplete artifacts (missing coverage)
    const lintReport = { timestamp: '2026-01-07T00:00:00.000Z', errors: 0, warnings: 0, files: 0 }
    const testReport = { timestamp: '2026-01-07T00:00:00.000Z', passed: 0, failed: 0, skipped: 0, total: 0, durationMs: 0, success: true }
    const wiringReport = { timestamp: '2026-01-07T00:00:00.000Z', ok: true, missingHandlers: [], unwiredEvents: [], domains: [] }
    
    writeFileSync('reports/lint/lint.json', JSON.stringify(lintReport, null, 2))
    writeFileSync('reports/tests/unit.json', JSON.stringify(testReport, null, 2))
    writeFileSync('reports/wiring/wiring.json', JSON.stringify(wiringReport, null, 2))
    // Intentionally not creating coverage report
    
    // Report generation should fail
    expect(() => {
      execSync('npm run generate-report', { stdio: 'pipe' })
    }).toThrow()
  })
  
  it('should fail when artifacts contain invalid JSON', () => {
    // Create valid artifacts except one with invalid JSON
    const lintReport = { timestamp: '2026-01-07T00:00:00.000Z', errors: 0, warnings: 0, files: 0 }
    const testReport = { timestamp: '2026-01-07T00:00:00.000Z', passed: 0, failed: 0, skipped: 0, total: 0, durationMs: 0, success: true }
    const wiringReport = { timestamp: '2026-01-07T00:00:00.000Z', ok: true, missingHandlers: [], unwiredEvents: [], domains: [] }
    
    writeFileSync('reports/lint/lint.json', JSON.stringify(lintReport, null, 2))
    writeFileSync('reports/tests/unit.json', JSON.stringify(testReport, null, 2))
    writeFileSync('reports/coverage/coverage-summary.json', 'invalid json content')
    writeFileSync('reports/wiring/wiring.json', JSON.stringify(wiringReport, null, 2))
    
    // Report generation should fail
    expect(() => {
      execSync('npm run generate-report', { stdio: 'pipe' })
    }).toThrow()
  })
  
  it('should correctly calculate quality gates with failing conditions', () => {
    // Create artifacts that should fail quality gates
    const lintReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      errors: 3, // Should fail lint gate
      warnings: 5,
      files: 10
    }
    
    const testReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      passed: 8,
      failed: 2, // Should fail test gate
      skipped: 0,
      total: 10,
      durationMs: 2000,
      success: false
    }
    
    const coverageReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      lines: { pct: 65 }, // Should fail coverage gate (< 80%)
      statements: { pct: 70 },
      functions: { pct: 75 },
      branches: { pct: 60 },
      total: {
        lines: { pct: 65 },
        statements: { pct: 70 },
        functions: { pct: 75 },
        branches: { pct: 60 }
      }
    }
    
    const wiringReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      ok: false, // Should fail wiring gate
      missingHandlers: ['handler1', 'handler2'],
      unwiredEvents: ['event1'],
      domains: ['task-manager']
    }
    
    // Write failing artifacts
    writeFileSync('reports/lint/lint.json', JSON.stringify(lintReport, null, 2))
    writeFileSync('reports/tests/unit.json', JSON.stringify(testReport, null, 2))
    writeFileSync('reports/coverage/coverage-summary.json', JSON.stringify(coverageReport, null, 2))
    writeFileSync('reports/wiring/wiring.json', JSON.stringify(wiringReport, null, 2))
    
    // Run report generator (should succeed but with failing gates)
    execSync('npm run generate-report')
    
    // Parse report
    const globalReport = JSON.parse(readFileSync('reports/global-report.json', 'utf-8'))
    
    // All quality gates should be false
    expect(globalReport.qualityGates.testsAllPassing).toBe(false) // failed tests > 0
    expect(globalReport.qualityGates.coverageOk).toBe(false) // 65% < 80%
    expect(globalReport.qualityGates.lintOk).toBe(false) // errors > 0
    expect(globalReport.qualityGates.wiringOk).toBe(false) // missing handlers
  })
  
  it('should enforce coverage gate >= 80% when domain code exists', () => {
    // This test validates the coverage gate threshold
    const coverageReport = {
      timestamp: '2026-01-07T00:00:00.000Z',
      lines: { pct: 79.9 }, // Just below threshold
      statements: { pct: 80 },
      functions: { pct: 85 },
      branches: { pct: 75 },
      total: {
        lines: { pct: 79.9 },
        statements: { pct: 80 },
        functions: { pct: 85 },
        branches: { pct: 75 }
      }
    }
    
    const lintReport = { timestamp: '2026-01-07T00:00:00.000Z', errors: 0, warnings: 0, files: 0 }
    const testReport = { timestamp: '2026-01-07T00:00:00.000Z', passed: 5, failed: 0, skipped: 0, total: 5, durationMs: 1000, success: true }
    const wiringReport = { timestamp: '2026-01-07T00:00:00.000Z', ok: true, missingHandlers: [], unwiredEvents: [], domains: [] }
    
    writeFileSync('reports/lint/lint.json', JSON.stringify(lintReport, null, 2))
    writeFileSync('reports/tests/unit.json', JSON.stringify(testReport, null, 2))
    writeFileSync('reports/coverage/coverage-summary.json', JSON.stringify(coverageReport, null, 2))
    writeFileSync('reports/wiring/wiring.json', JSON.stringify(wiringReport, null, 2))
    
    execSync('npm run generate-report')
    
    const globalReport = JSON.parse(readFileSync('reports/global-report.json', 'utf-8'))
    
    // Coverage gate should fail because 79.9% < 80%
    expect(globalReport.qualityGates.coverageOk).toBe(false)
    expect(globalReport.coverageSummary.linesPct).toBe(79.9)
  })
})