import React from 'react'
import {
  Paper,
  Typography,
  Box,
  Chip
} from '@mui/material'
import {
  Assignment as TaskIcon,
  CheckCircle as CompletedIcon,
  RadioButtonUnchecked as ActiveIcon
} from '@mui/icons-material'
import { type Task } from '../../shared/contracts/task-manager/v1/TaskSchema'

export interface TaskCounterProps {
  tasks: Task[]
  variant?: 'detailed' | 'simple'
}

export const TaskCounter: React.FC<TaskCounterProps> = ({
  tasks,
  variant = 'detailed'
}) => {
  // Calculate task counts
  const totalTasks = tasks.length
  const activeTasks = tasks.filter(task => !task.completed).length
  const completedTasks = tasks.filter(task => task.completed).length
  
  // Calculate completion percentage
  const completionPercentage = totalTasks > 0 
    ? Math.round((completedTasks / totalTasks) * 100)
    : 0

  const getProgressColor = () => {
    if (completionPercentage === 100) return 'success.main'
    if (completionPercentage >= 75) return 'info.main'
    if (completionPercentage >= 50) return 'warning.main'
    return 'error.main'
  }

  const getMotivationalMessage = () => {
    if (totalTasks === 0) return 'Ready to start your day!'
    if (completionPercentage === 100) return 'All done! Great work! 🎉'
    if (activeTasks === 1) return 'Almost there! One task left!'
    if (activeTasks <= 3) return 'You\'re doing great! Keep going!'
    return 'You\'ve got this! One task at a time.'
  }

  if (variant === 'simple') {
    return (
      <Chip
        icon={<ActiveIcon />}
        label={`${activeTasks} active`}
        color={activeTasks === 0 ? 'success' : 'primary'}
        variant="outlined"
        size="small"
        data-testid="task-counter"
      />
    )
  }

  return (
    <Paper
      elevation={1}
      data-testid="task-counter"
      sx={{
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        mb: 2,
        background: `linear-gradient(135deg, ${
          completionPercentage === 100 ? '#e8f5e8' : '#f5f5f5'
        } 0%, #ffffff 100%)`,
        transition: 'all 0.3s ease-in-out'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        mb: { xs: 1.5, sm: 2 },
        justifyContent: 'center'
      }}>
        <TaskIcon sx={{ 
          mr: 1, 
          color: 'primary.main',
          fontSize: { xs: '1.2rem', sm: '1.5rem' }
        }} />
        <Typography 
          variant="h6" 
          color="text.primary"
          sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }}
        >
          Task Progress
        </Typography>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        gap: { xs: 1, sm: 2 }, 
        mb: { xs: 1.5, sm: 2 },
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'stretch', sm: 'center' }
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          justifyContent: { xs: 'center', sm: 'flex-start' },
          p: { xs: 1, sm: 0 },
          backgroundColor: { xs: 'warning.light', sm: 'transparent' },
          borderRadius: { xs: 1, sm: 0 },
          opacity: { xs: 0.9, sm: 1 }
        }}>
          <ActiveIcon sx={{ 
            fontSize: { xs: 18, sm: 16 }, 
            color: 'warning.main' 
          }} />
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Active:
          </Typography>
          <Typography 
            variant="body1" 
            fontWeight="bold" 
            color="warning.main"
            sx={{ fontSize: { xs: '1rem', sm: '1rem' } }}
          >
            {activeTasks}
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          justifyContent: { xs: 'center', sm: 'flex-start' },
          p: { xs: 1, sm: 0 },
          backgroundColor: { xs: 'success.light', sm: 'transparent' },
          borderRadius: { xs: 1, sm: 0 },
          opacity: { xs: 0.9, sm: 1 }
        }}>
          <CompletedIcon sx={{ 
            fontSize: { xs: 18, sm: 16 }, 
            color: 'success.main' 
          }} />
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Completed:
          </Typography>
          <Typography 
            variant="body1" 
            fontWeight="bold" 
            color="success.main"
            sx={{ fontSize: { xs: '1rem', sm: '1rem' } }}
          >
            {completedTasks}
          </Typography>
        </Box>

        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          justifyContent: { xs: 'center', sm: 'flex-start' },
          p: { xs: 1, sm: 0 },
          backgroundColor: { xs: 'grey.100', sm: 'transparent' },
          borderRadius: { xs: 1, sm: 0 },
          opacity: { xs: 0.9, sm: 1 }
        }}>
          <TaskIcon sx={{ 
            fontSize: { xs: 18, sm: 16 }, 
            color: 'text.secondary' 
          }} />
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Total:
          </Typography>
          <Typography 
            variant="body1" 
            fontWeight="bold"
            sx={{ fontSize: { xs: '1rem', sm: '1rem' } }}
          >
            {totalTasks}
          </Typography>
        </Box>
      </Box>

      {totalTasks > 0 && (
        <Box sx={{ mb: { xs: 1.5, sm: 2 } }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            mb: 0.5,
            alignItems: 'center'
          }}>
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
            >
              Progress
            </Typography>
            <Typography 
              variant="body1" 
              fontWeight="bold" 
              color={getProgressColor()}
              sx={{ fontSize: { xs: '1rem', sm: '0.875rem' } }}
            >
              {completionPercentage}%
            </Typography>
          </Box>
          <Box
            sx={{
              width: '100%',
              height: { xs: 10, sm: 8 },
              backgroundColor: 'grey.200',
              borderRadius: 4,
              overflow: 'hidden'
            }}
          >
            <Box
              sx={{
                width: `${completionPercentage}%`,
                height: '100%',
                backgroundColor: getProgressColor(),
                transition: 'width 0.5s ease-in-out',
                borderRadius: 4
              }}
            />
          </Box>
        </Box>
      )}

      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          fontStyle: 'italic',
          textAlign: 'center',
          mt: 1,
          fontSize: { xs: '0.8rem', sm: '0.875rem' },
          opacity: 0.8
        }}
      >
        {getMotivationalMessage()}
      </Typography>
    </Paper>
  )
}

export default TaskCounter