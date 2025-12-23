import { render, screen } from '@testing-library/react';
import App from './App';

test('renders top bar title', () => {
  render(<App />);
  const el = screen.getByText(/Offline Document Tracker/i);
  expect(el).toBeInTheDocument();
});
