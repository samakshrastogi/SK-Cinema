import nodemailer from "nodemailer"
import SMTPTransport from "nodemailer/lib/smtp-transport"

const BREVO_USER = process.env.BREVO_USER as string
const BREVO_PASS = process.env.BREVO_PASS as string
const EMAIL_FROM = process.env.EMAIL_FROM as string

const transporter = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 2525,
    secure: false,
    auth: {
        user: BREVO_USER,
        pass: BREVO_PASS
    },
    requireTLS: true,
    connectionTimeout: 20000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
    family: 4,
    tls: {
        minVersion: "TLSv1.2",
        rejectUnauthorized: false
    }
} as SMTPTransport.Options)

export const sendOrganizationInviteEmail = async (
    to: string,
    organizationName: string,
    inviteLink: string
) => {
    await transporter.sendMail({
        from: `"SK Cinema" <${EMAIL_FROM || BREVO_USER}>`,
        to,
        subject: `Invitation to join ${organizationName}`,
        html: `
            <div style="font-family:Arial,sans-serif;line-height:1.5">
                <h2>Organization Invite</h2>
                <p>You were invited to join <strong>${organizationName}</strong> on SK Cinema.</p>
                <p><a href="${inviteLink}" target="_blank" rel="noopener noreferrer">Click here to join organization</a></p>
                <p>If the button does not work, copy this link:</p>
                <p>${inviteLink}</p>
            </div>
        `
    })
}

