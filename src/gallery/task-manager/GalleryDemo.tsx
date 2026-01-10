import React, { useState } from 'react'
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  ThemeProvider,
  createTheme,
  CssBaseline
} from '@mui/material'
import { v4 as uuidv4 } from 'uuid'
import { TaskInput } from './TaskInput'
import { TaskItem } from './TaskItem'
import { TaskList } from './TaskList'
import { TaskFilterComponent } from './TaskFilter'
import { TaskCounter } from './TaskCounter'
import { type Task, type TaskFilter as TaskFilterType } from '../../shared/contracts/task-manager/v1/TaskSchema'

// Create a light theme for the demo
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

// Sample tasks for demonstration
const createSampleTasks = (): Task[] => [
  {
    id: uuidv4(),
    description: 'Complete the task manager UI components',
    completed: true,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T14:30:00Z')
  },
  {
    id: uuidv4(),
    description: 'Write comprehensive tests for all components',
    completed: false,
    createdAt: new Date('2024-01-02T09:00:00Z'),
    updatedAt: new Date('2024-01-02T09:00:00Z')
  },
  {
    id: uuidv4(),
    description: 'Implement repository pattern with localStorage',
    completed: false,
    createdAt: new Date('2024-01-03T11:00:00Z'),
    updatedAt: new Date('2024-01-03T11:00:00Z')
  },
  {
    id: uuidv4(),
    description: 'Set up CI/CD pipeline',
    completed: true,
    createdAt: new Date('2024-01-04T08:00:00Z'),
    updatedAt: new Date('2024-01-04T16:45:00Z')
  },
  {
    id: uuidv4(),
    description: 'Create documentation and user guide',
    completed: false,
    createdAt: new Date('2024-01-05T13:00:00Z'),
    updatedAt: new Date('2024-01-05T13:00:00Z')
  }
]

export const GalleryDemo: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(createSampleTasks())
  const [filter, setFilter] = useState<TaskFilterType>('all')

  const handleCreateTask = (description: string) => {
    const newTask: Task = {
      id: uuidv4(),
      description,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    setTasks(prev => [newTask, ...prev])
  }

  const handleToggleComplete = (taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed, updatedAt: new Date() }
        : task
    ))
  }

  const handleDeleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.id !== taskId))
  }

  const handleFilterChange = (newFilter: TaskFilterType) => {
    setFilter(newFilter)
  }

  const taskCounts = {
    all: tasks.length,
    active: tasks.filter(t => !t.completed).length,
    completed: tasks.filter(t => t.completed).length
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          🎨 Task Manager Gallery
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2 }}>
          Demonstração interativa dos componentes UI implementados
        </Typography>
        <Box textAlign="center" sx={{ mb: 4 }}>
          <Typography 
            component="a" 
            href="/" 
            variant="body2" 
            sx={{ 
              color: 'primary.main',
              textDecoration: 'none',
              '&:hover': {
                textDecoration: 'underline'
              }
            }}
          >
            ← Back to Task Manager App
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {/* TaskCounter Demo */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                📊 TaskCounter Component
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Mostra contagem de tarefas ativas em tempo real com barra de progresso
              </Typography>
              <TaskCounter tasks={tasks} />
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Versão Simples:
                </Typography>
                <TaskCounter tasks={tasks} variant="simple" />
              </Box>
            </Paper>
          </Grid>

          {/* TaskInput Demo */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                ✏️ TaskInput Component
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Campo de entrada com validação Zod, suporte a Enter e botão
              </Typography>
              <TaskInput 
                onCreateTask={handleCreateTask}
                placeholder="Digite uma nova tarefa..."
                autoFocus
              />
            </Paper>
          </Grid>

          {/* TaskFilter Demo */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                🔍 TaskFilter Component
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Botões de filtro com contagem de tarefas por categoria
              </Typography>
              <TaskFilterComponent
                currentFilter={filter}
                onFilterChange={handleFilterChange}
                taskCounts={taskCounts}
              />
            </Paper>
          </Grid>

          {/* TaskList Demo */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                📋 TaskList Component
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Lista de tarefas com filtragem, ordenação e estados vazios
              </Typography>
              <TaskList
                tasks={tasks}
                filter={filter}
                onToggleComplete={handleToggleComplete}
                onDelete={handleDeleteTask}
              />
            </Paper>
          </Grid>

          {/* Individual TaskItem Demo */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                📝 TaskItem Component
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Item individual com checkbox, estilo visual e botão de deletar
              </Typography>
              <Box sx={{ maxWidth: 600 }}>
                {tasks.slice(0, 2).map(task => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                  />
                ))}
              </Box>
            </Paper>
          </Grid>

          {/* Component Features Summary */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
              <Typography variant="h5" gutterBottom>
                ✨ Recursos Implementados
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    🎯 Funcionalidades
                  </Typography>
                  <ul>
                    <li>Validação com Zod Schema</li>
                    <li>Suporte a teclado (Enter)</li>
                    <li>Estados visuais (completo/ativo)</li>
                    <li>Filtragem em tempo real</li>
                    <li>Contagem automática</li>
                    <li>Ordenação inteligente</li>
                  </ul>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    🎨 Design System
                  </Typography>
                  <ul>
                    <li>Material-UI components</li>
                    <li>Tema consistente</li>
                    <li>Responsivo</li>
                    <li>Acessibilidade (ARIA)</li>
                    <li>Animações suaves</li>
                    <li>Estados de loading</li>
                  </ul>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Usage Instructions */}
          <Grid item xs={12}>
            <Paper elevation={2} sx={{ p: 3, bgcolor: 'success.light', color: 'success.contrastText' }}>
              <Typography variant="h5" gutterBottom>
                🚀 Como Usar
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Todos os componentes estão prontos para uso e podem ser importados de:
              </Typography>
              <Box component="pre" sx={{ 
                bgcolor: 'rgba(0,0,0,0.1)', 
                p: 2, 
                borderRadius: 1, 
                overflow: 'auto',
                fontSize: '0.875rem'
              }}>
{`import {
  TaskInput,
  TaskItem,
  TaskList,
  TaskFilter,
  TaskCounter
} from '../gallery/task-manager'`}
              </Box>
              <Typography variant="body2" sx={{ mt: 2 }}>
                Cada componente segue os contratos definidos no TaskSchema e implementa os requisitos especificados no documento de design.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  )
}

export default GalleryDemo