#!/usr/bin/env tsx

import { spawn, ChildProcess } from 'child_process'
import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

interface E2EResult {
  passed: number
  failed: number
  skipped: number
  durationMs: number
  framework: string
  featuresExecuted: number
  scenariosExecuted: number
}

class E2ERunner {
  private devServer: ChildProcess | null = null
  private readonly serverUrl = 'http://localhost:5173'
  private readonly maxWaitTime = 30000 // 30 seconds

  async run(): Promise<void> {
    console.log('🚀 Starting E2E test pipeline...')
    
    try {
      // Ensure reports directory exists
      this.ensureReportsDirectory()
      
      // Start development server
      await this.startDevServer()
      
      // Wait for server to be ready
      await this.waitForServer()
      
      // Run E2E tests
      const result = await this.runE2ETests()
      
      // Generate E2E report
      this.generateE2EReport(result)
      
      console.log('✅ E2E pipeline completed successfully')
      
    } catch (error) {
      console.error('❌ E2E pipeline failed:', error)
      process.exit(1)
    } finally {
      // Always stop the dev server
      this.stopDevServer()
    }
  }

  private ensureReportsDirectory(): void {
    const reportsDir = join(process.cwd(), 'reports', 'tests')
    if (!existsSync(reportsDir)) {
      mkdirSync(reportsDir, { recursive: true })
    }
  }

