import { Router, Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { verifyRazorpaySignature } from '../utils/security';

export const createPaymentRouter = (razorpay: Razorpay) => {
    const router = Router();

    router.post('/create-order', async (req: Request, res: Response) => {
        const { productId } = req.body;

        const options = {
            amount: 50000,
            currency: "INR",
            receipt: `receipt_order_${new Date().getTime()}`,
        };

          try {
            const order = await razorpay.orders.create(options);
            res.status(200).json(order);
        } catch (error) {
            console.error("Error creating Razorpay order:", error);
            res.status(500).json({ error: "Failed to create payment order." });
        }
    });

      router.post('/verify-payment', (req: Request, res: Response) => {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const key_secret = process.env.RAZORPAY_KEY_SECRET!;

        const isVerified = verifyRazorpaySignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            key_secret
        );

        if (isVerified) {
            res.json({ success: true, message: "Payment has been verified." });
        } else {
            res.status(400).json({ success: false, message: "Payment verification failed." });
        }
    });

    return router;
};