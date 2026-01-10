import React from 'react'
import {
  List,
  Paper,
  Typography,
  Box,
  Divider
} from '@mui/material'
import { Assignment as AssignmentIcon } from '@mui/icons-material'
import { type Task, type TaskFilter } from '../../shared/contracts/task-manager/v1/TaskSchema'
import TaskItem from './TaskItem'

export interface TaskListProps {
  tasks: Task[]
  filter: TaskFilter
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  disabled?: boolean
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  filter,
  onToggleComplete,
  onDelete,
  disabled = false
}) => {
  // Filter tasks based on current filter
  const filteredTasks = React.useMemo(() => {
    switch (filter) {
      case 'active':
        return tasks.filter(task => !task.completed)
      case 'completed':
        return tasks.filter(task => task.completed)
      case 'all':
      default:
        return tasks
    }
  }, [tasks, filter])

  // Sort tasks: incomplete first, then by creation date (oldest first to maintain creation order)
  const sortedTasks = React.useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      // First sort by completion status (incomplete tasks first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      // Then sort by creation date (oldest first to maintain creation order)
      return a.createdAt.getTime() - b.createdAt.getTime()
    })
  }, [filteredTasks])

  const getEmptyStateMessage = () => {
    switch (filter) {
      case 'active':
        return tasks.length === 0 
          ? 'No tasks yet. Add your first task above!'
          : 'No active tasks. Great job!'
      case 'completed':
        return tasks.length === 0
          ? 'No tasks yet. Add your first task above!'
          : 'No completed tasks yet. Keep going!'
      case 'all':
      default:
        return 'No tasks yet. Add your first task above!'
    }
  }

  const getFilterLabel = () => {
    switch (filter) {
      case 'active':
        return 'Active Tasks'
      case 'completed':
        return 'Completed Tasks'
      case 'all':
      default:
        return 'All Tasks'
    }
  }

  if (sortedTasks.length === 0) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 4,
          textAlign: 'center',
          backgroundColor: 'background.paper',
          borderRadius: 2
        }}
      >
        <AssignmentIcon
          sx={{
            fontSize: 64,
            color: 'text.secondary',
            mb: 2
          }}
        />
        <Typography
          variant="h6"
          color="text.secondary"
          gutterBottom
        >
          {getEmptyStateMessage()}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {filter !== 'all' && `Showing ${filter} tasks`}
        </Typography>
      </Paper>
    )
  }

  return (
    <Paper
      elevation={1}
      sx={{
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ p: 2, pb: 1 }}>
        <Typography
          variant="h6"
          color="text.primary"
          sx={{ mb: 1 }}
        >
          {getFilterLabel()}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          {sortedTasks.length} {sortedTasks.length === 1 ? 'task' : 'tasks'}
        </Typography>
      </Box>
      
      <Divider />
      
      <List
        sx={{
          py: 1,
          px: 1
        }}
      >
        {sortedTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            disabled={disabled}
          />
        ))}
      </List>
    </Paper>
  )
}

export default TaskList