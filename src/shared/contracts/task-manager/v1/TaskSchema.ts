import { z } from 'zod'

/**
 * Task Schema - Core data contract for task entities
 * 
 * Derived from BDD scenarios in src/domains/task-manager/bdd/
 * This schema defines the structure and validation rules for Task entities
 * based on the requirements and behaviors tested in BDD scenarios.
 */

/**
 * Task entity schema with validation rules
 * - id: UUID string for unique identification
 * - description: 1-500 characters, non-empty after trimming
 * - completed: boolean status for task completion
 * - createdAt: timestamp when task was created
 * - updatedAt: timestamp when task was last modified
 */
export const TaskSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID'),
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(500, 'Task description cannot exceed 500 characters')
    .transform(str => str.trim())
    .refine(str => str.length > 0, 'Task description cannot be only whitespace'),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date()
})

/**
 * Type inference for Task entity
 */
export type Task = z.infer<typeof TaskSchema>

/**
 * Task filter options schema
 * Defines the available filter states for task display
 */
export const TaskFilterSchema = z.enum(['all', 'active', 'completed'], {
  errorMap: () => ({ message: 'Filter must be one of: all, active, completed' })
})

/**
 * Type inference for TaskFilter
 */
export type TaskFilter = z.infer<typeof TaskFilterSchema>

/**
 * Application state schema
 * Defines the complete application state structure including tasks, filter, and UI state
 */
export const AppStateSchema = z.object({
  tasks: z.array(TaskSchema),
  filter: TaskFilterSchema,
  isLoading: z.boolean(),
  error: z.string().nullable()
})

/**
 * Type inference for AppState
 */
export type AppState = z.infer<typeof AppStateSchema>

/**
 * Task creation input schema
 * Used for validating input when creating new tasks
 */
export const TaskCreateInputSchema = z.object({
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(500, 'Task description cannot exceed 500 characters')
    .transform(str => str.trim())
    .refine(str => str.length > 0, 'Task description cannot be only whitespace')
})

/**
 * Type inference for TaskCreateInput
 */
export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>

/**
 * Task update input schema
 * Used for validating partial updates to existing tasks
 */
export const TaskUpdateInputSchema = z.object({
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(500, 'Task description cannot exceed 500 characters')
    .transform(str => str.trim())
    .refine(str => str.length > 0, 'Task description cannot be only whitespace')
    .optional(),
  completed: z.boolean().optional()
})

/**
 * Type inference for TaskUpdateInput
 */
export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>

/**
 * Task storage schema for serialization/deserialization
 * Used when saving/loading tasks from localStorage with ISO date strings
 */
export const TaskStorageSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  completed: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

/**
 * Type inference for TaskStorage
 */
export type TaskStorage = z.infer<typeof TaskStorageSchema>

/**
 * Utility functions for schema validation and transformation
 */
export const TaskSchemaUtils = {
  /**
   * Parse and validate a task object
   */
  parseTask: (data: unknown): Task => {
    return TaskSchema.parse(data)
  },

  /**
   * Safe parse a task object, returning success/error result
   */
  safeParseTask: (data: unknown): z.SafeParseReturnType<unknown, Task> => {
    return TaskSchema.safeParse(data)
  },

  /**
   * Parse task creation input
   */
  parseTaskCreateInput: (data: unknown): TaskCreateInput => {
    return TaskCreateInputSchema.parse(data)
  },

  /**
   * Safe parse task creation input
   */
  safeParseTaskCreateInput: (data: unknown): z.SafeParseReturnType<unknown, TaskCreateInput> => {
    return TaskCreateInputSchema.safeParse(data)
  },

  /**
   * Parse task update input
   */
  parseTaskUpdateInput: (data: unknown): TaskUpdateInput => {
    return TaskUpdateInputSchema.parse(data)
  },

  /**
   * Safe parse task update input
   */
  safeParseTaskUpdateInput: (data: unknown): z.SafeParseReturnType<unknown, TaskUpdateInput> => {
    return TaskUpdateInputSchema.safeParse(data)
  },

  /**
   * Parse task filter
   */
  parseTaskFilter: (data: unknown): TaskFilter => {
    return TaskFilterSchema.parse(data)
  },

  /**
   * Safe parse task filter
   */
  safeParseTaskFilter: (data: unknown): z.SafeParseReturnType<unknown, TaskFilter> => {
    return TaskFilterSchema.safeParse(data)
  },

  /**
   * Parse application state
   */
  parseAppState: (data: unknown): AppState => {
    return AppStateSchema.parse(data)
  },

  /**
   * Safe parse application state
   */
  safeParseAppState: (data: unknown): z.SafeParseReturnType<unknown, AppState> => {
    return AppStateSchema.safeParse(data)
  },

  /**
   * Convert Task to storage format (with ISO date strings)
   */
  taskToStorage: (task: Task): TaskStorage => {
    return {
      id: task.id,
      description: task.description,
      completed: task.completed,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    }
  },

  /**
   * Convert storage format to Task (parsing ISO date strings)
   */
  storageToTask: (storage: TaskStorage): Task => {
    return {
      id: storage.id,
      description: storage.description,
      completed: storage.completed,
      createdAt: new Date(storage.createdAt),
      updatedAt: new Date(storage.updatedAt)
    }
  },

  /**
   * Validate and convert array of storage tasks to Task array
   */
  parseStorageTasks: (data: unknown): Task[] => {
    const storageArray = z.array(TaskStorageSchema).parse(data)
    return storageArray.map(TaskSchemaUtils.storageToTask)
  },

  /**
   * Safe parse and convert array of storage tasks to Task array
   */
  safeParseStorageTasks: (data: unknown): z.SafeParseReturnType<unknown, Task[]> => {
    const result = z.array(TaskStorageSchema).safeParse(data)
    if (result.success) {
      try {
        const tasks = result.data.map(TaskSchemaUtils.storageToTask)
        return { success: true, data: tasks }
      } catch (error) {
        return { 
          success: false, 
          error: new z.ZodError([{
            code: z.ZodIssueCode.custom,
            message: 'Failed to convert storage format to tasks',
            path: []
          }])
        }
      }
    }
    return result as z.SafeParseReturnType<unknown, Task[]>
  }
}