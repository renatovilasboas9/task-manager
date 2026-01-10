import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { Task, TaskSchemaUtils } from '../../../shared/contracts/task-manager/v1/TaskSchema'
import { MemoryTaskRepository } from './MemoryTaskRepository'
import { LocalStorageTaskRepository } from './LocalStorageTaskRepository'
import { createTaskRepository } from './index'

/**
 * Unit tests for TaskRepository implementations
 * 
 * These tests verify the core functionality of repository implementations
 * in isolation, complementing the BDD scenarios.
 */

// Test data builder
function createTestTask(description: string = 'Test task', completed: boolean = false): Task {
  return TaskSchemaUtils.parseTask({
    id: uuidv4(),
    description,
    completed,
    createdAt: new Date(),
    updatedAt: new Date()
  })
}

describe('MemoryTaskRepository', () => {
  let repository: MemoryTaskRepository

  beforeEach(() => {
    repository = new MemoryTaskRepository()
  })

  it('should save and retrieve tasks correctly', async () => {
    const task = createTestTask('Memory test task')
    
    const savedTask = await repository.save(task)
    expect(savedTask).toEqual(task)
    
    const retrievedTask = await repository.findById(task.id)
    expect(retrievedTask).toEqual(task)
  })

  it('should update existing tasks', async () => {
    const task = createTestTask('Original task')
    await repository.save(task)
    
    const updatedTask = { ...task, description: 'Updated task', completed: true }
    const savedUpdatedTask = await repository.save(updatedTask)
    
    expect(savedUpdatedTask.description).toBe('Updated task')
    expect(savedUpdatedTask.completed).toBe(true)
    expect(savedUpdatedTask.updatedAt).toBeInstanceOf(Date)
  })

  it('should delete tasks correctly', async () => {
    const task = createTestTask('Task to delete')
    await repository.save(task)
    
    expect(await repository.findById(task.id)).toEqual(task)
    
    await repository.delete(task.id)
    
    expect(await repository.findById(task.id)).toBeNull()
  })

  it('should throw error when deleting non-existent task', async () => {
    await expect(repository.delete('non-existent-id')).rejects.toThrow('Task with id non-existent-id not found')
  })

  it('should clear all tasks', async () => {
    const task1 = createTestTask('Task 1')
    const task2 = createTestTask('Task 2')
    
    await repository.save(task1)
    await repository.save(task2)
    
    expect(await repository.findAll()).toHaveLength(2)
    
    await repository.clear()
    
    expect(await repository.findAll()).toHaveLength(0)
  })
})

describe('LocalStorageTaskRepository', () => {
  let repository: LocalStorageTaskRepository

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
    repository = new LocalStorageTaskRepository()
  })

  it('should save and retrieve tasks from localStorage', async () => {
    const task = createTestTask('LocalStorage test task')
    
    const savedTask = await repository.save(task)
    expect(savedTask.id).toBe(task.id)
    expect(savedTask.description).toBe(task.description)
    expect(savedTask.completed).toBe(task.completed)
    expect(savedTask.createdAt).toEqual(task.createdAt)
    expect(savedTask.updatedAt).toBeInstanceOf(Date)
    expect(savedTask.updatedAt.getTime()).toBeGreaterThanOrEqual(task.updatedAt.getTime())
    
    // Create new repository instance to test persistence
    const newRepository = new LocalStorageTaskRepository()
    const retrievedTask = await newRepository.findById(task.id)
    expect(retrievedTask).toEqual(savedTask) // Compare with saved task, not original
  })

  it('should handle localStorage unavailability gracefully', async () => {
    // Mock localStorage to throw errors
    const originalSetItem = localStorage.setItem
    localStorage.setItem = () => {
      throw new Error('Storage quota exceeded')
    }

    const task = createTestTask('Fallback test task')
    
    // Should not throw error, should use memory fallback
    const savedTask = await repository.save(task)
    expect(savedTask.id).toBe(task.id)
    expect(savedTask.description).toBe(task.description)
    expect(savedTask.completed).toBe(task.completed)
    expect(savedTask.createdAt).toEqual(task.createdAt)
    expect(savedTask.updatedAt).toBeInstanceOf(Date)
    expect(savedTask.updatedAt.getTime()).toBeGreaterThanOrEqual(task.updatedAt.getTime())
    
    // Restore localStorage
    localStorage.setItem = originalSetItem
  })

  it('should report storage availability correctly', () => {
    expect(repository.getStorageAvailability()).toBe(true)
  })

  it('should handle corrupted data gracefully', async () => {
    // Manually set corrupted data in localStorage
    localStorage.setItem('task-manager-tasks', 'corrupted-json-{')
    
    // Should return empty array without throwing
    const tasks = await repository.findAll()
    expect(tasks).toEqual([])
  })
})

describe('createTaskRepository factory', () => {
  it('should create MemoryTaskRepository for test environment', () => {
    const repository = createTaskRepository('test')
    expect(repository).toBeInstanceOf(MemoryTaskRepository)
  })

  it('should create LocalStorageTaskRepository for development environment', () => {
    const repository = createTaskRepository('development')
    expect(repository).toBeInstanceOf(LocalStorageTaskRepository)
  })

  it('should create LocalStorageTaskRepository for production environment', () => {
    const repository = createTaskRepository('production')
    expect(repository).toBeInstanceOf(LocalStorageTaskRepository)
  })

  it('should throw error for unknown environment', () => {
    expect(() => createTaskRepository('unknown' as any)).toThrow('Unknown environment: unknown')
  })
})