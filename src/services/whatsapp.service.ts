import axios from 'axios'
import { supabase } from '../lib/supabase-server'
import { config } from '../config/server'

interface MaytapiWebhookPayload {
    From: string
    To: string
    Body: string
    MessageSid: string
    MediaUrl0?: string
    [key: string]: string | undefined
}

class WhatsAppServiceClass {
    private INSTANCE_URL: string
    private PRODUCT_ID: string
    private API_TOKEN: string
    private initialized: boolean = false

    constructor() {
        if (!config.maytapi?.productId || !config.maytapi?.apiToken) {
            throw new Error('Missing maytapi configuration')
        }

        this.PRODUCT_ID = config.maytapi.productId
        this.API_TOKEN = config.maytapi.apiToken
        this.INSTANCE_URL = 'https://api.maytapi.com/api'
    }

    initialize() {
        if (!this.PRODUCT_ID || !this.API_TOKEN) {
            throw new Error('Missing maytapi credentials')
        }
        this.initialized = true
    }

    isInitialized(): boolean {
        return this.initialized
    }

    private formatPhoneNumber(number: string): string {
        if (!number.startsWith('+')) {
            number = `+${number}`
        }
        return number
    }

    // async getPhoneIdFromContact(toNumber: string) {
    //   // Remove the "+" if present for consistent comparison with stored phone numbers
    //   const cleanedNumber = toNumber.startsWith('+') ? toNumber.substring(1) : toNumber;

    //   const { data: contact, error } = await supabase
    //     .from('contacts')
    //     .select('metadata')
    //     .eq('phone', cleanedNumber)
    //     .single();

    //   if (error) {
    //     console.error('Error fetching contact for phone ID:', error);
    //     throw new Error(`Contact not found for number ${toNumber}`);
    //   }

    //   if (!contact?.metadata?.phoneId) {
    //     console.error('No phoneId found in contact metadata:', contact);
    //     throw new Error(`No phoneId found in metadata for number ${toNumber}`);
    //   }

    //   return contact.metadata.phoneId.toString();
    // }

    async sendMessage(
        to: string,
        content: string,
        phoneId: string,
        mediaUrl?: string
    ) {
        if (!this.isInitialized()) {
            this.initialize()
        }

        try {
            const toNumber = this.formatPhoneNumber(to)
            const PHONE_ID = phoneId

            const body = {
                to_number: toNumber,
                message: mediaUrl || content,
                ...(mediaUrl
                    ? { text: content || '', type: 'media' }
                    : { type: 'text' }),
            }

            const url = `${this.INSTANCE_URL}/${this.PRODUCT_ID}/${PHONE_ID}/sendMessage`
            const response = await axios.post(url, body, {
                headers: {
                    'Content-Type': 'application/json',
                    'x-maytapi-key': this.API_TOKEN,
                },
            })
            if (response.data.success) {
                const messageId =
                    response.data.messageId || `maytapi_${Date.now()}`
                await supabase.from('messages').insert({
                    message_sid: messageId,
                    from_number: PHONE_ID,
                    to_number: toNumber,
                    content,
                    media_url: mediaUrl || null,
                    direction: 'outbound',
                    status: 'sent',
                })
                return { success: true, messageId }
            }
        } catch (error) {
            console.error('Error sending WhatsApp message:', error)
            throw error
        }
    }

    // async handleWebhook(payload: MaytapiWebhookPayload, phoneId: string) {
    //   if (!payload.messageId || !payload.from) {
    //     console.error("Invalid Maytapi webhook payload:", payload);
    //     return { success: false };
    //   }

    //   // Get the phone ID associated with the recipient (to number)
    //   const toNumber = payload.to || "";
    //   let PHONE_ID;

    //   try {
    //     // PHONE_ID = await this.getPhoneIdFromContact(toNumber);
    //     PHONE_ID = phoneId;
    //   } catch (error) {
    //     console.error(
    //       "Error getting phone ID from contact, using default fallback:",
    //       error
    //     );
    //     PHONE_ID = config.maytapi.phoneId;
    //   }

    //   const formattedPayload = {
    //     MessageSid: payload.MessageSid,
    //     From: `whatsapp:${payload.from}`,
    //     To: `whatsapp:${toNumber}`,
    //     Body: payload.text || "",
    //     MediaUrl0: payload.image || null,
    //   };

    //   await supabase.from("messages").insert({
    //     message_sid: formattedPayload.MessageSid,
    //     from_number: formattedPayload.From.replace("whatsapp:", ""),
    //     to_number: formattedPayload.To.replace("whatsapp:", ""),
    //     content: formattedPayload.Body,
    //     media_url: formattedPayload.MediaUrl0,
    //     direction: "inbound",
    //     status: "received",
    //   });

    //   return { success: true };
    // }
}

export const WhatsAppService = new WhatsAppServiceClass()
