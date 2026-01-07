import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'

/**
 * BDD Scenarios for Task Persistence
 * 
 * This file implements BDD scenarios for task persistence functionality.
 * Uses temporary scaffolding (mocks/MemoryRepository) to enable BDD-first development.
 * 
 * Properties tested:
 * - Property 9: Round-trip de restauração de storage
 */

// Temporary scaffolding - will be replaced with official implementations
interface Task {
  id: string
  description: string
  completed: boolean
  createdAt: Date
  updatedAt: Date
}

type TaskFilter = 'all' | 'active' | 'completed'

interface StorageEngine {
  setItem(key: string, value: string): void
  getItem(key: string): string | null
  removeItem(key: string): void
  clear(): void
  isAvailable(): boolean
}

interface TaskRepository {
  save(task: Task): Promise<Task>
  findById(id: string): Promise<Task | null>
  findAll(): Promise<Task[]>
  delete(id: string): Promise<void>
  clear(): Promise<void>
}

interface PersistenceService {
  saveTasks(tasks: Task[]): Promise<void>
  loadTasks(): Promise<Task[]>
  saveFilter(filter: TaskFilter): Promise<void>
  loadFilter(): Promise<TaskFilter>
  isStorageAvailable(): boolean
  handleStorageFailure(): void
}

interface TaskService {
  createTask(description: string): Promise<Task>
  updateTask(id: string, updates: Partial<Task>): Promise<Task>
  deleteTask(id: string): Promise<void>
  getAllTasks(): Promise<Task[]>
  initializeFromStorage(): Promise<void>
}

// Mock/Memory implementations for BDD scaffolding
class MockLocalStorage implements StorageEngine {
  private storage: Record<string, string> = {}
  private available: boolean = true

  setItem(key: string, value: string): void {
    if (!this.available) {
      throw new Error('Storage not available')
    }
    this.storage[key] = value
  }

  getItem(key: string): string | null {
    if (!this.available) {
      throw new Error('Storage not available')
    }
    return this.storage[key] || null
  }

  removeItem(key: string): void {
    if (!this.available) {
      throw new Error('Storage not available')
    }
    delete this.storage[key]
  }

  clear(): void {
    if (!this.available) {
      throw new Error('Storage not available')
    }
    this.storage = {}
  }

  isAvailable(): boolean {
    return this.available
  }

  // Test helper to simulate storage unavailability
  setAvailable(available: boolean): void {
    this.available = available
  }

  // Test helper to simulate corrupted data
  setCorruptedData(key: string): void {
    this.storage[key] = 'corrupted-json-data-{'
  }

  // Test helper to get internal storage state
  getInternalStorage(): Record<string, string> {
    return { ...this.storage }
  }
}

class MockMemoryRepository implements TaskRepository {
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

class MockPersistenceService implements PersistenceService {
  private static readonly TASKS_KEY = 'tasks'
  private static readonly FILTER_KEY = 'taskFilter'
  
  constructor(
    private storage: StorageEngine,
    private fallbackRepository: TaskRepository
  ) {}

  async saveTasks(tasks: Task[]): Promise<void> {
    try {
      if (this.storage.isAvailable()) {
        const serialized = JSON.stringify(tasks.map(task => ({
          ...task,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString()
        })))
        this.storage.setItem(MockPersistenceService.TASKS_KEY, serialized)
      } else {
        // Fallback to memory repository
        await this.fallbackRepository.clear()
        for (const task of tasks) {
          await this.fallbackRepository.save(task)
        }
      }
    } catch (error) {
      // Fallback to memory repository on storage failure
      await this.fallbackRepository.clear()
      for (const task of tasks) {
        await this.fallbackRepository.save(task)
      }
      throw new Error('Storage failed, using memory fallback')
    }
  }

