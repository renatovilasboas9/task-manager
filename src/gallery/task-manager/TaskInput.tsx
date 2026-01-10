import React, { useState, useRef, useEffect } from 'react'
import { TextField, Button, Box, Alert } from '@mui/material'
import { Add as AddIcon } from '@mui/icons-material'
import { TaskCreateInputSchema } from '../../shared/contracts/task-manager/v1/TaskSchema'

export interface TaskInputProps {
  onCreateTask: (description: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}

export const TaskInput: React.FC<TaskInputProps> = ({
  onCreateTask,
  disabled = false,
  placeholder = 'What needs to be done?',
  autoFocus = false
}) => {
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-focus on mount if requested
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus()
    }
  }, [autoFocus])

  const clearAndFocus = () => {
    setDescription('')
    setError(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleSubmit = () => {
    // Validate input using Zod schema
    const result = TaskCreateInputSchema.safeParse({ description })
    
    if (!result.success) {
      // Extract first validation error
      const firstError = result.error.errors[0]
      setError(firstError.message)
      return
    }

    // Call the create handler with validated description
    onCreateTask(result.data.description)
    
    // Clear input and focus for next entry (Requirements 1.3)
    clearAndFocus()
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDescription(event.target.value)
    // Clear error when user starts typing
    if (error) {
      setError(null)
    }
  }

  const handleButtonClick = () => {
    handleSubmit()
  }

  return (
    <Box sx={{ width: '100%', mb: 2 }}>
      <Box sx={{ 
        display: 'flex', 
        gap: { xs: 1, sm: 1.5 }, 
        alignItems: 'flex-start',
        flexDirection: { xs: 'column', sm: 'row' }
      }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          variant="outlined"
          placeholder={placeholder}
          value={description}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          error={!!error}
          data-testid="task-input"
          inputProps={{
            maxLength: 500, // Derived from contract constraint
            'aria-label': 'Task description input'
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '&:hover fieldset': {
                borderColor: 'primary.main'
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: 2
              }
            }
          }}
        />
        <Button
          variant="contained"
          onClick={handleButtonClick}
          disabled={disabled || description.trim().length === 0}
          startIcon={<AddIcon />}
          sx={{
            minWidth: { xs: '100%', sm: 'auto' },
            px: { xs: 2, sm: 2 },
            height: '56px', // Match TextField height
            whiteSpace: 'nowrap'
          }}
          aria-label="Add task"
        >
          Add Task
        </Button>
      </Box>
      
      {error && (
        <Alert 
          severity="error" 
          sx={{ mt: 1 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}
      
      <Box sx={{ 
        mt: 0.5, 
        fontSize: '0.75rem', 
        color: 'text.secondary',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span>{description.length}/500 characters</span>
        {description.length > 400 && (
          <span style={{ color: description.length > 480 ? '#d32f2f' : '#ed6c02' }}>
            {description.length > 480 ? 'Character limit almost reached' : 'Approaching character limit'}
          </span>
        )}
      </Box>
    </Box>
  )
}

export default TaskInput