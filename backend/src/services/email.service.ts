import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../logger/logger';

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  smtpConfig?: {
    host?: string | null;
    port?: number | null;
    user?: string | null;
    pass?: string | null;
    isEthereal?: boolean;
  };
}

export class EmailService {
  private etherealTransporter: Transporter | null = null;

  private async getEtherealTransporter(): Promise<Transporter> {
    if (this.etherealTransporter) return this.etherealTransporter;

    logger.info('[EmailService] Generating Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();
    
    this.etherealTransporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    logger.info(
      { user: testAccount.user },
      '[EmailService] Ethereal test account created successfully'
    );

    return this.etherealTransporter;
  }

  private getTransporter(smtpConfig?: SendEmailOptions['smtpConfig']): Promise<Transporter> {
    if (
      smtpConfig &&
      !smtpConfig.isEthereal &&
      smtpConfig.host &&
      smtpConfig.user &&
      smtpConfig.pass
    ) {
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: smtpConfig.port || 587,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        },
      });
      return Promise.resolve(transporter);
    }

    return this.getEtherealTransporter();
  }

  /**
   * Interpolates variable placeholders like {{name}}, {{email}}, {{company}}
   */
  public compileTemplate(template: string, variables: Record<string, unknown>): string {
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      if (key in variables && variables[key] !== undefined && variables[key] !== null) {
        return String(variables[key]);
      }
      return match;
    });
  }

  public async sendEmail(options: SendEmailOptions): Promise<{ messageId: string; previewUrl?: string | false }> {
    const transporter = await this.getTransporter(options.smtpConfig);

    const info = await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info({ previewUrl, to: options.to }, '[EmailService] Ethereal email preview available');
    }

    return {
      messageId: info.messageId,
      previewUrl,
    };
  }
}

export const emailService = new EmailService();
