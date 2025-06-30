import { verifyRazorpaySignature } from '../../utils/security';
import crypto from 'crypto';

// 3. `describe` creates a test suite, a container for related tests.
describe('verifyRazorpaySignature', () => {

  // 4. Set up constant test data that we will reuse in multiple tests.
  const MOCK_SECRET = 'my_test_webhook_secret';
  const MOCK_ORDER_ID = 'order_testid_12345';
  const MOCK_PAYMENT_ID = 'pay_testid_abcdef';

  // 5. Create a helper function to generate a valid signature for our tests.
  //    This mimics what Razorpay's server would do.
  const generateValidSignature = () => {
    const body = `${MOCK_ORDER_ID}|${MOCK_PAYMENT_ID}`;
    return crypto.createHmac('sha256', MOCK_SECRET).update(body).digest('hex');
  };

  // 6. `it` or `test` defines an individual test case. The string describes what it tests.
  //    This is the "Happy Path" test.
  test('should return true when the signature is valid', () => {
    // 7. ARRANGE: Set up the specific data for this test.
    const validSignature = generateValidSignature();

    // 8. ACT: Call the function we are testing with the arranged data.
    const result = verifyRazorpaySignature(
      MOCK_ORDER_ID,
      MOCK_PAYMENT_ID,
      validSignature,
      MOCK_SECRET
    );

    // 9. ASSERT: Check if the result is what we expect it to be.
    expect(result).toBe(true);
  });

  // 10. This is a "Failure Path" test.
  it('should return false when the signature is invalid', () => {
    // ARRANGE: Use a deliberately incorrect signature.
    const invalidSignature = 'this_is_obviously_not_a_real_signature';

    // ACT: Call the function.
    const result = verifyRazorpaySignature(
      MOCK_ORDER_ID,
      MOCK_PAYMENT_ID,
      invalidSignature,
      MOCK_SECRET
    );

    // ASSERT: We expect the result to be false this time.
    expect(result).toBe(false);
  });
  
  // 11. This is another "Failure Path" test.
  it('should return false when the secret key is wrong', () => {
    // ARRANGE: Generate a signature with the correct secret, but verify with the wrong one.
    const validSignature = generateValidSignature();
    const wrongSecret = 'a_completely_different_secret';

    // ACT: Call the function with the wrong secret.
    const result = verifyRazorpaySignature(
      MOCK_ORDER_ID,
      MOCK_PAYMENT_ID,
      validSignature,
      wrongSecret // <-- The only difference is here
    );

    // ASSERT: The result must be false.
    expect(result).toBe(false);
  });
  
  // 12. This is an "Edge Case" test.
  it('should return false if any of the required parameters are missing', () => {
    const validSignature = generateValidSignature();

    // ACT & ASSERT: Test multiple scenarios where a parameter is missing.
    // We expect every single one of these calls to return false.
    expect(verifyRazorpaySignature('', MOCK_PAYMENT_ID, validSignature, MOCK_SECRET)).toBe(false);
    expect(verifyRazorpaySignature(MOCK_ORDER_ID, '', validSignature, MOCK_SECRET)).toBe(false);
    expect(verifyRazorpaySignature(MOCK_ORDER_ID, MOCK_PAYMENT_ID, '', MOCK_SECRET)).toBe(false);
    expect(verifyRazorpaySignature(MOCK_ORDER_ID, MOCK_PAYMENT_ID, validSignature, '')).toBe(false);
  });
});