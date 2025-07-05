import requests
from flask import Flask, render_template, jsonify

app = Flask(__name__, static_folder='static', template_folder='templates')

LEETCODE_API_ENDPOINT = "https://leetcode-stats-api.herokuapp.com/"

@app.route('/')
def index():
    """Renders the main index.html page."""
    return render_template('index.html')

@app.route('/api/user_stats/<username>')
def get_user_stats(username):
    """
    Fetches raw stats and forwards the comprehensive payload, including the
    full submission calendar needed for the heatmap and advanced calculations.
    """
    if not username:
        return jsonify({"status": "error", "message": "Username cannot be empty"}), 400

    try:
        response = requests.get(f"{LEETCODE_API_ENDPOINT}{username}")
        response.raise_for_status()
        data = response.json()

        if data.get("status") == "error":
            return jsonify(data), 404
        
        # We no longer need to process much here; we'll pass most of the raw data
        # to the frontend to handle, as it's needed for calculations.
        return jsonify(data)

    except requests.exceptions.HTTPError as e:
        return jsonify({"status": "error", "message": "LeetCode user not found or API error."}), e.response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({"status": "error", "message": f"Could not connect to LeetCode API: {e}"}), 503

if __name__ == '__main__':
    app.run(debug=True)