  async loadTasks(): Promise<Task[]> {
    try {
      if (this.storage.isAvailable()) {
        const serialized = this.storage.getItem(MockPersistenceService.TASKS_KEY)
        if (serialized) {
          const parsed = JSON.parse(serialized)
          return parsed.map((task: any) => ({
            ...task,
            createdAt: new Date(task.createdAt),
            updatedAt: new Date(task.updatedAt)
          }))
        }
      }
      
      // Fallback to memory repository
      return await this.fallbackRepository.findAll()
    } catch (error) {
      // Return empty array on corrupted data and log error
      console.error('Failed to load tasks from storage, starting with empty state:', error)
      return []
    }
  }

  async saveFilter(filter: TaskFilter): Promise<void> {
    try {
      if (this.storage.isAvailable()) {
        this.storage.setItem(MockPersistenceService.FILTER_KEY, filter)
      }
      // Note: Filter fallback is not critical, defaults to 'all'
    } catch (error) {
      // Filter persistence failure is not critical
      console.warn('Failed to persist filter state:', error)
    }
  }

  async loadFilter(): Promise<TaskFilter> {
    try {
      if (this.storage.isAvailable()) {
        const stored = this.storage.getItem(MockPersistenceService.FILTER_KEY) as TaskFilter
        if (stored && ['all', 'active', 'completed'].includes(stored)) {
          return stored
        }
      }
    } catch (error) {
      console.warn('Failed to load filter state:', error)
    }
    return 'all' // Default filter
  }

  isStorageAvailable(): boolean {
    return this.storage.isAvailable()
  }

  handleStorageFailure(): void {
    console.warn('Storage is not available, using memory fallback')
  }
}

class MockTaskService implements TaskService {
  constructor(
    private repository: TaskRepository,
    private persistenceService: PersistenceService
  ) {}

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

    const savedTask = await this.repository.save(task)
    
    // Persist to storage immediately
    const allTasks = await this.repository.findAll()
    await this.persistenceService.saveTasks(allTasks)
    
    return savedTask
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

    const savedTask = await this.repository.save(updatedTask)
    
    // Persist to storage immediately
    const allTasks = await this.repository.findAll()
    await this.persistenceService.saveTasks(allTasks)
    
    return savedTask
  }

