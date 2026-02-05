/**
 * Mock notification service for beta.
 * Logs to console. Replace with Twilio/SendGrid in production.
 *
 * Extension point: implement NotificationService interface from @gts/shared
 */
export interface NotificationPayload {
  to: string;
  subject?: string;
  body: string;
  channel: 'SMS' | 'EMAIL' | 'PUSH';
}

export class MockNotificationService {
  async send(payload: NotificationPayload): Promise<{ success: boolean; messageId?: string }> {
    const messageId = `mock-${Date.now()}`;
    console.log(`📧 [MOCK ${payload.channel}] To: ${payload.to}`);
    console.log(`   Subject: ${payload.subject || '(none)'}`);
    console.log(`   Body: ${payload.body}`);
    console.log(`   MessageID: ${messageId}`);
    return { success: true, messageId };
  }
}
