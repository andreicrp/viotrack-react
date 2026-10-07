/**
 * iProgSMS / iProgTech SMS Gateway Service Integration
 * Configured with live endpoint and credentials from viotrack1
 */

export const smsService = {
  // Sanitize phone number to standard format
  sanitizePhoneNumber(phone) {
    if (!phone) return '';
    return phone.replace(/[^\d+]/g, '').trim();
  },

  async sendSMS({ recipientNumber, recipientName, studentName, violationTitle, customMessage = null }) {
    const apiToken = import.meta.env.VITE_IPROGSMS_API_TOKEN || '';
    const apiEndpoint = import.meta.env.VITE_IPROGSMS_ENDPOINT || 'https://sms.iprogtech.com/api/v1/sms_messages';
    const senderName = import.meta.env.VITE_IPROGSMS_SENDER_NAME || 'PHCM VioTrack';

    const sanitizedPhone = this.sanitizePhoneNumber(recipientNumber);
    const textMessage = customMessage || 
      `PHCM VioTrack: Hi ${recipientName || 'Guardian'}, this is to inform you that ${studentName} has received a record for: ${violationTitle}. Please contact the school guidance office for details.`;

    if (!sanitizedPhone) {
      return {
        success: false,
        isLive: false,
        error: 'Missing or invalid phone number',
        message: textMessage
      };
    }

    try {
      // Build form-urlencoded payload matching iprogtech API specifications
      const payload = new URLSearchParams({
        api_token: apiToken,
        phone_number: sanitizedPhone,
        message: textMessage,
        sender_id: senderName
      });

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        body: payload.toString()
      });

      const result = await response.json().catch(() => null);

      if (response.ok && (!result || (result.status !== 'error' && result.success !== false))) {
        return {
          success: true,
          isLive: true,
          provider: 'iProgTech SMS Gateway',
          recipient: sanitizedPhone,
          message: textMessage,
          response: result
        };
      } else {
        console.warn('iProgTech SMS API error response:', result);
        return {
          success: false,
          isLive: true,
          provider: 'iProgTech SMS Gateway',
          error: result?.message || `HTTP ${response.status}`,
          recipient: sanitizedPhone,
          message: textMessage
        };
      }
    } catch (err) {
      console.error('iProgTech SMS Network Error:', err);
      return {
        success: false,
        isLive: true,
        provider: 'iProgTech SMS Gateway',
        error: err.message,
        recipient: sanitizedPhone,
        message: textMessage
      };
    }
  }
};
