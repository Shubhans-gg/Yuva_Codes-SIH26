from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import hashlib
import uuid
import datetime
from config import Config
from database import (
    init_db, get_all_centres, get_centre_by_id, get_all_crops,
    get_slots_for_date_and_centre, get_live_queue_for_centre, get_farmer_by_phone,
    get_farmer_by_id, save_farmer, get_booking_count_by_date, insert_booking,
    update_booking_check_in, get_booking_by_id_or_token, get_booking_by_token,
    get_desk_by_id, assign_desk_token, insert_procurement_record, create_payment_txn,
    get_procurement_by_receipt, update_payment_credited, get_farmer_bookings,
    get_admin_by_username, upsert_otp_session, get_otp_session, mark_otp_session_used,
    get_sms_logs as db_get_sms_logs, get_analytic_summary,
    upload_document_to_storage, verify_supabase_token
)


app=Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize Supabase connection verification on startup
try:
    init_db()
except Exception as e:
    print(f"Warning on startup Supabase check: {e}")

# =============================================================================
# WEB PAGES / TEMPLATE ROUTES
# =============================================================================

@app.route('/')
def landing_page():
    centres = get_all_centres()
    crops = get_all_crops()
    return render_template('landing.html', config=Config, centres=centres, crops=crops)

@app.route('/farmer/login')
def farmer_login():
    return render_template('farmer_login.html', config=Config)

@app.route('/farmer/signup')
def farmer_signup():
    return render_template('farmer_signup.html', config=Config)

@app.route('/farmer/dashboard')
def farmer_dashboard():
    centres = get_all_centres()
    crops = get_all_crops()
    return render_template('farmer_dashboard.html', config=Config, centres=centres, crops=crops)

@app.route('/admin/login')
def admin_login_page():
    return render_template('admin_login.html', config=Config)

@app.route('/admin/dashboard')
def admin_dashboard():
    centres = get_all_centres()
    crops = get_all_crops()
    return render_template('admin_dashboard.html', config=Config, centres=centres, crops=crops)


# Legacy routes — keep working for backward compatibility
@app.route('/farmer')
def farmer_portal():
    return redirect(url_for('farmer_login'))

@app.route('/admin')
def admin_portal():
    return redirect(url_for('admin_login_page'))

@app.route('/display')
def mandi_display():
    centres = get_all_centres()
    return render_template('display.html', config=Config, centres=centres)

@app.route('/receipt/<receipt_no>')
def view_receipt(receipt_no):
    proc = get_procurement_by_receipt(receipt_no)
    if not proc:
        return "Receipt not found", 404

    booking = get_booking_by_id_or_token(proc.get("booking_id")) or {}
    farmer = get_farmer_by_id(proc.get("farmer_id")) or {}
    centre = get_centre_by_id(proc.get("centre_id")) or {}

    crops = get_all_crops()
    crop = next((c for c in crops if c["id"] == proc.get("crop_id")), {})

    receipt_data = {
        **proc,
        "farmer_name": farmer.get("full_name"),
        "farmer_phone": farmer.get("phone"),
        "aadhaar_masked": farmer.get("aadhaar_masked"),
        "kisan_id": farmer.get("kisan_id"),
        "village": farmer.get("village"),
        "farmer_district": farmer.get("district"),
        "farmer_state": farmer.get("state"),
        "bank_account_no": farmer.get("bank_account_no"),
        "bank_ifsc": farmer.get("bank_ifsc"),
        "bank_name": farmer.get("bank_name"),
        "upi_id": farmer.get("upi_id"),
        "centre_name": centre.get("name"),
        "centre_address": centre.get("location_address"),
        "centre_code": centre.get("code"),
        "crop_name": crop.get("crop_name"),
        "crop_hindi": crop.get("hindi_name"),
        "crop_category": crop.get("category"),
        "booking_date": booking.get("booking_date"),
        "time_slot": booking.get("time_slot"),
        "vehicle_number": booking.get("vehicle_number")
    }

    return render_template('receipt.html', config=Config, r=receipt_data)

# =============================================================================
# REST API ENDPOINTS
# =============================================================================

