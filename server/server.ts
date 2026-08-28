import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createPaymentRouter } from './routes/payments';
import { webhookRouter } from './routes/webhook';
import { initDb } from './db';

// --- CRASH CATCHERS ---
process.on('uncaughtException', (err) => {
    console.error("FATAL UNCAUGHT EXCEPTION:", err);
    process.exit(1);
});
process.on('unhandledRejection', (err) => {
    console.error("FATAL UNHANDLED REJECTION:", err);
    process.exit(1);
});

function assertRazorpayCredentials() {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay Key ID or Key Secret is not defined in .env file");
    }
}

export function createApp() {
    assertRazorpayCredentials();

    const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID!,
        key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const app = express();

    app.use(cors({
        origin: process.env.CLIENT_URL || 'http://localhost:3000',
        optionsSuccessStatus: 200
    }));

    // Throttle repeated requests to payment endpoints (brute-force / replay protection).
    const apiLimiter = rateLimit({
        windowMs: 60 * 1000,
        limit: 30,
        standardHeaders: 'draft-6',
        legacyHeaders: false,
        message: { error: "Too many requests, please try again later." }
    });
    app.use('/api', apiLimiter);

    app.use('/api/webhook', express.raw({ type: 'application/json' }), webhookRouter);
    app.use(express.json());

    const paymentRouter = createPaymentRouter(razorpay);
    app.use('/api', paymentRouter);

    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        console.error("Unhandled Error:", err);
        res.status(500).json({ error: err.message || "Internal Server Error" });
    });

    return app;
}

// CHANGED TO PORT 4243 TO AVOID ZOMBIE PROCESSES
const PORT = process.env.PORT || 4243;

export async function startServer() {
    const app = createApp();
    await initDb();
    console.log("Database initialized. Starting Express...");
    const server = app.listen(PORT, () => {
        console.log(`Node server is ALIVE and listening on port ${PORT}`);
    });
    server.on('error', (err: any) => {
        console.error("EXPRESS SERVER ERROR:", err);
        process.exit(1);
    });
    return server;
}

if (require.main === module) {
    startServer().catch((err) => {
        console.error("Failed to start server:", err);
        process.exit(1);
    });
}
