import React from 'react'
import {
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  IconButton,
  Typography,
  Box
} from '@mui/material'
import { Delete as DeleteIcon } from '@mui/icons-material'
import { type Task } from '../../shared/contracts/task-manager/v1/TaskSchema'

export interface TaskItemProps {
  task: Task
  onToggleComplete: (taskId: string) => void
  onDelete: (taskId: string) => void
  disabled?: boolean
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggleComplete,
  onDelete,
  disabled = false
}) => {
  const handleToggleComplete = (event?: React.SyntheticEvent) => {
    if (event) {
      event.stopPropagation()
    }
    if (!disabled) {
      onToggleComplete(task.id)
    }
  }

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the toggle when clicking delete
    if (!disabled) {
      onDelete(task.id)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleToggleComplete()
    }
  }

  return (
    <ListItem
      disablePadding
      data-testid="task-item"
      sx={{
        borderRadius: 1,
        mb: 0.5,
        '&:hover': {
          backgroundColor: 'action.hover'
        }
      }}
    >
      <ListItemButton
        onKeyDown={handleKeyDown}
        disabled={disabled}
        sx={{
          py: 1,
          px: 2,
          borderRadius: 1
        }}
        role="button"
        tabIndex={0}
        aria-label={`Toggle completion for task: ${task.description}`}
      >
        <ListItemIcon sx={{ minWidth: 40 }}>
          <Checkbox
            checked={task.completed}
            onChange={handleToggleComplete}
            disabled={disabled}
            data-testid="task-checkbox"
            inputProps={{
              'aria-label': `Mark task as ${task.completed ? 'incomplete' : 'complete'}`,
              'data-testid': 'task-checkbox-input'
            }}
            sx={{
              color: task.completed ? 'success.main' : 'action.active',
              '&.Mui-checked': {
                color: 'success.main'
              }
            }}
          />
        </ListItemIcon>
        
        <ListItemText
          primary={
            <Typography
              variant="body1"
              sx={{
                textDecoration: task.completed ? 'line-through' : 'none',
                color: task.completed ? 'text.secondary' : 'text.primary',
                opacity: task.completed ? 0.7 : 1,
                transition: 'all 0.2s ease-in-out',
                wordBreak: 'break-word'
              }}
            >
              {task.description}
            </Typography>
          }
          secondary={
            <Box sx={{ display: 'flex', gap: 2, mt: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                Created: {task.createdAt.toLocaleDateString()}
              </Typography>
              {task.updatedAt.getTime() !== task.createdAt.getTime() && (
                <Typography variant="caption" color="text.secondary">
                  Updated: {task.updatedAt.toLocaleDateString()}
                </Typography>
              )}
            </Box>
          }
        />
        
        <IconButton
          onClick={handleDelete}
          disabled={disabled}
          size="small"
          data-testid="task-delete"
          sx={{
            ml: 1,
            color: 'error.main',
            '&:hover': {
              backgroundColor: 'error.light',
              color: 'error.contrastText'
            }
          }}
          aria-label={`Delete task: ${task.description}`}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </ListItemButton>
    </ListItem>
  )
}

export default TaskItem