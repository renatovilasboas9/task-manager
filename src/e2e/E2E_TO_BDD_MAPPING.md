# E2E to BDD Scenario Mapping

This document maps each E2E scenario in the Cucumber feature files to their corresponding BDD test scenarios, ensuring complete coverage and traceability.

## Task Creation Scenarios

### E2E: "Criar nova tarefa válida"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-creation.test.ts`
- **BDD Scenario**: "Creating a valid task" → "should add task to list and persist to storage"
- **Property Tested**: Property 1 - Adição de tarefa cresce lista e persiste
- **Requirements**: 1.1, 1.4

### E2E: "Tentar criar tarefa vazia"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-creation.test.ts`
- **BDD Scenario**: "Attempting to create empty or invalid tasks" → "should reject empty task description"
- **Property Tested**: Property 2 - Rejeição de tarefa vazia preserva estado
- **Requirements**: 1.2

## Task Completion Scenarios

### E2E: "Marcar tarefa como concluída"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-completion.test.ts`
- **BDD Scenario**: "Toggling task completion status" → "should toggle incomplete task to complete"
- **Property Tested**: Property 5 - Persistência de conclusão de tarefa
- **Requirements**: 2.1, 2.2, 2.3

### E2E: "Alternar status de conclusão (round-trip)"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-completion.test.ts`
- **BDD Scenario**: "Toggling task completion status" → round-trip behavior
- **Property Tested**: Property 4 - Round-trip de alternância de conclusão de tarefa
- **Requirements**: 2.1, 2.2, 2.4

## Task Deletion Scenarios

### E2E: "Deletar tarefa"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-deletion.test.ts`
- **BDD Scenario**: "Deleting a single task" → "should remove task from list and storage"
- **Property Tested**: Property 6 - Remoção e persistência de deleção de tarefa
- **Requirements**: 3.1, 3.2

### E2E: "Deletar tarefa mantém ordem das restantes"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-deletion.test.ts`
- **BDD Scenario**: "Deleting task from multiple tasks list" → "should remove only the specified task and maintain order of remaining tasks"
- **Property Tested**: Property 6 - Remoção e persistência de deleção de tarefa
- **Requirements**: 3.3, 3.4

## Task Filtering Scenarios

### E2E: "Filtrar tarefas ativas"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-filtering.test.ts`
- **BDD Scenario**: "Filtering tasks by 'Active' status" → "should display only incomplete tasks"
- **Property Tested**: Property 7 - Correção de exibição de filtro
- **Requirements**: 4.2

### E2E: "Filtrar tarefas concluídas"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-filtering.test.ts`
- **BDD Scenario**: "Filtering tasks by 'Completed' status" → "should display only completed tasks"
- **Property Tested**: Property 7 - Correção de exibição de filtro
- **Requirements**: 4.3

### E2E: "Filtro 'All' mostra todas as tarefas"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-filtering.test.ts`
- **BDD Scenario**: "Filtering tasks by 'All' status" → "should display all tasks regardless of completion status"
- **Property Tested**: Property 7 - Correção de exibição de filtro
- **Requirements**: 4.1

## Task Persistence Scenarios

### E2E: "Persistência de dados"
- **Maps to BDD**: `src/domains/task-manager/bdd/task-persistence.test.ts`
- **BDD Scenario**: Storage persistence and recovery scenarios
- **Property Tested**: Property 9 - Round-trip de restauração de storage
- **Requirements**: 5.1, 5.3, 5.4

## Coverage Summary

| BDD Test File | E2E Scenarios Covered | Properties Tested |
|---------------|----------------------|-------------------|
| task-creation.test.ts | 2 scenarios | Properties 1, 2 |
| task-completion.test.ts | 2 scenarios | Properties 4, 5 |
| task-deletion.test.ts | 2 scenarios | Property 6 |
| task-filtering.test.ts | 3 scenarios | Properties 7, 8 |
| task-persistence.test.ts | 1 scenario | Property 9 |

**Total**: 10 E2E scenarios covering all 9 correctness properties and all requirements (1.1-6.4).

## Validation Rules

1. **One-to-One Mapping**: Each E2E scenario maps to exactly one primary BDD scenario
2. **Property Coverage**: Each correctness property from the design document is tested by at least one E2E scenario
3. **Requirement Traceability**: All acceptance criteria from requirements.md are covered
4. **UI Integration**: E2E tests validate the complete user journey through the web interface
5. **Data Persistence**: E2E tests verify that UI actions result in correct data persistence

## Test Execution Order

E2E tests should be executed after:
1. ✅ BDD tests pass (domain logic validation)
2. ✅ Unit/Component tests pass (UI component validation)
3. ✅ Integration tests pass (service layer validation)

This ensures that E2E tests validate the complete integrated system behavior.