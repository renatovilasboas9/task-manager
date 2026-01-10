/**
 * StorageNotificationService
 * 
 * Service for managing storage-related notifications to users.
 * Provides a centralized way to handle localStorage failures, corrupted data,
 * and other storage issues with user-friendly messages.
 * 
 * Requirements covered:
 * - 5.3: Display warning when localStorage unavailable
 * - 5.4: Handle corrupted data gracefully with user notification
 */

import { v4 as uuidv4 } from 'uuid'

export type StorageNotificationType = 'warning' | 'error' | 'info'

export interface StorageNotification {
  id: string
  type: StorageNotificationType
  message: string
  timestamp: Date
  persistent?: boolean
  details?: string
}

export type NotificationHandler = (notification: StorageNotification) => void

/**
 * Storage notification service for managing user notifications about storage issues
 */
export class StorageNotificationService {
  private handlers: Set<NotificationHandler> = new Set()

  /**
   * Subscribe to storage notifications
   */
  subscribe(handler: NotificationHandler): () => void {
    this.handlers.add(handler)
    
    return () => {
      this.handlers.delete(handler)
    }
  }

  /**
   * Emit a storage notification to all subscribers
   */
  private emit(notification: StorageNotification): void {
    this.handlers.forEach(handler => {
      try {
        handler(notification)
      } catch (error) {
        console.error('Error in notification handler:', error)
      }
    })
  }

  /**
   * Notify about localStorage being unavailable
   * Requirements: 5.3 - Display warning when localStorage unavailable
   */
  notifyStorageUnavailable(reason?: string): void {
    const notification: StorageNotification = {
      id: uuidv4(),
      type: 'warning',
      message: 'Local storage is unavailable. Your tasks will be stored in memory and lost when you close the browser.',
      timestamp: new Date(),
      persistent: true,
      details: reason
    }

    console.warn('localStorage unavailable:', reason)
    this.emit(notification)
  }

  /**
   * Notify about corrupted data being found and cleared
   * Requirements: 5.4 - Handle corrupted data gracefully with user notification
   */
  notifyCorruptedDataCleared(error?: string): void {
    const notification: StorageNotification = {
      id: uuidv4(),
      type: 'warning',
      message: 'Corrupted task data was found and cleared. Starting with an empty task list.',
      timestamp: new Date(),
      persistent: false,
      details: error
    }

    console.warn('Corrupted data cleared:', error)
    this.emit(notification)
  }

  /**
   * Notify about storage quota being exceeded
   */
  notifyStorageQuotaExceeded(): void {
    const notification: StorageNotification = {
      id: uuidv4(),
      type: 'error',
      message: 'Storage quota exceeded. Some tasks may not be saved. Please clear browser data or use fewer tasks.',
      timestamp: new Date(),
      persistent: true
    }

    console.error('Storage quota exceeded')
    this.emit(notification)
  }

  /**
   * Notify about temporary storage failure with retry suggestion
   */
  notifyTemporaryStorageFailure(operation: string): void {
    const notification: StorageNotification = {
      id: uuidv4(),
      type: 'warning',
      message: `Failed to ${operation}. Your changes may not be saved. Please try again.`,
      timestamp: new Date(),
      persistent: false
    }

    console.warn(`Temporary storage failure during ${operation}`)
    this.emit(notification)
  }

  /**
   * Notify about successful fallback to memory storage
   */
  notifyFallbackToMemory(): void {
    const notification: StorageNotification = {
      id: uuidv4(),
      type: 'info',
      message: 'Using temporary memory storage. Tasks will be lost when you close the browser.',
      timestamp: new Date(),
      persistent: true
    }

    console.info('Fallback to memory storage activated')
    this.emit(notification)
  }

  /**
   * Notify about storage being restored
   */
  notifyStorageRestored(): void {
    const notification: StorageNotification = {
      id: uuidv4(),
      type: 'info',
      message: 'Local storage has been restored. Your tasks will now be saved permanently.',
      timestamp: new Date(),
      persistent: false
    }

    console.info('Storage restored')
    this.emit(notification)
  }
}

/**
 * Global instance of the storage notification service
 */
export const storageNotificationService = new StorageNotificationService()