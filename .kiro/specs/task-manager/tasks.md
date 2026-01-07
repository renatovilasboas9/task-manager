# Implementation Plan

Seguindo rigorosamente a ordem imutável BDD-FIRST das regras de steering:
**0) Pós-Setup: Pipeline do Global Report (OBRIGATÓRIO PRIMEIRO)** → 1) BDD → 2) Contratos (Zod) → 3) Gallery (UI) → 4) Repository oficial → 5) Service oficial → 6) Component/Unit tests → 7) E2E → 8) Documentação → 9) Baseline

- [x] 0. Step 0 - Pipeline do Global Report (OBRIGATÓRIO ANTES DE QUALQUER FEATURE)
  - [x] 0.1 Estruturar pastas obrigatórias
    - Criar `reports/` (artefatos e relatório final)
    - Criar `scripts/` (orquestrador)
    - Criar subpastas: `reports/lint/`, `reports/tests/`, `reports/coverage/`, `reports/wiring/`, `reports/task-audit/`
    - _Requirements: Infraestrutura obrigatória para observabilidade_

  - [x] 0.2 Implementar script orquestrador global
    - Criar `scripts/run-global.ts` (single-run, não interativo)
    - Pipeline: lint → unit/component → coverage → gera artefatos → gera global-report.json → gera html → abre html
    - Gerar artefatos reais mesmo que vazios no início
    - _Requirements: Pipeline de observabilidade desde primeira linha_

  - [x] 0.3 Gerar artefatos obrigatórios
    - `reports/lint/lint.json`
    - `reports/tests/unit.json`
    - `reports/coverage/coverage-summary.json` (istanbul)
    - `reports/wiring/wiring.json`
    - _Requirements: Artefatos para agregação no relatório_

  - [x] 0.4 Implementar gerador do Global Report
    - Criar `scripts/generate-report.ts`
    - Gerar `reports/global-report.json` (lendo APENAS os arquivos de artefatos)
    - Gerar `reports/global-report.html` (MUI)
    - Falhar se qualquer artefato obrigatório não existir
    - _Requirements: Relatório confiável desde o início_

  - [x] 0.5 Testar o report generator
    - Criar testes unitários para validar parsing e consistência do JSON
    - Testar que o pipeline falha se artefatos estão ausentes
    - Garantir que coverage gate >= 80% começa a valer quando existir código de domínio
    - _Requirements: Pipeline testado e confiável_

  - [x] 0.6 Configurar auto-open do HTML
    - Após execução global, abrir `reports/global-report.html` automaticamente
    - _Requirements: Feedback imediato do estado do projeto_

- [x] 1. BDD PRIMEIRO (OBRIGATÓRIO - NADA PODE SER CRIADO ANTES)
  - [x] 1.1 Criar cenário BDD para criação de tarefas
    - Escrever `src/domains/task-manager/bdd/task-creation.test.ts`
    - Definir comportamento: criar tarefa válida, rejeitar tarefa vazia
    - Usar ANDAIMES temporários (mocks/MemoryRepository) para viabilizar BDD
    - Testar efeito final: tarefa aparece na lista E é persistida
    - **Property 1: Adição de tarefa cresce lista e persiste**
    - **Property 2: Rejeição de tarefa vazia preserva estado**
    - _Requirements: 1.1, 1.2, 1.4_

  - [x] 1.2 Criar cenário BDD para conclusão de tarefas
    - Escrever `src/domains/task-manager/bdd/task-completion.test.ts`
    - Definir comportamento round-trip: incompleta → completa → incompleta
    - Testar efeito final: UI muda E repository muda
    - **Property 4: Round-trip de alternância de conclusão de tarefa**
    - **Property 5: Persistência de conclusão de tarefa**
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 1.3 Criar cenário BDD para deleção de tarefas
    - Escrever `src/domains/task-manager/bdd/task-deletion.test.ts`
    - Definir comportamento: tarefa removida da UI E do storage
    - Testar manutenção de ordem das tarefas restantes
    - **Property 6: Remoção e persistência de deleção de tarefa**
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 1.4 Criar cenário BDD para filtragem de tarefas
    - Escrever `src/domains/task-manager/bdd/task-filtering.test.ts`
    - Definir comportamento de filtros (all, active, completed)
    - Testar persistência de estado do filtro através de recarregamentos
    - **Property 7: Correção de exibição de filtro**
    - **Property 8: Atualização de visualização de filtro com mudanças de dados**
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 1.5 Criar cenário BDD para persistência de dados
    - Escrever `src/domains/task-manager/bdd/task-persistence.test.ts`
    - Definir comportamento save/load do localStorage
    - Testar fallback para memória quando localStorage indisponível
    - **Property 9: Round-trip de restauração de storage**
    - _Requirements: 5.1, 5.3, 5.4_

- [ ] 2. Contratos Zod (APÓS BDD existir)
  - [ ] 2.1 Criar contratos Zod derivados dos cenários BDD
    - Criar `src/shared/contracts/task-manager/v1/TaskSchema.ts`
    - TaskSchema: id (uuid), description (1-500 chars), completed (boolean), createdAt, updatedAt
    - TaskFilterSchema: enum ['all', 'active', 'completed']
    - AppStateSchema: tasks[], filter, isLoading, error
    - Usar parse/safeParse nos BDD steps (No-Contract Drift)
    - _Requirements: 1.1, 1.2, 2.1, 4.1, 4.2, 4.3_

