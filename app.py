from flask import Flask, render_template, request, jsonify, redirect, url_for, Response
from flask_cors import CORS
import hashlib
import uuid
import datetime
import random
import json
import time
from config import Config
from sms import send_sms
from database import (
    init_db, get_all_centres, get_centre_by_id, get_all_crops,
    get_slots_for_date_and_centre, get_live_queue_for_centre, get_farmer_by_phone,
    get_farmer_by_id, save_farmer, get_booking_count_by_date, get_next_token_number, insert_booking,
    update_booking_check_in, get_booking_by_id_or_token, get_booking_by_token,
    get_desk_by_id, assign_desk_token, insert_procurement_record, create_payment_txn,
    get_procurement_by_receipt, update_payment_credited, get_farmer_bookings,
    get_admin_by_username, upsert_otp_session, get_otp_session, mark_otp_session_used,
    get_sms_logs as db_get_sms_logs, get_analytic_summary, get_nearest_centres,
    verify_supabase_token, cancel_farmer_booking
)


app = Flask(__name__)
app.config.from_object(Config)
CORS(app)

# Initialize Supabase connection & storage on startup
try:
    init_db()
except Exception as e:
    print(f"Warning on startup Supabase check: {e}")

# =============================================================================
# WEB PAGES / TEMPLATE ROUTES
# =============================================================================

def sort_crops_featured_first(crops_list):
    def rank(c):
        name = (c.get('crop_name') or '').lower()
        cid = c.get('id', '')
        if 'wheat' in name or cid == 'CROP-01':
            return 0
        if ('paddy' in name or 'rice' in name) and ('common' in name or 'grade' not in name) or cid == 'CROP-04':
            return 1
        if ('paddy' in name or 'rice' in name) and 'grade' in name or cid == 'CROP-05':
            return 2
        if 'gram' in name or 'chana' in name or cid == 'CROP-02':
            return 3
        if 'arhar' in name or 'tur' in name or cid == 'CROP-11':
            return 4
        if 'moong' in name or cid == 'CROP-12':
            return 5
        if 'urad' in name or cid == 'CROP-13':
            return 6
        if 'bajra' in name or cid == 'CROP-08':
            return 7
        return 10
    return sorted(crops_list, key=lambda c: (rank(c), c.get('crop_name', '')))

@app.route('/')
def landing_page():
    centres = get_all_centres()
    crops = sort_crops_featured_first(get_all_crops())
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
        "time_slot": booking.get("time_slot")
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
            admin_data['centre_name'] = centre.get('name')

    return jsonify({"success": True, "admin": admin_data, "message": "Login successful"})

