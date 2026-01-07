import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders task manager title', () => {
    render(<App />);
    expect(screen.getByText('Task Manager')).toBeInTheDocument();
  });

  it('shows welcome message', () => {
    render(<App />);
    expect(
      screen.getByText(/Welcome to the Task Manager application/)
    ).toBeInTheDocument();
  });
});
