import fetch from 'node-fetch';

interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  attachment?: { content: string; name: string }[];
}

export const sendBrevoEmail = async ({ to, subject, htmlContent, attachment }: SendEmailOptions) => {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@pharmia.com';
  const SENDER_NAME = process.env.SENDER_NAME || 'PharmIA';

  if (!BREVO_API_KEY) {
    console.error("BREVO_API_KEY is not set in environment variables.");
    throw new Error("Brevo API key not configured.");
  }

  const url = 'https://api.brevo.com/v3/smtp/email';
  const headers = {
    'accept': 'application/json',
    'api-key': BREVO_API_KEY,
    'content-type': 'application/json',
  };
  const body = JSON.stringify({
    sender: { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email: to }],
    subject,
    htmlContent,
    attachment,
  });

  try {
    const response = await fetch(url, { method: 'POST', headers, body });
    const data = await response.json();

    if (!response.ok) {
      console.error("Brevo API error:", response.status, data);
      const errorMessage = (data && typeof data === 'object' && 'message' in data) 
        ? String(data.message) 
        : 'Failed to send email via Brevo.';
      throw new Error(errorMessage);
    }

    console.log("Email sent successfully via Brevo:", response.status, data);
    return data;
  } catch (error) {
    console.error("Error sending email via Brevo:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`An unknown error occurred: ${String(error)}`);
  }
};