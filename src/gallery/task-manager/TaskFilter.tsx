import React from 'react'
import {
  ToggleButtonGroup,
  ToggleButton,
  Paper,
  Typography,
  Box
} from '@mui/material'
import {
  List as AllIcon,
  RadioButtonUnchecked as ActiveIcon,
  CheckCircle as CompletedIcon
} from '@mui/icons-material'
import { type TaskFilter } from '../../shared/contracts/task-manager/v1/TaskSchema'

export interface TaskFilterProps {
  currentFilter: TaskFilter
  onFilterChange: (filter: TaskFilter) => void
  disabled?: boolean
  taskCounts?: {
    all: number
    active: number
    completed: number
  }
}

export const TaskFilterComponent: React.FC<TaskFilterProps> = ({
  currentFilter,
  onFilterChange,
  disabled = false,
  taskCounts
}) => {
  const handleFilterChange = (
    _event: React.MouseEvent<HTMLElement>,
    newFilter: TaskFilter | null
  ) => {
    // Don't allow deselecting all filters - always have one active
    if (newFilter !== null) {
      onFilterChange(newFilter)
    }
  }

  const filterOptions = [
    {
      value: 'all' as TaskFilter,
      label: 'All',
      icon: <AllIcon fontSize="small" />,
      description: 'Show all tasks'
    },
    {
      value: 'active' as TaskFilter,
      label: 'Active',
      icon: <ActiveIcon fontSize="small" />,
      description: 'Show incomplete tasks'
    },
    {
      value: 'completed' as TaskFilter,
      label: 'Completed',
      icon: <CompletedIcon fontSize="small" />,
      description: 'Show completed tasks'
    }
  ]

  return (
    <Paper
      elevation={1}
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        mb: 2
      }}
    >
      <Typography
        variant="subtitle1"
        color="text.primary"
        sx={{ 
          mb: 2, 
          fontWeight: 500,
          fontSize: { xs: '0.9rem', sm: '1rem' }
        }}
      >
        Filter Tasks
      </Typography>
      
      <ToggleButtonGroup
        value={currentFilter}
        exclusive
        onChange={handleFilterChange}
        disabled={disabled}
        fullWidth
        sx={{
          '& .MuiToggleButton-root': {
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            py: { xs: 1, sm: 1.5 },
            px: { xs: 1, sm: 2 },
            textTransform: 'none',
            transition: 'all 0.2s ease-in-out',
            '&:not(:first-of-type)': {
              borderLeft: '1px solid',
              borderLeftColor: 'divider',
              marginLeft: 0
            },
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              transform: 'scale(1.02)',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            },
            '&:hover': {
              backgroundColor: 'action.hover',
              transform: 'translateY(-1px)'
            }
          }
        }}
      >
        {filterOptions.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            aria-label={option.description}
            data-testid={`filter-${option.value}`}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.5
              }}
            >
              {option.icon}
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  fontSize: { xs: '0.75rem', sm: '0.875rem' }
                }}
              >
                {option.label}
              </Typography>
              {taskCounts && (
                <Typography
                  variant="caption"
                  sx={{
                    opacity: 0.8,
                    fontSize: { xs: '0.6rem', sm: '0.7rem' }
                  }}
                >
                  ({taskCounts[option.value]})
                </Typography>
              )}
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ 
          mt: 1, 
          display: 'block', 
          textAlign: 'center',
          fontSize: { xs: '0.7rem', sm: '0.75rem' }
        }}
      >
        Current filter: {currentFilter}
      </Typography>
    </Paper>
  )
}

export default TaskFilterComponent