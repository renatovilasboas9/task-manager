import { describe, it, expect, beforeEach } from 'vitest'
import * as fc from 'fast-check'
import { Task, TaskFilter, TaskSchemaUtils } from '../../../shared/contracts/task-manager/v1/TaskSchema'
import { TaskService } from '../service/TaskService'
import { MemoryTaskRepository } from '../repository/MemoryTaskRepository'
import { EventBus } from '../../../shared/infrastructure/EventBus'
import { uuidv4 } from 'zod/v4'
import { TaskRepository } from '../repository'

/**
 * BDD Scenarios for Task Filtering
 * 
 * This file implements BDD scenarios for task filtering functionality.
 * Uses official implementations via DI (No-Mocks Drift).
 * Uses official Zod contracts for validation (No-Contract Drift).
 * 
 * Properties tested:
 * - Property 7: Correção de exibição de filtro
 * - Property 8: Atualização de visualização de filtro com mudanças de dados
 */

interface FilterState {
  setFilter(filter: TaskFilter): void
  getFilter(): TaskFilter
  persistFilter(): void
  loadFilter(): TaskFilter
}

class MockFilterState implements FilterState {
  private filter: TaskFilter = 'all'
  private storage: Record<string, string> = {}

  setFilter(filter: TaskFilter): void {
    // Use Zod validation for filter
    const filterResult = TaskSchemaUtils.safeParseTaskFilter(filter)
    if (!filterResult.success) {
      throw new Error(filterResult.error.errors[0].message)
    }
    
    this.filter = filterResult.data
    this.persistFilter()
  }

  getFilter(): TaskFilter {
    return this.filter
  }

  persistFilter(): void {
    this.storage['taskFilter'] = this.filter
  }

  loadFilter(): TaskFilter {
    const stored = this.storage['taskFilter']
    const filterResult = TaskSchemaUtils.safeParseTaskFilter(stored)
    if (filterResult.success) {
      this.filter = filterResult.data
      return filterResult.data
    }
    return 'all'
  }
}

class MockTaskService implements TaskService {
  constructor(private repository: TaskRepository) {}

