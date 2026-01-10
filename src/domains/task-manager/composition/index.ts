/**
 * Task Manager Composition Module Exports
 * 
 * This module exports the composition root and related types for the task manager domain.
 * The composition root handles dependency injection and wiring of components.
 */

export {
  TaskManagerComposition,
  createTaskManagerComposition,
  getEnvironment,
  type Environment,
  type TaskManagerCompositionConfig,
  type TaskManagerDependencies,
  type TaskManagerEventHandlers,
  type WiringVerificationResult
} from './TaskManagerComposition'

export {
  generateWiringReport,
  generateWiringReportJSON,
  isWiringHealthy,
  getWiringErrors,
  checkWiringCLI,
  type WiringReport
} from './WiringReport'