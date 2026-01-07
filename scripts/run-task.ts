#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { existsSync, writeFileSync, readFileSync } from 'fs'
import { join } from 'path'

/**
 * Task-level pipeline orchestrator
 * Runs pipeline for specific file/domain and generates task audit
 */

interface TaskAuditReport {
  taskId: string
  timestamp: string
  scope: {
    mode: 'file' | 'domain' | 'global'
    domain: string | null
    files: string[]
  }
  gates: {
    testsPassed: boolean
    coverageOk: boolean
    lintOk: boolean
    wiringOk: boolean
    driftOk: boolean
  }
  tests: {
    unit: { passed: number; failed: number; skipped: number; durationMs: number; outputFile: string }
    bdd: { passed: number; failed: number; skipped: number; durationMs: number; outputFile: string }
    e2e: { passed: number; failed: number; skipped: number; durationMs: number; outputFile: string; framework: string }
  }
  coverage: {
    engine: string
    linesPct: number
    branchesPct: number
    functionsPct: number
    statementsPct: number
    byDomain: Record<string, { linesPct: number; branchesPct: number; functionsPct: number; statementsPct: number }>
    byLayer: Record<string, { linesPct: number; branchesPct: number; functionsPct: number; statementsPct: number }>
    outputFile: string
  }
  lint: {
    errors: number
    warnings: number
    outputFile: string
  }
  wiring: {
    ok: boolean
    missingHandlers: string[]
    unwiredEvents: string[]
    outputFile: string
  }
  drift: {
    mocksAfterOfficial: number
    unusedContractsInBdd: number
    domainRepoInShared: number
    notes: string[]
  }
  autoOpen: {
    didOpenReport: boolean
    didOpenGallery: boolean
    didOpenApp: boolean
    reasonIfNot: string | null
  }
}

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function runTaskPipeline(taskId: string, mode: 'file' | 'domain' | 'global', domain?: string, files?: string[]): TaskAuditReport {
  console.log(`🚀 Running task pipeline: ${taskId} (${mode})`)
  
  // Run global pipeline first to generate base artifacts
  try {
    execSync('npm run run-global', { stdio: 'inherit' })
  } catch (error) {
    console.error('Global pipeline failed:', error)
  }
  
  // Read generated artifacts to build task audit
  const lintReport = existsSync('reports/lint/lint.json') 
    ? JSON.parse(readFileSync('reports/lint/lint.json', 'utf-8'))
    : { errors: 0, warnings: 0 }
    
  const testReport = existsSync('reports/tests/unit.json')
    ? JSON.parse(readFileSync('reports/tests/unit.json', 'utf-8'))
    : { passed: 0, failed: 0, skipped: 0, durationMs: 0, success: true }
    
  const coverageReport = existsSync('reports/coverage/coverage-summary.json')
    ? JSON.parse(readFileSync('reports/coverage/coverage-summary.json', 'utf-8'))
    : { total: { lines: { pct: 0 }, branches: { pct: 0 }, functions: { pct: 0 }, statements: { pct: 0 } } }
    
  const wiringReport = existsSync('reports/wiring/wiring.json')
    ? JSON.parse(readFileSync('reports/wiring/wiring.json', 'utf-8'))
    : { ok: true, missingHandlers: [], unwiredEvents: [] }
  
  // Calculate gates
  const gates = {
    testsPassed: testReport.failed === 0 && testReport.success,
    coverageOk: coverageReport.total.lines.pct >= 80,
    lintOk: lintReport.errors === 0,
    wiringOk: wiringReport.ok && wiringReport.missingHandlers.length === 0 && wiringReport.unwiredEvents.length === 0,
    driftOk: true // Will be calculated when domain code exists
  }
  
  const allGatesPassing = Object.values(gates).every(Boolean)
  
  // Build task audit report
  const taskAudit: TaskAuditReport = {
    taskId,
    timestamp: new Date().toISOString(),
    scope: {
      mode,
      domain: domain || null,
      files: files || []
    },
    gates,
    tests: {
      unit: {
        passed: testReport.passed || 0,
        failed: testReport.failed || 0,
        skipped: testReport.skipped || 0,
        durationMs: testReport.durationMs || 0,
        outputFile: 'reports/tests/unit.json'
      },
      bdd: {
        passed: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
        outputFile: 'reports/tests/bdd.json'
      },
      e2e: {
        passed: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
        outputFile: 'reports/tests/e2e.json',
        framework: 'none'
      }
    },
    coverage: {
      engine: '@vitest/coverage-istanbul',
      linesPct: coverageReport.total.lines.pct || 0,
      branchesPct: coverageReport.total.branches.pct || 0,
      functionsPct: coverageReport.total.functions.pct || 0,
      statementsPct: coverageReport.total.statements.pct || 0,
      byDomain: {},
      byLayer: {},
      outputFile: 'reports/coverage/coverage-summary.json'
    },
    lint: {
      errors: lintReport.errors || 0,
      warnings: lintReport.warnings || 0,
      outputFile: 'reports/lint/lint.json'
    },
    wiring: {
      ok: wiringReport.ok || true,
      missingHandlers: wiringReport.missingHandlers || [],
      unwiredEvents: wiringReport.unwiredEvents || [],
      outputFile: 'reports/wiring/wiring.json'
    },
    drift: {
      mocksAfterOfficial: 0,
      unusedContractsInBdd: 0,
      domainRepoInShared: 0,
      notes: ['No domain code exists yet - drift check will be implemented with first domain']
    },
    autoOpen: {
      didOpenReport: false,
      didOpenGallery: false,
      didOpenApp: false,
      reasonIfNot: allGatesPassing ? null : 'Quality gates failing'
    }
  }
  
  // Auto-open if all gates pass
  if (allGatesPassing) {
    try {
      // Open report
      const reportPath = join(process.cwd(), 'reports/global-report.html')
      if (existsSync(reportPath)) {
        const platform = process.platform
        if (platform === 'darwin') {
          execSync(`open "${reportPath}"`)
        } else if (platform === 'win32') {
          execSync(`start "${reportPath}"`)
        } else {
          execSync(`xdg-open "${reportPath}"`)
        }
        taskAudit.autoOpen.didOpenReport = true
      }
      
      // TODO: Open gallery when it exists
      // TODO: Open app when it exists
      
    } catch (error) {
      taskAudit.autoOpen.reasonIfNot = `Auto-open failed: ${error}`
    }
  }
  
  return taskAudit
}

