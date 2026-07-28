import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../logger/logger';

export interface SmtpConfig {
  host?: string | null;
  port?: number | null;
  user?: string | null;
  pass?: string | null;
  isEthereal?: boolean;
  secure?: boolean | null;
  authType?: 'basic' | 'oauth2' | string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  refreshToken?: string | null;
}

export interface SendEmailOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  smtpConfig?: SmtpConfig;
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

  public getTransporter(smtpConfig?: SmtpConfig): Promise<Transporter> {
    if (smtpConfig && !smtpConfig.isEthereal) {
      // Check for OAuth2 authentication mode
      if (smtpConfig.authType === 'oauth2' && smtpConfig.user && smtpConfig.clientId && smtpConfig.clientSecret && smtpConfig.refreshToken) {
        logger.info({ user: smtpConfig.user }, '[EmailService] Initializing Gmail OAuth2 Transporter');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: smtpConfig.user,
            clientId: smtpConfig.clientId,
            clientSecret: smtpConfig.clientSecret,
            refreshToken: smtpConfig.refreshToken,
          },
        } as any);
        return Promise.resolve(transporter);
      }

      // Check standard SMTP or Gmail App Password mode
      if (smtpConfig.host && smtpConfig.user && smtpConfig.pass) {
        // Strip spaces from Gmail App Password if user pasted with spaces (e.g. xxxx xxxx xxxx xxxx)
        const cleanPass = smtpConfig.pass.replace(/\s+/g, '');
        const isGmail = smtpConfig.host.toLowerCase().includes('gmail');

        // For Gmail: use Nodemailer's built-in 'service' shorthand which auto-handles
        // port selection, TLS, and connection pooling — avoids port 587 timeout on cloud providers
        if (isGmail) {
          logger.info(
            { user: smtpConfig.user },
            '[EmailService] Initializing Gmail Service Transporter (auto port/TLS)'
          );

          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: smtpConfig.user,
              pass: cleanPass,
            },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000,
          });
          return Promise.resolve(transporter);
        }

        // For non-Gmail SMTP: use explicit host/port config
        const port = smtpConfig.port ? Number(smtpConfig.port) : 587;
        const secure = smtpConfig.secure !== undefined && smtpConfig.secure !== null 
          ? smtpConfig.secure 
          : port === 465;

        logger.info(
          { host: smtpConfig.host, port, user: smtpConfig.user, secure },
          '[EmailService] Initializing Real SMTP Transporter'
        );

        const transporterOptions: any = {
          host: smtpConfig.host,
          port,
          secure,
          auth: {
            user: smtpConfig.user,
            pass: cleanPass,
          },
          requireTLS: port === 587,
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 30000,
          greetingTimeout: 30000,
          socketTimeout: 30000,
        };

        const transporter = nodemailer.createTransport(transporterOptions);
        return Promise.resolve(transporter);
      }
    }

    logger.info('[EmailService] Using Ethereal Test Transporter (Sandbox Mode)');
    return this.getEtherealTransporter();
  }

  /**
   * Tests connection with provided SMTP / Gmail credentials and sends a test email if recipient is provided.
   */
  public async testSmtpConnection(
    smtpConfig: SmtpConfig,
    testRecipient?: string
  ): Promise<{ success: boolean; message: string; messageId?: string }> {
    try {
      const transporter = await this.getTransporter(smtpConfig);
      
      // Verify connection config
      await transporter.verify();
      logger.info('[EmailService] SMTP Transporter verification succeeded');

      let messageId: string | undefined;
      if (testRecipient && smtpConfig.user) {
        const info = await transporter.sendMail({
          from: `"${smtpConfig.user}" <${smtpConfig.user}>`,
          to: testRecipient,
          subject: 'MailOrchestrator SMTP Connection Test',
          html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #4f46e5;">SMTP Connection Successful!</h2>
            <p>This test email confirms that your MailOrchestrator sender settings (<strong>${smtpConfig.user}</strong>) are properly configured and capable of dispatching real emails.</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          </div>`,
        });
        messageId = info.messageId;
        logger.info({ testRecipient, messageId }, '[EmailService] Test email dispatched successfully');
      }

      return {
        success: true,
        message: testRecipient
          ? `Connection successful! Test email delivered to ${testRecipient}`
          : 'SMTP Connection verified successfully!',
        messageId,
      };
    } catch (err: any) {
      const errorMessage = err?.message || 'SMTP Connection failed';
      logger.error({ err: errorMessage }, '[EmailService] SMTP Connection verification failed');
      return {
        success: false,
        message: `SMTP Connection error: ${errorMessage}`,
      };
    }
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
    // 5. SMTP DISPATCH (With automatic Ethereal fallback if cloud provider blocks outbound SMTP ports)
    try {
      let transporter;
      try {
        transporter = await this.getTransporter(options.smtpConfig);
      } catch (err) {
        logger.warn('[EmailService] Custom SMTP transporter failed, falling back to Ethereal Sandbox');
        transporter = await this.getEtherealTransporter();
      }

      let info;
      try {
        info = await transporter.sendMail({
          from: options.from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
        });
      } catch (smtpErr: any) {
        // If Railway / Cloud Provider blocks outbound port 587/465 with Connection Timeout
        if (smtpErr?.message?.includes('timeout') || smtpErr?.code === 'ETIMEDOUT' || smtpErr?.code === 'ESOCKET') {
          logger.warn({ err: smtpErr?.message }, '[EmailService] Live SMTP timed out on Cloud provider. Falling back to Ethereal Email sandbox...');
          const fallbackTransporter = await this.getEtherealTransporter();
          info = await fallbackTransporter.sendMail({
            from: options.from,
            to: options.to,
            subject: options.subject,
            html: options.html,
            text: options.text || options.html.replace(/<[^>]*>?/gm, ''),
          });
        } else {
          throw smtpErr;
        }
      }

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        logger.info({ previewUrl, to: options.to }, '[EmailService] Ethereal email preview available');
      } else {
        logger.info({ messageId: info.messageId, to: options.to }, '[EmailService] Real email dispatched via SMTP/Gmail');
      }

      return {
        messageId: info.messageId,
        previewUrl,
      };
    } catch (err: any) {
      logger.error({ err: err?.message }, '[EmailService] All email dispatch attempts failed');
      throw err;
    }
  }
}

export const emailService = new EmailService();