- [ ] 3. Gallery (UI Components) - APÓS contratos existirem
  - [ ] 3.1 Criar TaskInput component
    - Campo de entrada com validação Zod
    - Suporte Enter + botão para criação
    - Limpeza e foco após submissão
    - Derivar props de constraints do contrato (maxLength=500)
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 3.2 Criar TaskItem component
    - Exibição individual com checkbox e botão delete
    - Alternância de status de conclusão
    - Estilo visual para completed vs active
    - _Requirements: 2.1, 2.2, 2.4, 3.1_

  - [ ] 3.3 Criar TaskList component
    - Exibição de coleção com renderização adequada
    - Estado vazio quando não há tarefas
    - Integração com sistema de filtragem
    - _Requirements: 3.4, 4.1, 4.2, 4.3, 4.5_

  - [ ] 3.4 Criar TaskFilter component
    - Botões de filtro (All, Active, Completed)
    - Gerenciamento de estado ativo e persistência
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ] 3.5 Criar TaskCounter component
    - Contagem de tarefas ativas em tempo real
    - **Property 10: Precisão de contagem de tarefas ativas**
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 4. Repository oficial (substitui ANDAIMES temporários)
  - [ ] 4.1 Criar TaskRepository interface e LocalStorageTaskRepository
    - Interface: save, findById, findAll, delete, clear
    - LocalStorageTaskRepository com error handling
    - Fallback para MemoryRepository quando localStorage indisponível
    - _Requirements: 1.4, 2.3, 3.2, 5.1, 5.3, 5.4_

- [ ] 5. Service oficial (substitui ANDAIMES temporários)
  - [ ] 5.1 Criar TaskService com lógica de negócio
    - createTask com GUID generation e validação Zod
    - updateTask com gerenciamento de completion status
    - deleteTask com cleanup adequado
    - getAllTasks e getTasksByFilter
    - Publicar DOMAIN events quando aplicável
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 4.2, 4.3_

- [ ] 6. Composition Root / Wiring
  - [ ] 6.1 Criar EventBus simples (pub/sub em memória)
    - Eventos formato: SCOPE.DOMAIN.ACTION
    - TASK.MANAGER.CREATE, TASK.MANAGER.UPDATE, TASK.MANAGER.DELETE
    - _Requirements: Arquitetura orientada a eventos_

  - [ ] 6.2 Criar composition root por domínio
    - Registrar handlers (UI events → services)
    - Configurar repository implementation por ambiente (TEST=Memory, DEV=LocalStorage)
    - Wiring testável via suíte "wiring check"
    - _Requirements: Gerenciamento de dependências_

- [ ] 7. TaskManager container principal
  - [ ] 7.1 Implementar container da aplicação
    - React Context + useReducer para estado global
    - Integração de todos os componentes filhos
    - Inicialização e carregamento de dados
    - Error boundary para tratamento gracioso
    - _Requirements: 5.1, 5.3, 5.4_

- [ ] 8. Checkpoint - Garantir todos os testes passem
  - Garantir que todos os testes passem, perguntar ao usuário se surgem questões.

- [ ] 9. No-Mocks Drift (OBRIGATÓRIO)
  - [ ] 9.1 Atualizar BDD para usar implementações oficiais
    - Substituir ANDAIMES por Repository/Service oficiais via DI
    - BDD deve rodar com MemoryRepository em TEST, LocalStorage em DEV
    - Steps devem usar contratos Zod (parse/safeParse)
    - Remover completamente artefatos temporários
    - _Requirements: Todos os requisitos com implementações reais_

- [ ] 10. Component/Unit tests (apenas onde BDD NÃO cobre)
  - [ ] 10.1 Testes unitários para componentes UI
    - Focar em comportamentos NÃO cobertos pelos cenários BDD
    - Componentes de tela, scripts (parser/gerador do report)
    - Utilitários/infra transversal
    - _Requirements: Validação de componentes individuais_

  - [ ] 10.2 Property tests para propriedades não cobertas por BDD
    - **Property 3: Adição de tarefa limpa e foca entrada**
    - Apenas se BDD não cobrir completamente
    - _Requirements: 1.3_

- [ ] 11. Tratamento de erro e casos extremos
  - [ ] 11.1 Implementar error handling abrangente
    - localStorage failure detection e fallback
    - Corrupted data recovery com empty state
    - User notifications para storage issues
    - _Requirements: 5.3, 5.4_

- [ ] 12. E2E (Gherkin + Cucumber OBRIGATÓRIO)
  - [ ] 12.1 Configurar Playwright + Cucumber
    - Arquivos .feature em `src/e2e/features/`
    - Step definitions em `src/e2e/steps/`
    - 1 browser, vídeo recording
    - Gerar `reports/tests/e2e.json`
    - _Requirements: Validação E2E com Cucumber_

  - [ ] 12.2 Mapear cenários E2E para cenários BDD
    - Cada cenário E2E mapeia para 1 cenário BDD pai
    - Cobrir criação, conclusão, deleção, filtragem via UI
    - _Requirements: Todos os requisitos via E2E_

- [ ] 13. Integração final
  - [ ] 13.1 Conectar tudo no App principal
    - Wiring final de todos os componentes
    - Styling e responsive design
    - Loading states e transitions
    - _Requirements: Integração final_

- [ ] 14. Checkpoint Final
  - Garantir que todos os testes passem, perguntar ao usuário se surgem questões.