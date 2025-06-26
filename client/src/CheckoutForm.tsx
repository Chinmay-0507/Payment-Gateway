import React, { useState } from 'react';

declare global {
  interface Window { Razorpay: any; }
}

const CheckoutForm: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const displayRazorpay = async () => {
    console.log("--- displayRazorpay function started ---");
    setLoading(true);
    setError(null);

    const res = await fetch('http://localhost:4242/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50000 }),
    });

    const order = await res.json();
    if (!order) {
        console.error("Failed to create order on server.");
        setError("Server error. Could not create order.");
        setLoading(false);
        return;
    }
    console.log("Order created successfully:", order);

    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'My Awesome Corp',
      description: 'Test Transaction',
      order_id: order.id,
      
      handler: function (response: any) {
        console.log("--- SUCCESS HANDLER CALLED ---", response);
        // Verification logic will go here in the real app
        setSucceeded(true);
        setLoading(false);
      },

      modal: {
        ondismiss: function() {
          console.log("--- MODAL ONDISMISS CALLED ---");
          setLoading(false);
        }
      },
      
      events: {
        payment_failed: function (response: any){
          console.log("--- PAYMENT_FAILED EVENT CALLED ---", response);
          setError(`Payment Failed: ${response.error.description}`);
          setLoading(false);
        }
      },

      prefill: { name: 'John Doe', email: 'johndoe@example.com', contact: '9999999999' },
      theme: { color: '#3399cc' },
    };

    console.log("--- Creating Razorpay object with these options: ---", options);
    const paymentObject = new window.Razorpay(options);

    console.log("--- Opening Razorpay modal ---");
    paymentObject.open();
  };

  console.log("--- CheckoutForm component rendered ---");
  return (
    <div className="checkout-form">
      {error && <div className="card-error" role="alert">{error}</div>}
      {succeeded ? (
        <p className="result-message">Payment succeeded!</p>
      ) : (
        <button onClick={displayRazorpay} disabled={loading}>
          {loading ? 'Processing…' : 'Pay with Razorpay'}
        </button>
      )}
    </div>
  );
};

export default CheckoutForm;