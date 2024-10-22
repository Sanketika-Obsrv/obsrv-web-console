import React from 'react';
import { render, screen } from '@testing-library/react';
import NewDataset from './NewDataset';
import { BrowserRouter } from 'react-router-dom';

test('renders button with correct content', () => {
  render(<NewDataset />, { wrapper: BrowserRouter });
  const buttonElement = screen.getByRole('button', {
    name: /Create New Dataset/i,
  });

  expect(buttonElement).toBeInTheDocument();
  expect(buttonElement.textContent).toBe('Create New Dataset');
});
