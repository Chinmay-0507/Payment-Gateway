// client/src/App.tsx
import React from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';
import './App.css';

// Paste your PUBLISHABLE key here
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE');

const App: React.FC = () => (
  <div className="App">
    <h1>TypeScript Payment Project</h1>
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  </div>
);

export default App;