import { prisma } from './prisma';
import { CampaignStatus, RecipientStatus, ScheduledEmailStatus } from '@prisma/client';

async function seed() {
  console.log('Seeding demo database...');

  const user = await prisma.user.upsert({
    where: { email: 'admin@mailorchestrator.internal' },
    update: {},
    create: {
      id: 'default-system-user-id',
      email: 'admin@mailorchestrator.internal',
      name: 'System Administrator',
    },
  });

  const sender = await prisma.emailSender.create({
    data: {
      userId: user.id,
      name: 'Resend Production Engine',
      fromEmail: 'orchestrator@ethereal.email',
      isEthereal: true,
      maxPerHour: 500,
      minDelayMs: 100,
    },
  });

  const campaign = await prisma.emailCampaign.create({
    data: {
      userId: user.id,
      senderId: sender.id,
      title: 'Q3 Product Announcement',
      subject: 'Introducing MailOrchestrator v2.0 for {{name}}',
      bodyTemplate: '<p>Hi {{name}},</p><p>We are thrilled to welcome {{company}} to the MailOrchestrator platform!</p><p>Best regards,<br/>The Engineering Team</p>',
      status: CampaignStatus.PROCESSING,
      totalRecipients: 3,
      sentCount: 2,
      failedCount: 0,
    },
  });

  const recipients = [
    { email: 'alex.developer@example.com', name: 'Alex Developer', company: 'Acme Corp' },
    { email: 'sarah.engineer@example.com', name: 'Sarah Engineer', company: 'Vercel Inc' },
    { email: 'jordan.architect@example.com', name: 'Jordan Architect', company: 'Stripe Labs' },
  ];

  for (const r of recipients) {
    const recipient = await prisma.emailRecipient.create({
      data: {
        campaignId: campaign.id,
        email: r.email,
        metadataJson: { name: r.name, company: r.company },
        status: RecipientStatus.SENT,
        sentAt: new Date(),
      },
    });

    await prisma.scheduledEmail.create({
      data: {
        campaignId: campaign.id,
        recipientId: recipient.id,
        senderId: sender.id,
        status: ScheduledEmailStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  console.log('Seeding completed successfully!');
}

seed().catch(console.error).finally(() => prisma.$disconnect());
