#!/usr/bin/env tsx

import { execSync } from 'child_process'

/**
 * Domain-level pipeline orchestrator
 * Runs pipeline for specific domain
 */

async function main() {
  const args = process.argv.slice(2)
  const domain = args[0]
  
  if (!domain) {
    console.error('Usage: npm run run-domain <domain-name>')
    process.exit(1)
  }
  
  console.log(`🚀 Running domain pipeline for: ${domain}`)
  
  try {
    // Run task pipeline in domain mode
    execSync(`npm run run-task domain ${domain}`, { stdio: 'inherit' })
    
    console.log(`✅ Domain pipeline completed for: ${domain}`)
    
  } catch (error) {
    console.error(`Domain pipeline failed for ${domain}:`, error)
    process.exit(1)
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Domain pipeline error:', error)
    process.exit(1)
  })
}