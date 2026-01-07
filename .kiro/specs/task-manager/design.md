# Task Manager Design Document

## Overview

O Task Manager é uma aplicação React que fornece uma interface limpa e eficiente para gerenciamento pessoal de tarefas. O sistema segue princípios de Domain-Driven Design (DDD) com clara separação entre componentes UI, lógica de negócio e persistência de dados. A aplicação usa local storage para persistência de dados e implementa uma arquitetura orientada a eventos para baixo acoplamento entre componentes.

## Architecture

A aplicação segue uma arquitetura em camadas com clara separação de responsabilidades:

- **UI Layer**: Componentes React com Material-UI para estilo consistente
- **Service Layer**: Lógica de negócio e operações de tarefas
- **Repository Layer**: Abstração de persistência de dados com implementação localStorage
- **Event Layer**: Comunicação orientada a eventos entre componentes

### Technology Stack

- **Frontend**: React 18 com TypeScript
- **UI Framework**: Material-UI (MUI) para componentes e temas
- **State Management**: React Context + useReducer para estado global
- **Data Validation**: Zod para validação de schema e type safety
- **Testing**: Vitest + React Testing Library para testes unitários
- **Property Testing**: fast-check para testes baseados em propriedades
- **Build Tool**: Vite para desenvolvimento e bundling
- **Storage**: localStorage do navegador com fallback para armazenamento em memória

## Components and Interfaces

### Core Components

1. **TaskManager** (Container Principal)
   - Orquestra toda a aplicação
   - Gerencia estado global e manipulação de eventos
   - Fornece contexto para componentes filhos

2. **TaskInput**
   - Manipula criação de novas tarefas
   - Valida entrada e previne submissões vazias
   - Gerencia foco e limpeza da entrada

3. **TaskList**
   - Exibe lista filtrada de tarefas
   - Manipula renderização de tarefas e estados vazios
   - Gerencia interações da lista

4. **TaskItem**
   - Exibição e interação de tarefa individual
   - Alterna status de conclusão
   - Funcionalidade de deletar tarefa

5. **TaskFilter**
   - Controles de filtro (All, Active, Completed)
   - Mantém estado do filtro
   - Atualiza exibição baseada na seleção

6. **TaskCounter**
   - Exibe contagem de tarefas ativas (incompletas)
   - Atualiza automaticamente quando tarefas mudam

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

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Após revisar as propriedades identificadas no prework, as seguintes redundâncias foram identificadas e consolidadas:

- Propriedades de adição e persistência de tarefas (1.1, 1.4) podem ser combinadas em uma propriedade abrangente
- Propriedades de alternância de conclusão (2.1, 2.4) representam o mesmo comportamento round-trip
- Propriedades de exibição de filtro (4.1, 4.2, 4.3) podem ser unificadas em uma propriedade de filtragem abrangente
- Propriedades de contagem de tarefas (6.1, 6.2, 6.4) testam a mesma invariante de contagem

### Core Properties

**Property 1: Adição de tarefa cresce lista e persiste**
*Para qualquer* descrição de tarefa válida e lista de tarefas atual, adicionar a tarefa deve resultar na lista crescendo em um, contendo a nova tarefa, e a tarefa sendo persistida no storage
**Validates: Requirements 1.1, 1.4**

**Property 2: Rejeição de tarefa vazia preserva estado**
*Para qualquer* string composta inteiramente de caracteres de espaço em branco, tentar adicioná-la deve ser rejeitado, deixando a lista de tarefas e storage inalterados
**Validates: Requirements 1.2**

**Property 3: Adição de tarefa limpa e foca entrada**
*Para qualquer* adição de tarefa válida, o campo de entrada deve ser limpo e receber foco após a operação ser completada
**Validates: Requirements 1.3**

**Property 4: Round-trip de alternância de conclusão de tarefa**
*Para qualquer* tarefa, alternar seu status de conclusão duas vezes deve retorná-la ao seu estado original, com estilo apropriado aplicado a cada passo
**Validates: Requirements 2.1, 2.2, 2.4**

**Property 5: Persistência de conclusão de tarefa**
*Para qualquer* mudança de status de conclusão de tarefa, o novo status deve ser imediatamente refletido no storage
**Validates: Requirements 2.3**

