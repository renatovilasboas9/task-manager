import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * BDD Scenarios for Task Deletion
 * 
 * This file implements BDD scenarios for task deletion functionality.
 * Uses temporary scaffolding (mocks/MemoryRepository) to enable BDD-first development.
 * 
 * Properties tested:
 * - Property 6: Remoção e persistência de deleção de tarefa
 */

// Temporary scaffolding - will be replaced with official implementations
interface Task {
  id: string
  description: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

interface TaskRepository {
  save(task: Task): Promise<Task>
  findById(id: string): Promise<Task | null>
  findAll(): Promise<Task[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

interface TaskService {
  createTask(description: string): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  getAllTasks(): Promise<Task[]>
}

// Mock/Memory implementations for BDD scaffolding
class MemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = []

  async save(task: Task): Promise<Task> {
    const existingIndex = this.tasks.findIndex(t => t.id === task.id)
    if (existingIndex >= 0) {
      this.tasks[existingIndex] = { ...task, updatedAt: new Date() }
    } else {
      this.tasks.push(task)
    }
    return this.tasks.find(t => t.id === task.id)!
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.find(t => t.id === id) || null
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks]
  }

  async delete(id: string): Promise<void> {
    const index = this.tasks.findIndex(t => t.id === id)
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`)
    }
    this.tasks.splice(index, 1)
  }

  async clear(): Promise<void> {
    this.tasks = []
  }
}

class MockTaskService implements TaskService {
  constructor(private repository: TaskRepository) {}

  async createTask(description: string): Promise<Task> {
    // Validate input - reject empty/whitespace-only descriptions
    if (!description || description.trim().length === 0) {
      throw new Error('Task description cannot be empty')
    }

    // Validate length (max 500 characters as per design)
    if (description.length > 500) {
      throw new Error('Task description cannot exceed 500 characters')
    }

    const task: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: description.trim(),
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    return await this.repository.save(task)
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const existingTask = await this.repository.findById(id)
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`)
    }

    const updatedTask: Task = {
      ...existingTask,
      ...updates,
      id: existingTask.id, // Ensure ID cannot be changed
      createdAt: existingTask.createdAt, // Ensure createdAt cannot be changed
      updatedAt: new Date()
    }

    return await this.repository.save(updatedTask)
  }

  async deleteTask(id: string): Promise<void> {
    // Verify task exists before attempting deletion
    const existingTask = await this.repository.findById(id)
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`)
    }

    await this.repository.delete(id)
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.repository.findAll()
  }
}

// Test Data Builder
class TaskDeletionTestDataBuilder {
  static createTask(description: string, completed: boolean = false): Task {
    return {
      id: `test-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: description.trim(),
      completed,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  static randomTaskDescription(): fc.Arbitrary<string> {
    return fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0)
  }

  static randomCompletionStatus(): fc.Arbitrary<boolean> {
    return fc.boolean()
  }

  static createMultipleTasks(count: number): Task[] {
    return Array.from({ length: count }, (_, i) => 
      this.createTask(`Task ${i + 1}`, i % 2 === 0)
    )
  }
}

