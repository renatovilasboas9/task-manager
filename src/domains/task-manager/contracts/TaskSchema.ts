import { z } from 'zod';

/**
 * Task Schema - Defines the structure and validation rules for a task
 * Based on Requirements 1.1, 1.2, 2.1, 4.1, 4.2, 4.3
 */
export const TaskSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID'),
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(500, 'Task description cannot exceed 500 characters')
    .trim(),
  completed: z.boolean().default(false),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * Task Filter Schema - Defines valid filter types for task display
 * Based on Requirements 4.1, 4.2, 4.3, 4.4
 */
export const TaskFilterSchema = z.enum(['all', 'active', 'completed'], {
  errorMap: () => ({ message: 'Filter must be one of: all, active, completed' }),
});

/**
 * Application State Schema - Defines the complete application state structure
 * Based on Requirements 5.1, 5.3, 5.4
 */
export const AppStateSchema = z.object({
  tasks: z.array(TaskSchema).default([]),
  currentFilter: TaskFilterSchema.default('all'),
  lastUpdated: z.date().default(() => new Date()),
});

/**
 * Task Creation Input Schema - Validates input for creating new tasks
 * Based on Requirements 1.1, 1.2
 */
export const TaskCreateInputSchema = z.object({
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(500, 'Task description cannot exceed 500 characters')
    .trim(),
});

/**
 * Task Update Input Schema - Validates input for updating existing tasks
 * Based on Requirements 2.1, 2.3
 */
export const TaskUpdateInputSchema = z.object({
  id: z.string().uuid('Task ID must be a valid UUID'),
  completed: z.boolean().optional(),
  description: z
    .string()
    .min(1, 'Task description cannot be empty')
    .max(500, 'Task description cannot exceed 500 characters')
    .trim()
    .optional(),
});

// Type exports derived from schemas
export type Task = z.infer<typeof TaskSchema>;
export type TaskFilter = z.infer<typeof TaskFilterSchema>;
export type AppState = z.infer<typeof AppStateSchema>;
export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;
export type TaskUpdateInput = z.infer<typeof TaskUpdateInputSchema>;

// Validation helper functions
export const validateTask = (data: unknown): Task => TaskSchema.parse(data);
export const validateTaskFilter = (data: unknown): TaskFilter => TaskFilterSchema.parse(data);
export const validateAppState = (data: unknown): AppState => AppStateSchema.parse(data);
export const validateTaskCreateInput = (data: unknown): TaskCreateInput =>
  TaskCreateInputSchema.parse(data);
export const validateTaskUpdateInput = (data: unknown): TaskUpdateInput =>
  TaskUpdateInputSchema.parse(data);

// Safe validation functions that return results instead of throwing
export const safeValidateTask = (data: unknown) => TaskSchema.safeParse(data);
export const safeValidateTaskFilter = (data: unknown) => TaskFilterSchema.safeParse(data);
export const safeValidateAppState = (data: unknown) => AppStateSchema.safeParse(data);
export const safeValidateTaskCreateInput = (data: unknown) =>
  TaskCreateInputSchema.safeParse(data);
export const safeValidateTaskUpdateInput = (data: unknown) =>
  TaskUpdateInputSchema.safeParse(data);