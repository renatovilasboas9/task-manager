# Task Manager

A modern, clean task management application built with React, TypeScript, and Material-UI.

## Features

- ✅ Create and manage tasks
- 🎯 Mark tasks as complete/incomplete
- 🗑️ Delete unwanted tasks
- 🔍 Filter tasks (All, Active, Completed)
- 💾 Automatic persistence to localStorage
- 📱 Responsive design with Material-UI
- 🧪 Comprehensive testing with Vitest and Property-Based Testing

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **UI Library**: Material-UI (MUI)
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library + fast-check (Property-Based Testing)
- **Validation**: Zod schemas
- **Code Quality**: ESLint + Prettier
- **Architecture**: Domain-Driven Design (DDD) + Clean Architecture

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run all quality checks (lint, tests, coverage)
npm run global

# Build for production
npm run build
```

## Project Structure

```
src/
├── domains/
│   └── task-manager/          # Task management domain
│       ├── bdd/              # BDD test scenarios
│       ├── components/       # React components
│       ├── contracts/        # Zod schemas & types
│       ├── repository/       # Data access layer
│       └── service/          # Business logic
├── shared/                   # Shared utilities
│   ├── infra/               # Infrastructure (EventBus, etc.)
│   └── utils/               # Generic utilities
└── test/                    # Test setup
```

## Quality Standards

- 🔍 **Lint**: ESLint with TypeScript rules
- 🎨 **Format**: Prettier code formatting
- 🧪 **Tests**: Unit tests + Property-Based Testing
- 📊 **Coverage**: Minimum 80% code coverage
- 🔌 **Wiring**: Component integration validation

## Architecture Principles

- **Domain-Driven Design**: Code organized by business domains
- **Clean Architecture**: Separation of concerns with clear boundaries
- **Event-Driven**: Loose coupling through event system
- **Property-Based Testing**: Comprehensive validation with generated test cases
- **Contract-First**: Zod schemas as single source of truth