/**
 * Transactional email service mock.
 * Prints emails to server console for local testing.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  console.log(`\n==================================================`);
  console.log(`📧 ENVIANDO EMAIL TRANSACCIONAL`);
  console.log(`Para: ${to}`);
  console.log(`Asunto: ${subject}`);
  console.log(`--------------------------------------------------`);
  // Strip HTML tags for clean console logging
  const plainText = html.replace(/<[^>]*>/g, ' ');
  console.log(plainText.trim().substring(0, 300) + '...');
  console.log(`==================================================\n`);
  return { success: true, id: 'msg_' + Math.random().toString(36).substring(7) };
}
