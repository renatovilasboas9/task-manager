import { Task } from '../../../shared/contracts/task-manager/v1/TaskSchema'

/**
 * TaskRepository Interface
 * 
 * Defines the contract for task data persistence operations.
 * This interface abstracts the storage mechanism, allowing for different
 * implementations (localStorage, memory, SQLite, etc.) based on environment.
 * 
 * Requirements covered:
 * - 1.4: Task persistence to local storage
 * - 2.3: Immediate persistence of completion status changes
 * - 3.2: Permanent removal from storage on deletion
 * - 5.1: Restore tasks from storage on application load
 * - 5.3: Fallback behavior when storage unavailable
 * - 5.4: Handle corrupted data gracefully
 */
export interface TaskRepository {
  /**
   * Save a task to the repository
   * Creates new task if it doesn't exist, updates if it does
   * 
   * @param task - The task to save
   * @returns Promise resolving to the saved task
   * @throws Error if save operation fails
   */
  save(task: Task): Promise<Task>

  /**
   * Find a task by its unique identifier
   * 
   * @param id - The unique task identifier
   * @returns Promise resolving to the task if found, null otherwise
   * @throws Error if find operation fails
   */
  findById(id: string): Promise<Task | null>

  /**
   * Retrieve all tasks from the repository
   * 
   * @returns Promise resolving to array of all tasks
   * @throws Error if retrieval operation fails
   */
  findAll(): Promise<Task[]>

  /**
   * Delete a task from the repository
   * 
   * @param id - The unique task identifier
   * @returns Promise resolving when deletion is complete
   * @throws Error if task not found or deletion fails
   */
  delete(id: string): Promise<void>

  /**
   * Clear all tasks from the repository
   * Used for testing and data reset scenarios
   * 
   * @returns Promise resolving when clear operation is complete
   * @throws Error if clear operation fails
   */
  clear(): Promise<void>
}