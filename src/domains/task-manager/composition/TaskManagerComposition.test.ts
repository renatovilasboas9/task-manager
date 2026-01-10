/**
 * Task Manager Composition Wiring Tests
 * 
 * This test suite verifies the wiring integrity of the task manager domain,
 * ensuring that all components are properly connected and configured for
 * different environments.
 * 
 * Requirements: Wiring testável via suíte "wiring check"
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { 
  TaskManagerComposition, 
  createTaskManagerComposition,
  getEnvironment,
  type Environment 
} from './TaskManagerComposition'
import { MemoryTaskRepository } from '../repository/MemoryTaskRepository'
import { LocalStorageTaskRepository } from '../repository/LocalStorageTaskRepository'

describe('TaskManagerComposition Wiring Check', () => {
  let eventBus: EventBus
  let composition: TaskManagerComposition

  beforeEach(() => {
    eventBus = new EventBus()
  })

  describe('Environment-based Repository Configuration', () => {
    it('should use MemoryTaskRepository for test environment', () => {
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })

      const dependencies = composition.getDependencies()
      expect(dependencies.taskRepository).toBeInstanceOf(MemoryTaskRepository)
      expect(dependencies.environment).toBe('test')
    })

    it('should use LocalStorageTaskRepository for development environment', () => {
      composition = createTaskManagerComposition({
        environment: 'development',
        eventBus
      })

      const dependencies = composition.getDependencies()
      expect(dependencies.taskRepository).toBeInstanceOf(LocalStorageTaskRepository)
      expect(dependencies.environment).toBe('development')
    })

    it('should use LocalStorageTaskRepository for production environment', () => {
      composition = createTaskManagerComposition({
        environment: 'production',
        eventBus
      })

      const dependencies = composition.getDependencies()
      expect(dependencies.taskRepository).toBeInstanceOf(LocalStorageTaskRepository)
      expect(dependencies.environment).toBe('production')
    })
  })

  describe('Event Handler Registration', () => {
    beforeEach(() => {
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })
    })

    it('should register all required UI event handlers', () => {
      const requiredEvents = [
        'UI.TASK.CREATE',
        'UI.TASK.UPDATE', 
        'UI.TASK.TOGGLE',
        'UI.TASK.DELETE',
        'UI.TASK.CLEAR'
      ]

      const registeredEvents = eventBus.getRegisteredEvents()
      
      for (const event of requiredEvents) {
        expect(registeredEvents).toContain(event)
        expect(eventBus.getSubscriberCount(event)).toBe(1)
      }
    })

    it('should have working event handlers that call service methods', async () => {
      const dependencies = composition.getDependencies()
      const taskService = dependencies.taskService
      
      // Spy on service methods
      const createSpy = vi.spyOn(taskService, 'createTask').mockResolvedValue({
        id: 'test-id',
        description: 'Test task',
        completed: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const updateSpy = vi.spyOn(taskService, 'updateTask').mockResolvedValue({
        id: 'test-id',
        description: 'Updated task',
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const toggleSpy = vi.spyOn(taskService, 'toggleTaskCompletion').mockResolvedValue({
        id: 'test-id',
        description: 'Test task',
        completed: true,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      const deleteSpy = vi.spyOn(taskService, 'deleteTask').mockResolvedValue()
      const clearSpy = vi.spyOn(taskService, 'clearAllTasks').mockResolvedValue()

      // Test UI.TASK.CREATE handler
      await eventBus.publish('UI.TASK.CREATE', { description: 'Test task' })
      expect(createSpy).toHaveBeenCalledWith('Test task')

      // Test UI.TASK.UPDATE handler
      await eventBus.publish('UI.TASK.UPDATE', { 
        id: 'test-id', 
        updates: { description: 'Updated task' } 
      })
      expect(updateSpy).toHaveBeenCalledWith('test-id', { description: 'Updated task' })

      // Test UI.TASK.TOGGLE handler
      await eventBus.publish('UI.TASK.TOGGLE', { id: 'test-id' })
      expect(toggleSpy).toHaveBeenCalledWith('test-id')

      // Test UI.TASK.DELETE handler
      await eventBus.publish('UI.TASK.DELETE', { id: 'test-id' })
      expect(deleteSpy).toHaveBeenCalledWith('test-id')

      // Test UI.TASK.CLEAR handler
      await eventBus.publish('UI.TASK.CLEAR')
      expect(clearSpy).toHaveBeenCalled()
    })
  })

  describe('Wiring Verification', () => {
    it('should pass wiring verification for test environment', () => {
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })

      const verification = composition.verifyWiring()
      
      expect(verification.isValid).toBe(true)
      expect(verification.environment).toBe('test')
      expect(verification.repositoryType).toBe('MemoryTaskRepository')
      expect(verification.missingHandlers).toHaveLength(0)
      expect(verification.errors).toHaveLength(0)
    })

    it('should pass wiring verification for development environment', () => {
      composition = createTaskManagerComposition({
        environment: 'development',
        eventBus
      })

      const verification = composition.verifyWiring()
      
      expect(verification.isValid).toBe(true)
      expect(verification.environment).toBe('development')
      expect(verification.repositoryType).toBe('LocalStorageTaskRepository')
      expect(verification.missingHandlers).toHaveLength(0)
      expect(verification.errors).toHaveLength(0)
    })

    it('should detect missing handlers in wiring verification', () => {
      // Create composition but clear event bus to simulate missing handlers
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })
      
      eventBus.clear()
      
      const verification = composition.verifyWiring()
      
      expect(verification.isValid).toBe(false)
      expect(verification.missingHandlers).toContain('UI.TASK.CREATE')
      expect(verification.missingHandlers).toContain('UI.TASK.UPDATE')
      expect(verification.missingHandlers).toContain('UI.TASK.TOGGLE')
      expect(verification.missingHandlers).toContain('UI.TASK.DELETE')
      expect(verification.missingHandlers).toContain('UI.TASK.CLEAR')
    })

    it('should detect repository type mismatch', () => {
      // This test simulates a configuration error where wrong repo type is used
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })

      // Manually override the repository type for testing
      const dependencies = composition.getDependencies()
      Object.defineProperty(dependencies.taskRepository.constructor, 'name', {
        value: 'WrongRepository'
      })

      const verification = composition.verifyWiring()
      
      expect(verification.isValid).toBe(false)
      expect(verification.errors).toContain(
        'Expected MemoryTaskRepository for environment test, got WrongRepository'
      )
    })
  })

  describe('Dependency Access', () => {
    beforeEach(() => {
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })
    })

    it('should provide access to all wired dependencies', () => {
      const dependencies = composition.getDependencies()
      
      expect(dependencies.taskService).toBeDefined()
      expect(dependencies.taskRepository).toBeDefined()
      expect(dependencies.eventBus).toBe(eventBus)
      expect(dependencies.environment).toBe('test')
    })

    it('should provide access to event handlers for testing', () => {
      const handlers = composition.getEventHandlers()
      
      expect(handlers.onTaskCreate).toBeTypeOf('function')
      expect(handlers.onTaskUpdate).toBeTypeOf('function')
      expect(handlers.onTaskToggle).toBeTypeOf('function')
      expect(handlers.onTaskDelete).toBeTypeOf('function')
      expect(handlers.onTasksClear).toBeTypeOf('function')
    })
  })

  describe('Cleanup', () => {
    it('should properly dispose of subscriptions', () => {
      composition = createTaskManagerComposition({
        environment: 'test',
        eventBus
      })

      // Verify handlers are registered
      expect(eventBus.getRegisteredEvents()).toHaveLength(5)

      // Dispose composition
      composition.dispose()

      // Verify handlers are cleaned up
      expect(eventBus.getRegisteredEvents()).toHaveLength(0)
    })
  })

  describe('Environment Detection', () => {
    it('should detect test environment from NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'
      
      expect(getEnvironment()).toBe('test')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should detect production environment from NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      expect(getEnvironment()).toBe('production')
      
      process.env.NODE_ENV = originalEnv
    })

    it('should default to development environment', () => {
      const originalEnv = process.env.NODE_ENV
      delete process.env.NODE_ENV
      
      expect(getEnvironment()).toBe('development')
      
      process.env.NODE_ENV = originalEnv
    })
  })
})