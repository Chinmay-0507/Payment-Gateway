// server/server.ts
import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import crypto from 'crypto'; // Built-in Node.js module for cryptography

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay Key ID or Key Secret is not defined in .env file");
}

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();
app.use(cors());
app.use(express.json());

// Endpoint 1: Create an Order
app.post('/create-order', async (req: Request, res: Response) => {
  const { amount } = req.body;

  const options = {
    amount: amount, // Amount in the smallest currency unit (e.g., paisa)
    currency: "INR",
    receipt: `receipt_order_${new Date().getTime()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).send(error); 
  }
});

// Endpoint 2: Verify the Payment (CRITICAL SECURITY STEP)
app.post('/verify-payment', (req: Request, res: Response) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET!;

  // Create an HMAC SHA256 signature
  const hmac = crypto.createHmac('sha256', key_secret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest('hex');

  if (generated_signature === razorpay_signature) {
    // Payment is authentic and successful
    // Here you would typically save the payment details to your database
    res.json({ success: true, message: "Payment has been verified." });
  } else {
    res.status(400).json({ success: false, message: "Payment verification failed." });
  }
});

const PORT = 4242;
app.listen(PORT, () => console.log(`Node server listening on port ${PORT}`));