**Property 6: Remoção e persistência de deleção de tarefa**
*Para qualquer* tarefa na lista de tarefas, deletá-la deve removê-la tanto da lista exibida quanto do storage, preservando a ordem e estado das tarefas restantes
**Validates: Requirements 3.1, 3.2, 3.3**

**Property 7: Correção de exibição de filtro**
*Para qualquer* coleção de tarefas e seleção de filtro (all/active/completed), apenas tarefas que correspondem aos critérios do filtro devem ser exibidas, e o estado do filtro deve persistir através de sessões
**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

**Property 8: Atualização de visualização de filtro com mudanças de dados**
*Para qualquer* visualização filtrada e modificação de tarefa (add/delete/toggle), a exibição filtrada deve atualizar para refletir o estado atual corretamente
**Validates: Requirements 4.5**

**Property 9: Round-trip de restauração de storage**
*Para qualquer* coleção de tarefas salva no storage, recarregar a aplicação deve restaurar exatamente as mesmas tarefas com propriedades idênticas
**Validates: Requirements 5.1**

**Property 10: Precisão de contagem de tarefas ativas**
*Para qualquer* coleção de tarefas, a contagem ativa exibida deve ser igual ao número de tarefas incompletas, atualizando imediatamente quando tarefas são adicionadas, deletadas, ou seu status de conclusão muda
**Validates: Requirements 6.1, 6.2, 6.4**

## Error Handling

O sistema implementa tratamento abrangente de erros para vários cenários de falha:

### Storage Failures

- **localStorage Indisponível**: Fallback para armazenamento em memória com notificação ao usuário
- **Dados Corrompidos**: Inicializa com estado vazio e registra erro para debugging
- **Cota de Storage Excedida**: Implementa estratégia de limpeza para dados antigos

### Input Validation

- **Dados de Tarefa Inválidos**: Rejeita tarefas malformadas usando validação de schema Zod
- **Prevenção XSS**: Sanitiza toda entrada do usuário antes de armazenamento e exibição
- **Limites de Comprimento**: Impõe comprimento máximo de descrição de tarefa (500 caracteres)

### Network and Performance

- **Operações Debounced**: Previne operações rápidas em sequência que poderiam causar inconsistências de estado
- **Atualizações Otimistas**: Atualiza UI imediatamente enquanto persiste em background
- **Recuperação de Erro**: Fornece mecanismos de retry para operações falhadas

## Testing Strategy

A abordagem de teste combina testes unitários e testes baseados em propriedades para garantir cobertura abrangente:

### Unit Testing com Vitest + React Testing Library

- **Teste de Componentes**: Verificar comportamento e renderização de componentes individuais
- **Teste de Integração**: Testar interações de componentes e fluxo de dados
- **Teste de Casos Extremos**: Manipular cenários específicos como estados vazios e condições de erro
- **Teste de Interação do Usuário**: Simular ações do usuário e verificar resultados esperados

### Property-Based Testing com fast-check

- **Propriedades Universais**: Testar comportamentos que devem se manter através de todas as entradas válidas
- **Mínimo 100 iterações**: Cada teste de propriedade executa pelo menos 100 casos de teste aleatórios
- **Marcação de Propriedades**: Cada teste referencia explicitamente sua propriedade de design correspondente
- **Formato de Marcação**: `**Feature: task-manager, Property {number}: {property_text}**`

### Testing Requirements

- **Gates de Cobertura**: Manter ≥80% de cobertura geral, com ≥90% para camada de serviço
- **Implementação de Propriedades**: Cada propriedade de correção implementada por exatamente um teste baseado em propriedades
- **Test Data Builders**: Usar builders para geração consistente de dados de teste
- **Sem Watch Mode**: Todos os testes executam em modo finito, não-interativo

### Dual Testing Benefits

- **Testes unitários** capturam bugs específicos e verificam exemplos concretos
- **Testes de propriedades** verificam correção geral através do espaço de entrada
- **Juntos** eles fornecem validação abrangente do comportamento do sistema

A estratégia de teste garante que tanto casos de uso específicos quanto propriedades gerais do sistema sejam completamente validados, fornecendo confiança na correção e confiabilidade do sistema.