describe('BDD: Task Deletion Scenarios', () => {
  let repository: MemoryTaskRepository
  let taskService: MockTaskService

  beforeEach(async () => {
    repository = new MemoryTaskRepository()
    taskService = new MockTaskService(repository)
  })

  describe('Scenario: Deleting a single task', () => {
    it('should remove task from list and storage', async () => {
      // Given: I have a task in the list
      const createdTask = await taskService.createTask('Task to delete')
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(1)
      expect(initialTasks[0]).toEqual(createdTask)

      // When: I delete the task
      await taskService.deleteTask(createdTask.id)

      // Then: The task should be removed from the list
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(0)

      // And: The task should be removed from storage
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)

      // And: The task should not be findable by ID
      const deletedTask = await repository.findById(createdTask.id)
      expect(deletedTask).toBeNull()
    })

    it('should handle deletion of completed task', async () => {
      // Given: I have a completed task
      const createdTask = await taskService.createTask('Completed task to delete')
      const completedTask = await taskService.updateTask(createdTask.id, { completed: true })
      
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(1)
      expect(initialTasks[0].completed).toBe(true)

      // When: I delete the completed task
      await taskService.deleteTask(completedTask.id)

      // Then: The task should be removed from the list
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(0)

      // And: The task should be removed from storage
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)
    })
  })

  describe('Scenario: Deleting task from multiple tasks list', () => {
    it('should remove only the specified task and maintain order of remaining tasks', async () => {
      // Given: I have multiple tasks in a specific order
      const task1 = await taskService.createTask('First task')
      const task2 = await taskService.createTask('Second task')
      const task3 = await taskService.createTask('Third task')
      const task4 = await taskService.createTask('Fourth task')

      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(4)

      // When: I delete the second task (middle of the list)
      await taskService.deleteTask(task2.id)

      // Then: Only the specified task should be removed
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(3)

      // And: The remaining tasks should maintain their order and properties
      expect(tasksAfterDeletion).toContainEqual(task1)
      expect(tasksAfterDeletion).toContainEqual(task3)
      expect(tasksAfterDeletion).toContainEqual(task4)
      expect(tasksAfterDeletion).not.toContainEqual(task2)

      // And: The order should be preserved (task1, task3, task4)
      const taskIds = tasksAfterDeletion.map(t => t.id)
      expect(taskIds.indexOf(task1.id)).toBeLessThan(taskIds.indexOf(task3.id))
      expect(taskIds.indexOf(task3.id)).toBeLessThan(taskIds.indexOf(task4.id))

      // And: Storage should reflect the same state
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(3)
      expect(persistedTasks).toContainEqual(task1)
      expect(persistedTasks).toContainEqual(task3)
      expect(persistedTasks).toContainEqual(task4)
    })

    it('should handle deletion of first task', async () => {
      // Given: I have multiple tasks
      const task1 = await taskService.createTask('First task')
      const task2 = await taskService.createTask('Second task')
      const task3 = await taskService.createTask('Third task')

      // When: I delete the first task
      await taskService.deleteTask(task1.id)

      // Then: The remaining tasks should be preserved in order
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(2)
      expect(tasksAfterDeletion).toContainEqual(task2)
      expect(tasksAfterDeletion).toContainEqual(task3)

      // And: Order should be maintained
      const taskIds = tasksAfterDeletion.map(t => t.id)
      expect(taskIds.indexOf(task2.id)).toBeLessThan(taskIds.indexOf(task3.id))
    })

    it('should handle deletion of last task', async () => {
      // Given: I have multiple tasks
      const task1 = await taskService.createTask('First task')
      const task2 = await taskService.createTask('Second task')
      const task3 = await taskService.createTask('Third task')

      // When: I delete the last task
      await taskService.deleteTask(task3.id)

      // Then: The remaining tasks should be preserved in order
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(2)
      expect(tasksAfterDeletion).toContainEqual(task1)
      expect(tasksAfterDeletion).toContainEqual(task2)

      // And: Order should be maintained
      const taskIds = tasksAfterDeletion.map(t => t.id)
      expect(taskIds.indexOf(task1.id)).toBeLessThan(taskIds.indexOf(task2.id))
    })
  })

  describe('Scenario: Deleting the last remaining task', () => {
    it('should result in empty state when deleting the last task', async () => {
      // Given: I have only one task
      const singleTask = await taskService.createTask('Only task')
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(1)

      // When: I delete the last task
      await taskService.deleteTask(singleTask.id)

      // Then: The list should be empty
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(0)

      // And: Storage should be empty
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)
    })

    it('should handle appropriate empty state after deleting all tasks one by one', async () => {
      // Given: I have multiple tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      const task3 = await taskService.createTask('Task 3')

      // When: I delete all tasks one by one
      await taskService.deleteTask(task1.id)
      let remainingTasks = await taskService.getAllTasks()
      expect(remainingTasks).toHaveLength(2)

      await taskService.deleteTask(task2.id)
      remainingTasks = await taskService.getAllTasks()
      expect(remainingTasks).toHaveLength(1)

      await taskService.deleteTask(task3.id)
      remainingTasks = await taskService.getAllTasks()

      // Then: The list should be completely empty
      expect(remainingTasks).toHaveLength(0)

      // And: Storage should be empty
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)
    })
  })

  describe('Scenario: Error handling for task deletion', () => {
    it('should throw error when trying to delete non-existent task', async () => {
      // Given: I have some tasks
      const existingTask = await taskService.createTask('Existing task')
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(1)

      // When: I try to delete a non-existent task
      // Then: It should throw an error
      await expect(taskService.deleteTask('non-existent-id')).rejects.toThrow('Task with id non-existent-id not found')

      // And: Existing tasks should remain unchanged
      const tasksAfterError = await taskService.getAllTasks()
      expect(tasksAfterError).toHaveLength(1)
      expect(tasksAfterError[0]).toEqual(existingTask)

      // And: Storage should remain unchanged
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(1)
      expect(persistedTasks[0]).toEqual(existingTask)
    })

    it('should not affect other tasks when deletion fails', async () => {
      // Given: I have multiple tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      const task3 = await taskService.createTask('Task 3')

      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(3)

      // When: I try to delete a non-existent task
      await expect(taskService.deleteTask('invalid-id')).rejects.toThrow()

      // Then: All existing tasks should remain unchanged
      const tasksAfterError = await taskService.getAllTasks()
      expect(tasksAfterError).toHaveLength(3)
      expect(tasksAfterError).toContainEqual(task1)
      expect(tasksAfterError).toContainEqual(task2)
      expect(tasksAfterError).toContainEqual(task3)

      // And: Storage should remain unchanged
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(3)
    })

    it('should handle deletion from empty list gracefully', async () => {
      // Given: I have no tasks
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I try to delete a task from empty list
      // Then: It should throw an error
      await expect(taskService.deleteTask('any-id')).rejects.toThrow('Task with id any-id not found')

      // And: The list should remain empty
      const tasksAfterError = await taskService.getAllTasks()
      expect(tasksAfterError).toHaveLength(0)
    })
  })

  describe('Scenario: Task deletion with mixed completion states', () => {
    it('should handle deletion of tasks with different completion states', async () => {
      // Given: I have tasks with mixed completion states
      const incompleteTask1 = await taskService.createTask('Incomplete task 1')
      const completeTask = await taskService.createTask('Complete task')
      const incompleteTask2 = await taskService.createTask('Incomplete task 2')

      // Mark one task as complete
      await taskService.updateTask(completeTask.id, { completed: true })

      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(3)

      // When: I delete the completed task
      await taskService.deleteTask(completeTask.id)

      // Then: Only incomplete tasks should remain
      const tasksAfterDeletion = await taskService.getAllTasks()
      expect(tasksAfterDeletion).toHaveLength(2)
      expect(tasksAfterDeletion).toContainEqual(incompleteTask1)
      expect(tasksAfterDeletion).toContainEqual(incompleteTask2)

      // And: All remaining tasks should be incomplete
      tasksAfterDeletion.forEach(task => {
        expect(task.completed).toBe(false)
      })

      // And: Storage should reflect the same state
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(2)
      persistedTasks.forEach(task => {
        expect(task.completed).toBe(false)
      })
    })
  })

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property 6: Task removal and deletion persistence', async () => {
      /**
       * **Feature: task-manager, Property 6: Remoção e persistência de deleção de tarefa**
       * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(TaskDeletionTestDataBuilder.randomTaskDescription(), { minLength: 1, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }),
          async (taskDescriptions, indexToDelete) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: Multiple tasks in the list
            const createdTasks: Task[] = []
            for (const description of taskDescriptions) {
              const task = await taskService.createTask(description)
              createdTasks.push(task)
            }

            const actualIndexToDelete = indexToDelete % createdTasks.length
            const taskToDelete = createdTasks[actualIndexToDelete]
            const expectedRemainingTasks = createdTasks.filter((_, i) => i !== actualIndexToDelete)

            // When: Deleting a task from the list
            await taskService.deleteTask(taskToDelete.id)

            // Then: Task should be removed from the displayed list
            const tasksAfterDeletion = await taskService.getAllTasks()
            expect(tasksAfterDeletion).toHaveLength(expectedRemainingTasks.length)
            expect(tasksAfterDeletion).not.toContainEqual(taskToDelete)

            // And: All remaining tasks should be present
            for (const expectedTask of expectedRemainingTasks) {
              expect(tasksAfterDeletion).toContainEqual(expectedTask)
            }

            // And: Task should be removed from storage
            const persistedTasks = await repository.findAll()
            expect(persistedTasks).toHaveLength(expectedRemainingTasks.length)
            expect(persistedTasks).not.toContainEqual(taskToDelete)

            // And: Deleted task should not be findable by ID
            const deletedTask = await repository.findById(taskToDelete.id)
            expect(deletedTask).toBeNull()

            // And: Order and state of remaining tasks should be preserved
            for (const expectedTask of expectedRemainingTasks) {
              const persistedTask = persistedTasks.find(t => t.id === expectedTask.id)
              expect(persistedTask).toBeDefined()
              expect(persistedTask).toEqual(expectedTask)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property: Deletion maintains list integrity', async () => {
      /**
       * Additional property: Deleting any task should maintain the integrity of the remaining list
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(TaskDeletionTestDataBuilder.randomTaskDescription(), { minLength: 2, maxLength: 8 }),
          async (taskDescriptions) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: Multiple tasks
            const createdTasks: Task[] = []
            for (const description of taskDescriptions) {
              const task = await taskService.createTask(description)
              createdTasks.push(task)
            }

            const initialCount = createdTasks.length
            const taskToDelete = createdTasks[Math.floor(Math.random() * createdTasks.length)]

            // When: Deleting one task
            await taskService.deleteTask(taskToDelete.id)

            // Then: List should have exactly one less task
            const remainingTasks = await taskService.getAllTasks()
            expect(remainingTasks).toHaveLength(initialCount - 1)

            // And: No duplicate tasks should exist
            const taskIds = remainingTasks.map(t => t.id)
            const uniqueIds = new Set(taskIds)
            expect(uniqueIds.size).toBe(taskIds.length)

            // And: All remaining tasks should be valid
            for (const task of remainingTasks) {
              expect(task.id).toBeTruthy()
              expect(task.description).toBeTruthy()
              expect(typeof task.completed).toBe('boolean')
              expect(task.createdAt).toBeInstanceOf(Date)
              expect(task.updatedAt).toBeInstanceOf(Date)
            }

            // And: Storage should match the list
            const persistedTasks = await repository.findAll()
            expect(persistedTasks).toHaveLength(remainingTasks.length)
            expect(persistedTasks).toEqual(remainingTasks)
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property: Multiple deletions preserve remaining tasks', async () => {
      /**
       * Additional property: Multiple deletions should preserve the integrity of remaining tasks
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(TaskDeletionTestDataBuilder.randomTaskDescription(), { minLength: 3, maxLength: 6 }),
          fc.integer({ min: 1, max: 2 }),
          async (taskDescriptions, numberOfDeletions) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: Multiple tasks
            const createdTasks: Task[] = []
            for (const description of taskDescriptions) {
              const task = await taskService.createTask(description)
              createdTasks.push(task)
            }

            const actualDeletions = Math.min(numberOfDeletions, createdTasks.length - 1)
            const tasksToDelete = createdTasks.slice(0, actualDeletions)
            const expectedRemainingTasks = createdTasks.slice(actualDeletions)

            // When: Deleting multiple tasks
            for (const taskToDelete of tasksToDelete) {
              await taskService.deleteTask(taskToDelete.id)
            }

            // Then: Correct number of tasks should remain
            const remainingTasks = await taskService.getAllTasks()
            expect(remainingTasks).toHaveLength(expectedRemainingTasks.length)

            // And: Only the expected tasks should remain
            for (const expectedTask of expectedRemainingTasks) {
              expect(remainingTasks).toContainEqual(expectedTask)
            }

            // And: Deleted tasks should not be present
            for (const deletedTask of tasksToDelete) {
              expect(remainingTasks).not.toContainEqual(deletedTask)
            }

            // And: Storage should match
            const persistedTasks = await repository.findAll()
            expect(persistedTasks).toEqual(remainingTasks)
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})