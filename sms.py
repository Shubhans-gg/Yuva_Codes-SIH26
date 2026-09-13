"""
SMARTPROCURE — SMS Service
Real SMS delivery via Fast2SMS API (India)
Falls back to console logging if API key is not set.
"""

import uuid
import datetime
import requests 
from config import Config 
 
# SMS templates (bilingual)
TEMPLATES = {
    'booking_confirm': {
        'en': "Namaste {name}! Your procurement slot CONFIRMED at {centre_name}. Date: {date}, Time: {slot}. Token: {token}. Please arrive on time. - DoCA SmartProcure",
        'hi': "नमस्ते {name}! {centre_name} पर आपका स्लॉट कन्फर्म। दिनांक: {date}, समय: {slot}। टोकन: {token}। - DoCA SmartProcure"
    },
    'slot_reminder': {
        'en': "Reminder: Procurement slot today at {slot} — {centre_name}. Token: {token}. - DoCA SmartProcure",
        'hi': "अनुस्मारक: आज {slot} — {centre_name} पर खरीद स्लॉट। टोकन: {token}। - DoCA SmartProcure"
    },
    'queue_checkin': {
        'en': "Check-in Successful! Token {token} is #{position} in queue. Est. wait: ~{wait_time} mins. Please wait in the farmer lounge. - DoCA SmartProcure",
        'hi': "चेक-इन सफल! टोकन {token}, कतार में स्थान #{position}। अनुमानित प्रतीक्षा: ~{wait_time} मिनट। कृपया किसान लाउंज में प्रतीक्षा करें। - DoCA SmartProcure"
    },
    'token_called': {
        'en': "ALERT: Token {token} ({name}) — please proceed to {desk_name} immediately for weighment & verification. - DoCA SmartProcure",
        'hi': "अलर्ट: टोकन {token} ({name}) — कृपया वज़न और सत्यापन के लिए तुरंत {desk_name} पर जाएँ।। - DoCA SmartProcure"
    },
    'weighment_done': {
        'en': "Weighment Done! Token {token}. Crop: {crop}, Net: {net_weight} Qtl, Grade: {grade}. Total Payable: Rs.{amount}. Receipt: {receipt_no}. - DoCA SmartProcure",
        'hi': "तौल पूर्ण! टोकन {token}। {crop}, {net_weight} क्विंटल, ग्रेड: {grade}। देय: रु.{amount}। रसीद: {receipt_no}। - DoCA SmartProcure"
    },
    'dbt_credited': {
        'en': "SUCCESS! Rs.{amount} for {crop} credited to your bank via DBT/PFMS. UTR: {utr}. Receipt: {receipt_no}. Thank you! - DoCA SmartProcure",
        'hi': "सफलता! {crop} हेतु रु.{amount} DBT/PFMS से आपके बैंक में भेजे गए। UTR: {utr}। रसीद: {receipt_no}। धन्यवाद! - DoCA SmartProcure"
    }
}

def _format_message(notification_type: str, lang: str = 'en', **kwargs) -> str:
    tpl = TEMPLATES.get(notification_type, {}).get(lang) or \
          TEMPLATES.get(notification_type, {}).get('en', '')

    try:
        return tpl.format(**kwargs)
    except KeyError:
        return tpl

from concurrent.futures import ThreadPoolExecutor
_sms_pool = ThreadPoolExecutor(max_workers=5)

def _send_via_fast2sms(phone: str, message: str) -> dict:
    """
    Sends SMS via Fast2SMS Quick SMS API.
    Docs: https://docs.fast2sms.com/
    """
    api_key = Config.FAST2SMS_API_KEY
    if not api_key:
        print(f"[SMS MOCK] To: +91 {phone}\n{message}\n")
        return {"status": "mock", "message": "SMS logged (no api key set)"}

    try:
        resp = requests.post(
            "https://www.fast2sms.com/dev/bulkV2",
            headers={"authorization": api_key},
            json={
                "route": "q",           # 'q' = Quick SMS (no DLT required for demo)
                "message": message,
                "language": "english",
                "flash": 0,
                "numbers": phone
            },
            timeout=3
        )
        result = resp.json()
        if result.get("return") is True:
            return {"status": "sent", "message_ids": result.get("message_id", [])}
        else:
            print(f"[SMS ERROR] Fast2SMS: {result}")
            return {"status": "failed", "error": "str(result)"}

    except Exception as e:
            print(f"[SMS ERROR] Fast2SMS request failed: {e}")
            return {'status': 'error', 'error': str(e)}

def send_sms(phone: str, recipient_name: str, notification_type: str, lang: str='en', **kwargs) -> dict:
    message = _format_message(notification_type, lang=lang, **kwargs)
    sms_id = f"SMS-{uuid.uuid4().hex[:8].upper()}"
    sent_at = datetime.datetime.now().isoformat()

    def _async_send_and_log():
        delivery = _send_via_fast2sms(phone, message)
        try:
            from database import log_sms
            log_sms({
                "id":                sms_id,
                "phone":             phone,
                "recipient_name":    recipient_name,
                "notification_type": notification_type,
                "message_content":   message,
                "status":            delivery.get("status", "unknown"),
                "sent_at":           sent_at
            })
        except Exception as e:
            print(f"SMS audit log failed: {e}")

    _sms_pool.submit(_async_send_and_log)

    return {
        "sms_id":            sms_id,
        "phone":             phone,
        "recipient_name":    recipient_name,
        "notification_type": notification_type,
        "message":           message,
        "status":            "dispatched",
        "sent_at":           sent_at
    }

class SMSService:
    TEMPLATES = TEMPLATES

    @classmethod
    def send_sms(cls, db_conn_ignored, phone, recipient_name, notification_type, lang='en', **kwargs):
        return send_sms(phone, recipient_name, notification_type, lang=lang, **kwargs)

    @classmethod
    def format_message(cls, notification_type, lang='en', **kwargs):
        return _format_message(notification_type, lang=lang, **kwargs)