# 1. Authentication Endpoints (Farmer Mobile OTP via Fast2SMS)

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    data = request.json or {}
    phone = data.get('phone', '').strip()
    if not phone or len(phone) < 10:
        return jsonify({"success": False, "error": "Please enter a valid 10-digit mobile number"}), 400

    if phone in ['9876543210', '9812345678', '9425123456']:
        otp = '1234'
    else:
        otp = str(random.randint(1000, 9999))

    expiry_time = (datetime.datetime.now() + datetime.timedelta(minutes=Config.OTP_EXPIRY_MINUTES)).isoformat()

    try:
        upsert_otp_session(phone, otp, expiry_time)
    except Exception as e:
        print(f"Failed to store OTP session: {e}")

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
    phone = data.get('phone', '').strip()
    otp = str(data.get('otp', '')).strip()

    if not phone or not otp:
        return jsonify({"success": False, "error": "Phone and OTP are required"}), 400

    is_valid = False
    if otp in ['1234', '7469'] and phone in ['9876543210', '9812345678', '9425123456']:
        is_valid = True
    else:
        try:
            session = get_otp_session(phone)
            if session and not session.get("used"):
                session_otp = str(session.get("otp_code", "")).strip()
                if session_otp == otp:
                    expires_at = session.get("expires_at")
                    if expires_at:
                        try:
                            exp_str = str(expires_at).replace('Z', '+00:00')
                            exp_dt = datetime.datetime.fromisoformat(exp_str)
                            now = datetime.datetime.now(exp_dt.tzinfo) if exp_dt.tzinfo else datetime.datetime.now()
                            if exp_dt >= now:
                                is_valid = True
                            else:
                                print(f"[OTP EXPIRED] Expired at {exp_dt}")
                        except Exception as dt_err:
                            print(f"[OTP DT PARSE ERROR] {dt_err}")
                            is_valid = True
                    else:
                        is_valid = True

                    if is_valid:
                        mark_otp_session_used(phone)

        except Exception as e:
            print(f"[VERIFY OTP ERROR] {e}")

    if not is_valid:
        return jsonify({"success": False, "error": "Incorrect or expired OTP"}), 400

    farmer = get_farmer_by_phone(phone)
    if farmer:
        return jsonify({"success": True, "farmer": farmer, "is_new": False})
    else:
        return jsonify({"success": True, "phone": phone, "is_new": True})

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
        return jsonify({"success": True, "farmer": farmer, "message": "Farmer authenticated successfully"})
    return jsonify({"success": False, "error": "Farmer profile not found. Please register."}), 404

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

    if not phone or not full_name:
        return jsonify({"success": False, "error": "Phone number and Name are required"}), 400

    existing = get_farmer_by_phone(phone)
    if existing:
        farmer_id = existing['id']
        kisan_id = existing.get('kisan_id')
        masked_aadhaar = existing.get('aadhaar_masked') or (f"XXXX-XXXX-{aadhaar[-4:]}" if aadhaar else "XXXX-XXXX-0000")
        created_at = existing.get('created_at')
    else:
        farmer_id = f"FARMER-{uuid.uuid4().hex[:8].upper()}"
        kisan_id = f"KISAN-{state[:2].upper()}-2026-{uuid.uuid4().hex[:5].upper()}"
        masked_aadhaar = f"XXXX-XXXX-{aadhaar[-4:]}" if aadhaar else "XXXX-XXXX-0000"
        created_at = datetime.datetime.now().isoformat()

    f = {
        "id": farmer_id,
        "phone": phone,
        "email": email or f"farmer_{phone}@smartprocure.in",
        "full_name": full_name,
        "aadhaar": aadhaar,
        "aadhaar_masked": masked_aadhaar,
        "kisan_id": kisan_id,
        "state": state,
        "district": district,
        "village": village,
        "bank_account_no": bank_account_no,
        "bank_ifsc": bank_ifsc,
        "bank_name": bank_name,
        "upi_id": upi_id,
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

@app.route('/api/centres/nearest', methods=['GET'])
def list_nearest_centres():
    lat = request.args.get('lat')
    lng = request.args.get('lng')
    crop_id = request.args.get('crop_id')

    if not lat or not lng:
        return jsonify({"success": False, "error": "lat and lng parameters are required"}), 400

    try:
        nearest = get_nearest_centres(float(lat), float(lng), crop_id=crop_id)
        return jsonify({
            "success": True,
            "centres": nearest,
            "user_location": {"lat": float(lat), "lng": float(lng)}
        })
    except ValueError:
        return jsonify({"success": False, "error": "Invalid lat or lng values"}), 400
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

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

    slots = get_slots_for_date_and_centre(centre_id, booking_date)
    return jsonify({"success": True, "centre_id": centre_id, "date": booking_date, "slots": slots})

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

    if not farmer_id or not centre_id or not crop_id or not time_slot:
        return jsonify({"success": False, "error": "Missing required booking details"}), 400

    farmer = get_farmer_by_id(farmer_id)
    centre = get_centre_by_id(centre_id)

    crops = get_all_crops()
    crop = next((c for c in crops if c['id'] == crop_id), None)

    if not farmer or not centre or not crop:
        return jsonify({"success": False, "error": "Farmer, Centre or Crop record not found"}), 404

    today_str = datetime.date.today().isoformat()
    if booking_date < today_str:
        return jsonify({"success": False, "error": "Cannot book slots for a past date"}), 400

    if booking_date == today_str and time_slot:
        parts = time_slot.split('–') if '–' in time_slot else time_slot.split('-')
        if len(parts) >= 2:
            end_str = parts[1].strip()
            try:
                end_time = datetime.datetime.strptime(end_str, "%I:%M %p").time()
                if datetime.datetime.now().time() >= end_time:
                    return jsonify({"success": False, "error": "This time slot has already passed for today"}), 400
            except ValueError:
                pass

    token_number = get_next_token_number(centre_id, booking_date)
    booking_id = f"BOOK-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.datetime.now().isoformat()

    b = {
        "id": booking_id,
        "token_number": token_number,
        "farmer_id": farmer_id,
        "centre_id": centre_id,
        "crop_id": crop_id,
        "booking_date": booking_date,
        "time_slot": time_slot,
        "estimated_quantity_quintals": estimated_qty,
        "booking_status": "booked",
        "created_at": now_iso
    }

    try:
        insert_booking(b)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to save booking: {str(e)}"}), 500

    sms_res = send_sms(
        phone=farmer['phone'],
        recipient_name=farmer['full_name'],
        notification_type='booking_confirm',
        name=farmer['full_name'],
        centre_name=centre['name'],
        date=booking_date,
        slot=time_slot,
        token=token_number,
        track_url=f"/#track?token={token_number}"
    )

    b['farmer_name'] = farmer['full_name']
    b['farmer_phone'] = farmer['phone']
    b['centre_name'] = centre['name']
    b['crop_name'] = crop['crop_name']

    return jsonify({
        "success": True,
        "message": f"Slot booked successfully! Token {token_number} generated.",
        "booking": b,
        "sms_sent": sms_res
    })


# 5. Farmer Check-in (Arrive at Procurement Centre)
@app.route('/api/bookings/<booking_id>/check-in', methods=['POST'])
def farmer_check_in(booking_id):
    booking = get_booking_by_id_or_token(booking_id)
    if not booking:
        return jsonify({"success": False, "error": "Booking not found"}), 404

    now_iso = datetime.datetime.now().isoformat()
    try:
        update_booking_check_in(booking['id'], now_iso)
    except Exception as e:
        return jsonify({"success": False, "error": f"Check-in failed: {str(e)}"}), 500

    live_info = get_live_queue_for_centre(booking['centre_id'])
    queue_pos = live_info.get("total_active_in_queue", 1)
    estimated_wait = max(2, (queue_pos - 1) * 12)

    sms_res = send_sms(
        phone=booking['farmer_phone'],
        recipient_name=booking['farmer_name'],
        notification_type='queue_checkin',
        token=booking['token_number'],
        position=queue_pos,
        wait_time=estimated_wait
    )

    return jsonify({
        "success": True,
        "message": f"Check-in successful! You are #{queue_pos} in line.",
        "queue_position": queue_pos,
        "estimated_wait_minutes": estimated_wait,
        "token_number": booking['token_number'],
        "sms_sent": sms_res
    })


# 5b. Farmer Booking Cancellation / Deletion (Before Check-In Only)
@app.route('/api/bookings/<booking_id>/cancel', methods=['POST', 'DELETE'])
def cancel_farmer_booking_route(booking_id):
    data = request.get_json(silent=True) or {}
    farmer_phone = data.get('farmer_phone') or request.args.get('phone')

    success, message = cancel_farmer_booking(booking_id, farmer_phone)
    if success:
        return jsonify({"success": True, "message": message})
    else:
        return jsonify({"success": False, "error": message}), 400


# 6. Live Queue State
@app.route('/api/queue/live', methods=['GET'])
def live_queue():
    centre_id = request.args.get('centre_id', 'CENTRE-01')
    try:
        queue_data = get_live_queue_for_centre(centre_id)
        return jsonify({"success": True, "data": queue_data})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# 7. Operator Actions: Call Next Token to Counter
@app.route('/api/admin/call-next', methods=['POST'])
def call_next_token():
    data = request.json or {}
    centre_id = data.get('centre_id', 'CENTRE-01')
    desk_id = data.get('desk_id', 'DESK-01')
    token_number = data.get('token_number')

    desk = get_desk_by_id(desk_id)
    if not desk:
        return jsonify({"success": False, "error": "Counter Desk not found"}), 404

    now_iso = datetime.datetime.now().isoformat()

    if not token_number:
        live_info = get_live_queue_for_centre(centre_id)
        waiting = [b for b in live_info.get('queue', []) if b.get('booking_status') == 'checked_in']
        if not waiting:
            return jsonify({"success": False, "error": "No checked-in farmers waiting in queue"}), 400
        target_booking = waiting[0]
    else:
        target_booking = get_booking_by_token(token_number)
        if not target_booking:
            return jsonify({"success": False, "error": "Specified booking token not found"}), 404

    tok_num = target_booking['token_number']

    try:
        assign_desk_token(target_booking['id'], tok_num, desk_id, now_iso)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to assign desk: {str(e)}"}), 500

    farmer = get_farmer_by_id(target_booking['farmer_id'])
    sms_res = None
    if farmer:
        sms_res = send_sms(
            phone=farmer['phone'],
            recipient_name=farmer['full_name'],
            notification_type='token_called',
            token=tok_num,
            name=farmer['full_name'],
            desk_name=desk.get('desk_name', f"Counter {desk.get('desk_number')}")
        )

    return jsonify({
        "success": True,
        "message": f"Token {tok_num} called to {desk.get('desk_name')}",
        "token_number": tok_num,
        "desk": desk,
        "sms_sent": sms_res
    })


# 8. Procurement Recording & Quality Assessment (J-Form Generation)
@app.route('/api/procurement/record', methods=['POST'])
def record_procurement_api():
    data = request.json or {}
    token_number = data.get('token_number')
    gross_weight_kg = float(data.get('gross_weight_kg', 0.0))
    tare_weight_kg = float(data.get('tare_weight_kg', 0.0))
    moisture_pct = float(data.get('moisture_percentage', 12.0))
    quality_grade = data.get('quality_grade', 'Grade A')
    operator_notes = data.get('operator_notes', 'Verified grain quality and weight.')
    verified_by = data.get('verified_by', 'S. K. Sharma (Procurement Officer)')

    if not token_number or gross_weight_kg <= 0 or tare_weight_kg < 0:
        return jsonify({"success": False, "error": "Valid token and weight measurements required"}), 400

    net_weight_kg = max(0.0, gross_weight_kg - tare_weight_kg)
    net_weight_quintals = round(net_weight_kg / 100.0, 3)

    booking = get_booking_by_token(token_number)
    if not booking:
        return jsonify({"success": False, "error": "Booking record not found for this token"}), 404

    base_msp = float(booking.get('msp_rate_per_quintal', 2425.0))
    max_moisture = 12.0
    moisture_penalty = 0.0
    if moisture_pct > max_moisture:
        moisture_penalty = round((moisture_pct - max_moisture) * 40.0, 2)

    grade_bonus = 50.0 if quality_grade == 'Grade A' else 0.0
    effective_rate = round(base_msp + grade_bonus - moisture_penalty, 2)
    total_payable = round(net_weight_quintals * effective_rate, 2)

    receipt_number = f"DOCA-JFORM-2026-{uuid.uuid4().hex[:6].upper()}"
    procurement_id = f"PROC-{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.datetime.now().isoformat()

    p = {
        "id": procurement_id,
        "booking_id": booking['id'],
        "token_number": token_number,
        "farmer_id": booking['farmer_id'],
        "centre_id": booking['centre_id'],
        "crop_id": booking['crop_id'],
        "gross_weight_kg": gross_weight_kg,
        "tare_weight_kg": tare_weight_kg,
        "net_weight_kg": net_weight_kg,
        "net_weight_quintals": net_weight_quintals,
        "moisture_percentage": moisture_pct,
        "quality_grade": quality_grade,
        "base_msp_per_quintal": base_msp,
        "moisture_penalty_per_quintal": moisture_penalty,
        "grade_bonus_per_quintal": grade_bonus,
        "effective_rate_per_quintal": effective_rate,
        "total_payable_amount": total_payable,
        "receipt_number": receipt_number,
        "operator_notes": operator_notes,
        "verified_by": verified_by,
        "created_at": now_iso
    }

    try:
        insert_procurement_record(p, booking['id'], booking.get('assigned_desk_id'), now_iso)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to record procurement: {str(e)}"}), 500

    # Initiate DBT Payment txn
    t = {
        "id": f"TXN-{uuid.uuid4().hex[:8].upper()}",
        "procurement_id": procurement_id,
        "farmer_id": booking['farmer_id'],
        "payable_amount": total_payable,
        "payment_status": "initiated",
        "pfms_batch_id": f"BATCH-DOCA-{uuid.uuid4().hex[:4].upper()}",
        "payment_mode": "DBT_PFMS",
        "initiated_at": now_iso,
        "remarks": "Procurement approved. Queued for DBT transfer."
    }
    try:
        create_payment_txn(t)
    except Exception as e:
        print(f"Warning: Failed to create payment txn: {e}")

    sms_res = send_sms(
        phone=booking['farmer_phone'],
        recipient_name=booking['farmer_name'],
        notification_type='weighment_done',
        token=token_number,
        crop=booking.get('crop_name', 'Crop'),
        net_weight=net_weight_quintals,
        moisture=moisture_pct,
        grade=quality_grade,
        amount=total_payable,
        receipt_no=receipt_number
    )

    return jsonify({
        "success": True,
        "message": f"Procurement recorded! J-Form Receipt {receipt_number} generated.",
        "receipt_number": receipt_number,
        "net_weight_quintals": net_weight_quintals,
        "effective_rate_per_quintal": effective_rate,
        "total_payable_amount": total_payable,
        "procurement_id": procurement_id,
        "sms_sent": sms_res
    })


# 9. DBT Payment Dispatch & Real-time Settlement
@app.route('/api/procurement/payout', methods=['POST'])
def process_dbt_payout():
    data = request.json or {}
    receipt_number = data.get('receipt_number')

    proc = get_procurement_by_receipt(receipt_number)
    if not proc:
        return jsonify({"success": False, "error": "Procurement record not found"}), 404

    utr = f"PFMS{datetime.datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"
    now_iso = datetime.datetime.now().isoformat()

    try:
        update_payment_credited(proc['id'], utr, now_iso)
    except Exception as e:
        return jsonify({"success": False, "error": f"Failed to credit payout: {str(e)}"}), 500

    farmer = get_farmer_by_id(proc['farmer_id'])
    crops = get_all_crops()
    crop = next((c for c in crops if c['id'] == proc['crop_id']), None)

    sms_res = None
    if farmer and crop:
        sms_res = send_sms(
            phone=farmer['phone'],
            recipient_name=farmer['full_name'],
            notification_type='dbt_credited',
            amount=proc['total_payable_amount'],
            crop=crop['crop_name'],
            utr=utr,
            receipt_no=proc['receipt_number']
        )

    return jsonify({
        "success": True,
        "message": f"DBT Transfer of Rs. {proc['total_payable_amount']} credited successfully!",
        "utr": utr,
        "credited_at": now_iso,
        "sms_sent": sms_res
    })


# 10. Farmer Booking & Procurement Tracker
@app.route('/api/farmer/track', methods=['GET'])
def track_farmer():
    phone = request.args.get('phone', '').strip()
    token = request.args.get('token', '').strip()

    def augment_booking(b):
        if not b or not isinstance(b, dict):
            return b
        c_id = b.get('centre_id')
        status = b.get('booking_status')
        if c_id and status in ('checked_in', 'called'):
            try:
                lq = get_live_queue_for_centre(c_id)
                live_list = lq.get('live_queue', [])
                pos = 1
                found = False
                for item in live_list:
                    if item.get('id') == b.get('id') or item.get('token_number') == b.get('token_number'):
                        found = True
                        break
                    pos += 1
                if found:
                    b['queue_position'] = pos
                    b['estimated_wait_minutes'] = max(0, (pos - 1) * 10)
                else:
                    b['queue_position'] = 1
                    b['estimated_wait_minutes'] = 5
            except Exception as ex:
                print(f"[TRACK QUEUE AUGMENT ERROR] {ex}")
        elif status == 'called':
            b['queue_position'] = 1
            b['estimated_wait_minutes'] = 0
        return b

    if token:
        booking = get_farmer_bookings(token=token)
        if not booking:
            return jsonify({"success": False, "error": "Token not found"}), 404
        booking = augment_booking(booking)
        return jsonify({"success": True, "booking": booking})

    elif phone:
        bookings = get_farmer_bookings(phone=phone)
        augmented = [augment_booking(b) for b in (bookings or [])]
        return jsonify({"success": True, "bookings": augmented})

    return jsonify({"success": False, "error": "Phone or Token is required"}), 400


# 11. SMS Notification History
@app.route('/api/sms/logs', methods=['GET'])
def get_sms_logs():
    phone = request.args.get('phone', '').strip()
    if not phone:
        return jsonify({"success": True, "logs": []})
    logs = db_get_sms_logs(phone=phone)
    return jsonify({"success": True, "logs": logs})


# 12. Analytics Summary (DoCA / SIH Dashboard)
@app.route('/api/analytics/summary', methods=['GET'])
def analytics_summary():
    try:
        metrics = get_analytic_summary()
        return jsonify({"success": True, "metrics": metrics})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# 13. Server-Sent Events (SSE) Stream for Queue Announcements
@app.route('/api/queue/stream')
def queue_stream():
    """SSE endpoint for real-time queue updates and voice announcements."""
    def event_stream():
        yield f"data: {json.dumps({'event': 'connected', 'data': {'time': datetime.datetime.now().isoformat()}})}\n\n"
        while True:
            time.sleep(15)
            yield f"data: {json.dumps({'event': 'ping', 'data': {'time': datetime.datetime.now().isoformat()}})}\n\n"

    return Response(event_stream(), mimetype="text/event-stream")


if __name__ == '__main__':
    print(f"Starting SMARTPROCURE Platform on port {Config.PORT}...")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
