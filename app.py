from flask import Config, Flask, render_template
from config import Config


app=Flask(__name__)

# try:
#     init_db()
# except Exception as e:
#     print(f"Warning on startup Supabase check: {e}")

# =============================================================================
# WEB PAGES / TEMPLATE ROUTES
# =============================================================================

@app.route('/')
def landing_page():
    return render_template('index.html')

if __name__ == '__main__':
    print(f"Starting SMARTPROCURE Platform on port {Config.PORT}...")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)