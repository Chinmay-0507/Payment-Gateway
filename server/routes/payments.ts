import { Router, Request, Response, NextFunction } from 'express';
import Razorpay from 'razorpay';
import { verifyRazorpaySignature } from '../utils/security';
import { PRODUCTS } from '../config/products';
import { getDb } from '../db';
import { createOrderSchema, verifyPaymentSchema } from '../validation/schemas';

export const createPaymentRouter = (razorpay: Razorpay) => {
    const router = Router();

    router.get('/orders', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const page = Math.max(1, parseInt(req.query.page as string) || 1);
            const limit = Math.max(1, parseInt(req.query.limit as string) || 10);
            const offset = (page - 1) * limit;

            const db = await getDb();
            const [orders] = await db.query(`SELECT * FROM orders ORDER BY created_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
            const [countResult]: any = await db.query(`SELECT COUNT(*) as total FROM orders`);
            const total = countResult[0]?.total || 0;

            res.json({ data: orders, page, totalPages: Math.ceil(total / limit), total });
        } catch (error) { next(error); }
    });

    router.post('/create-order', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = createOrderSchema.safeParse(req.body);
            if (!parsed.success) { res.status(400).json({ error: "Invalid request payload. Missing productId." }); return; }

            const { productId } = parsed.data;
            if (!PRODUCTS[productId]) { res.status(400).json({ error: "Invalid productId." }); return; }

            const options = { amount: PRODUCTS[productId], currency: "INR", receipt: `receipt_order_${new Date().getTime()}` };
            const order = await razorpay.orders.create(options);
            
            const db = await getDb();
            await db.execute(
                `INSERT INTO orders (razorpay_order_id, product_id, amount, currency, status) VALUES (?, ?, ?, ?, ?)`,
                [order.id, productId, options.amount, options.currency, 'created']
            );

            res.status(200).json(order);
        } catch (error) { next(error); }
    });

    router.post('/verify-payment', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const parsed = verifyPaymentSchema.safeParse(req.body);
            if (!parsed.success) { res.status(400).json({ success: false, message: "Invalid payment payload." }); return; }

            const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
            const key_secret = process.env.RAZORPAY_KEY_SECRET!;
            const isVerified = verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, key_secret);
            const db = await getDb();

            if (isVerified) {
                await db.execute(`UPDATE orders SET status = 'paid', razorpay_payment_id = ? WHERE razorpay_order_id = ?`, [razorpay_payment_id, razorpay_order_id]);
                res.json({ success: true, message: "Payment has been verified." });
            } else {
                await db.execute(`UPDATE orders SET status = 'failed' WHERE razorpay_order_id = ?`, [razorpay_order_id]);
                res.status(400).json({ success: false, message: "Payment verification failed." });
            }
        } catch (error) { next(error); }
    });

    return router;
};