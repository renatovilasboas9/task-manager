/**
 * TaskManager - Main container component
 * 
 * This is the main container that orchestrates the entire task manager application.
 * It provides React Context + useReducer for global state management, integrates
 * all child components, handles data initialization and loading, and includes
 * error boundary for graceful error handling.
 * 
 * Requirements:
 * - 5.1: Restore tasks from localStorage on application load
 * - 5.3: Continue functioning with memory storage when localStorage unavailable
 * - 5.4: Handle corrupted data gracefully with empty state
 */

import React, { createContext, useContext, useReducer, useEffect, useState, ReactNode } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Alert,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
  IconButton,
  Collapse
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import { TaskInput } from '../../gallery/task-manager/TaskInput'
import { TaskList } from '../../gallery/task-manager/TaskList'
import { TaskFilterComponent } from '../../gallery/task-manager/TaskFilter'
import { TaskCounter } from '../../gallery/task-manager/TaskCounter'
import { TaskManagerComposition, createTaskManagerComposition, getEnvironment } from './composition/TaskManagerComposition'
import { EventBus } from '../../shared/infrastructure/EventBus'
import { storageNotificationService, type StorageNotification as StorageNotificationData } from '../../shared/infrastructure/StorageNotificationService'
import { type Task, type TaskFilter as TaskFilterType, type AppState } from '../../shared/contracts/task-manager/v1/TaskSchema'

// Create a clean theme for the application with responsive breakpoints
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    h4: {
      fontWeight: 600,
      '@media (max-width:600px)': {
        fontSize: '1.75rem'
      },
      '@media (min-width:600px)': {
        fontSize: '2.125rem'
      }
    },
    subtitle1: {
      '@media (max-width:600px)': {
        fontSize: '0.875rem'
      },
      '@media (min-width:600px)': {
        fontSize: '1rem'
      }
    }
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '16px',
          paddingRight: '16px',
          '@media (min-width: 600px)': {
            paddingLeft: '24px',
            paddingRight: '24px',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          transition: 'box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms',
        },
      },
    },
  },
})

/**
 * Storage notification types for user feedback
 */
export type StorageNotification = StorageNotificationData

/**
 * Application state actions
 */
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_TASKS'; payload: Task[] }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: { id: string; updates: Partial<Task> } }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'SET_FILTER'; payload: TaskFilterType }
  | { type: 'CLEAR_TASKS' }
  | { type: 'INITIALIZE_STATE'; payload: { tasks: Task[]; filter: TaskFilterType } }
  | { type: 'ADD_STORAGE_NOTIFICATION'; payload: StorageNotification }
  | { type: 'REMOVE_STORAGE_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_STORAGE_NOTIFICATIONS' }

/**
 * Initial application state
 */
const initialState: AppState & { storageNotifications: StorageNotification[] } = {
  tasks: [],
  filter: 'all',
  isLoading: true,
  error: null,
  storageNotifications: []
}

/**
 * Application state reducer
 */
function appReducer(state: AppState & { storageNotifications: StorageNotification[] }, action: AppAction): AppState & { storageNotifications: StorageNotification[] } {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload }

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false }

    case 'SET_TASKS':
      return { ...state, tasks: action.payload }

    case 'ADD_TASK':
      return { ...state, tasks: [action.payload, ...state.tasks] }

    case 'UPDATE_TASK': {
      const updatedTasks = state.tasks.map(task =>
        task.id === action.payload.id
          ? { ...task, ...action.payload.updates, updatedAt: new Date() }
          : task
      )
      return { ...state, tasks: updatedTasks }
    }

    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(task => task.id !== action.payload) }

    case 'SET_FILTER':
      return { ...state, filter: action.payload }

    case 'CLEAR_TASKS':
      return { ...state, tasks: [] }

    case 'INITIALIZE_STATE':
      return {
        ...state,
        tasks: action.payload.tasks,
        filter: action.payload.filter,
        isLoading: false,
        error: null
      }

    case 'ADD_STORAGE_NOTIFICATION':
      return {
        ...state,
        storageNotifications: [...state.storageNotifications, action.payload]
      }

    case 'REMOVE_STORAGE_NOTIFICATION':
      return {
        ...state,
        storageNotifications: state.storageNotifications.filter(n => n.id !== action.payload)
      }

    case 'CLEAR_STORAGE_NOTIFICATIONS':
      return {
        ...state,
        storageNotifications: []
      }

    default:
      return state
  }
}

/**
 * Task Manager Context
 */
interface TaskManagerContextType {
  state: AppState & { storageNotifications: StorageNotification[] }
  dispatch: React.Dispatch<AppAction>
  composition: TaskManagerComposition
}

const TaskManagerContext = createContext<TaskManagerContextType | null>(null)

/**
 * Hook to use TaskManager context
 */
