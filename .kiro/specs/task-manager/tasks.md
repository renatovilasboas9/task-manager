# Implementation Plan

- [x] 1. Set up project structure and development environment
  - Initialize Vite + React + TypeScript project with proper folder structure
  - Configure ESLint + Prettier with workspace settings for lint/format on save
  - Set up Material-UI with theme configuration
  - Create domain-based folder structure: `src/domains/task-manager/`
  - Configure testing environment with Vitest + React Testing Library + fast-check
  - _Requirements: All requirements need proper development setup_

- [ ] 2. Create core contracts and data models
  - [-] 2.1 Define Zod schemas for Task and application state
    - Create TaskSchema with id, description, completed, createdAt, updatedAt
    - Create TaskFilterSchema for filter types (all, active, completed)
    - Create AppStateSchema for application state management
    - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3_

  - [ ] 2.2 Write property test for task schema validation
    - **Property 2: Empty task rejection preserves state**
    - **Validates: Requirements 1.2**

- [ ] 3. Implement repository layer with localStorage
  - [ ] 3.1 Create TaskRepository interface and localStorage implementation
    - Define repository interface with save, findById, findAll, delete, clear methods
    - Implement LocalStorageTaskRepository with error handling for storage failures
    - Add fallback to in-memory storage when localStorage unavailable
    - _Requirements: 1.4, 2.3, 3.2, 5.1, 5.3, 5.4_

  - [ ] 3.2 Write property test for storage persistence
    - **Property 9: Storage restoration round-trip**
    - **Validates: Requirements 5.1**

- [ ] 4. Implement task service layer
  - [ ] 4.1 Create TaskService with business logic
    - Implement createTask with GUID generation and validation
    - Implement updateTask with completion status management
    - Implement deleteTask with proper cleanup
    - Add getAllTasks and getTasksByFilter methods
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3_

  - [ ] 4.2 Write property test for task creation
    - **Property 1: Task addition grows list and persists**
    - **Validates: Requirements 1.1, 1.4**

  - [ ] 4.3 Write property test for task completion toggle
    - **Property 4: Task completion toggle round-trip**
    - **Validates: Requirements 2.1, 2.2, 2.4**

  - [ ] 4.4 Write property test for task deletion
    - **Property 6: Task deletion removes and persists**
    - **Validates: Requirements 3.1, 3.2, 3.3**

- [ ] 5. Create event system and composition root
  - [ ] 5.1 Implement EventBus for component communication
    - Create simple pub/sub event system for loose coupling
    - Define task-related events (TASK.CREATE, TASK.UPDATE, TASK.DELETE)
    - _Requirements: All requirements benefit from event-driven architecture_

  - [ ] 5.2 Set up composition root and dependency injection
    - Create composition root that wires repository, service, and event handlers
    - Configure different implementations for TEST/DEV environments
    - _Requirements: All requirements need proper dependency management_

- [ ] 6. Implement core React components
  - [ ] 6.1 Create TaskInput component
    - Implement input field with validation and submission handling
    - Add Enter key and button click support for task creation
    - Implement input clearing and focus management after submission
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 6.2 Write property test for input behavior
    - **Property 3: Task addition clears and focuses input**
    - **Validates: Requirements 1.3**

  - [ ] 6.3 Create TaskItem component
    - Implement individual task display with checkbox and delete button
    - Add completion status toggle functionality
    - Implement visual styling for completed vs active tasks
    - _Requirements: 2.1, 2.2, 2.4, 3.1_

  - [ ] 6.4 Create TaskList component
    - Implement task collection display with proper rendering
    - Add empty state handling when no tasks exist
    - Integrate with filtering system for conditional display
    - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.5_

  - [ ] 6.5 Create TaskFilter component
    - Implement filter buttons (All, Active, Completed)
    - Add active filter state management and persistence
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 6.6 Create TaskCounter component
    - Implement active task counting logic
    - Add real-time updates when task status changes
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 6.7 Write property test for filtering logic
    - **Property 7: Filter display correctness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [ ] 6.8 Write property test for filter updates
    - **Property 8: Filter view updates with data changes**
    - **Validates: Requirements 4.5**

  - [ ] 6.9 Write property test for task counting
    - **Property 10: Active task count accuracy**
    - **Validates: Requirements 6.1, 6.2, 6.4**

- [ ] 7. Create main TaskManager container component
  - [ ] 7.1 Implement main application container
    - Set up React Context for global state management
    - Integrate all child components with proper data flow
    - Implement application initialization and data loading
    - Add error boundary for graceful error handling
    - _Requirements: 5.1, 5.3, 5.4_

  - [ ] 7.2 Write property test for completion status persistence
    - **Property 5: Task completion persistence**
    - **Validates: Requirements 2.3**

- [ ] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Add error handling and edge cases
  - [ ] 9.1 Implement comprehensive error handling
    - Add localStorage failure detection and fallback
    - Implement corrupted data recovery with empty state initialization
    - Add user notifications for storage issues and errors
    - _Requirements: 5.3, 5.4_

  - [ ] 9.2 Write unit tests for error scenarios
    - Test localStorage unavailable fallback behavior
    - Test corrupted data recovery and error logging
    - Test empty state display when last task deleted
    - _Requirements: 3.4, 5.3, 5.4_

- [ ] 10. Implement BDD scenarios for end-to-end validation
  - [ ] 10.1 Create BDD test scenarios
    - Write Gherkin scenarios for core user workflows
    - Implement step definitions using real components and services
    - Cover task creation, completion, deletion, and filtering workflows
    - _Requirements: All requirements validated through BDD scenarios_

  - [ ] 10.2 Set up E2E tests with Playwright
    - Configure Playwright for cross-browser testing
    - Create E2E tests that map to BDD scenarios
    - Add video recording for test execution
    - _Requirements: All requirements need E2E validation_

- [ ] 11. Final integration and polish
  - [ ] 11.1 Complete application integration
    - Wire all components together in main App component
    - Add final styling and responsive design touches
    - Implement proper loading states and transitions
    - _Requirements: All requirements need final integration_

  - [ ] 11.2 Add comprehensive integration tests
    - Test complete user workflows from UI to storage
    - Verify event flow and component communication
    - Test application initialization and data restoration
    - _Requirements: All requirements need integration validation_

- [ ] 12. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
