import { verifyRazorpaySignature } from '../../utils/security';
import crypto from 'crypto';

describe('verifyRazorpaySignature', () => {

  const MOCK_SECRET = 'my_test_webhook_secret';
  const MOCK_ORDER_ID = 'order_testid_12345';
  const MOCK_PAYMENT_ID = 'pay_testid_abcdef';

  const generateValidSignature = () => {
    const body = `${MOCK_ORDER_ID}|${MOCK_PAYMENT_ID}`;
    return crypto.createHmac('sha256', MOCK_SECRET).update(body).digest('hex');
  };

  test('should return true when the signature is valid', () => {
    const validSignature = generateValidSignature();

    const result = verifyRazorpaySignature(
      MOCK_ORDER_ID,
      MOCK_PAYMENT_ID,
      validSignature,
      MOCK_SECRET
    );

    expect(result).toBe(true);
  });

  it('should return false when the signature is invalid', () => {
    const invalidSignature = 'this_is_obviously_not_a_real_signature';

    const result = verifyRazorpaySignature(
      MOCK_ORDER_ID,
      MOCK_PAYMENT_ID,
      invalidSignature,
      MOCK_SECRET
    );

    expect(result).toBe(false);
  });
  
  it('should return false when the secret key is wrong', () => {
    const validSignature = generateValidSignature();
    const wrongSecret = 'a_completely_different_secret';

    const result = verifyRazorpaySignature(
      MOCK_ORDER_ID,
      MOCK_PAYMENT_ID,
      validSignature,
      wrongSecret 
    );

    expect(result).toBe(false);
  });
  
  it('should return false if any of the required parameters are missing', () => {
    const validSignature = generateValidSignature();

    expect(verifyRazorpaySignature('', MOCK_PAYMENT_ID, validSignature, MOCK_SECRET)).toBe(false);
    expect(verifyRazorpaySignature(MOCK_ORDER_ID, '', validSignature, MOCK_SECRET)).toBe(false);
    expect(verifyRazorpaySignature(MOCK_ORDER_ID, MOCK_PAYMENT_ID, '', MOCK_SECRET)).toBe(false);
    expect(verifyRazorpaySignature(MOCK_ORDER_ID, MOCK_PAYMENT_ID, validSignature, '')).toBe(false);
  });
});