export function useTaskManager(): TaskManagerContextType {
  const context = useContext(TaskManagerContext)
  if (!context) {
    throw new Error('useTaskManager must be used within a TaskManagerProvider')
  }
  return context
}

/**
 * TaskManager Provider Props
 */
interface TaskManagerProviderProps {
  children: ReactNode
  eventBus?: EventBus
}

/**
 * TaskManager Provider Component
 * 
 * Provides the task manager context and handles initialization
 */
export function TaskManagerProvider({ children, eventBus }: TaskManagerProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  
  // Create shared EventBus if not provided
  const sharedEventBus = eventBus || new EventBus()
  
  const [composition] = useState(() => 
    createTaskManagerComposition({
      environment: getEnvironment(),
      eventBus: sharedEventBus
    })
  )

  // Initialize application state on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true })
        dispatch({ type: 'SET_ERROR', payload: null })

        const { taskService } = composition.getDependencies()

        // Load tasks from storage (Requirements 5.1, 5.3, 5.4)
        const tasks = await taskService.getAllTasks()
        
        // Load filter preference from localStorage with fallback
        let savedFilter: TaskFilterType = 'all'
        try {
          const filterFromStorage = localStorage.getItem('taskManager.filter')
          if (filterFromStorage && ['all', 'active', 'completed'].includes(filterFromStorage)) {
            savedFilter = filterFromStorage as TaskFilterType
          }
        } catch (error) {
          // localStorage unavailable, use default filter
          console.warn('Could not load filter preference from localStorage:', error)
        }

        dispatch({
          type: 'INITIALIZE_STATE',
          payload: { tasks, filter: savedFilter }
        })

      } catch (error) {
        console.error('Failed to initialize TaskManager:', error)
        dispatch({
          type: 'SET_ERROR',
          payload: error instanceof Error ? error.message : 'Failed to initialize application'
        })
      }
    }

    initializeApp()
  }, [composition])

  // Subscribe to storage notifications
  useEffect(() => {
    const unsubscribe = storageNotificationService.subscribe((notification: StorageNotificationData) => {
      dispatch({ type: 'ADD_STORAGE_NOTIFICATION', payload: notification })
      
      // Auto-remove non-persistent notifications after 10 seconds
      if (!notification.persistent) {
        setTimeout(() => {
          dispatch({ type: 'REMOVE_STORAGE_NOTIFICATION', payload: notification.id })
        }, 10000)
      }
    })

    return unsubscribe
  }, [])

  // Subscribe to domain events to update UI state
  useEffect(() => {
    // Use the eventBus from composition to ensure we're using the same instance
    const { eventBus: compositionEventBus } = composition.getDependencies()
    
    const subscriptions = [
      // Listen for task creation events
      compositionEventBus.subscribe('TASK.MANAGER.CREATE', (payload: { task: Task }) => {
        dispatch({ type: 'ADD_TASK', payload: payload.task })
      }),

      // Listen for task update events
      compositionEventBus.subscribe('TASK.MANAGER.UPDATE', (payload: { task: Task }) => {
        dispatch({ 
          type: 'UPDATE_TASK', 
          payload: { 
            id: payload.task.id, 
            updates: payload.task 
          } 
        })
      }),

      // Listen for task deletion events
      compositionEventBus.subscribe('TASK.MANAGER.DELETE', (payload: { taskId: string }) => {
        dispatch({ type: 'DELETE_TASK', payload: payload.taskId })
      }),

      // Listen for clear all tasks events
      compositionEventBus.subscribe('TASK.MANAGER.CLEAR', () => {
        dispatch({ type: 'CLEAR_TASKS' })
      })
    ]

    return () => {
      subscriptions.forEach(sub => sub.unsubscribe())
    }
  }, [composition]) // Only depend on composition, not the eventBus

  // Save filter preference to localStorage when it changes
  useEffect(() => {
    if (!state.isLoading) {
      try {
        localStorage.setItem('taskManager.filter', state.filter)
      } catch (error) {
        // localStorage unavailable, continue without saving
        console.warn('Could not save filter preference to localStorage:', error)
      }
    }
  }, [state.filter, state.isLoading])

  const contextValue: TaskManagerContextType = {
    state,
    dispatch,
    composition
  }

  return (
    <TaskManagerContext.Provider value={contextValue}>
      {children}
    </TaskManagerContext.Provider>
  )
}

/**
 * Task Manager UI Component
 * 
 * The main UI component that renders all task manager functionality
 */
