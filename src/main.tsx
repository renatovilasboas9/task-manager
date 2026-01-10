import React, { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import TaskManager from './domains/task-manager/TaskManager'
import { GalleryDemo } from './gallery/task-manager/GalleryDemo'

// Simple routing based on URL path
const App: React.FC = () => {
  const path = window.location.pathname

  useEffect(() => {
    if (path === '/gallery') {
      document.title = 'Task Manager Gallery - Component Showcase'
    } else {
      document.title = 'Task Manager - Organize Your Tasks Efficiently'
    }
  }, [path])

  if (path === '/gallery') {
    return <GalleryDemo />
  }

  return <TaskManager />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)