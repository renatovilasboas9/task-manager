import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventBus, TaskManagerEvents } from './EventBus'

describe('EventBus', () => {
  let eventBus: EventBus

  beforeEach(() => {
    eventBus = new EventBus()
  })

  describe('subscribe and publish', () => {
    it('should call handler when event is published', async () => {
      const handler = vi.fn()
      const payload = { test: 'data' }

      eventBus.subscribe('TEST.EVENT', handler)
      await eventBus.publish('TEST.EVENT', payload)

      expect(handler).toHaveBeenCalledWith(payload)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should call multiple handlers for the same event', async () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const payload = { test: 'data' }

      eventBus.subscribe('TEST.EVENT', handler1)
      eventBus.subscribe('TEST.EVENT', handler2)
      await eventBus.publish('TEST.EVENT', payload)

      expect(handler1).toHaveBeenCalledWith(payload)
      expect(handler2).toHaveBeenCalledWith(payload)
    })

    it('should not call handlers for different events', async () => {
      const handler = vi.fn()

      eventBus.subscribe('TEST.EVENT.A', handler)
      await eventBus.publish('TEST.EVENT.B', { test: 'data' })

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle async handlers', async () => {
      const handler = vi.fn().mockResolvedValue(undefined)
      const payload = { test: 'data' }

      eventBus.subscribe('TEST.EVENT', handler)
      await eventBus.publish('TEST.EVENT', payload)

      expect(handler).toHaveBeenCalledWith(payload)
    })

    it('should handle handler errors gracefully', async () => {
      const errorHandler = vi.fn().mockImplementation(() => {
        throw new Error('Handler error')
      })
      const goodHandler = vi.fn()
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      eventBus.subscribe('TEST.EVENT', errorHandler)
      eventBus.subscribe('TEST.EVENT', goodHandler)
      
      await eventBus.publish('TEST.EVENT', { test: 'data' })

      expect(errorHandler).toHaveBeenCalled()
      expect(goodHandler).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler for TEST.EVENT:'),
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('unsubscribe', () => {
    it('should stop calling handler after unsubscribe', async () => {
      const handler = vi.fn()
      const subscription = eventBus.subscribe('TEST.EVENT', handler)

      await eventBus.publish('TEST.EVENT', { test: 'data' })
      expect(handler).toHaveBeenCalledTimes(1)

      subscription.unsubscribe()
      await eventBus.publish('TEST.EVENT', { test: 'data' })
      expect(handler).toHaveBeenCalledTimes(1) // Still only called once
    })

    it('should clean up empty event handlers map', () => {
      const handler = vi.fn()
      const subscription = eventBus.subscribe('TEST.EVENT', handler)

      expect(eventBus.getSubscriberCount('TEST.EVENT')).toBe(1)
      expect(eventBus.getRegisteredEvents()).toContain('TEST.EVENT')

      subscription.unsubscribe()

      expect(eventBus.getSubscriberCount('TEST.EVENT')).toBe(0)
      expect(eventBus.getRegisteredEvents()).not.toContain('TEST.EVENT')
    })
  })

  describe('utility methods', () => {
    it('should return correct subscriber count', () => {
      expect(eventBus.getSubscriberCount('TEST.EVENT')).toBe(0)

      eventBus.subscribe('TEST.EVENT', vi.fn())
      expect(eventBus.getSubscriberCount('TEST.EVENT')).toBe(1)

      eventBus.subscribe('TEST.EVENT', vi.fn())
      expect(eventBus.getSubscriberCount('TEST.EVENT')).toBe(2)
    })

    it('should return registered events', () => {
      expect(eventBus.getRegisteredEvents()).toEqual([])

      eventBus.subscribe('EVENT.A', vi.fn())
      eventBus.subscribe('EVENT.B', vi.fn())

      const events = eventBus.getRegisteredEvents()
      expect(events).toContain('EVENT.A')
      expect(events).toContain('EVENT.B')
      expect(events).toHaveLength(2)
    })

    it('should clear all handlers', () => {
      eventBus.subscribe('EVENT.A', vi.fn())
      eventBus.subscribe('EVENT.B', vi.fn())

      expect(eventBus.getRegisteredEvents()).toHaveLength(2)

      eventBus.clear()

      expect(eventBus.getRegisteredEvents()).toHaveLength(0)
    })
  })

  describe('TaskManager event constants', () => {
    it('should have correct event names', () => {
      expect(TaskManagerEvents.CREATE).toBe('TASK.MANAGER.CREATE')
      expect(TaskManagerEvents.UPDATE).toBe('TASK.MANAGER.UPDATE')
      expect(TaskManagerEvents.DELETE).toBe('TASK.MANAGER.DELETE')
      expect(TaskManagerEvents.CLEAR).toBe('TASK.MANAGER.CLEAR')
    })
  })
})