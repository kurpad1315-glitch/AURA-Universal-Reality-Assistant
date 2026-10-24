from flask import Flask, jsonify, request
from flask_cors import CORS
from openai import OpenAI
from dotenv import load_dotenv

import os
import base64
import binascii


# ============================================================
# AURA BACKEND
# ============================================================

load_dotenv()

app = Flask(__name__)

# Allow the frontend at 127.0.0.1:5500 to communicate
# with the Flask backend at 127.0.0.1:5001
CORS(app)


# ============================================================
# OPENAI SETUP
# ============================================================

api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is missing from .env"
    )

client = OpenAI(api_key=api_key)


# ============================================================
# HOME
# ============================================================

@app.route("/")
def home():

    return jsonify({
        "status": "AURA backend is running"
    })


# ============================================================
# TEST AI CONNECTION
# ============================================================

@app.route("/test-ai")
def test_ai():

    try:

        response = client.responses.create(

            model="gpt-6-luna",

            input=(
                "Say exactly: "
                "AURA AI connection successful."
            )
        )

        return jsonify({
            "answer": response.output_text
        })

    except Exception as error:

        print(
            "OPENAI TEST ERROR:",
            error
        )

        return jsonify({
            "error": str(error)
        }), 500


# ============================================================
# CAMERA + AI ANALYSIS
# ============================================================

