import os
from dotenv import load_dotenv

load_dotenv()   # reads variables from a .env file and sets them in os.environ

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'smartprocure-sih-2026-yuva-codes-key-9921')
    DEBUG      = os.getenv('FLASK_DEBUG', 'True').lower() in ('true', '1', 'yes')
    PORT       = int(os.getenv('PORT', 5000))
    HOST       = os.getenv('HOST', '0.0.0.0')
    
    # Supabase (required — no SQLite fallback)
    SUPABASE_URL              = os.getenv('SUPABASE_URL', '')
    SUPABASE_KEY              = os.getenv('SUPABASE_KEY', '')
    SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

    # Fast2SMS API (for real SMS in India)
    # Get your key at: https://www.fast2sms.com → Dev API
    FAST2SMS_API_KEY = os.getenv('FAST2SMS_API_KEY', '')

    # OTP expiry (minutes)
    OTP_EXPIRY_MINUTES = int(os.getenv('OTP_EXPIRY_MINUTES', 10))

    # App Metadata
    APP_NAME     = "SMARTPROCURE"
    APP_TAGLINE  = "Digital Procurement Queue & Status Platform"
    SIH_PS_ID    = "26032"
    SIH_YEAR     = "2026"
    TEAM_NAME    = "Yuva Codes"
    ORGANIZATION = "Ministry of Consumer Affairs, Food & Public Distribution"
    DEPARTMENT   = "Department of Consumer Affairs (DoCA)"
  