import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { getDb } from '../db';

export const webhookRouter = Router();

webhookRouter.post('/razorpay', async (req: Request, res: Response): Promise<void> => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) { res.status(500).send("Webhook secret not configured."); return; }

    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) { res.status(400).send("Missing signature"); return; }

    const expectedSignature = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    if (expectedSignature !== signature) { res.status(400).send("Invalid signature"); return; }

    try {
        const event = JSON.parse(req.body.toString('utf8'));
        const db = await getDb();

        if (event.event === 'payment.captured') {
            const payment = event.payload.payment.entity;
            await db.execute(`UPDATE orders SET status = 'paid', razorpay_payment_id = ? WHERE razorpay_order_id = ?`, [payment.id, payment.order_id]);
        } else if (event.event === 'payment.failed') {
            const payment = event.payload.payment.entity;
            await db.execute(`UPDATE orders SET status = 'failed' WHERE razorpay_order_id = ?`, [payment.order_id]);
        }
        res.status(200).send("Webhook processed");
    } catch (error) {
        res.status(500).send("Webhook processing failed");
    }
});