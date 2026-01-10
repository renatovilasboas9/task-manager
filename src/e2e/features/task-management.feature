# language: pt
Funcionalidade: Gerenciamento de Tarefas E2E
  Como usuário
  Quero gerenciar minhas tarefas através da interface web
  Para organizar meu trabalho diário

  # Mapeia para: src/domains/task-manager/bdd/task-creation.test.ts
  Cenário: Criar nova tarefa válida
    Dado que estou na página do gerenciador de tarefas
    Quando eu digito "Comprar leite" no campo de entrada
    E pressiono Enter
    Então a tarefa "Comprar leite" deve aparecer na lista
    E o campo de entrada deve estar vazio
    E o contador deve mostrar "1 item restante"

  # Teste específico para capturar problema de refresh da UI
  Cenário: UI atualiza imediatamente após adicionar tarefa
    Dado que estou na página do gerenciador de tarefas
    E não há tarefas na lista
    Quando eu digito "Tarefa de teste" no campo de entrada
    E pressiono Enter
    Então a tarefa "Tarefa de teste" deve aparecer na lista imediatamente
    E o contador deve ser atualizado imediatamente

  # Teste específico para capturar problema de refresh após deletar
  Cenário: UI atualiza imediatamente após deletar tarefa
    Dado que estou na página do gerenciador de tarefas
    E tenho uma tarefa "Tarefa para deletar" na lista
    Quando eu clico no botão deletar da tarefa
    Então a tarefa deve desaparecer da lista imediatamente
    E o contador deve ser atualizado imediatamente

  # Mapeia para: src/domains/task-manager/bdd/task-creation.test.ts
  Cenário: Tentar criar tarefa vazia
    Dado que estou na página do gerenciador de tarefas
    Quando eu tento adicionar uma tarefa vazia
    Então a tarefa não deve ser adicionada à lista
    E uma mensagem de erro deve ser exibida
    E o contador deve permanecer inalterado

  # Mapeia para: src/domains/task-manager/bdd/task-completion.test.ts
  Cenário: Marcar tarefa como concluída
    Dado que tenho uma tarefa "Estudar React" na lista
    Quando eu clico no checkbox da tarefa
    Então a tarefa deve aparecer como concluída
    E o contador deve mostrar "0 itens restantes"

  # Mapeia para: src/domains/task-manager/bdd/task-completion.test.ts
  Cenário: Alternar status de conclusão (round-trip)
    Dado que tenho uma tarefa "Tarefa de teste" na lista
    Quando eu marco a tarefa como concluída
    E depois marco como incompleta novamente
    Então a tarefa deve voltar ao estado original
    E o contador deve refletir o estado correto

  # Mapeia para: src/domains/task-manager/bdd/task-deletion.test.ts
  Cenário: Deletar tarefa
    Dado que tenho uma tarefa "Tarefa temporária" na lista
    Quando eu clico no botão deletar da tarefa
    Então a tarefa deve ser removida da lista
    E o contador deve ser atualizado

  # Mapeia para: src/domains/task-manager/bdd/task-deletion.test.ts
  Cenário: Deletar tarefa mantém ordem das restantes
    Dado que tenho tarefas "Primeira", "Segunda" e "Terceira" na lista
    Quando eu deleto a tarefa "Segunda"
    Então apenas "Primeira" e "Terceira" devem permanecer
    E a ordem deve ser mantida

  # Mapeia para: src/domains/task-manager/bdd/task-filtering.test.ts
  Cenário: Filtrar tarefas ativas
    Dado que tenho tarefas "Tarefa 1" e "Tarefa 2" na lista
    E a "Tarefa 1" está marcada como concluída
    Quando eu clico no filtro "Active"
    Então apenas "Tarefa 2" deve ser exibida

  # Mapeia para: src/domains/task-manager/bdd/task-filtering.test.ts
  Cenário: Filtrar tarefas concluídas
    Dado que tenho tarefas "Tarefa A" e "Tarefa B" na lista
    E a "Tarefa A" está marcada como concluída
    Quando eu clico no filtro "Completed"
    Então apenas "Tarefa A" deve ser exibida

  # Mapeia para: src/domains/task-manager/bdd/task-filtering.test.ts
  Cenário: Filtro "All" mostra todas as tarefas
    Dado que tenho tarefas com estados mistos na lista
    Quando eu clico no filtro "All"
    Então todas as tarefas devem ser exibidas

  # Mapeia para: src/domains/task-manager/bdd/task-persistence.test.ts
  Cenário: Persistência de dados
    Dado que tenho uma tarefa "Tarefa persistente" na lista
    Quando eu recarrego a página
    Então a tarefa "Tarefa persistente" ainda deve estar na lista
    E o estado de conclusão deve ser mantido

  # Teste completo: criar múltiplas tarefas e deletar todas
  Cenário: Gerenciar múltiplas tarefas - criar e deletar
    Dado que estou na página do gerenciador de tarefas
    E não há tarefas na lista
    Quando eu adiciono a tarefa "Primeira tarefa"
    E eu adiciono a tarefa "Segunda tarefa"
    E eu adiciono a tarefa "Terceira tarefa"
    Então devo ter 3 tarefas na lista
    E o contador deve mostrar "3 itens restantes"
    Quando eu deleto todas as tarefas uma por uma
    Então não deve haver tarefas na lista
    E o contador deve mostrar "0 itens restantes"