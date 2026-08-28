import crypto from 'crypto';

export function verifyRazorpaySignature( //This function takes 4 params given below
  orderId: string, 
  paymentId: string, 
  razorpaySignature: string,
  secret: string 
): boolean {
  if (!orderId || !paymentId || !razorpaySignature || !secret) {
    return false;
  }
   const bodyToSign = `${orderId}|${paymentId}`; //According to razorpay docs, how an input is taken in, for the creating of signature
   const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(bodyToSign)
    .digest('hex');
    return expectedSignature === razorpaySignature;
}      
