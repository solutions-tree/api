import { BadGatewayException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
export interface SendMessageResult { providerRef: string }
@Injectable()
export class MessageProvider {
  async sendOtp(channel: string, destination: string, code: string): Promise<SendMessageResult> {
    if ((process.env.PROVIDER_MODE ?? 'mock') === 'mock') {
      console.info(JSON.stringify({ event: 'mock_otp_sent', channel, destination: `***${destination.slice(-4)}` }));
      return { providerRef: `mock_${randomUUID()}` };
    }
    if (channel === 'WHATSAPP') return this.sendWhatsApp(destination, code);
    throw new BadGatewayException('SMS provider is not configured');
  }
  private async sendWhatsApp(destination: string, code: string): Promise<SendMessageResult> {
    const phoneId = process.env.META_PHONE_NUMBER_ID;
    const token = process.env.META_ACCESS_TOKEN;
    if (!phoneId || !token) throw new BadGatewayException('WhatsApp provider is not configured');
    const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messaging_product: 'whatsapp', to: destination.replace('+', ''), type: 'template', template: { name: process.env.META_OTP_TEMPLATE ?? 'otp_authentication', language: { code: process.env.META_TEMPLATE_LANGUAGE ?? 'en' }, components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }, { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: code }] }] } }),
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json() as { messages?: Array<{ id: string }> };
    if (!response.ok || !body.messages?.[0]) throw new BadGatewayException('WhatsApp delivery rejected');
    return { providerRef: body.messages[0].id };
  }
}
