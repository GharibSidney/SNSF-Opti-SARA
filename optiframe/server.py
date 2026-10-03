"""
Flask server wrapping the SAM vision pipeline (finalSam.py).

Run with:
    cd optiframe
    python server.py

The server listens on http://localhost:5000.
The Vite dev server proxies /api/* to this server (see vite.config.ts).
"""

import sys
import os
import traceback

# Make the segment-anything package importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src", "segment-anything"))

from flask import Flask, request, jsonify
from flask_cors import CORS

from finalSam import process_image

app = Flask(__name__)
CORS(app)  # allow calls from the Vite dev server on a different port


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/measure", methods=["POST"])
def measure_endpoint():
    # --- validate input ---------------------------------------------------
    if "image" not in request.files:
        return jsonify({"error": "missing_image", "message": "No 'image' file in the request."}), 400

    eye = request.form.get("eye", "R").upper()
    if eye not in ("L", "R"):
        return jsonify({"error": "bad_eye", "message": "'eye' must be 'L' or 'R'."}), 400

    from_back = request.form.get("from_back", "false").lower() in ("1", "true", "yes")

    image_file = request.files["image"]
    data = image_file.read()
    if len(data) == 0:
        return jsonify({"error": "bad_image", "message": "Uploaded file is empty."}), 400

    # --- run pipeline ------------------------------------------------------
    try:
        results = process_image(data, eye=eye, from_back=from_back)
    except RuntimeError as exc:
        msg = str(exc)
        # Map known error strings to VisionError codes the frontend understands
        if "lens_not_found" in msg:
            code = "lens_not_found"
        elif "no_reference" in msg:
            code = "no_reference"
        else:
            code = "failed"
        return jsonify({"error": code, "message": msg}), 422
    except Exception:
        traceback.print_exc()
        return jsonify({"error": "failed", "message": "Internal server error."}), 500

    # The pipeline returns a list of contours (one per detected lens).
    # The frontend expects one contour per call (one eye at a time),
    # so we return the first result.
    if not results:
        return jsonify({"error": "lens_not_found", "message": "No lens detected."}), 422

    return jsonify({"contour": results[0]})


if __name__ == "__main__":
    print("Starting vision server on http://localhost:5000")
    print("  POST /api/measure  — image + eye → contour JSON")
    print("  GET  /api/health   — health check")
    app.run(host="0.0.0.0", port=5000, debug=False)
