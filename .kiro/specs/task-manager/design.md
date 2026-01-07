# Task Manager Design Document

## Overview

The Task Manager is a React-based web application that provides a clean, efficient interface for personal task management. The system follows Domain-Driven Design (DDD) principles with clear separation between UI components, business logic, and data persistence. The application uses local storage for data persistence and implements an event-driven architecture for loose coupling between components.

## Architecture

The application follows a layered architecture with clear separation of concerns:

- **UI Layer**: React components with Material-UI for consistent styling
- **Service Layer**: Business logic and task operations
- **Repository Layer**: Data persistence abstraction with localStorage implementation
- **Event Layer**: Event-driven communication between components

### Technology Stack

- **Frontend**: React 18 with TypeScript
- **UI Framework**: Material-UI (MUI) for components and theming
- **State Management**: React Context + useReducer for global state
- **Data Validation**: Zod for schema validation and type safety
- **Testing**: Vitest + React Testing Library for unit tests
- **Property Testing**: fast-check for property-based testing
- **Build Tool**: Vite for development and bundling
- **Storage**: Browser localStorage with fallback to in-memory storage

## Components and Interfaces

### Core Components

1. **TaskManager** (Main Container)
   - Orchestrates the entire application
   - Manages global state and event handling
   - Provides context to child components

2. **TaskInput**
   - Handles new task creation
   - Validates input and prevents empty submissions
   - Manages input focus and clearing

3. **TaskList**
   - Displays filtered list of tasks
   - Handles task rendering and empty states
   - Manages list interactions

4. **TaskItem**
   - Individual task display and interaction
   - Toggle completion status
   - Delete task functionality

5. **TaskFilter**
   - Filter controls (All, Active, Completed)
   - Maintains filter state
   - Updates display based on selection

6. **TaskCounter**
   - Displays count of active (incomplete) tasks
   - Updates automatically when tasks change

### Service Interfaces

```typescript
interface TaskService {
  createTask(description: string): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: string): Promise<void>;
  getAllTasks(): Promise<Task[]>;
  getTasksByFilter(filter: TaskFilter): Promise<Task[]>;
}

interface TaskRepository {
  save(task: Task): Promise<Task>;
  findById(id: string): Promise<Task | null>;
  findAll(): Promise<Task[]>;
  delete(id: string): Promise<void>;
  clear(): Promise<void>;
}
```

## Data Models

### Task Entity

```typescript
const TaskSchema = z.object({
  id: z.string().uuid(),
  description: z.string().min(1).max(500),
  completed: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

type Task = z.infer<typeof TaskSchema>;
```

### Filter Types

```typescript
const TaskFilterSchema = z.enum(['all', 'active', 'completed']);
type TaskFilter = z.infer<typeof TaskFilterSchema>;
```

### Application State

```typescript
const AppStateSchema = z.object({
  tasks: z.array(TaskSchema),
  filter: TaskFilterSchema,
  isLoading: z.boolean(),
  error: z.string().nullable(),
});

type AppState = z.infer<typeof AppStateSchema>;
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

After reviewing the acceptance criteria, several properties can be consolidated to eliminate redundancy and provide comprehensive validation:

### Property Reflection

The following properties were identified as redundant and consolidated:

- Task addition and persistence properties (1.1, 1.4) can be combined into a single comprehensive property
- Task completion toggle properties (2.1, 2.4) represent the same round-trip behavior
- Filter display properties (4.1, 4.2, 4.3) can be unified into one comprehensive filtering property
- Task count properties (6.1, 6.2, 6.4) all test the same counting invariant

### Core Properties

**Property 1: Task addition grows list and persists**
_For any_ valid task description and current task list, adding the task should result in the task list growing by one, containing the new task, and the task being persisted to storage
**Validates: Requirements 1.1, 1.4**

**Property 2: Empty task rejection preserves state**
_For any_ string composed entirely of whitespace characters, attempting to add it should be rejected, leaving the task list and storage unchanged
**Validates: Requirements 1.2**

**Property 3: Task addition clears and focuses input**
_For any_ valid task addition, the input field should be cleared and receive focus after the operation completes
**Validates: Requirements 1.3**

**Property 4: Task completion toggle round-trip**
_For any_ task, toggling its completion status twice should return it to its original state, with appropriate styling applied at each step
**Validates: Requirements 2.1, 2.2, 2.4**

**Property 5: Task completion persistence**
_For any_ task completion status change, the new status should be immediately reflected in storage
**Validates: Requirements 2.3**

**Property 6: Task deletion removes and persists**
_For any_ task in the task list, deleting it should remove it from both the displayed list and storage, while preserving the order and state of remaining tasks
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 7: Filter display correctness**
_For any_ task collection and filter selection (all/active/completed), only tasks matching the filter criteria should be displayed, and the filter state should persist across sessions
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 8: Filter view updates with data changes**
_For any_ filtered view and task modification (add/delete/toggle), the filtered display should update to reflect the current state correctly
**Validates: Requirements 4.5**

**Property 9: Storage restoration round-trip**
_For any_ collection of tasks saved to storage, reloading the application should restore exactly the same tasks with identical properties
**Validates: Requirements 5.1**

**Property 10: Active task count accuracy**
_For any_ task collection, the displayed active count should equal the number of incomplete tasks, updating immediately when tasks are added, deleted, or their completion status changes
**Validates: Requirements 6.1, 6.2, 6.4**

## Error Handling

The system implements comprehensive error handling for various failure scenarios:

### Storage Failures

- **localStorage Unavailable**: Falls back to in-memory storage with user notification
- **Corrupted Data**: Initializes with empty state and logs error for debugging
- **Storage Quota Exceeded**: Implements cleanup strategy for old data

### Input Validation

- **Invalid Task Data**: Rejects malformed tasks using Zod schema validation
- **XSS Prevention**: Sanitizes all user input before storage and display
- **Length Limits**: Enforces maximum task description length (500 characters)

### Network and Performance

- **Debounced Operations**: Prevents rapid-fire operations that could cause state inconsistencies
- **Optimistic Updates**: Updates UI immediately while persisting in background
- **Error Recovery**: Provides retry mechanisms for failed operations

## Testing Strategy

The testing approach combines unit testing and property-based testing to ensure comprehensive coverage:

### Unit Testing with Vitest + React Testing Library

- **Component Testing**: Verify individual component behavior and rendering
- **Integration Testing**: Test component interactions and data flow
- **Edge Case Testing**: Handle specific scenarios like empty states and error conditions
- **User Interaction Testing**: Simulate user actions and verify expected outcomes

### Property-Based Testing with fast-check

- **Universal Properties**: Test behaviors that should hold across all valid inputs
- **Minimum 100 iterations**: Each property test runs at least 100 random test cases
- **Property Tagging**: Each test explicitly references its corresponding design property
- **Tag Format**: `**Feature: task-manager, Property {number}: {property_text}**`

### Testing Requirements

- **Coverage Gates**: Maintain ≥80% overall coverage, with ≥90% for service layer
- **Property Implementation**: Each correctness property implemented by exactly one property-based test
- **Test Data Builders**: Use builders for consistent test data generation
- **No Watch Mode**: All tests run in finite, non-interactive mode

### Dual Testing Benefits

- **Unit tests** catch specific bugs and verify concrete examples
- **Property tests** verify general correctness across input space
- **Together** they provide comprehensive validation of system behavior

The testing strategy ensures that both specific use cases and general system properties are thoroughly validated, providing confidence in the system's correctness and reliability.
