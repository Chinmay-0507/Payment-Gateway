import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Pay with Razorpay button', () => {
  render(<App />);
  const buttonElement = screen.getByRole('button', { name: /Pay with Razorpay/i });
  expect(buttonElement).toBeInTheDocument();
});