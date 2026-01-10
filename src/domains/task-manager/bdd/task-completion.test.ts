import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { Task, TaskSchemaUtils } from '../../../shared/contracts/task-manager/v1/TaskSchema'
import { TaskService } from '../service/TaskService'
import { MemoryTaskRepository } from '../repository/MemoryTaskRepository'
import { EventBus } from '../../../shared/infrastructure/EventBus'

/**
 * BDD Scenarios for Task Completion
 * 
 * This file implements BDD scenarios for task completion functionality.
 * Uses official implementations via DI (No-Mocks Drift).
 * Uses official Zod contracts for validation (No-Contract Drift).
 * 
 * Properties tested:
 * - Property 4: Round-trip de alternância de conclusão de tarefa
 * - Property 5: Persistência de conclusão de tarefa
 */

// Test Data Builder using Zod contracts
class TaskCompletionTestDataBuilder {
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
}

describe('BDD: Task Completion Scenarios', () => {
  let repository: MemoryTaskRepository
  let eventBus: EventBus
  let taskService: TaskService

  beforeEach(async () => {
    repository = new MemoryTaskRepository()
    eventBus = new EventBus()
    taskService = new TaskService(repository, eventBus)
  })

  describe('Scenario: Toggling task completion status', () => {
    it('should toggle incomplete task to complete', async () => {
      // Given: I have an incomplete task
      const createdTask = await taskService.createTask('Buy groceries')
      expect(createdTask.completed).toBe(false)

      // When: I toggle the task completion
      const toggledTask = await taskService.toggleTaskCompletion(createdTask.id)

      // Then: The task should be marked as completed
      expect(toggledTask.completed).toBe(true)
      expect(toggledTask.id).toBe(createdTask.id)
      expect(toggledTask.description).toBe(createdTask.description)
      expect(toggledTask.createdAt).toEqual(createdTask.createdAt)
      expect(toggledTask.updatedAt.getTime()).toBeGreaterThanOrEqual(createdTask.updatedAt.getTime())

      // And: The change should be persisted in storage
      const persistedTask = await repository.findById(createdTask.id)
      expect(persistedTask).not.toBeNull()
      expect(persistedTask!.completed).toBe(true)
    })

    it('should toggle complete task to incomplete', async () => {
      // Given: I have a completed task
      const createdTask = await taskService.createTask('Buy groceries')
      const completedTask = await taskService.toggleTaskCompletion(createdTask.id)
      expect(completedTask.completed).toBe(true)

      // When: I toggle the task completion again
      const toggledTask = await taskService.toggleTaskCompletion(completedTask.id)

      // Then: The task should be marked as incomplete
      expect(toggledTask.completed).toBe(false)
      expect(toggledTask.id).toBe(createdTask.id)
      expect(toggledTask.description).toBe(createdTask.description)
      expect(toggledTask.createdAt).toEqual(createdTask.createdAt)

      // And: The change should be persisted in storage
      const persistedTask = await repository.findById(createdTask.id)
      expect(persistedTask).not.toBeNull()
      expect(persistedTask!.completed).toBe(false)
    })

    it('should handle multiple tasks with different completion states', async () => {
      // Given: I have multiple tasks with different completion states
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      const task3 = await taskService.createTask('Task 3')

      // Complete task2
      await taskService.toggleTaskCompletion(task2.id)

      // When: I toggle completion on different tasks
      const toggledTask1 = await taskService.toggleTaskCompletion(task1.id) // incomplete -> complete
      const toggledTask2 = await taskService.toggleTaskCompletion(task2.id) // complete -> incomplete

      // Then: Each task should have the correct completion state
      expect(toggledTask1.completed).toBe(true)
      expect(toggledTask2.completed).toBe(false)

      // And: Task3 should remain unchanged
      const unchangedTask3 = await repository.findById(task3.id)
      expect(unchangedTask3!.completed).toBe(false)

      // And: All changes should be persisted
      const allTasks = await repository.findAll()
      expect(allTasks).toHaveLength(3)
      
      const persistedTask1 = allTasks.find(t => t.id === task1.id)!
      const persistedTask2 = allTasks.find(t => t.id === task2.id)!
      const persistedTask3 = allTasks.find(t => t.id === task3.id)!

      expect(persistedTask1.completed).toBe(true)
      expect(persistedTask2.completed).toBe(false)
      expect(persistedTask3.completed).toBe(false)
    })
  })

  describe('Scenario: Task completion persistence', () => {
    it('should immediately persist completion status changes', async () => {
      // Given: I have a task
      const createdTask = await taskService.createTask('Important task')

      // When: I change the completion status
      const completedTask = await taskService.toggleTaskCompletion(createdTask.id)

      // Then: The change should be immediately available in storage
      const persistedTask = await repository.findById(createdTask.id)
      expect(persistedTask).not.toBeNull()
      expect(persistedTask!.completed).toBe(true)
      expect(persistedTask!.updatedAt).toEqual(completedTask.updatedAt)

      // When: I toggle it back
      const incompletedTask = await taskService.toggleTaskCompletion(createdTask.id)

      // Then: The change should be immediately persisted again
      const persistedTaskAgain = await repository.findById(createdTask.id)
      expect(persistedTaskAgain).not.toBeNull()
      expect(persistedTaskAgain!.completed).toBe(false)
      expect(persistedTaskAgain!.updatedAt).toEqual(incompletedTask.updatedAt)
    })

    it('should update timestamp when completion status changes', async () => {
      // Given: I have a task
      const createdTask = await taskService.createTask('Time-sensitive task')
      const originalUpdatedAt = createdTask.updatedAt

      // Wait a small amount to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      // When: I toggle completion
      const toggledTask = await taskService.toggleTaskCompletion(createdTask.id)

      // Then: The updatedAt timestamp should be different
      expect(toggledTask.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())

      // And: The createdAt should remain unchanged
      expect(toggledTask.createdAt).toEqual(createdTask.createdAt)
    })
  })

  describe('Scenario: Error handling for task completion', () => {
    it('should throw error when trying to toggle non-existent task', async () => {
      // Given: I have no tasks
      const allTasks = await taskService.getAllTasks()
      expect(allTasks).toHaveLength(0)

      // When: I try to toggle a non-existent task
      // Then: It should throw an error
      await expect(taskService.toggleTaskCompletion('non-existent-id')).rejects.toThrow('Task with id non-existent-id not found')

      // And: Storage should remain unchanged
      const tasksAfterError = await repository.findAll()
      expect(tasksAfterError).toHaveLength(0)
    })

    it('should not affect other tasks when toggle fails', async () => {
      // Given: I have some existing tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      await taskService.toggleTaskCompletion(task1.id) // Complete task1

      const initialTasks = await repository.findAll()
      expect(initialTasks).toHaveLength(2)

      // When: I try to toggle a non-existent task
      await expect(taskService.toggleTaskCompletion('invalid-id')).rejects.toThrow()

      // Then: Existing tasks should remain unchanged
      const tasksAfterError = await repository.findAll()
      expect(tasksAfterError).toHaveLength(2)
      
      const task1AfterError = tasksAfterError.find(t => t.id === task1.id)!
      const task2AfterError = tasksAfterError.find(t => t.id === task2.id)!
      
      expect(task1AfterError.completed).toBe(true)
      expect(task2AfterError.completed).toBe(false)
    })
  })

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property 4: Round-trip completion toggle', async () => {
      /**
       * **Feature: task-manager, Property 4: Round-trip de alternância de conclusão de tarefa**
       * **Validates: Requirements 2.1, 2.2, 2.4**
       */
      await fc.assert(
        fc.asyncProperty(
          TaskCompletionTestDataBuilder.randomTaskDescription(),
          TaskCompletionTestDataBuilder.randomCompletionStatus(),
          async (description, initialCompletionStatus) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: A task with any initial completion status
            const createdTask = await taskService.createTask(description)
            if (initialCompletionStatus !== createdTask.completed) {
              await taskService.toggleTaskCompletion(createdTask.id)
            }
            
            const taskWithInitialStatus = await repository.findById(createdTask.id)
            expect(taskWithInitialStatus!.completed).toBe(initialCompletionStatus)

            // When: Toggling completion twice (round-trip)
            const firstToggle = await taskService.toggleTaskCompletion(createdTask.id)
            const secondToggle = await taskService.toggleTaskCompletion(createdTask.id)

            // Then: Should return to original state
            expect(secondToggle.completed).toBe(initialCompletionStatus)
            expect(secondToggle.id).toBe(createdTask.id)
            expect(secondToggle.description).toBe(description.trim()) // Description is trimmed during creation
            expect(secondToggle.createdAt).toEqual(createdTask.createdAt)

            // And: First toggle should have opposite state
            expect(firstToggle.completed).toBe(!initialCompletionStatus)

            // And: Final state should be persisted
            const finalPersistedTask = await repository.findById(createdTask.id)
            expect(finalPersistedTask!.completed).toBe(initialCompletionStatus)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 5: Completion status persistence', async () => {
      /**
       * **Feature: task-manager, Property 5: Persistência de conclusão de tarefa**
       * **Validates: Requirements 2.3**
       */
      await fc.assert(
        fc.asyncProperty(
          TaskCompletionTestDataBuilder.randomTaskDescription(),
          async (description) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: A task
            const createdTask = await taskService.createTask(description)
            const initialCompletionStatus = createdTask.completed

            // When: Changing completion status
            const toggledTask = await taskService.toggleTaskCompletion(createdTask.id)

            // Then: Change should be immediately reflected in storage
            const persistedTask = await repository.findById(createdTask.id)
            expect(persistedTask).not.toBeNull()
            expect(persistedTask!.completed).toBe(!initialCompletionStatus)
            expect(persistedTask!.completed).toBe(toggledTask.completed)
            expect(persistedTask!.updatedAt).toEqual(toggledTask.updatedAt)

            // And: All other properties should remain unchanged
            expect(persistedTask!.id).toBe(createdTask.id)
            expect(persistedTask!.description).toBe(createdTask.description)
            expect(persistedTask!.createdAt).toEqual(createdTask.createdAt)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property: Multiple completion changes preserve consistency', async () => {
      /**
       * Additional property: Multiple rapid completion changes should maintain consistency
       */
      await fc.assert(
        fc.asyncProperty(
          TaskCompletionTestDataBuilder.randomTaskDescription(),
          fc.array(fc.boolean(), { minLength: 1, maxLength: 10 }),
          async (description, toggleSequence) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: A task
            const createdTask = await taskService.createTask(description)
            let currentTask = createdTask

            // When: Applying a sequence of toggles
            for (const _ of toggleSequence) {
              currentTask = await taskService.toggleTaskCompletion(currentTask.id)
            }

            // Then: Final state should be persisted correctly
            const persistedTask = await repository.findById(createdTask.id)
            expect(persistedTask).not.toBeNull()
            expect(persistedTask!.completed).toBe(currentTask.completed)
            expect(persistedTask!.id).toBe(createdTask.id)
            expect(persistedTask!.description).toBe(createdTask.description)
            expect(persistedTask!.createdAt).toEqual(createdTask.createdAt)

            // And: Expected final completion state should match toggle count
            const expectedFinalState = toggleSequence.length % 2 === 1 ? !createdTask.completed : createdTask.completed
            expect(currentTask.completed).toBe(expectedFinalState)
          }
        ),
        { numRuns: 50 }
      )
    })
  })
})