/**
 * Task Manager Composition Root
 * 
 * This module handles dependency injection and wiring for the task manager domain.
 * It configures repository implementations based on environment and registers
 * event handlers to connect UI events to service operations.
 * 
 * Requirements:
 * - Registrar handlers (UI events → services)
 * - Configurar repository implementation por ambiente (TEST=Memory, DEV=LocalStorage)
 * - Wiring testável via suíte "wiring check"
 */

import { TaskService } from '../service/TaskService'
import { TaskRepository, createTaskRepository } from '../repository'
import { EventBus } from '../../../shared/infrastructure/EventBus'

/**
 * Environment types for repository configuration
 */
export type Environment = 'test' | 'development' | 'production'

/**
 * Task Manager composition configuration
 */
export interface TaskManagerCompositionConfig {
  environment: Environment
  eventBus: EventBus
}

/**
 * Wired task manager dependencies
 */
export interface TaskManagerDependencies {
  taskService: TaskService
  taskRepository: TaskRepository
  eventBus: EventBus
  environment: Environment
}

/**
 * Event handler types for UI → Service integration
 */
export interface TaskManagerEventHandlers {
  onTaskCreate: (payload: { description: string }) => Promise<void>
  onTaskUpdate: (payload: { id: string; updates: { description?: string; completed?: boolean } }) => Promise<void>
  onTaskToggle: (payload: { id: string }) => Promise<void>
  onTaskDelete: (payload: { id: string }) => Promise<void>
  onTasksClear: () => Promise<void>
}

/**
 * Task Manager Composition Root
 * 
 * Handles dependency injection, event handler registration, and environment-based
 * configuration for the task manager domain.
 */
export class TaskManagerComposition {
  private dependencies: TaskManagerDependencies
  private eventHandlers: TaskManagerEventHandlers
  private subscriptions: Array<{ unsubscribe(): void }> = []

  constructor(config: TaskManagerCompositionConfig) {
    // Create repository based on environment
    const taskRepository = createTaskRepository(config.environment)
    
    // Create service with repository and eventBus dependencies
    const taskService = new TaskService(taskRepository, config.eventBus)

    // Store dependencies
    this.dependencies = {
      taskService,
      taskRepository,
      eventBus: config.eventBus,
      environment: config.environment
    }

    // Create event handlers that bridge UI events to service calls
    this.eventHandlers = this.createEventHandlers(taskService)

    // Register event handlers with the event bus
    this.registerEventHandlers(config.eventBus)
  }

  /**
   * Get the wired dependencies
   */
  getDependencies(): TaskManagerDependencies {
    return this.dependencies
  }

  /**
   * Get the event handlers for testing
   */
  getEventHandlers(): TaskManagerEventHandlers {
    return this.eventHandlers
  }

  /**
   * Create event handlers that connect UI events to service operations
   */
  private createEventHandlers(taskService: TaskService): TaskManagerEventHandlers {
    return {
      onTaskCreate: async (payload: { description: string }) => {
        await taskService.createTask(payload.description)
      },

      onTaskUpdate: async (payload: { id: string; updates: { description?: string; completed?: boolean } }) => {
        await taskService.updateTask(payload.id, payload.updates)
      },

      onTaskToggle: async (payload: { id: string }) => {
        await taskService.toggleTaskCompletion(payload.id)
      },

      onTaskDelete: async (payload: { id: string }) => {
        await taskService.deleteTask(payload.id)
      },

      onTasksClear: async () => {
        await taskService.clearAllTasks()
      }
    }
  }

  /**
   * Register event handlers with the event bus
   */
  private registerEventHandlers(eventBus: EventBus): void {
    // Register UI event handlers
    this.subscriptions.push(
      eventBus.subscribe('UI.TASK.CREATE', this.eventHandlers.onTaskCreate),
      eventBus.subscribe('UI.TASK.UPDATE', this.eventHandlers.onTaskUpdate),
      eventBus.subscribe('UI.TASK.TOGGLE', this.eventHandlers.onTaskToggle),
      eventBus.subscribe('UI.TASK.DELETE', this.eventHandlers.onTaskDelete),
      eventBus.subscribe('UI.TASK.CLEAR', this.eventHandlers.onTasksClear)
    )
  }

  /**
   * Cleanup subscriptions
   */
  dispose(): void {
    this.subscriptions.forEach(subscription => subscription.unsubscribe())
    this.subscriptions = []
  }

  /**
   * Verify wiring integrity for testing
   * Returns information about the current wiring state
   */
  verifyWiring(): WiringVerificationResult {
    const result: WiringVerificationResult = {
      isValid: true,
      environment: this.dependencies.environment,
      repositoryType: this.getRepositoryType(),
      registeredHandlers: this.getRegisteredHandlers(),
      missingHandlers: [],
      unwiredEvents: [],
      errors: []
    }

    // Verify repository type matches environment
    const expectedRepoType = this.dependencies.environment === 'test' ? 'MemoryTaskRepository' : 'LocalStorageTaskRepository'
    if (result.repositoryType !== expectedRepoType) {
      result.isValid = false
      result.errors.push(`Expected ${expectedRepoType} for environment ${this.dependencies.environment}, got ${result.repositoryType}`)
    }

    // Verify all required handlers are registered
    const requiredHandlers = ['UI.TASK.CREATE', 'UI.TASK.UPDATE', 'UI.TASK.TOGGLE', 'UI.TASK.DELETE', 'UI.TASK.CLEAR']
    const registeredEvents = this.dependencies.eventBus.getRegisteredEvents()
    
    for (const handler of requiredHandlers) {
      if (!registeredEvents.includes(handler)) {
        result.missingHandlers.push(handler)
        result.isValid = false
      }
    }

    // Check for unwired events (events with no subscribers)
    for (const event of registeredEvents) {
      if (this.dependencies.eventBus.getSubscriberCount(event) === 0) {
        result.unwiredEvents.push(event)
      }
    }

    return result
  }

  /**
   * Get the repository type name for verification
   */
  private getRepositoryType(): string {
    return this.dependencies.taskRepository.constructor.name
  }

  /**
   * Get list of registered event handlers
   */
  private getRegisteredHandlers(): string[] {
    return this.dependencies.eventBus.getRegisteredEvents()
  }
}

/**
 * Wiring verification result
 */
export interface WiringVerificationResult {
  isValid: boolean
  environment: Environment
  repositoryType: string
  registeredHandlers: string[]
  missingHandlers: string[]
  unwiredEvents: string[]
  errors: string[]
}

/**
 * Factory function to create a fully wired task manager composition
 */
export function createTaskManagerComposition(config: TaskManagerCompositionConfig): TaskManagerComposition {
  return new TaskManagerComposition(config)
}

/**
 * Utility function to get environment from process.env or default to development
 */
export function getEnvironment(): Environment {
  // In Node.js environment (like tests), use NODE_ENV
  if (typeof globalThis !== 'undefined' && (globalThis as any).process?.env) {
    const env = (globalThis as any).process.env.NODE_ENV || 'development'
    
    switch (env) {
      case 'test':
        return 'test'
      case 'production':
        return 'production'
      case 'development':
      default:
        return 'development'
    }
  }
  
  // In browser environment, check if we're in test mode via global variables
  if (typeof window !== 'undefined') {
    // Check for test environment indicators
    if ((window as any).__VITEST__ || (window as any).__TEST__) {
      return 'test'
    }
    // Default to development in browser
    return 'development'
  }
  
  // Fallback to development
  return 'development'
}