  private async startDevServer(): Promise<void> {
    console.log('🌐 Starting development server...')
    
    return new Promise((resolve, reject) => {
      this.devServer = spawn('npm', ['run', 'dev'], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      })

      let serverOutput = ''
      
      this.devServer.stdout?.on('data', (data) => {
        serverOutput += data.toString()
        // Look for Vite's ready message
        if (serverOutput.includes('Local:') && serverOutput.includes('5173')) {
          resolve()
        }
      })

      this.devServer.stderr?.on('data', (data) => {
        console.error('Dev server error:', data.toString())
      })

      this.devServer.on('error', (error) => {
        reject(new Error(`Failed to start dev server: ${error.message}`))
      })

      // Timeout after 15 seconds
      setTimeout(() => {
        reject(new Error('Dev server failed to start within 15 seconds'))
      }, 15000)
    })
  }

  private async waitForServer(): Promise<void> {
    console.log('⏳ Waiting for server to be ready...')
    
    const startTime = Date.now()
    
    while (Date.now() - startTime < this.maxWaitTime) {
      try {
        // Try to fetch from the server
        const response = await fetch(this.serverUrl)
        if (response.ok) {
          console.log('✅ Server is ready!')
          return
        }
      } catch (error) {
        // Server not ready yet, continue waiting
      }
      
      // Wait 1 second before trying again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    throw new Error(`Server did not become ready within ${this.maxWaitTime}ms`)
  }

  private async runE2ETests(): Promise<E2EResult> {
    console.log('🧪 Running E2E tests...')
    
    return new Promise((resolve, reject) => {
      const startTime = Date.now()
      const testTimeout = 45000 // 45 seconds timeout for tests
      
      const cucumber = spawn('node', ['--import', 'tsx/esm', './node_modules/.bin/cucumber-js', '--config', 'cucumber.config.js'], {
        stdio: ['ignore', 'pipe', 'pipe']
      })

      let output = ''
      let errorOutput = ''
      let isResolved = false

      cucumber.stdout?.on('data', (data) => {
        output += data.toString()
        process.stdout.write(data.toString())
      })

      cucumber.stderr?.on('data', (data) => {
        errorOutput += data.toString()
        process.stderr.write(data.toString())
      })

      cucumber.on('close', (code) => {
        if (isResolved) return
        isResolved = true
        
        const durationMs = Date.now() - startTime
        
        // Parse cucumber output to extract results
        const result = this.parseCucumberOutput(output, errorOutput, durationMs)
        
        if (code === 0) {
          console.log('✅ E2E tests completed successfully')
          resolve(result)
        } else {
          console.log('⚠️ E2E tests completed with failures')
          resolve(result) // Still resolve to generate report
        }
      })

      cucumber.on('error', (error) => {
        if (isResolved) return
        isResolved = true
        reject(new Error(`Failed to run E2E tests: ${error.message}`))
      })

      // Add timeout for tests
      setTimeout(() => {
        if (isResolved) return
        isResolved = true
        
        console.log('⏰ E2E tests timed out, killing process...')
        cucumber.kill('SIGTERM')
        
        const durationMs = Date.now() - startTime
        const result = this.parseCucumberOutput(output, errorOutput, durationMs)
        result.failed = Math.max(result.failed, 1) // Mark as failed due to timeout
        
        resolve(result)
      }, testTimeout)
    })
  }

  private parseCucumberOutput(output: string, errorOutput: string, durationMs: number): E2EResult {
    // Default result
    let result: E2EResult = {
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs,
      framework: 'cucumber',
      featuresExecuted: 0,
      scenariosExecuted: 0
    }

    try {
      // Parse scenario results from output
      const scenarioMatches = output.match(/(\d+) scenarios? \(([^)]+)\)/)
      if (scenarioMatches) {
        const totalScenarios = parseInt(scenarioMatches[1])
        const statusText = scenarioMatches[2]
        
        result.scenariosExecuted = totalScenarios
        
        // Parse individual statuses
        const failedMatch = statusText.match(/(\d+) failed/)
        const passedMatch = statusText.match(/(\d+) passed/)
        const skippedMatch = statusText.match(/(\d+) skipped/)
        
        result.failed = failedMatch ? parseInt(failedMatch[1]) : 0
        result.passed = passedMatch ? parseInt(passedMatch[1]) : 0
        result.skipped = skippedMatch ? parseInt(skippedMatch[1]) : 0
      }

      // Count features (rough estimate based on .feature files)
      const featureMatches = output.match(/\.feature/g)
      result.featuresExecuted = featureMatches ? featureMatches.length : 1

    } catch (error) {
      console.warn('Failed to parse cucumber output, using defaults')
    }

    return result
  }

  private generateE2EReport(result: E2EResult): void {
    console.log('📋 Generating E2E report...')
    
    const reportPath = join(process.cwd(), 'reports', 'tests', 'e2e.json')
    
    const report = {
      timestamp: new Date().toISOString(),
      framework: result.framework,
      featuresExecuted: result.featuresExecuted,
      scenariosExecuted: result.scenariosExecuted,
      results: {
        passed: result.passed,
        failed: result.failed,
        skipped: result.skipped,
        total: result.passed + result.failed + result.skipped
      },
      duration: {
        ms: result.durationMs,
        seconds: Math.round(result.durationMs / 1000)
      },
      coverage: {
        scenarios: result.scenariosExecuted > 0 ? ((result.passed / result.scenariosExecuted) * 100).toFixed(2) : '0.00'
      }
    }

    writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`✅ E2E report generated: ${reportPath}`)
  }

  private stopDevServer(): void {
    if (this.devServer) {
      console.log('🛑 Stopping development server...')
      
      // Kill the process and all its children
      if (this.devServer.pid) {
        try {
          // Try to kill the process group first
          process.kill(-this.devServer.pid, 'SIGTERM')
          
          // Wait a bit then force kill if needed
          setTimeout(() => {
            if (this.devServer && !this.devServer.killed) {
              try {
                process.kill(-this.devServer.pid!, 'SIGKILL')
              } catch (error) {
                // Process might already be dead
              }
            }
          }, 2000)
        } catch (error) {
          // Fallback to regular kill
          try {
            this.devServer.kill('SIGTERM')
            setTimeout(() => {
              if (this.devServer && !this.devServer.killed) {
                this.devServer.kill('SIGKILL')
              }
            }, 2000)
          } catch (killError) {
            console.warn('Could not kill dev server process')
          }
        }
      }
      
      this.devServer = null
      console.log('✅ Development server stopped')
    }
  }
}

// Run the E2E pipeline
const runner = new E2ERunner()
runner.run().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})