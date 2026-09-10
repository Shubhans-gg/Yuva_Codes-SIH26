from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import hashlib
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


                       
    
if __name__ == '__main__':
    print(f"Starting SMARTPROCURE Platform on port {Config.PORT}...")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)