import { POST as paymentWebhookPost } from '../payments/[provider]/route';

export function POST(request: Request) {
  return paymentWebhookPost(request, { params: Promise.resolve({ provider: 'razorpay' }) });
}