/**
 * Task Manager Gallery Components
 * 
 * This module exports all UI components for the task manager domain.
 * Components are designed to work with the TaskSchema contracts and
 * follow Material-UI design patterns.
 */

export { TaskInput, type TaskInputProps } from './TaskInput'
export { TaskItem, type TaskItemProps } from './TaskItem'
export { TaskList, type TaskListProps } from './TaskList'
export { TaskFilterComponent, type TaskFilterProps } from './TaskFilter'
export { TaskCounter, type TaskCounterProps } from './TaskCounter'
export { GalleryDemo } from './GalleryDemo'

// Re-export types from contracts for convenience
export type {
  Task,
  TaskFilter,
  TaskCreateInput,
  TaskUpdateInput,
  AppState
} from '../../shared/contracts/task-manager/v1/TaskSchema'