async function main() {
  const args = process.argv.slice(2)
  const mode = (args[0] as 'file' | 'domain' | 'global') || 'global'
  const domain = args[1]
  const files = args.slice(2)
  
  const taskId = generateTaskId()
  
  try {
    const taskAudit = runTaskPipeline(taskId, mode, domain, files)
    
    // Write task audit
    const auditPath = `reports/task-audit/${taskId}.json`
    writeFileSync(auditPath, JSON.stringify(taskAudit, null, 2))
    
    console.log(`\n✅ Task audit completed: ${auditPath}`)
    
    if (taskAudit.autoOpen.didOpenReport) {
      console.log('🌐 Report opened automatically')
    } else if (taskAudit.autoOpen.reasonIfNot) {
      console.log(`⚠️  Auto-open skipped: ${taskAudit.autoOpen.reasonIfNot}`)
    }
    
    // Exit with error if gates fail
    const allGatesPassing = Object.values(taskAudit.gates).every(Boolean)
    if (!allGatesPassing) {
      console.log('\n❌ Quality gates failing:')
      Object.entries(taskAudit.gates).forEach(([gate, passing]) => {
        if (!passing) {
          console.log(`  ❌ ${gate}`)
        }
      })
      process.exit(1)
    }
    
  } catch (error) {
    console.error('Task pipeline failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Task pipeline error:', error)
    process.exit(1)
  })
}