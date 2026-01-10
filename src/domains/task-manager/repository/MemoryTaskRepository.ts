import { Task } from '../../../shared/contracts/task-manager/v1/TaskSchema'
import { TaskRepository } from './TaskRepository'

/**
 * MemoryTaskRepository
 * 
 * In-memory implementation of TaskRepository for testing and fallback scenarios.
 * This implementation stores tasks in memory and does not persist data between sessions.
 * Used as fallback when localStorage is unavailable or during testing.
 * 
 * Requirements covered:
 * - 5.3: Fallback behavior when localStorage unavailable
 * - 5.4: Continue functioning with memory storage
 */
export class MemoryTaskRepository implements TaskRepository {
  private tasks: Task[] = []

  /**
   * Save a task to memory storage
   * Updates existing task or adds new one
   */
  async save(task: Task): Promise<Task> {
    const existingIndex = this.tasks.findIndex(t => t.id === task.id)
    
    if (existingIndex >= 0) {
      // Update existing task
      this.tasks[existingIndex] = { ...task, updatedAt: new Date() }
    } else {
      // Add new task
      this.tasks.push(task)
    }
    
    // Return the saved task
    const savedTask = this.tasks.find(t => t.id === task.id)
    if (!savedTask) {
      throw new Error('Failed to save task to memory')
    }
    
    return savedTask
  }

  /**
   * Find a task by ID in memory storage
   */
  async findById(id: string): Promise<Task | null> {
    const task = this.tasks.find(t => t.id === id)
    return task || null
  }

  /**
   * Get all tasks from memory storage, sorted by creation time
   */
  async findAll(): Promise<Task[]> {
    // Return a copy sorted by createdAt to maintain consistent order
    return [...this.tasks].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  }

  /**
   * Delete a task from memory storage
   */
  async delete(id: string): Promise<void> {
    const index = this.tasks.findIndex(t => t.id === id)
    
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`)
    }
    
    this.tasks.splice(index, 1)
  }

  /**
   * Clear all tasks from memory storage
   */
  async clear(): Promise<void> {
    this.tasks = []
  }

  /**
   * Get current task count (utility method for testing)
   */
  getTaskCount(): number {
    return this.tasks.length
  }
}