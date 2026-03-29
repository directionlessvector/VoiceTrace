"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWhatsAppMessageViaGreenApi = sendWhatsAppMessageViaGreenApi;
async function sendWhatsAppMessageViaGreenApi(phoneNumber, message) {
    // Remove any non-digit characters and ensure it's in international format
    const cleanedNumber = phoneNumber.replace(/\D/g, '');
    const chatId = `${cleanedNumber}@c.us`;
    const url = 'https://7107.api.greenapi.com/waInstance7107567295/sendMessage/d3a010e7fe6b4bf9b0bb99f24df40c4c80cbedd0be494d83bc';
    const payload = {
        chatId: chatId,
        message: message
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });
        const textDesc = await response.text();
        let result = {};
        try {
            result = JSON.parse(textDesc);
        }
        catch {
            result = { rawText: textDesc };
        }
        if (!response.ok) {
            console.error(`HTTP error! Status: ${response.status}`, result);
            return false;
        }
        console.log('Message sent successfully:', result);
        return true;
    }
    catch (error) {
        console.error('Failed to send WhatsApp message:', error);
        return false;
    }
}
