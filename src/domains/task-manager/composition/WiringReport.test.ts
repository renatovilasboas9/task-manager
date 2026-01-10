import { describe, it, expect, vi } from 'vitest'
import { 
  generateWiringReport, 
  generateWiringReportJSON, 
  isWiringHealthy, 
  getWiringErrors 
} from './WiringReport'

describe('WiringReport', () => {
  describe('generateWiringReport', () => {
    it('should generate a complete wiring report for test environment', () => {
      const report = generateWiringReport('test')
      
      expect(report.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(report.environment).toBe('test')
      expect(report.domain).toBe('task-manager')
      expect(report.verification).toBeDefined()
      expect(report.summary).toBeDefined()
      expect(report.summary.isHealthy).toBe(true)
      expect(report.summary.totalHandlers).toBe(5)
      expect(report.summary.missingHandlers).toBe(0)
      expect(report.summary.errors).toBe(0)
    })

    it('should generate a complete wiring report for development environment', () => {
      const report = generateWiringReport('development')
      
      expect(report.environment).toBe('development')
      expect(report.verification.repositoryType).toBe('LocalStorageTaskRepository')
      expect(report.summary.isHealthy).toBe(true)
    })
  })

  describe('generateWiringReportJSON', () => {
    it('should generate valid JSON string', () => {
      const jsonReport = generateWiringReportJSON('test')
      
      expect(() => JSON.parse(jsonReport)).not.toThrow()
      
      const parsed = JSON.parse(jsonReport)
      expect(parsed.domain).toBe('task-manager')
      expect(parsed.environment).toBe('test')
    })
  })

  describe('isWiringHealthy', () => {
    it('should return true for healthy wiring', () => {
      expect(isWiringHealthy('test')).toBe(true)
      expect(isWiringHealthy('development')).toBe(true)
    })
  })

  describe('getWiringErrors', () => {
    it('should return empty array for healthy wiring', () => {
      expect(getWiringErrors('test')).toEqual([])
      expect(getWiringErrors('development')).toEqual([])
    })
  })
})