function TaskManagerUI() {
  const { state, dispatch, composition } = useTaskManager()
  const { eventBus } = composition.getDependencies()

  // Handle task creation
  const handleCreateTask = async (description: string) => {
    try {
      await eventBus.publish('UI.TASK.CREATE', { description })
    } catch (error) {
      console.error('Failed to create task:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to create task'
      })
    }
  }

  // Handle task completion toggle
  const handleToggleComplete = async (taskId: string) => {
    try {
      await eventBus.publish('UI.TASK.TOGGLE', { id: taskId })
    } catch (error) {
      console.error('Failed to toggle task:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to update task'
      })
    }
  }

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    try {
      await eventBus.publish('UI.TASK.DELETE', { id: taskId })
    } catch (error) {
      console.error('Failed to delete task:', error)
      dispatch({
        type: 'SET_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to delete task'
      })
    }
  }

  // Handle filter change
  const handleFilterChange = (newFilter: TaskFilterType) => {
    dispatch({ type: 'SET_FILTER', payload: newFilter })
  }

  // Handle storage notification dismissal
  const handleDismissStorageNotification = (notificationId: string) => {
    dispatch({ type: 'REMOVE_STORAGE_NOTIFICATION', payload: notificationId })
  }

  // Calculate task counts for filter component
  const taskCounts = {
    all: state.tasks.length,
    active: state.tasks.filter(t => !t.completed).length,
    completed: state.tasks.filter(t => t.completed).length
  }

  // Show loading state
  if (state.isLoading) {
    return (
      <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
        <Box 
          display="flex" 
          flexDirection="column"
          justifyContent="center" 
          alignItems="center" 
          minHeight={{ xs: "200px", sm: "300px" }}
          textAlign="center"
        >
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h6" sx={{ mb: 1 }}>
            Loading Task Manager
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Initializing your tasks and preferences...
          </Typography>
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ py: { xs: 2, sm: 4 } }}>
      {/* Header */}
      <Box textAlign="center" mb={{ xs: 3, sm: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Task Manager
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Organize your tasks efficiently
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography 
            component="a" 
            href="/gallery" 
            variant="body2" 
            sx={{ 
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            🎨 View Component Gallery
          </Typography>
        </Box>
      </Box>

      {/* Storage Notifications */}
      {state.storageNotifications.map((notification) => (
        <Collapse key={notification.id} in={true}>
          <Alert
            severity={notification.type}
            sx={{ mb: 2 }}
            action={
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={() => handleDismissStorageNotification(notification.id)}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            }
          >
            <Typography variant="body2" component="div">
              {notification.message}
            </Typography>
            {notification.details && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Details: {notification.details}
              </Typography>
            )}
          </Alert>
        </Collapse>
      ))}

      {/* Error Alert */}
      {state.error && (
        <Collapse in={!!state.error}>
          <Alert 
            severity="error" 
            sx={{ mb: 3 }}
            onClose={() => dispatch({ type: 'SET_ERROR', payload: null })}
          >
            {state.error}
          </Alert>
        </Collapse>
      )}

      {/* Main Content */}
      <Paper 
        elevation={2} 
        sx={{ 
          p: { xs: 2, sm: 3 },
          borderRadius: { xs: 2, sm: 3 },
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            elevation: 4
          }
        }}
      >
        {/* Task Input */}
        <Box mb={{ xs: 2, sm: 3 }}>
          <TaskInput
            onCreateTask={handleCreateTask}
            placeholder="What needs to be done?"
            autoFocus
          />
        </Box>

        {/* Task Counter */}
        <Box mb={{ xs: 2, sm: 3 }}>
          <TaskCounter tasks={state.tasks} />
        </Box>

        {/* Task Filter */}
        <Box mb={{ xs: 2, sm: 3 }}>
          <TaskFilterComponent
            currentFilter={state.filter}
            onFilterChange={handleFilterChange}
            taskCounts={taskCounts}
          />
        </Box>

        {/* Task List */}
        <Box sx={{ 
          transition: 'opacity 0.3s ease-in-out',
          opacity: state.isLoading ? 0.5 : 1 
        }}>
          <TaskList
            tasks={state.tasks}
            filter={state.filter}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteTask}
          />
        </Box>
      </Paper>

      {/* Footer */}
      <Box 
        textAlign="center" 
        mt={{ xs: 3, sm: 4 }}
        sx={{ opacity: 0.7 }}
      >
        <Typography variant="caption" color="text.secondary">
          Task Manager - Built with React & Material-UI
        </Typography>
      </Box>
    </Container>
  )
}

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and
 * displays a fallback UI instead of crashing the entire application
 */
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class TaskManagerErrorBoundary extends React.Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('TaskManager Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h5" color="error" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              The application encountered an unexpected error. Please refresh the page to try again.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {this.state.error?.message}
            </Typography>
          </Paper>
        </Container>
      )
    }

    return this.props.children
  }
}

/**
 * Main TaskManager Component
 * 
 * The complete task manager application with error boundary,
 * context provider, theme, and UI components
 */
export function TaskManager() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <TaskManagerErrorBoundary>
        <TaskManagerProvider>
          <TaskManagerUI />
        </TaskManagerProvider>
      </TaskManagerErrorBoundary>
    </ThemeProvider>
  )
}

export default TaskManager