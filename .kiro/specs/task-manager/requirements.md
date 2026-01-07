# Requirements Document

## Introduction

O Task Manager é uma aplicação web para gerenciamento pessoal de tarefas. O sistema permite criar, organizar e gerenciar itens de to-do com interface limpa e intuitiva, incluindo criação de tarefas, acompanhamento de conclusão, filtragem e persistência.

## Glossary

- **Task Manager**: O sistema completo de aplicação web para gerenciamento de tarefas
- **Task**: Um item individual representando algo que precisa ser realizado, contendo descrição e status de conclusão
- **Task List**: A coleção de todas as tarefas exibidas ao usuário
- **Input Field**: O componente de entrada de texto onde usuários digitam descrições de novas tarefas
- **Filter**: Um mecanismo para exibir apenas tarefas que correspondem a certos critérios (todas, ativas, concluídas)

## Requirements

### Requirement 1

**User Story:** Como usuário, quero adicionar novas tarefas à minha lista de to-do, para que eu possa capturar e organizar coisas que preciso realizar.

#### Acceptance Criteria

1. WHEN um usuário digita uma descrição de tarefa e pressiona Enter ou clica no botão adicionar THEN o Task Manager SHALL criar uma nova tarefa e adicioná-la à Task List
2. WHEN um usuário tenta adicionar uma tarefa vazia THEN o Task Manager SHALL prevenir a adição e manter o estado atual
3. WHEN uma nova tarefa é adicionada THEN o Task Manager SHALL limpar o Input Field e focá-lo para a próxima entrada
4. WHEN uma tarefa é adicionada THEN o Task Manager SHALL persistir a tarefa no local storage imediatamente
5. WHEN o Input Field recebe foco THEN o Task Manager SHALL fornecer feedback visual sutil sem interromper a estética calma

### Requirement 2

**User Story:** Como usuário, quero marcar tarefas como concluídas, para que eu possa acompanhar meu progresso e ver o que realizei.

#### Acceptance Criteria

1. WHEN um usuário clica no checkbox de uma tarefa THEN o Task Manager SHALL alternar o status de conclusão da tarefa
2. WHEN uma tarefa é marcada como concluída THEN o Task Manager SHALL aplicar estilo visual para indicar conclusão
3. WHEN o status de conclusão de uma tarefa muda THEN o Task Manager SHALL persistir a mudança no local storage imediatamente
4. WHEN uma tarefa concluída é clicada novamente THEN o Task Manager SHALL marcá-la como incompleta e restaurar o estilo normal

### Requirement 3

**User Story:** Como usuário, quero deletar tarefas que não preciso mais, para que eu possa manter minha lista de tarefas limpa e relevante.

#### Acceptance Criteria

1. WHEN um usuário clica no botão deletar de uma tarefa THEN o Task Manager SHALL remover a tarefa da Task List
2. WHEN uma tarefa é deletada THEN o Task Manager SHALL atualizar o local storage para remover a tarefa permanentemente
3. WHEN uma tarefa é deletada THEN o Task Manager SHALL manter a ordem e estado das tarefas restantes
4. WHEN a última tarefa é deletada THEN o Task Manager SHALL exibir um estado vazio apropriado

### Requirement 4

**User Story:** Como usuário, quero filtrar minhas tarefas por status de conclusão, para que eu possa focar em tipos específicos de tarefas.

#### Acceptance Criteria

1. WHEN um usuário seleciona o filtro "All" THEN o Task Manager SHALL exibir todas as tarefas independente do status de conclusão
2. WHEN um usuário seleciona o filtro "Active" THEN o Task Manager SHALL exibir apenas tarefas incompletas
3. WHEN um usuário seleciona o filtro "Completed" THEN o Task Manager SHALL exibir apenas tarefas concluídas
4. WHEN um filtro é aplicado THEN o Task Manager SHALL manter o estado do filtro através de recarregamentos de página
5. WHEN tarefas são adicionadas ou modificadas THEN o Task Manager SHALL atualizar a visualização filtrada adequadamente

### Requirement 5

**User Story:** Como usuário, quero que minhas tarefas sejam salvas automaticamente, para que eu não perca meus dados quando fechar o navegador.

#### Acceptance Criteria

1. WHEN a aplicação carrega THEN o Task Manager SHALL restaurar todas as tarefas previamente salvas do local storage
2. WHEN qualquer operação de tarefa ocorre THEN o Task Manager SHALL persistir o estado atual no local storage dentro de 100 milissegundos
3. WHEN o local storage não está disponível THEN o Task Manager SHALL continuar funcionando com armazenamento em memória e exibir um aviso
4. WHEN dados corrompidos são encontrados no local storage THEN o Task Manager SHALL inicializar com uma lista de tarefas vazia e registrar o erro

### Requirement 6

**User Story:** Como usuário, quero ver uma contagem das minhas tarefas ativas, para que eu possa entender minha carga de trabalho atual.

#### Acceptance Criteria

1. WHEN tarefas são exibidas THEN o Task Manager SHALL mostrar a contagem de tarefas incompletas
2. WHEN o status de conclusão de uma tarefa muda THEN o Task Manager SHALL atualizar a contagem de tarefas ativas imediatamente
3. WHEN todas as tarefas são concluídas THEN o Task Manager SHALL exibir zero tarefas ativas
4. WHEN tarefas são adicionadas ou deletadas THEN o Task Manager SHALL recalcular e exibir a contagem ativa correta