# 0. Admin Password Authentication
@app.route('/api/auth/admin-login', methods=['POST'])
def admin_login_api():
    data = request.json or {}
    username = data.get('username', '').strip().lower()
    password = data.get('password', '').strip()

    if not username or not password:
        return jsonify({"success": False, "error": "Username and Password required"}), 400

    try:
        admin = get_admin_by_username(username)
    except Exception as e:
        return jsonify({"success": False, "error": f"Database Error: {str(e)}"}), 500

    if not admin:
        return jsonify({"success": False, "error": "Invalid Username and Password"}), 401

    pw_hash = hashlib.sha256(password.encode()).hexdigest()
    if admin.get("password_hash") != pw_hash:
        return jsonify({"success": False, "error": "Invalid Username or Password"}), 401

    admin_data = dict(admin)
    admin_data.pop('password_hash', None)       # for not exposing hash

    # Enrich centre details
    if admin_data.get("centre_id"):
        centre = get_centre_by_id(admin_data['centre_id'])
        if centre:
            admin_data['centre_name'] = centre.get(name)

    return jsonify({"success": True, "admin": admin_data, message: "Login successful"})

# 1. Authentication Endpoints (Farmer Mobile OTP via Fast2SMS)

@app.route('/api/auth/send-otp', methods = ['POST'])
def send_otp():
    data = request.json or {}
    phone = data.get('phone', '').strip()
    if not phone or len(phone) < 10:
        return jsonify({"success": False, "error": "Please enter a valid 10-digit monile number"}), 400

    if phone in ['9876543210', '9812345678', '9425123456']:
        otp = '1234'
    else:
        # otp from fast2sms
        pass
        
    expiry_time = (datetime.datetime.now() + datetime.timedelta(minutes=Config.OTP_EXPIRY_MINUTES)).isoformat()

    try:
        upsert_otp_session(phone, otp, expiry_time)
    except Exception as e:
        print(f"Failed to store OTP session in Supabase: {e}")

    farmer = get_farmer_by_phone(phone)
    farmer_name = farmer["full_name"] if farmer else "Farmer"

    # SEND SMS NOTIFICATION 
    sms_res = send_sms(
        phone=phone,
        recipient_name=farmer_name,
        notification_type='booking_confirm',
        name=farmer_name,
        centre_name="SmartProcure Portal",
        date=datetime.date.today().isoformat(),
        slot="OTP Verification",
        token=f"OTP: {otp}",
        track_url="/"
    )

    return jsonify({
        "success": True,
        "message": f"OTP sent successfully to +91 {phone}",
        "demo_otp": otp,
        "is_registered": bool(farmer),
        "sms_status": sms_res.get('status')
    })

@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    data = request.json or {}
    phone = data.get('phone','').strip()
    otp = data.get('otp','').strip()

    if not phone or not otp:
        return jsonify({"success": False, "error": "Phone and OTP are required"}), 400

    # Demo hardcoded bypasses
    is_valid = False
    if otp=='7469' and phone in ['9876543210', '9812345678', '9425123456']:
        is_valid = True

    else:
        try:
            session = get_otp_session(phone)
            if session and not session.get("used"):
                expires_at = session.get("expires_at")
                if expires_at and datetime.datetime.fromisoformat(expires_at) >= datetime.datetime.now():
                    if session.get('otp_code') == otp:
                        is_valid = True
                        mark_otp_session_used(phone)

        except Exception as e:
            print(f"Error checking OTP session: {e}")

    if not is_valid:
        return jsonify({"success": False, "error": "Incorrect OTP"}), 400

    farmer = get_farmer_by_phone(phone)
    if farmer:
        return jsonify({"success": True, "farmer": farmer, "is_new": False})
    else:
        return jsonify({"success": True, "phone": phone, "is_new": True})

# SUPABASE STORAGE FILE UPLOAD
@app.route('/api/storage/upload', methods=['POST'])
def storage_upload():
    if 'file' not request.files:
        return jsonify({"success": False, "error": "No file attached in request"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "error": "No file selected"}), 400

    folder = request.form.get('folder', 'documents')
    try:
        file_bytes = file.read()
        public_url = upload_document_to_storage(
            file_bytes=file_bytes,
            filename=file.filename,
            content_type=file.content_type or "application/octet-stream"
            folder=folder
        )
        return jsonify({
            "success": True,
            "url": public_url,
            "filename": file.filename,
            "message": "File uploaded successfully"
        })
    except Exception as e:
        return jsonify({"success": False, "error": f"Upload failed: {str(e)}"}), 500


@app.route('/api/auth/farmer/login', methods=['POST'])
def farmer_login_direct():
    data = request.json or {}
    phone = data.get('phone', '').strip()
    email = data.get('email', '').strip()
    token = data.get('access_token', '').strip()
    
    # If Supabase Auth token provided, verify it
    if token:
        user = verify_supabase_token(token)
        if user and user.user_metadata:
            phone = user.user_metadata.get('phone', phone)
            email = user.email or email
            
    if not phone and not email:
        return jsonify({"success": False, "error": "Phone or email required"}), 400
        
    farmer = get_farmer_by_phone(phone) if phone else None

    if farmer:
        return jsonify({"success": True, "farmer"=farmer, "message": "Farmer authenticated successfully"})
    return jsonify({"success":False, "error": "Farmer profile not found. Please register."}), 404

