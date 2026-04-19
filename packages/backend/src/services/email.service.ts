export interface EmailService {
  sendMagicLink(email: string, token: string): Promise<void>;
}

export const emailService: EmailService = {
  async sendMagicLink(email: string, token: string): Promise<void> {
    const baseUrl = process.env.APP_BASE_URL ?? 'http://localhost:5173';
    const link = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
    console.log(`[EmailService] Magic link for ${email}: ${link}`);
  },
};