  async createTask(description: string): Promise<Task> {
    // Use Zod validation for input
    const inputResult = TaskSchemaUtils.safeParseTaskCreateInput({ description })
    if (!inputResult.success) {
      throw new Error(inputResult.error.errors[0].message)
    }

    const validatedInput = inputResult.data

    const task: Task = {
      id: uuidv4(),
      description: validatedInput.description,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    // Validate the created task with Zod schema
    const taskResult = TaskSchemaUtils.safeParseTask(task)
    if (!taskResult.success) {
      throw new Error('Failed to create valid task')
    }

    return await this.repository.save(taskResult.data)
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task> {
    const existingTask = await this.repository.findById(id)
    if (!existingTask) {
      throw new Error(`Task with id ${id} not found`)
    }

    // Use Zod validation for update input
    const updateResult = TaskSchemaUtils.safeParseTaskUpdateInput(updates)
    if (!updateResult.success) {
      throw new Error(updateResult.error.errors[0].message)
    }

    const validatedUpdates = updateResult.data

    const updatedTask: Task = {
      ...existingTask,
      ...validatedUpdates,
      id: existingTask.id, // Ensure ID cannot be changed
      createdAt: existingTask.createdAt, // Ensure createdAt cannot be changed
      updatedAt: new Date()
    }

    // Validate the updated task with Zod schema
    const taskResult = TaskSchemaUtils.safeParseTask(updatedTask)
    if (!taskResult.success) {
      throw new Error('Failed to create valid updated task')
    }

    return await this.repository.save(taskResult.data)
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

  async getTasksByFilter(filter: TaskFilter): Promise<Task[]> {
    // Use Zod validation for filter
    const filterResult = TaskSchemaUtils.safeParseTaskFilter(filter)
    if (!filterResult.success) {
      throw new Error(filterResult.error.errors[0].message)
    }

    const validatedFilter = filterResult.data
    const allTasks = await this.getAllTasks()
    
    switch (validatedFilter) {
      case 'all':
        return allTasks
      case 'active':
        return allTasks.filter(task => !task.completed)
      case 'completed':
        return allTasks.filter(task => task.completed)
      default:
        throw new Error(`Invalid filter: ${filter}`)
    }
  }
}

// Test Data Builder using Zod contracts
class TaskFilteringTestDataBuilder {
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

  static createMixedTasks(count: number): { completed: Task[], active: Task[] } {
    const completed: Task[] = []
    const active: Task[] = []
    
    for (let i = 0; i < count; i++) {
      const isCompleted = i % 2 === 0
      const task = this.createTask(`Task ${i + 1}`, isCompleted)
      
      if (isCompleted) {
        completed.push(task)
      } else {
        active.push(task)
      }
    }
    
    return { completed, active }
  }
}

describe('BDD: Task Filtering Scenarios', () => {
  let repository: MemoryTaskRepository
  let eventBus: EventBus
  let taskService: TaskService
  let filterState: MockFilterState

  beforeEach(async () => {
    repository = new MemoryTaskRepository()
    eventBus = new EventBus()
    taskService = new TaskService(repository, eventBus)
    filterState = new MockFilterState()
  })

  describe('Scenario: Filtering tasks by "All" status', () => {
    it('should display all tasks regardless of completion status', async () => {
      // Given: I have tasks with mixed completion states
      const activeTask1 = await taskService.createTask('Active task 1')
      const activeTask2 = await taskService.createTask('Active task 2')
      const completedTask1 = await taskService.createTask('Completed task 1')
      const completedTask2 = await taskService.createTask('Completed task 2')

      // Mark some tasks as completed
      await taskService.updateTask(completedTask1.id, { completed: true })
      await taskService.updateTask(completedTask2.id, { completed: true })

      // When: I apply the "All" filter
      filterState.setFilter('all')
      const filteredTasks = await taskService.getTasksByFilter('all')

      // Then: All tasks should be displayed
      expect(filteredTasks).toHaveLength(4)
      expect(filteredTasks).toContainEqual(activeTask1)
      expect(filteredTasks).toContainEqual(activeTask2)
      
      // Find the updated completed tasks
      const updatedCompletedTask1 = filteredTasks.find(t => t.id === completedTask1.id)!
      const updatedCompletedTask2 = filteredTasks.find(t => t.id === completedTask2.id)!
      expect(updatedCompletedTask1.completed).toBe(true)
      expect(updatedCompletedTask2.completed).toBe(true)

      // And: Filter state should be persisted
      expect(filterState.getFilter()).toBe('all')
    })

    it('should display all tasks when list contains only active tasks', async () => {
      // Given: I have only active tasks
      const activeTask1 = await taskService.createTask('Active task 1')
      const activeTask2 = await taskService.createTask('Active task 2')

      // When: I apply the "All" filter
      const filteredTasks = await taskService.getTasksByFilter('all')

      // Then: All active tasks should be displayed
      expect(filteredTasks).toHaveLength(2)
      expect(filteredTasks).toContainEqual(activeTask1)
      expect(filteredTasks).toContainEqual(activeTask2)
      filteredTasks.forEach(task => expect(task.completed).toBe(false))
    })

    it('should display all tasks when list contains only completed tasks', async () => {
      // Given: I have only completed tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      
      const completedTask1 = await taskService.updateTask(task1.id, { completed: true })
      const completedTask2 = await taskService.updateTask(task2.id, { completed: true })

      // When: I apply the "All" filter
      const filteredTasks = await taskService.getTasksByFilter('all')

      // Then: All completed tasks should be displayed
      expect(filteredTasks).toHaveLength(2)
      expect(filteredTasks.find(t => t.id === completedTask1.id)!.completed).toBe(true)
      expect(filteredTasks.find(t => t.id === completedTask2.id)!.completed).toBe(true)
    })
  })

  describe('Scenario: Filtering tasks by "Active" status', () => {
    it('should display only incomplete tasks', async () => {
      // Given: I have tasks with mixed completion states
      const activeTask1 = await taskService.createTask('Active task 1')
      const activeTask2 = await taskService.createTask('Active task 2')
      const completedTask = await taskService.createTask('Completed task')
      
      await taskService.updateTask(completedTask.id, { completed: true })

      // When: I apply the "Active" filter
      filterState.setFilter('active')
      const filteredTasks = await taskService.getTasksByFilter('active')

      // Then: Only active (incomplete) tasks should be displayed
      expect(filteredTasks).toHaveLength(2)
      expect(filteredTasks).toContainEqual(activeTask1)
      expect(filteredTasks).toContainEqual(activeTask2)
      
      // And: No completed tasks should be displayed
      filteredTasks.forEach(task => expect(task.completed).toBe(false))
      expect(filteredTasks.find(t => t.id === completedTask.id)).toBeUndefined()

      // And: Filter state should be persisted
      expect(filterState.getFilter()).toBe('active')
    })

    it('should display empty list when all tasks are completed', async () => {
      // Given: I have only completed tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      
      await taskService.updateTask(task1.id, { completed: true })
      await taskService.updateTask(task2.id, { completed: true })

      // When: I apply the "Active" filter
      const filteredTasks = await taskService.getTasksByFilter('active')

      // Then: No tasks should be displayed
      expect(filteredTasks).toHaveLength(0)
    })

    it('should display all tasks when none are completed', async () => {
      // Given: I have only active tasks
      const activeTask1 = await taskService.createTask('Active task 1')
      const activeTask2 = await taskService.createTask('Active task 2')
      const activeTask3 = await taskService.createTask('Active task 3')

      // When: I apply the "Active" filter
      const filteredTasks = await taskService.getTasksByFilter('active')

      // Then: All tasks should be displayed
      expect(filteredTasks).toHaveLength(3)
      expect(filteredTasks).toContainEqual(activeTask1)
      expect(filteredTasks).toContainEqual(activeTask2)
      expect(filteredTasks).toContainEqual(activeTask3)
      filteredTasks.forEach(task => expect(task.completed).toBe(false))
    })
  })

  describe('Scenario: Filtering tasks by "Completed" status', () => {
    it('should display only completed tasks', async () => {
      // Given: I have tasks with mixed completion states
      const activeTask = await taskService.createTask('Active task')
      const completedTask1 = await taskService.createTask('Completed task 1')
      const completedTask2 = await taskService.createTask('Completed task 2')
      
      await taskService.updateTask(completedTask1.id, { completed: true })
      await taskService.updateTask(completedTask2.id, { completed: true })

      // When: I apply the "Completed" filter
      filterState.setFilter('completed')
      const filteredTasks = await taskService.getTasksByFilter('completed')

      // Then: Only completed tasks should be displayed
      expect(filteredTasks).toHaveLength(2)
      
      const foundCompletedTask1 = filteredTasks.find(t => t.id === completedTask1.id)!
      const foundCompletedTask2 = filteredTasks.find(t => t.id === completedTask2.id)!
      expect(foundCompletedTask1.completed).toBe(true)
      expect(foundCompletedTask2.completed).toBe(true)
      
      // And: No active tasks should be displayed
      expect(filteredTasks.find(t => t.id === activeTask.id)).toBeUndefined()

      // And: Filter state should be persisted
      expect(filterState.getFilter()).toBe('completed')
    })

    it('should display empty list when no tasks are completed', async () => {
      // Given: I have only active tasks
      const activeTask1 = await taskService.createTask('Active task 1')
      const activeTask2 = await taskService.createTask('Active task 2')

      // When: I apply the "Completed" filter
      const filteredTasks = await taskService.getTasksByFilter('completed')

      // Then: No tasks should be displayed
      expect(filteredTasks).toHaveLength(0)
    })

    it('should display all tasks when all are completed', async () => {
      // Given: I have only completed tasks
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      const task3 = await taskService.createTask('Task 3')
      
      await taskService.updateTask(task1.id, { completed: true })
      await taskService.updateTask(task2.id, { completed: true })
      await taskService.updateTask(task3.id, { completed: true })

      // When: I apply the "Completed" filter
      const filteredTasks = await taskService.getTasksByFilter('completed')

      // Then: All tasks should be displayed
      expect(filteredTasks).toHaveLength(3)
      filteredTasks.forEach(task => expect(task.completed).toBe(true))
    })
  })

  describe('Scenario: Filter state persistence through reloads', () => {
    it('should maintain filter state after reload', async () => {
      // Given: I have set a specific filter
      filterState.setFilter('active')
      expect(filterState.getFilter()).toBe('active')

      // When: I simulate a reload by creating a new filter state instance
      const newFilterState = new MockFilterState()
      // Simulate loading from the same storage
      newFilterState['storage'] = filterState['storage']
      const loadedFilter = newFilterState.loadFilter()

      // Then: The filter should be restored
      expect(loadedFilter).toBe('active')
      expect(newFilterState.getFilter()).toBe('active')
    })

    it('should default to "all" filter when no previous state exists', async () => {
      // Given: I have a fresh filter state with no previous data
      const freshFilterState = new MockFilterState()

      // When: I load the filter
      const loadedFilter = freshFilterState.loadFilter()

      // Then: It should default to "all"
      expect(loadedFilter).toBe('all')
      expect(freshFilterState.getFilter()).toBe('all')
    })

    it('should persist filter changes immediately', async () => {
      // Given: I have a filter state
      const initialFilter = filterState.getFilter()
      expect(initialFilter).toBe('all')

      // When: I change the filter multiple times
      filterState.setFilter('active')
      expect(filterState.getFilter()).toBe('active')

      filterState.setFilter('completed')
      expect(filterState.getFilter()).toBe('completed')

      filterState.setFilter('all')
      expect(filterState.getFilter()).toBe('all')

      // Then: Each change should be immediately persisted
      // Simulate reload after each change
      const testFilterState = new MockFilterState()
      testFilterState['storage'] = filterState['storage']
      const finalLoadedFilter = testFilterState.loadFilter()
      expect(finalLoadedFilter).toBe('all')
    })
  })

  describe('Scenario: Filter view updates with data changes', () => {
    it('should update filtered view when tasks are added', async () => {
      // Given: I have some tasks and an active filter
      const existingTask = await taskService.createTask('Existing task')
      filterState.setFilter('active')
      
      let filteredTasks = await taskService.getTasksByFilter('active')
      expect(filteredTasks).toHaveLength(1)

      // When: I add a new active task
      const newActiveTask = await taskService.createTask('New active task')

      // Then: The filtered view should include the new task
      filteredTasks = await taskService.getTasksByFilter('active')
      expect(filteredTasks).toHaveLength(2)
      expect(filteredTasks).toContainEqual(existingTask)
      expect(filteredTasks).toContainEqual(newActiveTask)
    })

    it('should update filtered view when task completion status changes', async () => {
      // Given: I have tasks and a "completed" filter
      const task1 = await taskService.createTask('Task 1')
      const task2 = await taskService.createTask('Task 2')
      
      await taskService.updateTask(task1.id, { completed: true })
      filterState.setFilter('completed')
      
      let filteredTasks = await taskService.getTasksByFilter('completed')
      expect(filteredTasks).toHaveLength(1)

      // When: I complete another task
      await taskService.updateTask(task2.id, { completed: true })

      // Then: The filtered view should include the newly completed task
      filteredTasks = await taskService.getTasksByFilter('completed')
      expect(filteredTasks).toHaveLength(2)
      filteredTasks.forEach(task => expect(task.completed).toBe(true))
    })

    it('should update filtered view when tasks are deleted', async () => {
      // Given: I have multiple active tasks and an "active" filter
      const activeTask1 = await taskService.createTask('Active task 1')
      const activeTask2 = await taskService.createTask('Active task 2')
      const activeTask3 = await taskService.createTask('Active task 3')
      
      filterState.setFilter('active')
      let filteredTasks = await taskService.getTasksByFilter('active')
      expect(filteredTasks).toHaveLength(3)

      // When: I delete one of the active tasks
      await taskService.deleteTask(activeTask2.id)

      // Then: The filtered view should no longer include the deleted task
      filteredTasks = await taskService.getTasksByFilter('active')
      expect(filteredTasks).toHaveLength(2)
      expect(filteredTasks).toContainEqual(activeTask1)
      expect(filteredTasks).toContainEqual(activeTask3)
      expect(filteredTasks.find(t => t.id === activeTask2.id)).toBeUndefined()
    })

    it('should handle filter view when task moves between filter categories', async () => {
      // Given: I have an active task and "active" filter
      const task = await taskService.createTask('Task to toggle')
      filterState.setFilter('active')
      
      let activeTasks = await taskService.getTasksByFilter('active')
      expect(activeTasks).toHaveLength(1)
      expect(activeTasks[0]).toEqual(task)

      // When: I complete the task
      await taskService.updateTask(task.id, { completed: true })

      // Then: The task should no longer appear in active filter
      activeTasks = await taskService.getTasksByFilter('active')
      expect(activeTasks).toHaveLength(0)

      // And: The task should appear in completed filter
      const completedTasks = await taskService.getTasksByFilter('completed')
      expect(completedTasks).toHaveLength(1)
      expect(completedTasks[0].id).toBe(task.id)
      expect(completedTasks[0].completed).toBe(true)
    })
  })

  describe('Scenario: Error handling for invalid filters', () => {
    it('should throw error for invalid filter values', async () => {
      // Given: I have some tasks
      await taskService.createTask('Test task')

      // When: I try to use an invalid filter
      // Then: It should throw an error
      await expect(taskService.getTasksByFilter('invalid' as TaskFilter)).rejects.toThrow('Filter must be one of: all, active, completed')
    })
  })

  // Property-Based Tests
  describe('Property-Based Tests', () => {
    it('Property 7: Filter display correctness', async () => {
      /**
       * **Feature: task-manager, Property 7: Correção de exibição de filtro**
       * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              description: TaskFilteringTestDataBuilder.randomTaskDescription(),
              completed: TaskFilteringTestDataBuilder.randomCompletionStatus()
            }),
            { minLength: 0, maxLength: 10 }
          ),
          TaskFilteringTestDataBuilder.randomFilter(),
          async (taskSpecs, filter) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: Tasks with various completion states
            const createdTasks: Task[] = []
            for (const spec of taskSpecs) {
              const task = await taskService.createTask(spec.description)
              if (spec.completed) {
                await taskService.updateTask(task.id, { completed: true })
              }
              const finalTask = await repository.findById(task.id)
              createdTasks.push(finalTask!)
            }

            // When: Applying any filter
            filterState.setFilter(filter)
            const filteredTasks = await taskService.getTasksByFilter(filter)

            // Then: Only tasks matching the filter criteria should be displayed
            switch (filter) {
              case 'all':
                expect(filteredTasks).toHaveLength(createdTasks.length)
                for (const task of createdTasks) {
                  expect(filteredTasks).toContainEqual(task)
                }
                break
              case 'active':
                const expectedActiveTasks = createdTasks.filter(t => !t.completed)
                expect(filteredTasks).toHaveLength(expectedActiveTasks.length)
                for (const task of expectedActiveTasks) {
                  expect(filteredTasks).toContainEqual(task)
                }
                // Ensure no completed tasks are included
                filteredTasks.forEach(task => expect(task.completed).toBe(false))
                break
              case 'completed':
                const expectedCompletedTasks = createdTasks.filter(t => t.completed)
                expect(filteredTasks).toHaveLength(expectedCompletedTasks.length)
                for (const task of expectedCompletedTasks) {
                  expect(filteredTasks).toContainEqual(task)
                }
                // Ensure no active tasks are included
                filteredTasks.forEach(task => expect(task.completed).toBe(true))
                break
            }

            // And: Filter state should persist
            expect(filterState.getFilter()).toBe(filter)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('Property 8: Filter view updates with data changes', async () => {
      /**
       * **Feature: task-manager, Property 8: Atualização de visualização de filtro com mudanças de dados**
       * **Validates: Requirements 4.5**
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(TaskFilteringTestDataBuilder.randomTaskDescription(), { minLength: 1, maxLength: 5 }),
          TaskFilteringTestDataBuilder.randomFilter(),
          fc.constantFrom('add', 'toggle', 'delete'),
          async (initialDescriptions, filter, changeType) => {
            // Setup: Clear repository for each test
            await repository.clear()
            
            // Given: Initial tasks
            const initialTasks: Task[] = []
            for (const description of initialDescriptions) {
              const task = await taskService.createTask(description)
              initialTasks.push(task)
            }

            // Set filter and get initial filtered view
            filterState.setFilter(filter)
            const initialFilteredTasks = await taskService.getTasksByFilter(filter)

            // When: Making a data change
            let expectedChange = 0
            switch (changeType) {
              case 'add':
                // Add a new task that matches the current filter
                const newTask = await taskService.createTask('New task')
                if (filter === 'all' || (filter === 'active' && !newTask.completed)) {
                  expectedChange = 1
                }
                break
              case 'toggle':
                if (initialTasks.length > 0) {
                  // Toggle completion status of first task
                  const taskToToggle = initialTasks[0]
                  await taskService.updateTask(taskToToggle.id, { completed: !taskToToggle.completed })
                  
                  // Calculate expected change based on filter and toggle direction
                  if (filter === 'active') {
                    expectedChange = taskToToggle.completed ? 1 : -1 // was completed, now active (+1) or vice versa (-1)
                  } else if (filter === 'completed') {
                    expectedChange = taskToToggle.completed ? -1 : 1 // was completed, now active (-1) or vice versa (+1)
                  }
                  // 'all' filter shows no change in count
                }
                break
              case 'delete':
                if (initialTasks.length > 0) {
                  // Delete first task
                  const taskToDelete = initialTasks[0]
                  await taskService.deleteTask(taskToDelete.id)
                  
                  // Calculate expected change based on whether deleted task was in current filter
                  const wasInFilter = initialFilteredTasks.some(t => t.id === taskToDelete.id)
                  if (wasInFilter) {
                    expectedChange = -1
                  }
                }
                break
            }

            // Then: Filtered view should reflect the change
            const updatedFilteredTasks = await taskService.getTasksByFilter(filter)
            expect(updatedFilteredTasks.length).toBe(initialFilteredTasks.length + expectedChange)

            // And: All tasks in filtered view should match filter criteria
            switch (filter) {
              case 'all':
                // All tasks should be included
                break
              case 'active':
                updatedFilteredTasks.forEach(task => expect(task.completed).toBe(false))
                break
              case 'completed':
                updatedFilteredTasks.forEach(task => expect(task.completed).toBe(true))
                break
            }
          }
        ),
        { numRuns: 50 }
      )
    })

    it('Property: Filter persistence across state changes', async () => {
      /**
       * Additional property: Filter state should persist correctly across multiple changes
       */
      await fc.assert(
        fc.asyncProperty(
          fc.array(TaskFilteringTestDataBuilder.randomFilter(), { minLength: 1, maxLength: 5 }),
          async (filterSequence) => {
            // Given: A sequence of filter changes
            let currentFilter: TaskFilter = 'all'
            
            // When: Applying each filter in sequence
            for (const filter of filterSequence) {
              filterState.setFilter(filter)
              currentFilter = filter
              
              // Then: Filter should be immediately persisted and retrievable
              expect(filterState.getFilter()).toBe(currentFilter)
              
              // And: Filter should survive simulated reload
              const testFilterState = new MockFilterState()
              testFilterState['storage'] = filterState['storage']
              const loadedFilter = testFilterState.loadFilter()
              expect(loadedFilter).toBe(currentFilter)
            }
          }
        ),
        { numRuns: 30 }
      )
    })
  })
})