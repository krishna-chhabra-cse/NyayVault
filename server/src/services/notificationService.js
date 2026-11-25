import nodemailer from 'nodemailer';
import { query } from '../config/db.js';

let transporter = null;

// Initialize mailer only when needed
function getTransporter() {
  if (!transporter) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
      console.warn("Email configuration missing (SMTP_HOST, SMTP_USER). Notifications will be mocked.");
      return null;
    }
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

export async function sendEvidenceUploadNotification({ caseId, caseNumber, caseTitle, uploaderName, uploaderBadge, filename, documentType }) {
  try {
    // 1. Get emails of all assigned users for this case, except the uploader
    const sql = `
      SELECT u.email, u.full_name, u.role
      FROM case_assignments ca
      JOIN users u ON ca.user_id = u.id
      WHERE ca.case_id = $1 AND u.badge_number != $2 AND u.email IS NOT NULL;
    `;
    const res = await query(sql, [caseId, uploaderBadge]);
    const recipients = res.rows;

    if (recipients.length === 0) {
      console.log(`No assigned users with email found for case ${caseNumber}`);
      return;
    }

    const mailer = getTransporter();
    
    // Setup html template
    const htmlBody = `
      <div style="font-family: sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1e293b; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0;">NyayVault Evidence Vault</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <h3 style="color: #0f172a; margin-top: 0;">New Evidence Uploaded</h3>
          <p style="color: #475569; line-height: 1.6;">
            A new document has been securely uploaded to <strong>${caseNumber}: ${caseTitle}</strong>.
          </p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Document:</strong> ${filename}</p>
            <p style="margin: 5px 0;"><strong>Category:</strong> ${documentType}</p>
            <p style="margin: 5px 0;"><strong>Uploaded By:</strong> ${uploaderName} (${uploaderBadge})</p>
            <p style="margin: 5px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <p style="color: #475569; line-height: 1.6;">
            The SHA-256 integrity hash has been recorded in the blockchain-verified chain of custody. Log in to the portal to review this evidence.
          </p>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/#case/${caseId}" style="background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; display: inline-block;">
              View Case Files
            </a>
          </div>
        </div>
        <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
          This is an automated notification from the NyayVault Cloud Evidence Vault.
        </div>
      </div>
    `;

    const toEmails = recipients.map(r => r.email).join(', ');

    if (!mailer) {
      console.log(`[MOCK EMAIL] To: ${toEmails}\nSubject: 🔔 New Evidence Uploaded — Case ${caseNumber}\nContent: ${filename} uploaded by ${uploaderName}`);
      return;
    }

    // Send email — use BCC so recipients cannot see each other's addresses
    await mailer.sendMail({
      from: process.env.SMTP_FROM || '"Evidence Vault" <noreply@evidencevault.local>',
      to: process.env.SMTP_FROM || '"Evidence Vault" <noreply@evidencevault.local>',
      bcc: toEmails,
      subject: `🔔 New Evidence Uploaded — Case ${caseNumber}`,
      html: htmlBody,
    });

    console.log(`Email notification sent to ${recipients.length} users for case ${caseNumber}`);
  } catch (err) {
    console.error("Failed to send email notifications:", err.message);
  }
}