@app.route('/api/auth/register-farmer', methods=['POST'])
def register_farmer():
    data = request.json or {}
    phone = data.get('phone', '').strip()
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip()
    aadhaar = data.get('aadhaar', '').strip()
    state = data.get('state', 'Haryana').strip()
    district = data.get('district', 'Karnal').strip()
    village = data.get('village', '').strip()
    bank_account_no = data.get('bank_account_no', '').strip()
    bank_ifsc = data.get('bank_ifsc', '').strip()
    bank_name = data.get('bank_name', 'State Bank of India').strip()
    upi_id = data.get('upi_id', '').strip()
    document_url = data.get('document_url', '').strip()

    if not phone or not full_name:
        return jsonify({"success": False, "error": "Phone number and Name are required"}), 400

    existing = get_farmer_by_phone(phone)
    if existing:
        farmer_id = existing['id']
        kisan_id = existing.get('kisan_id')
        masked_aadhaar = existing.get('aadhaar_masked')
        created_at = existing.get('created_at')
        doc_url = document_url or existing.get('document_url')

    else:
        farmer_id = f"FARMER-{uuid.uuid4().hex[:8].upper()}"
        kisan_id = f"KISAN-{state[:2].upper()}-2026-{uuid.uuid4().hex[:5].upper()}"
        masked_aadhaar = f"XXXX-XXXX-{aadhaar[-4:]}"
        created_at = datetime.datetime.now().isoformat()
        doc_url = document_url

    f = {
        "id": farmer_id,
        "phone": phone,
        "email": email or f"farmer_{phone}@smartprocure.in",
        "full_name": full_name,
        "aadhaar_masked": masked_aadhaar,
        "kisan_id": kisan_id,
        "state": state,
        "district": district,
        "village": village,
        "bank_account_no": bank_account_no,
        "bank_ifsc": bank_ifsc,
        "bank_name": bank_name,
        "upi_id": upi_id,
        "document_url": doc_url,
        "created_at": created_at
    }

    try:
        save_farmer(f)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save farmer: {str(e)}"}), 500

    return jsonify({"success": True, "farmer": f, "message": "Farmer registered successfully"})


# 2. Reference Catalogs (Centres & MSP Crops)
@app.route('/api/centres', methods=['GET'])
def list_centres():
    centres = get_all_centres()
    return jsonify({"success": True, "centres": centres})

@app.route('/api/crops', methods=['GET'])
def list_crops():
    crops = get_all_crops()
    return jsonify({"success": True, "crops": crops})


# 3. Dynamic Slots & Capacity
@app.route('/api/slots', methods=['GET'])
def get_slots():
    centre_id = request.args.get('centre_id')
    booking_date = request.args.get('date', datetime.date.today().isoformat())

    if not centre_id:
        return jsonify({"success": False, "error": "centre_id is required"}), 400

    slots = get_slots_for_date_and_centre(centre_id, date_str)
    return jsonify({"success": True, "centre_id": centre_id, "date": date_str, "slots": slots})


# 4. Slot Booking & Token Allocation
@app.route('/api/bookings', methods=['POST'])
def create_booking():
    data = request.json or {}
    farmer_id = data.get('farmer_id')
    centre_id = data.get('centre_id')
    crop_id = data.get('crop_id')
    booking_date = data.get('booking_date', datetime.date.today().isoformat())
    time_slot = data.get('time_slot')
    estimated_qty = float(data.get('estimated_quantity_quintals', 20.0))
    vehicle_no = data.get('vehicle_number', 'TRACTOR-TROLLEY')

    if not farmer_id or not centre_id or not crop_id or not time_slot:
        return jsonify({"success": False, "error": "Missing required booking details"}), 400

    farmer = get_farmer_by_id(farmer_id)
    centre = get_centre_by_id(centre_id)

    crops = get_all_crops()
    crop = next((c for c in crops if c['id'] == crop_id), None)

    if not farmer or not centre or not crop:
        return jsonify({"success": False, "error": "Farmer, Centre or Crop record not found"}), 404

    token_count = get_booking_count_by_date(centre_id, booking_date)+1
    token_number = f""

if __name__ == '__main__':
    print(f"Starting SMARTPROCURE Platform on port {Config.PORT}...")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)