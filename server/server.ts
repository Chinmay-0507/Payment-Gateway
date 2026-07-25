import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import { createPaymentRouter } from './routes/payments';
import { webhookRouter } from './routes/webhook';
import { initDb } from './db';

// --- CRASH CATCHERS ---
process.on('uncaughtException', (err) => {
    console.error("FATAL UNCAUGHT EXCEPTION:", err);
});
process.on('unhandledRejection', (err) => {
    console.error("FATAL UNHANDLED REJECTION:", err);
});

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error("Razorpay Key ID or Key Secret is not defined in .env file");
}

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  optionsSuccessStatus: 200
}));

if (webhookRouter) {
    app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);
}
app.use(express.json());

const paymentRouter = createPaymentRouter(razorpay);
if (paymentRouter) {
    app.use('/api', paymentRouter);
}

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

// CHANGED TO PORT 4243 TO AVOID ZOMBIE PROCESSES
const PORT = process.env.PORT || 4243; 
export let server: any;

console.log("Starting database initialization...");

initDb().then(() => {
  console.log("Database initialized. Starting Express...");
  
  server = app.listen(PORT, () => {
      console.log(`Node server is ALIVE and listening on port ${PORT}`);
  });

  server.on('error', (err: any) => {
      console.error("EXPRESS SERVER ERROR:", err);
  });

}).catch((err: any) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});