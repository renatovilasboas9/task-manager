/**
 * Task Manager Repository Module
 * 
 * Exports all repository interfaces and implementations for task persistence.
 * Provides abstraction layer for different storage mechanisms.
 */

export type { TaskRepository } from './TaskRepository'
export { MemoryTaskRepository } from './MemoryTaskRepository'
export { LocalStorageTaskRepository } from './LocalStorageTaskRepository'

import { MemoryTaskRepository } from './MemoryTaskRepository'
import { LocalStorageTaskRepository } from './LocalStorageTaskRepository'

/**
 * Repository factory for environment-based instantiation
 * 
 * @param environment - The target environment ('test', 'development', 'production')
 * @returns Appropriate repository implementation for the environment
 */
export function createTaskRepository(environment: 'test' | 'development' | 'production') {
  switch (environment) {
    case 'test':
      // Always use memory repository for tests
      return new MemoryTaskRepository()
    case 'development':
    case 'production':
      // Use localStorage with memory fallback for dev and prod
      return new LocalStorageTaskRepository()
    default:
      throw new Error(`Unknown environment: ${environment}`)
  }
}