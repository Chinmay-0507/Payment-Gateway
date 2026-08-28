import React, { useState } from 'react';

declare global {
  interface Window { Razorpay: any; }
}

const CheckoutForm: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [succeeded, setSucceeded] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const displayRazorpay = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('http://localhost:4242/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: 'prod_1' }),
      });

      const order = await res.json();
      if (!res.ok || !order) {
          setError(order.error || "Server error. Could not create order.");
          setLoading(false);
          return;
      }

      const options = {
        key: process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'My Awesome Corp',
        description: 'Test Transaction',
        order_id: order.id,
        
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch('http://localhost:4242/api/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyRes.json();
            
            if (verifyData.success) {
              setSucceeded(true);
            } else {
              setError("Payment verification failed on server.");
            }
          } catch (err) {
            setError("Network error during payment verification.");
          } finally {
            setLoading(false);
          }
        },

        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        },
        
        events: {
          payment_failed: function (response: any){
            setError(`Payment Failed: ${response.error.description}`);
            setLoading(false);
          }
        },

        prefill: { name: 'John Doe', email: 'johndoe@example.com', contact: '9999999999' },
        theme: { color: '#3399cc' },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (err) {
      setError("Network error. Could not connect to server.");
      setLoading(false);
    }
  };

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