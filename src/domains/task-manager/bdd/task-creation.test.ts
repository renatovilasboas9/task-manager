import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * BDD Scenarios for Task Creation
 * 
 * This file implements BDD scenarios for task creation functionality.
 * Uses temporary scaffolding (mocks/MemoryRepository) to enable BDD-first development.
 * 
 * Properties tested:
 * - Property 1: Adição de tarefa cresce lista e persiste
 * - Property 2: Rejeição de tarefa vazia preserva estado
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
  findAll(): Promise<Task[]>
  clear(): Promise<void>
}

interface TaskService {
  createTask(description: string): Promise<Task>
  getAllTasks(): Promise<Task[]>
}

// Mock/Memory implementations for BDD scaffolding
class MemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = []

  async save(task: Task): Promise<Task> {
    const existingIndex = this.tasks.findIndex(t => t.id === task.id)
    if (existingIndex >= 0) {
      this.tasks[existingIndex] = task
    } else {
      this.tasks.push(task)
    }
    return task
  }

  async findAll(): Promise<Task[]> {
    return [...this.tasks]
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

  async getAllTasks(): Promise<Task[]> {
    return await this.repository.findAll()
  }
}

// Test Data Builder
class TaskTestDataBuilder {
  static validDescription(): fc.Arbitrary<string> {
    return fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0)
  }

  static emptyOrWhitespaceDescription(): fc.Arbitrary<string> {
    return fc.oneof(
      fc.constant(''),
      fc.string().filter(s => s.trim().length === 0 && s.length > 0)
    )
  }

  static createTask(description: string): Task {
    return {
      id: `test-task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      description: description.trim(),
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }
}

describe('BDD: Task Creation Scenarios', () => {
  let repository: MemoryTaskRepository
  let taskService: MockTaskService

  beforeEach(async () => {
    repository = new MemoryTaskRepository()
    taskService = new MockTaskService(repository)
  })

  describe('Scenario: Creating a valid task', () => {
    it('should add task to list and persist to storage', async () => {
      // Given: I have an empty task list
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I create a task with a valid description
      const description = 'Buy groceries'
      const createdTask = await taskService.createTask(description)

      // Then: The task should be created with correct properties
      expect(createdTask).toBeDefined()
      expect(createdTask.id).toBeTruthy()
      expect(createdTask.description).toBe(description)
      expect(createdTask.completed).toBe(false)
      expect(createdTask.createdAt).toBeInstanceOf(Date)
      expect(createdTask.updatedAt).toBeInstanceOf(Date)

      // And: The task list should grow by one
      const tasksAfterCreation = await taskService.getAllTasks()
      expect(tasksAfterCreation).toHaveLength(1)

      // And: The task should be persisted in storage
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(1)
      expect(persistedTasks[0]).toEqual(createdTask)
    })

    it('should handle multiple task creation correctly', async () => {
      // Given: I have an empty task list
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I create multiple tasks
      const task1 = await taskService.createTask('First task')
      const task2 = await taskService.createTask('Second task')
      const task3 = await taskService.createTask('Third task')

      // Then: All tasks should be in the list
      const allTasks = await taskService.getAllTasks()
      expect(allTasks).toHaveLength(3)

      // And: All tasks should be persisted
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(3)
      expect(persistedTasks).toContainEqual(task1)
      expect(persistedTasks).toContainEqual(task2)
      expect(persistedTasks).toContainEqual(task3)
    })
  })

  describe('Scenario: Attempting to create empty or invalid tasks', () => {
    it('should reject empty task description', async () => {
      // Given: I have an empty task list
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I try to create a task with empty description
      // Then: It should throw an error
      await expect(taskService.createTask('')).rejects.toThrow('Task description cannot be empty')

      // And: The task list should remain unchanged
      const tasksAfterAttempt = await taskService.getAllTasks()
      expect(tasksAfterAttempt).toHaveLength(0)

      // And: Storage should remain unchanged
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)
    })

    it('should reject whitespace-only task description', async () => {
      // Given: I have an empty task list
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I try to create a task with whitespace-only description
      const whitespaceDescriptions = ['   ', '\t\t', '\n\n', '  \t  \n  ']

      for (const description of whitespaceDescriptions) {
        // Then: It should throw an error
        await expect(taskService.createTask(description)).rejects.toThrow('Task description cannot be empty')
      }

      // And: The task list should remain unchanged
      const tasksAfterAttempts = await taskService.getAllTasks()
      expect(tasksAfterAttempts).toHaveLength(0)

      // And: Storage should remain unchanged
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)
    })

    it('should reject task description exceeding maximum length', async () => {
      // Given: I have an empty task list
      const initialTasks = await taskService.getAllTasks()
      expect(initialTasks).toHaveLength(0)

      // When: I try to create a task with description longer than 500 characters
      const longDescription = 'a'.repeat(501)

      // Then: It should throw an error
      await expect(taskService.createTask(longDescription)).rejects.toThrow('Task description cannot exceed 500 characters')

      // And: The task list should remain unchanged
      const tasksAfterAttempt = await taskService.getAllTasks()
      expect(tasksAfterAttempt).toHaveLength(0)

      // And: Storage should remain unchanged
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(0)
    })
  })

  describe('Scenario: Task creation with existing tasks', () => {
    it('should add new task to existing list without affecting other tasks', async () => {
      // Given: I have some existing tasks
      const existingTask1 = await taskService.createTask('Existing task 1')
      const existingTask2 = await taskService.createTask('Existing task 2')
      
      const tasksBeforeNewTask = await taskService.getAllTasks()
      expect(tasksBeforeNewTask).toHaveLength(2)

      // When: I create a new task
      const newTask = await taskService.createTask('New task')

      // Then: The new task should be added
      const tasksAfterNewTask = await taskService.getAllTasks()
      expect(tasksAfterNewTask).toHaveLength(3)

      // And: All tasks should be present (existing + new)
      expect(tasksAfterNewTask).toContainEqual(existingTask1)
      expect(tasksAfterNewTask).toContainEqual(existingTask2)
      expect(tasksAfterNewTask).toContainEqual(newTask)

      // And: All tasks should be persisted
      const persistedTasks = await repository.findAll()
      expect(persistedTasks).toHaveLength(3)
    })
  })

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property 1: Adding valid task grows list and persists', async () => {
      /**
       * **Feature: task-manager, Property 1: Adição de tarefa cresce lista e persiste**
       * **Validates: Requirements 1.1, 1.4**
       */
      await fc.assert(
        fc.asyncProperty(
          TaskTestDataBuilder.validDescription(),
          async (description) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: Current task list
            const initialTasks = await taskService.getAllTasks()
            const initialCount = initialTasks.length

            // When: Adding a valid task
            const createdTask = await taskService.createTask(description)

            // Then: List should grow by one
            const finalTasks = await taskService.getAllTasks()
            expect(finalTasks).toHaveLength(initialCount + 1)

            // And: New task should be in the list
            expect(finalTasks).toContainEqual(createdTask)

            // And: Task should be persisted in storage
            const persistedTasks = await repository.findAll()
            expect(persistedTasks).toContainEqual(createdTask)
            expect(persistedTasks).toHaveLength(initialCount + 1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 2: Rejecting empty task preserves state', async () => {
      /**
       * **Feature: task-manager, Property 2: Rejeição de tarefa vazia preserva estado**
       * **Validates: Requirements 1.2**
       */
      await fc.assert(
        fc.asyncProperty(
          TaskTestDataBuilder.emptyOrWhitespaceDescription(),
          async (emptyDescription) => {
            // Setup: Clear repository and add some tasks
            await repository.clear()
            const existingTask = await taskService.createTask('Existing task')
            
            // Given: Current state
            const initialTasks = await taskService.getAllTasks()
            const initialCount = initialTasks.length
            const initialPersisted = await repository.findAll()

            // When: Attempting to add empty/whitespace task
            // Then: Should throw error
            await expect(taskService.createTask(emptyDescription)).rejects.toThrow()

            // And: Task list should remain unchanged
            const finalTasks = await taskService.getAllTasks()
            expect(finalTasks).toHaveLength(initialCount)
            expect(finalTasks).toEqual(initialTasks)

            // And: Storage should remain unchanged
            const finalPersisted = await repository.findAll()
            expect(finalPersisted).toHaveLength(initialCount)
            expect(finalPersisted).toEqual(initialPersisted)
          }
        ),
        { numRuns: 100 }
      )
    })
  })
})