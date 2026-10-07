export interface SendGiftEmailParams {
  recipientName: string;
  recipientEmail: string;
  purchaserName: string;
  productName: string;
  claimUrl: string;
  giftMessage?: string | null;
}

export interface SendOnboardingEmailParams {
  name: string;
  email: string;
  onboardingUrl: string;
}

export interface EmailServicePort {
  sendGiftEmail(params: SendGiftEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
  sendOnboardingEmail?(params: SendOnboardingEmailParams): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export class DefaultEmailService implements EmailServicePort {
  async sendGiftEmail(params: SendGiftEmailParams) {
    // In production, integrates with Resend, SendGrid, or AWS SES
    console.log(
      `[EmailService] Dispatched gift email to ${params.recipientEmail} for product "${params.productName}". Claim URL: ${params.claimUrl}`
    );
    return {
      success: true,
      messageId: `email_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  async sendOnboardingEmail(params: SendOnboardingEmailParams) {
    console.log(
      `[EmailService] Dispatched onboarding password setup email to ${params.email}. Access URL: ${params.onboardingUrl}`
    );
    return {
      success: true,
      messageId: `onboarding_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }
}

export const emailService: EmailServicePort = new DefaultEmailService();
