/// <reference types="jest" />
import request from 'supertest';

jest.mock('razorpay', () => {
    return jest.fn().mockImplementation(() => ({
        orders: {
            create: jest.fn().mockResolvedValue({ id: 'order_test_123', amount: 50000, currency: 'INR' }),
        },
    }));
});

jest.mock('../../db', () => ({
    getDb: jest.fn(),
    initDb: jest.fn().mockResolvedValue(undefined),
    closeDb: jest.fn().mockResolvedValue(undefined),
}));

import { createApp } from '../../server';
import { getDb } from '../../db';
import crypto from 'crypto';

const RAZORPAY_KEY_SECRET = 'test_key_secret';
const WEBHOOK_SECRET = 'test_webhook_secret';
const ADMIN_API_KEY = 'test_admin_key';

const fakeDb = {
    query: jest.fn().mockResolvedValue([[], []]),
    execute: jest.fn().mockResolvedValue([{ affectedRows: 1 }]),
};

beforeAll(() => {
    process.env.RAZORPAY_KEY_ID = 'test_key_id';
    process.env.RAZORPAY_KEY_SECRET = RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.ADMIN_API_KEY = ADMIN_API_KEY;
});

beforeEach(() => {
    (getDb as jest.Mock).mockResolvedValue(fakeDb);
    fakeDb.query.mockClear();
    fakeDb.execute.mockClear();
});

const app = createApp();

describe('GET /api/orders', () => {
    it('rejects requests without the admin API key', async () => {
        const res = await request(app).get('/api/orders');
        expect(res.status).toBe(401);
    });

    it('returns paginated orders with a valid admin key', async () => {
        fakeDb.query.mockResolvedValueOnce([[{ id: 1, status: 'paid' }], []]);
        fakeDb.query.mockResolvedValueOnce([[{ total: 1 }], []]);
        const res = await request(app).get('/api/orders').set('x-admin-api-key', ADMIN_API_KEY);
        expect(res.status).toBe(200);
        expect(res.body.data).toBeDefined();
        expect(res.body.total).toBe(1);
    });
});

describe('POST /api/create-order', () => {
    it('creates an order and persists it for a valid productId', async () => {
        const res = await request(app)
            .post('/api/create-order')
            .send({ productId: 'prod_1' });
        expect(res.status).toBe(200);
        expect(res.body.id).toBe('order_test_123');
        expect(fakeDb.execute).toHaveBeenCalled();
    });

    it('rejects an unknown productId', async () => {
        const res = await request(app)
            .post('/api/create-order')
            .send({ productId: 'prod_unknown' });
        expect(res.status).toBe(400);
    });

    it('rejects a missing productId', async () => {
        const res = await request(app).post('/api/create-order').send({});
        expect(res.status).toBe(400);
    });
});

describe('POST /api/verify-payment', () => {
    const buildSignature = (orderId: string, paymentId: string) =>
        crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');

    it('marks the order paid for a valid signature', async () => {
        const orderId = 'order_test_123';
        const paymentId = 'pay_test_abc';
        const res = await request(app)
            .post('/api/verify-payment')
            .send({ razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: buildSignature(orderId, paymentId) });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(fakeDb.execute).toHaveBeenCalledWith(
            expect.stringContaining("status = 'paid'"),
            [paymentId, orderId]
        );
    });

    it('rejects an invalid signature', async () => {
        const res = await request(app)
            .post('/api/verify-payment')
            .send({ razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_y', razorpay_signature: 'bogus' });
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });
});

describe('POST /api/webhook/razorpay', () => {
    const buildWebhookSignature = (rawBody: string) =>
        crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

    it('processes a valid payment.captured event', async () => {
        const body = JSON.stringify({
            event: 'payment.captured',
            payload: { payment: { entity: { id: 'pay_1', order_id: 'order_test_123' } } },
        });
        const res = await request(app)
            .post('/api/webhook/razorpay')
            .set('content-type', 'application/json')
            .set('x-razorpay-signature', buildWebhookSignature(body))
            .send(body);
        expect(res.status).toBe(200);
        expect(fakeDb.execute).toHaveBeenCalled();
    });

    it('rejects an invalid webhook signature', async () => {
        const body = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: {} } } });
        const res = await request(app)
            .post('/api/webhook/razorpay')
            .set('content-type', 'application/json')
            .set('x-razorpay-signature', 'invalid')
            .send(body);
        expect(res.status).toBe(400);
    });
});
