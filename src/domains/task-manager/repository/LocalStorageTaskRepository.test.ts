/**
 * LocalStorageTaskRepository Tests
 * 
 * Tests for comprehensive error handling, localStorage failure detection,
 * corrupted data recovery, and user notifications for storage issues.
 * 
 * Requirements covered:
 * - 5.3: localStorage failure detection and fallback with user notification
 * - 5.4: Corrupted data recovery with empty state and user notification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { LocalStorageTaskRepository } from './LocalStorageTaskRepository'
import { storageNotificationService } from '../../../shared/infrastructure/StorageNotificationService'
import { Task } from '../../../shared/contracts/task-manager/v1/TaskSchema'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}

// Mock console methods to avoid noise in tests
const mockConsole = {
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn()
}

describe('LocalStorageTaskRepository Error Handling', () => {
  let repository: LocalStorageTaskRepository

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    
    // Mock console methods
    vi.spyOn(console, 'warn').mockImplementation(mockConsole.warn)
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error)
    vi.spyOn(console, 'info').mockImplementation(mockConsole.info)
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    })
    
    // Mock notification methods
    vi.spyOn(storageNotificationService, 'notifyStorageUnavailable')
    vi.spyOn(storageNotificationService, 'notifyCorruptedDataCleared')
    vi.spyOn(storageNotificationService, 'notifyFallbackToMemory')
    vi.spyOn(storageNotificationService, 'notifyStorageQuotaExceeded')
    vi.spyOn(storageNotificationService, 'notifyTemporaryStorageFailure')
    vi.spyOn(storageNotificationService, 'notifyStorageRestored')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('localStorage unavailable scenarios', () => {
    it('should notify when localStorage is not available', () => {
      // Mock localStorage as unavailable
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      })

      repository = new LocalStorageTaskRepository()

      expect(storageNotificationService.notifyStorageUnavailable).toHaveBeenCalledWith(
        'localStorage not available or functional'
      )
    })

    it('should notify when localStorage throws error during availability check', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('localStorage disabled')
      })

      repository = new LocalStorageTaskRepository()

      expect(storageNotificationService.notifyStorageUnavailable).toHaveBeenCalledWith(
        'localStorage not available or functional'
      )
    })

    it('should use fallback repository when localStorage unavailable', async () => {
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      })

      repository = new LocalStorageTaskRepository()

      const task: Task = {
        id: 'test-id',
        description: 'Test task',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const savedTask = await repository.save(task)
      expect(savedTask.id).toBe(task.id)
      expect(savedTask.description).toBe(task.description)
      expect(savedTask.completed).toBe(task.completed)
      expect(savedTask.createdAt).toEqual(task.createdAt)
      expect(savedTask.updatedAt).toBeInstanceOf(Date)
      expect(savedTask.updatedAt.getTime()).toBeGreaterThanOrEqual(task.updatedAt.getTime())

      const foundTask = await repository.findById('test-id')
      expect(foundTask).toEqual(savedTask) // Compare with saved task, not original
    })
  })

  describe('corrupted data scenarios', () => {
    beforeEach(() => {
      // Mock localStorage as available
      mockLocalStorage.setItem.mockImplementation(() => {})
      mockLocalStorage.removeItem.mockImplementation(() => {})
      repository = new LocalStorageTaskRepository()
    })

    it('should notify and clear corrupted JSON data', async () => {
      mockLocalStorage.getItem.mockReturnValue('corrupted json data')

      const tasks = await repository.findAll()

      expect(tasks).toEqual([])
      expect(storageNotificationService.notifyCorruptedDataCleared).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON')
      )
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('task-manager-tasks')
    })

    it('should notify and clear data that fails schema validation', async () => {
      const invalidData = JSON.stringify([
        {
          id: 'invalid-uuid',
          description: '',
          completed: 'not-boolean',
          createdAt: 'invalid-date',
          updatedAt: 'invalid-date'
        }
      ])
      
      mockLocalStorage.getItem.mockReturnValue(invalidData)

      const tasks = await repository.findAll()

      expect(tasks).toEqual([])
      expect(storageNotificationService.notifyCorruptedDataCleared).toHaveBeenCalled()
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('task-manager-tasks')
    })
  })

  describe('storage quota exceeded scenarios', () => {
    beforeEach(() => {
      mockLocalStorage.setItem.mockImplementation(() => {})
      mockLocalStorage.removeItem.mockImplementation(() => {})
      repository = new LocalStorageTaskRepository()
    })

    it('should notify when storage quota is exceeded', async () => {
      const quotaError = new Error('QuotaExceededError')
      quotaError.name = 'QuotaExceededError'
      mockLocalStorage.setItem.mockImplementation(() => {
        throw quotaError
      })

      const task: Task = {
        id: 'test-id',
        description: 'Test task',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      await repository.save(task)

      expect(storageNotificationService.notifyStorageQuotaExceeded).toHaveBeenCalled()
    })
  })

  describe('storage restoration', () => {
    it('should notify when storage is restored', () => {
      // Start with unavailable storage
      Object.defineProperty(window, 'localStorage', {
        value: undefined,
        writable: true
      })

      repository = new LocalStorageTaskRepository()

      // Restore localStorage
      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
      })
      mockLocalStorage.setItem.mockImplementation(() => {})

      repository.refreshStorageAvailability()

      expect(storageNotificationService.notifyStorageRestored).toHaveBeenCalled()
    })
  })

  describe('error handling in repository operations', () => {
    beforeEach(() => {
      mockLocalStorage.setItem.mockImplementation(() => {})
      mockLocalStorage.removeItem.mockImplementation(() => {})
      repository = new LocalStorageTaskRepository()
    })

    it('should handle errors gracefully in save operation', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage read error')
      })

      const task: Task = {
        id: 'test-id',
        description: 'Test task',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      const result = await repository.save(task)
      
      // Should still return the task (using fallback)
      expect(result.id).toBe('test-id')
      expect(storageNotificationService.notifyTemporaryStorageFailure).toHaveBeenCalledWith('load tasks')
    })

    it('should handle errors gracefully in findAll operation', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('Storage read error')
      })

      const tasks = await repository.findAll()
      
      // Should return empty array instead of throwing
      expect(tasks).toEqual([])
      expect(storageNotificationService.notifyTemporaryStorageFailure).toHaveBeenCalledWith('load tasks')
    })

    it('should handle delete operation with proper error for non-existent task', async () => {
      // Setup empty storage
      mockLocalStorage.getItem.mockReturnValue('[]')

      // Expect error when trying to delete non-existent task
      await expect(repository.delete('non-existent-id')).rejects.toThrow('Task with id non-existent-id not found')
    })
  })
})