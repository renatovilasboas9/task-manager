/**
 * Wiring Report Generator
 * 
 * This module generates wiring verification reports for the task manager domain.
 * It can be used by scripts to verify that all components are properly wired
 * and configured for the current environment.
 * 
 * Requirements: Wiring testável via suíte "wiring check"
 */

import { EventBus } from '../../../shared/infrastructure/EventBus'
import { 
  createTaskManagerComposition, 
  getEnvironment,
  type WiringVerificationResult 
} from './TaskManagerComposition'

/**
 * Wiring report data structure
 */
export interface WiringReport {
  timestamp: string
  environment: string
  domain: string
  verification: WiringVerificationResult
  summary: {
    isHealthy: boolean
    totalHandlers: number
    missingHandlers: number
    unwiredEvents: number
    errors: number
  }
}

/**
 * Generate a wiring report for the task manager domain
 * 
 * @param environment - Optional environment override (defaults to current NODE_ENV)
 * @returns Wiring report with verification results
 */
export function generateWiringReport(environment?: string): WiringReport {
  const env = environment || getEnvironment()
  const eventBus = new EventBus()
  
  // Create composition for the specified environment
  const composition = createTaskManagerComposition({
    environment: env as any,
    eventBus
  })

  // Verify wiring
  const verification = composition.verifyWiring()

  // Generate summary
  const summary = {
    isHealthy: verification.isValid,
    totalHandlers: verification.registeredHandlers.length,
    missingHandlers: verification.missingHandlers.length,
    unwiredEvents: verification.unwiredEvents.length,
    errors: verification.errors.length
  }

  // Clean up
  composition.dispose()

  return {
    timestamp: new Date().toISOString(),
    environment: env,
    domain: 'task-manager',
    verification,
    summary
  }
}

/**
 * Generate wiring report in JSON format for scripts
 * 
 * @param environment - Optional environment override
 * @returns JSON string of the wiring report
 */
export function generateWiringReportJSON(environment?: string): string {
  const report = generateWiringReport(environment)
  return JSON.stringify(report, null, 2)
}

/**
 * Check if wiring is healthy for the current environment
 * 
 * @param environment - Optional environment override
 * @returns True if wiring is healthy, false otherwise
 */
export function isWiringHealthy(environment?: string): boolean {
  const report = generateWiringReport(environment)
  return report.summary.isHealthy
}

/**
 * Get wiring errors for the current environment
 * 
 * @param environment - Optional environment override
 * @returns Array of error messages
 */
export function getWiringErrors(environment?: string): string[] {
  const report = generateWiringReport(environment)
  return report.verification.errors
}

/**
 * CLI-friendly wiring check function
 * Exits with code 0 if wiring is healthy, 1 if not
 * 
 * @param environment - Optional environment override
 */
export function checkWiringCLI(environment?: string): void {
  const report = generateWiringReport(environment)
  
  console.log(`Wiring Check for ${report.domain} domain (${report.environment} environment)`)
  console.log('='.repeat(60))
  
  if (report.summary.isHealthy) {
    console.log('✅ Wiring is healthy')
    console.log(`   - ${report.summary.totalHandlers} handlers registered`)
    console.log(`   - ${report.verification.repositoryType} configured`)
    // Exit with success code in Node.js environment
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.exit) {
      (globalThis as any).process.exit(0)
    }
  } else {
    console.log('❌ Wiring issues detected')
    
    if (report.summary.missingHandlers > 0) {
      console.log(`   - ${report.summary.missingHandlers} missing handlers:`)
      report.verification.missingHandlers.forEach(handler => {
        console.log(`     • ${handler}`)
      })
    }
    
    if (report.summary.unwiredEvents > 0) {
      console.log(`   - ${report.summary.unwiredEvents} unwired events:`)
      report.verification.unwiredEvents.forEach(event => {
        console.log(`     • ${event}`)
      })
    }
    
    if (report.summary.errors > 0) {
      console.log(`   - ${report.summary.errors} configuration errors:`)
      report.verification.errors.forEach(error => {
        console.log(`     • ${error}`)
      })
    }
    
    // Exit with error code in Node.js environment
    if (typeof globalThis !== 'undefined' && (globalThis as any).process?.exit) {
      (globalThis as any).process.exit(1)
    }
  }
}