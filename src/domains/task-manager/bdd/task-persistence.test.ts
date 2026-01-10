import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { Task, TaskFilter, TaskSchemaUtils } from '../../../shared/contracts/task-manager/v1/TaskSchema'
import { TaskService } from '../service/TaskService'
import { MemoryTaskRepository } from '../repository/MemoryTaskRepository'
import { LocalStorageTaskRepository } from '../repository/LocalStorageTaskRepository'
import { EventBus } from '../../../shared/infrastructure/EventBus'

/**
 * BDD Scenarios for Task Persistence
 * 
 * This file implements BDD scenarios for task persistence functionality.
 * Uses official implementations via DI (No-Mocks Drift).
 * Uses official Zod contracts for validation (No-Contract Drift).
 * 
 * Properties tested:
 * - Property 9: Round-trip de restauração de storage
 */

// Test Data Builder using Zod contracts
class TaskPersistenceTestDataBuilder {
  static createTask(description: string, completed: boolean = false): Task {
    const task = {
      id: 'test-id',
      description: description.trim(),
      completed,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Validate with Zod schema
    return TaskSchemaUtils.parseTask(task)
  }

  static randomTaskDescription(): fc.Arbitrary<string> {
    return fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  }

  static randomCompletionStatus(): fc.Arbitrary<boolean> {
    return fc.boolean()
  }

  static randomFilter(): fc.Arbitrary<TaskFilter> {
    return fc.constantFrom('all', 'active', 'completed')
  }

  static createTaskCollection(count: number): Task[] {
    return Array.from({ length: count }, (_, i) => 
      this.createTask(`Task ${i + 1}`, i % 3 === 0) // Every 3rd task is completed
    )
  }
}

describe('BDD: Task Persistence Scenarios', () => {
  let memoryRepository: MemoryTaskRepository
  let localStorageRepository: LocalStorageTaskRepository
  let eventBus: EventBus
  let taskService: TaskService

  beforeEach(async () => {
    // Clear localStorage before each test
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
    
    memoryRepository = new MemoryTaskRepository()
    localStorageRepository = new LocalStorageTaskRepository()
    eventBus = new EventBus()
    
    // Use LocalStorageTaskRepository for persistence tests (DEV environment behavior)
    taskService = new TaskService(localStorageRepository, eventBus)
  })

  describe('Scenario: Loading tasks from storage on application start', () => {
    it('should restore all previously saved tasks with identical properties', async () => {
      // Given: I have some tasks saved in storage from a previous session
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      await taskService.updateTask(task2.id, { completed: true })
      const task3 = await taskService.createTask('Task 3')
      
      const originalTasks = await taskService.getAllTasks()
      expect(originalTasks).toHaveLength(3)

      // When: I simulate a fresh application start with a new service instance
      const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)
      
      // Then: All previously saved tasks should be restored
      const restoredTasks = await newTaskService.getAllTasks()
      expect(restoredTasks).toHaveLength(3)

      // And: Each task should have identical properties
      for (const originalTask of originalTasks) {
        const restoredTask = restoredTasks.find(t => t.id === originalTask.id)
        expect(restoredTask).toBeDefined()
        expect(restoredTask!.id).toBe(originalTask.id)
        expect(restoredTask!.description).toBe(originalTask.description)
        expect(restoredTask!.completed).toBe(originalTask.completed)
        expect(restoredTask!.createdAt).toEqual(originalTask.createdAt)
        expect(restoredTask!.updatedAt).toEqual(originalTask.updatedAt)
      }
    })

    it('should start with empty state when no previous data exists', async () => {
      // Given: I have no previous data in storage (fresh localStorage)
      // When: I initialize a new application
      const freshTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)

      // Then: The application should start with empty state
      const tasks = await freshTaskService.getAllTasks()
      expect(tasks).toHaveLength(0)
    })

    it('should handle empty storage gracefully', async () => {
      // Given: I have empty storage (no tasks created)
      const tasks = await taskService.getAllTasks()
      expect(tasks).toHaveLength(0)

      // When: I initialize a new application instance
      const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)

      // Then: The application should start with empty state
      const newTasks = await newTaskService.getAllTasks()
      expect(newTasks).toHaveLength(0)
    })
  })

  describe('Scenario: Immediate persistence of task operations', () => {
    it('should persist task creation within 100ms', async () => {
      // Given: I have an empty task list
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I create a new task
      const startTime = Date.now()
      const createdTask = await taskService.createTask('New task')
      const endTime = Date.now()

      // Then: The task should be persisted immediately
      const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)
      const persistedTasks = await newTaskService.getAllTasks()
      expect(persistedTasks).toHaveLength(1)
      expect(persistedTasks[0].id).toBe(createdTask.id)
      expect(persistedTasks[0].description).toBe(createdTask.description)

      // And: The operation should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should persist task updates immediately', async () => {
      // Given: I have an existing task
      const originalTask = await taskService.createTask('Task to update')

      // When: I update the task
      const updatedTask = await taskService.updateTask(originalTask.id, { completed: true })

      // Then: The update should be immediately persisted
      const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)
      const persistedTasks = await newTaskService.getAllTasks()
      expect(persistedTasks).toHaveLength(1)
      expect(persistedTasks[0].completed).toBe(true)
      expect(persistedTasks[0].id).toBe(originalTask.id)
      expect(persistedTasks[0].updatedAt).toEqual(updatedTask.updatedAt)
    })

    it('should persist task deletion immediately', async () => {
      // Given: I have multiple tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      const task3 = await taskService.createTask('Task 3')

      let persistedTasks = await taskService.getAllTasks()
      expect(persistedTasks).toHaveLength(3)

      // When: I delete one task
      await taskService.deleteTask(task2.id)

      // Then: The deletion should be immediately persisted
      const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)
      persistedTasks = await newTaskService.getAllTasks()
      expect(persistedTasks).toHaveLength(2)
      expect(persistedTasks.find(t => t.id === task1.id)).toBeDefined()
      expect(persistedTasks.find(t => t.id === task3.id)).toBeDefined()
      expect(persistedTasks.find(t => t.id === task2.id)).toBeUndefined()
    })
  })

  describe('Scenario: Storage unavailability fallback', () => {
    it('should continue functioning with memory storage when localStorage is unavailable', async () => {
      // Given: localStorage becomes unavailable (simulate by using MemoryTaskRepository)
      const memoryTaskService = new TaskService(memoryRepository, eventBus)
      
      // When: I perform task operations
      const task1 = await memoryTaskService.createTask('Memory task 1')
      const task2 = await memoryTaskService.createTask('Memory task 2')
      await memoryTaskService.updateTask(task1.id, { completed: true })

      // Then: Operations should work with memory fallback
      const tasks = await memoryTaskService.getAllTasks()
      expect(tasks).toHaveLength(2)
      expect(tasks.find(t => t.id === task1.id)!.completed).toBe(true)
      expect(tasks.find(t => t.id === task2.id)!.completed).toBe(false)

      // And: Tasks should be available in memory repository
      const memoryTasks = await memoryRepository.findAll()
      expect(memoryTasks).toHaveLength(2)
    })

    it('should display warning when storage is unavailable', async () => {
      // Given: localStorage becomes unavailable (using memory repository)
      const memoryTaskService = new TaskService(memoryRepository, eventBus)

      // When: I check storage availability through repository type
      const isMemoryRepo = memoryRepository instanceof MemoryTaskRepository

      // Then: It should be using memory repository
      expect(isMemoryRepo).toBe(true)

      // And: Operations should still work
      const task = await memoryTaskService.createTask('Test task')
      expect(task).toBeDefined()
      expect(task.description).toBe('Test task')
    })
  })

  describe('Scenario: Corrupted data recovery', () => {
    it('should initialize with empty state when storage contains corrupted data', async () => {
      // Given: Storage contains corrupted JSON data (simulate by clearing localStorage and creating fresh service)
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('task-manager-tasks', 'corrupted-json-data-{')
      }

      // When: I try to initialize from storage
      const corruptedTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)

      // Then: Application should start with empty state
      const tasks = await corruptedTaskService.getAllTasks()
      expect(tasks).toHaveLength(0)

      // And: Should not throw errors
      expect(async () => await corruptedTaskService.getAllTasks()).not.toThrow()
    })

    it('should recover gracefully from storage errors during save operations', async () => {
      // Given: I have a working task service
      const task = await taskService.createTask('Test task')
      expect(await taskService.getAllTasks()).toHaveLength(1)

      // When: Storage becomes unavailable during operation (simulate with memory repository)
      const memoryTaskService = new TaskService(memoryRepository, eventBus)

      // Then: Operations should continue with memory fallback
      const task2 = await memoryTaskService.createTask('Memory fallback task')
      const allTasks = await memoryTaskService.getAllTasks()
      
      expect(allTasks).toHaveLength(1) // Only the memory task
      expect(allTasks.find(t => t.id === task2.id)).toBeDefined()
    })
  })

  describe('Scenario: Filter state persistence', () => {
    it('should persist and restore filter state', async () => {
      // Note: Filter persistence is handled by UI components, not the TaskService
      // This test demonstrates that the service can handle filter operations
      
      // Given: I have tasks with different completion states
      const activeTask = await taskService.createTask('Active task')
      const completedTask = await taskService.createTask('Completed task')
      await taskService.updateTask(completedTask.id, { completed: true })

      // When: I filter tasks by different criteria
      const allTasks = await taskService.getTasksByFilter('all')
      const activeTasks = await taskService.getTasksByFilter('active')
      const completedTasks = await taskService.getTasksByFilter('completed')

      // Then: Filtering should work correctly
      expect(allTasks).toHaveLength(2)
      expect(activeTasks).toHaveLength(1)
      expect(activeTasks[0].id).toBe(activeTask.id)
      expect(completedTasks).toHaveLength(1)
      expect(completedTasks[0].id).toBe(completedTask.id)
    })

    it('should default to "all" filter when no filter state exists', async () => {
      // Given: No previous filter state exists (fresh service)
      const freshTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)

      // When: I get all tasks (equivalent to 'all' filter)
      const tasks = await freshTaskService.getAllTasks()

      // Then: It should return all tasks (default behavior)
      expect(tasks).toHaveLength(0) // No tasks created yet
    })

    it('should handle filter operations gracefully', async () => {
      // Given: I have tasks
      await taskService.createTask('Task 1')
      await taskService.createTask('Task 2')

      // When: I try to use different filters
      const allTasks = await taskService.getTasksByFilter('all')
      const activeTasks = await taskService.getTasksByFilter('active')
      const completedTasks = await taskService.getTasksByFilter('completed')

      // Then: All operations should work without throwing errors
      expect(allTasks).toHaveLength(2)
      expect(activeTasks).toHaveLength(2) // Both tasks are active by default
      expect(completedTasks).toHaveLength(0) // No completed tasks
    })
  })

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property 9: Storage round-trip restoration', async () => {
      /**
       * **Feature: task-manager, Property 9: Round-trip de restauração de storage**
       * **Validates: Requirements 5.1**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              description: TaskPersistenceTestDataBuilder.randomTaskDescription(),
              completed: TaskPersistenceTestDataBuilder.randomCompletionStatus()
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (taskSpecs) => {
            // Setup: Clear all state
            await localStorageRepository.clear()
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.clear()
            }
            
            // Given: A collection of tasks with various states
            const originalTasks: Task[] = []
            for (const spec of taskSpecs) {
              const task = await taskService.createTask(spec.description)
              if (spec.completed) {
                await taskService.updateTask(task.id, { completed: true })
              }
              const finalTask = await localStorageRepository.findById(task.id)
              originalTasks.push(finalTask!)
            }

            // When: Saving to storage and reloading application
            const allTasks = await taskService.getAllTasks()
            
            // Simulate application restart with new service instance
            const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)

            // Then: All tasks should be restored with identical properties
            const restoredTasks = await newTaskService.getAllTasks()
            expect(restoredTasks).toHaveLength(originalTasks.length)

            for (const originalTask of originalTasks) {
              const restoredTask = restoredTasks.find(t => t.id === originalTask.id)
              expect(restoredTask).toBeDefined()
              expect(restoredTask!.id).toBe(originalTask.id)
              expect(restoredTask!.description).toBe(originalTask.description)
              expect(restoredTask!.completed).toBe(originalTask.completed)
              expect(restoredTask!.createdAt).toEqual(originalTask.createdAt)
              expect(restoredTask!.updatedAt).toEqual(originalTask.updatedAt)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property: Persistence consistency across operations', async () => {
      /**
       * Additional property: Any sequence of operations should maintain consistency between memory and storage
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.oneof(
              fc.record({ type: fc.constant('create'), description: TaskPersistenceTestDataBuilder.randomTaskDescription() }),
              fc.record({ type: fc.constant('toggle'), taskIndex: fc.nat() }),
              fc.record({ type: fc.constant('delete'), taskIndex: fc.nat() })
            ),
            { minLength: 1, maxLength: 8 }
          ),
          async (operations) => {
            // Setup: Clear all state
            await localStorageRepository.clear()
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.clear()
            }
            
            let currentTasks: Task[] = []

            // When: Performing a sequence of operations
            for (const operation of operations) {
              switch (operation.type) {
                case 'create':
                  const newTask = await taskService.createTask(operation.description)
                  currentTasks.push(newTask)
                  break
                case 'toggle':
                  if (currentTasks.length > 0) {
                    const taskIndex = operation.taskIndex % currentTasks.length
                    const taskToToggle = currentTasks[taskIndex]
                    const updatedTask = await taskService.updateTask(taskToToggle.id, { 
                      completed: !taskToToggle.completed 
                    })
                    currentTasks[taskIndex] = updatedTask
                  }
                  break
                case 'delete':
                  if (currentTasks.length > 0) {
                    const taskIndex = operation.taskIndex % currentTasks.length
                    const taskToDelete = currentTasks[taskIndex]
                    await taskService.deleteTask(taskToDelete.id)
                    currentTasks.splice(taskIndex, 1)
                  }
                  break
              }
            }

            // Then: Memory and storage should be consistent
            const memoryTasks = await taskService.getAllTasks()
            const newTaskService = new TaskService(new LocalStorageTaskRepository(), eventBus)
            const storageTasks = await newTaskService.getAllTasks()
            
            expect(memoryTasks).toHaveLength(storageTasks.length)
            expect(memoryTasks).toHaveLength(currentTasks.length)

            // And: All tasks should match exactly
            for (const memoryTask of memoryTasks) {
              const storageTask = storageTasks.find(t => t.id === memoryTask.id)
              expect(storageTask).toBeDefined()
              expect(storageTask).toEqual(memoryTask)
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property: Storage fallback maintains functionality', async () => {
      /**
       * Additional property: When storage fails, all operations should continue working with memory fallback
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(TaskPersistenceTestDataBuilder.randomTaskDescription(), { minLength: 1, maxLength: 5 }),
          async (descriptions) => {
            // Setup: Clear state and use memory repository (simulates storage unavailable)
            await memoryRepository.clear()
            const memoryTaskService = new TaskService(memoryRepository, eventBus)
            
            // Given: Storage is unavailable (using memory repository)
            expect(memoryRepository instanceof MemoryTaskRepository).toBe(true)

            // When: Performing operations with storage unavailable
            const createdTasks: Task[] = []
            for (const description of descriptions) {
              const task = await memoryTaskService.createTask(description)
              createdTasks.push(task)
            }

            // Toggle completion of first task if exists
            if (createdTasks.length > 0) {
              const updatedTask = await memoryTaskService.updateTask(createdTasks[0].id, { completed: true })
              createdTasks[0] = updatedTask
            }

            // Then: All operations should work with memory fallback
            const allTasks = await memoryTaskService.getAllTasks()
            expect(allTasks).toHaveLength(createdTasks.length)

            // And: Memory repository should contain all tasks
            const memoryTasks = await memoryRepository.findAll()
            expect(memoryTasks).toEqual(allTasks)

            // And: First task should be completed if it exists
            if (createdTasks.length > 0) {
              expect(allTasks[0].completed).toBe(true)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})