@app.route("/analyze", methods=["POST"])
def analyze():

    try:

        # ----------------------------------------------------
        # RECEIVE DATA FROM FRONTEND
        # ----------------------------------------------------

        data = request.get_json(
            silent=True
        )

        if not data:

            return jsonify({
                "error": "No JSON data received."
            }), 400


        question = data.get(
            "question",
            ""
        )

        image = data.get(
            "image",
            ""
        )


        # ----------------------------------------------------
        # VALIDATE QUESTION
        # ----------------------------------------------------

        if not question:

            return jsonify({
                "error": "No question received."
            }), 400


        # ----------------------------------------------------
        # VALIDATE IMAGE
        # ----------------------------------------------------

        if not image:

            return jsonify({
                "error": "No camera image received."
            }), 400


        print()
        print("======================================")
        print("AURA VISION REQUEST")
        print("======================================")
        print(
            "QUESTION:",
            question
        )


        # ----------------------------------------------------
        # NORMALIZE IMAGE
        #
        # Browser normally sends:
        #
        # data:image/jpeg;base64,XXXXXX
        #
        # We extract ONLY the base64 portion,
        # decode it, then encode it again.
        #
        # This prevents malformed base64 data from
        # reaching the OpenAI API.
        # ----------------------------------------------------

        image = str(image).strip()


        if image.startswith("data:image/"):

            try:

                # Split:
                #
                # data:image/jpeg;base64,XXXXX
                #
                # into header + actual base64

                header, encoded_data = image.split(
                    ",",
                    1
                )

                encoded_data = encoded_data.strip()


                if not encoded_data:

                    return jsonify({
                        "error":
                        "Camera image contains no base64 data."
                    }), 400


                # Decode base64
                image_bytes = base64.b64decode(
                    encoded_data,
                    validate=True
                )


                if not image_bytes:

                    return jsonify({
                        "error":
                        "Camera image decoded to empty data."
                    }), 400


                # Re-encode cleanly
                clean_base64 = base64.b64encode(
                    image_bytes
                ).decode("utf-8")


                # Keep original image MIME type
                if "image/png" in header.lower():

                    mime_type = "image/png"

                elif "image/webp" in header.lower():

                    mime_type = "image/webp"

                else:

                    mime_type = "image/jpeg"


                image_url = (
                    f"data:{mime_type};base64,"
                    f"{clean_base64}"
                )


            except (
                ValueError,
                binascii.Error
            ) as image_error:

                print(
                    "AURA IMAGE DECODE ERROR:",
                    image_error
                )

                return jsonify({
                    "error":
                    "The captured camera image "
                    "is not valid base64 data."
                }), 400


        else:

            # ------------------------------------------------
            # If frontend accidentally sends only base64
            # without data:image/... prefix
            # ------------------------------------------------

            try:

                encoded_data = image.strip()


                image_bytes = base64.b64decode(
                    encoded_data,
                    validate=True
                )


                if not image_bytes:

                    return jsonify({
                        "error":
                        "Camera image is empty."
                    }), 400


                clean_base64 = base64.b64encode(
                    image_bytes
                ).decode("utf-8")


                image_url = (
                    "data:image/jpeg;base64,"
                    + clean_base64
                )


            except (
                ValueError,
                binascii.Error
            ) as image_error:

                print(
                    "AURA BASE64 ERROR:",
                    image_error
                )

                return jsonify({
                    "error":
                    "Camera image is not valid base64."
                }), 400


        # ----------------------------------------------------
        # DEBUG INFORMATION
        # ----------------------------------------------------

        print(
            "IMAGE PREFIX:",
            image_url[:40]
        )

        print(
            "IMAGE LENGTH:",
            len(image_url)
        )

        print(
            "IMAGE VALIDATED: YES"
        )


        # ----------------------------------------------------
        # SEND IMAGE + QUESTION TO AI
        # ----------------------------------------------------

        response = client.responses.create(

            model="gpt-6-luna",

            input=[

                {
                    "role": "user",

                    "content": [

                        {
                            "type": "input_text",

                            "text": f"""
You are AURA — a voice-first AI
accessibility assistant designed
primarily for blind and visually
impaired people.

The user asked:

{question}

You have also received a photograph
captured from the user's camera.

Analyze the image carefully.

Answer the user's question using
ONLY information that can actually
be determined from the image.

IMPORTANT:

1. Be concise because your answer
   will be spoken aloud.

2. Prioritize information useful
   to a blind person.

3. Mention important people,
   objects, obstacles, signs,
   doors, stairs, vehicles,
   paths and hazards when relevant.

4. If something is uncertain,
   clearly say that you are uncertain.

5. NEVER invent details.

6. Answer naturally like a helpful
   human accessibility assistant.

7. Respond in the SAME LANGUAGE
   used by the user.

For example:

English question → English answer.

Kannada question → Kannada answer.

Hindi question → Hindi answer.

Do not translate the user's question
into another language unless necessary
for understanding.

Do not explain that you are an AI.
Simply answer the user.

The response will be converted
into speech by AURA.
"""
                        },

                        {
                            "type": "input_image",

                            "image_url": image_url
                        }

                    ]
                }

            ]
        )


        # ----------------------------------------------------
        # GET AI ANSWER
        # ----------------------------------------------------

        answer = response.output_text.strip()


        print(
            "AURA AI ANSWER:",
            answer
        )

        print(
            "======================================"
        )
        print()


        # ----------------------------------------------------
        # RETURN ANSWER TO FRONTEND
        # ----------------------------------------------------

        return jsonify({

            "answer": answer,

            "success": True

        })


    except Exception as error:

        # ----------------------------------------------------
        # GENERAL ERROR
        # ----------------------------------------------------

        print()
        print(
            "======================================"
        )

        print(
            "AURA VISION ERROR:"
        )

        print(
            error
        )

        print(
            "======================================"
        )
        print()


        return jsonify({

            "success": False,

            "error": str(error)

        }), 500


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print()
    print(
        "======================================"
    )

    print(
        "       AURA BACKEND STARTING"
    )

    print(
        "======================================"
    )

    print(
        "Backend:"
        " http://127.0.0.1:5001"
    )

    print(
        "Vision:"
        " http://127.0.0.1:5001/analyze"
    )

    print(
        "======================================"
    )
    print()


    app.run(

        host="127.0.0.1",

        port=5001,

        debug=True
    )