  async deleteTask(id: string): Promise<void> {
    // Verify task exists before attempting deletion
    const existingTask = await this.repository.findById(id)
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`)
    }

    await this.repository.delete(id)
    
    // Persist to storage immediately
    const allTasks = await this.repository.findAll()
    await this.persistenceService.saveTasks(allTasks)
  }

  async getAllTasks(): Promise<Task[]> {
    return await this.repository.findAll()
  }

  async initializeFromStorage(): Promise<void> {
    try {
      const loadedTasks = await this.persistenceService.loadTasks()
      
      // Clear current repository and load from storage
      await this.repository.clear()
      for (const task of loadedTasks) {
        await this.repository.save(task)
      }
    } catch (error) {
      console.error('Failed to initialize from storage:', error)
      // Continue with empty state
    }
  }
}

// Test Data Builder
class TaskPersistenceTestDataBuilder {
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
  let mockStorage: MockLocalStorage
  let repository: MockMemoryRepository
  let persistenceService: MockPersistenceService
  let taskService: MockTaskService

  beforeEach(async () => {
    mockStorage = new MockLocalStorage()
    repository = new MockMemoryRepository()
    persistenceService = new MockPersistenceService(mockStorage, repository)
    taskService = new MockTaskService(repository, persistenceService)
  })

  describe('Scenario: Loading tasks from storage on application start', () => {
    it('should restore all previously saved tasks with identical properties', async () => {
      // Given: I have some tasks saved in storage from a previous session
      const originalTasks = [
        TaskPersistenceTestDataBuilder.createTask('Task 1', false),
        TaskPersistenceTestDataBuilder.createTask('Task 2', true),
        TaskPersistenceTestDataBuilder.createTask('Task 3', false)
      ]
      
      // Simulate saving tasks in previous session
      await persistenceService.saveTasks(originalTasks)
      
      // Clear current repository to simulate fresh start
      await repository.clear()
      expect(await repository.findAll()).toHaveLength(0)

      // When: I initialize the application from storage
      await taskService.initializeFromStorage()

      // Then: All previously saved tasks should be restored
      const restoredTasks = await taskService.getAllTasks()
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
      // Given: I have no previous data in storage
      expect(mockStorage.getItem('tasks')).toBeNull()

      // When: I initialize the application from storage
      await taskService.initializeFromStorage()

      // Then: The application should start with empty state
      const tasks = await taskService.getAllTasks()
      expect(tasks).toHaveLength(0)
    })

    it('should handle empty storage gracefully', async () => {
      // Given: I have empty array saved in storage
      await persistenceService.saveTasks([])

      // When: I initialize the application from storage
      await taskService.initializeFromStorage()

      // Then: The application should start with empty state
      const tasks = await taskService.getAllTasks()
      expect(tasks).toHaveLength(0)
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
      const persistedTasks = await persistenceService.loadTasks()
      expect(persistedTasks).toHaveLength(1)
      expect(persistedTasks[0]).toEqual(createdTask)

      // And: The operation should complete within 100ms
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should persist task updates immediately', async () => {
      // Given: I have an existing task
      const originalTask = await taskService.createTask('Task to update')

      // When: I update the task
      const updatedTask = await taskService.updateTask(originalTask.id, { completed: true })

      // Then: The update should be immediately persisted
      const persistedTasks = await persistenceService.loadTasks()
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

      let persistedTasks = await persistenceService.loadTasks()
      expect(persistedTasks).toHaveLength(3)

      // When: I delete one task
      await taskService.deleteTask(task2.id)

      // Then: The deletion should be immediately persisted
      persistedTasks = await persistenceService.loadTasks()
      expect(persistedTasks).toHaveLength(2)
      expect(persistedTasks.find(t => t.id === task1.id)).toBeDefined()
      expect(persistedTasks.find(t => t.id === task3.id)).toBeDefined()
      expect(persistedTasks.find(t => t.id === task2.id)).toBeUndefined()
    })
  })

  describe('Scenario: Storage unavailability fallback', () => {
    it('should continue functioning with memory storage when localStorage is unavailable', async () => {
      // Given: localStorage becomes unavailable
      mockStorage.setAvailable(false)
      expect(persistenceService.isStorageAvailable()).toBe(false)

      // When: I perform task operations
      const task1 = await taskService.createTask('Memory task 1')
      const task2 = await taskService.createTask('Memory task 2')
      await taskService.updateTask(task1.id, { completed: true })

      // Then: Operations should work with memory fallback
      const tasks = await taskService.getAllTasks()
      expect(tasks).toHaveLength(2)
      expect(tasks.find(t => t.id === task1.id)!.completed).toBe(true)
      expect(tasks.find(t => t.id === task2.id)!.completed).toBe(false)

      // And: Tasks should be available in memory repository
      const memoryTasks = await repository.findAll()
      expect(memoryTasks).toHaveLength(2)
    })

    it('should display warning when storage is unavailable', async () => {
      // Given: localStorage becomes unavailable
      mockStorage.setAvailable(false)

      // When: I check storage availability
      const isAvailable = persistenceService.isStorageAvailable()

      // Then: It should report unavailability
      expect(isAvailable).toBe(false)

      // And: Fallback handling should be triggered
      expect(() => persistenceService.handleStorageFailure()).not.toThrow()
    })
  })

  describe('Scenario: Corrupted data recovery', () => {
    it('should initialize with empty state when storage contains corrupted data', async () => {
      // Given: Storage contains corrupted JSON data
      mockStorage.setCorruptedData('tasks')

      // When: I try to initialize from storage
      await taskService.initializeFromStorage()

      // Then: Application should start with empty state
      const tasks = await taskService.getAllTasks()
      expect(tasks).toHaveLength(0)

      // And: Should not throw errors
      expect(async () => await persistenceService.loadTasks()).not.toThrow()
    })

    it('should recover gracefully from storage errors during save operations', async () => {
      // Given: I have a working task service
      const task = await taskService.createTask('Test task')
      expect(await taskService.getAllTasks()).toHaveLength(1)

      // When: Storage becomes unavailable during operation
      mockStorage.setAvailable(false)

      // Then: Operations should continue with memory fallback
      const task2 = await taskService.createTask('Memory fallback task')
      const allTasks = await taskService.getAllTasks()
      
      expect(allTasks).toHaveLength(2)
      expect(allTasks.find(t => t.id === task.id)).toBeDefined()
      expect(allTasks.find(t => t.id === task2.id)).toBeDefined()
    })
  })

  describe('Scenario: Filter state persistence', () => {
    it('should persist and restore filter state', async () => {
      // Given: I set a specific filter
      await persistenceService.saveFilter('active')

      // When: I load the filter state
      const loadedFilter = await persistenceService.loadFilter()

      // Then: The filter should be restored correctly
      expect(loadedFilter).toBe('active')
    })

    it('should default to "all" filter when no filter state exists', async () => {
      // Given: No previous filter state exists
      expect(mockStorage.getItem('taskFilter')).toBeNull()

      // When: I load the filter state
      const loadedFilter = await persistenceService.loadFilter()

      // Then: It should default to "all"
      expect(loadedFilter).toBe('all')
    })

    it('should handle filter persistence gracefully when storage fails', async () => {
      // Given: Storage is unavailable
      mockStorage.setAvailable(false)

      // When: I try to save and load filter state
      await persistenceService.saveFilter('completed')
      const loadedFilter = await persistenceService.loadFilter()

      // Then: It should default gracefully without throwing errors
      expect(loadedFilter).toBe('all')
      expect(() => persistenceService.saveFilter('active')).not.toThrow()
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
            await repository.clear()
            mockStorage.clear()
            
            // Given: A collection of tasks with various states
            const originalTasks: Task[] = []
            for (const spec of taskSpecs) {
              const task = await taskService.createTask(spec.description)
              if (spec.completed) {
                await taskService.updateTask(task.id, { completed: true })
              }
              const finalTask = await repository.findById(task.id)
              originalTasks.push(finalTask!)
            }

            // When: Saving to storage and reloading application
            const allTasks = await taskService.getAllTasks()
            await persistenceService.saveTasks(allTasks)
            
            // Simulate application restart
            await repository.clear()
            await taskService.initializeFromStorage()

            // Then: All tasks should be restored with identical properties
            const restoredTasks = await taskService.getAllTasks()
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
            await repository.clear()
            mockStorage.clear()
            
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
            const storageTasks = await persistenceService.loadTasks()
            
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
            // Setup: Clear state and disable storage
            await repository.clear()
            // Clear storage before disabling it
            if (mockStorage.isAvailable()) {
              mockStorage.clear()
            }
            mockStorage.setAvailable(false)
            
            // Given: Storage is unavailable
            expect(persistenceService.isStorageAvailable()).toBe(false)

            // When: Performing operations with storage unavailable
            const createdTasks: Task[] = []
            for (const description of descriptions) {
              const task = await taskService.createTask(description)
              createdTasks.push(task)
            }

            // Toggle completion of first task if exists
            if (createdTasks.length > 0) {
              const updatedTask = await taskService.updateTask(createdTasks[0].id, { completed: true })
              createdTasks[0] = updatedTask
            }

            // Then: All operations should work with memory fallback
            const allTasks = await taskService.getAllTasks()
            expect(allTasks).toHaveLength(createdTasks.length)

            // And: Memory repository should contain all tasks
            const memoryTasks = await repository.findAll()
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