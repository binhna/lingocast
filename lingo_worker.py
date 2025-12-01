from flask import Flask, request, jsonify
import requests
import os
import time
import json 
import subprocess
import base64

# --- CONFIGURATION (UPDATE THIS) ---
# Your specific Python script to run the TTS/story generation
# We will use this path to execute the script in a subprocess.
GENERATOR_SCRIPT_PATH = "/home/ben/miniconda3/envs/tts/bin/python inference/effortless_story_generator.py"

# Temporary folder to save the generated audio file
OUTPUT_DIR = os.path.join(os.path.expanduser('~'), 'lingocast_output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Supabase Credentials (You need to get these from your Supabase dashboard)
SUPABASE_URL = "YOUR_SUPABASE_URL_HERE" # e.g., https://xyz123.supabase.co
SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE" # Get this from Settings -> API

# The bucket name you created in Supabase Storage
SUPABASE_BUCKET = "podcasts"

# --- END CONFIGURATION ---

app = Flask(__name__)

# --- UTILITY FUNCTIONS ---

def generate_story_mock(topic, words, main_voice, guest_voice):
    """Mocks the story generation and includes speaker tags for multi-voice TTS."""
    story_title = f"The Curious Case of the {topic.title().replace(' ', '')}"
    
    # We use simple speaker tags that your external script can parse
    story_transcript = f"""
    [SPEAKER_A] Welcome to LingoCast. Today's story is titled, {story_title}. 
    
    [SPEAKER_B] The narrative begins in a small town. The main character, Leo, 
    had a simple goal: to find the perfect apple. His search was {words[0]}. 
    
    [SPEAKER_A] He was always {words[1]} with his decisions. He learned that {words[2]} 
    requires {words[3]} effort. 
    
    [SPEAKER_B] In the end, he found his apple, realizing the journey was the true {words[4]}.
    """
    
    # Save the input script to a temporary file for your external Python script
    input_txt_path = os.path.join(OUTPUT_DIR, "input.txt")
    with open(input_txt_path, "w") as f:
        f.write(story_transcript.strip())
        
    return story_title, story_transcript.strip(), input_txt_path

def run_local_tts_script(input_txt_path, main_voice, guest_voice):
    """
    Executes the external Python script using subprocess.
    Assumes the script generates a single output file (e.g., output.wav) in a known location.
    """
    print(f"Executing local TTS script: {GENERATOR_SCRIPT_PATH}")
    
    # Define a predictable output path based on the input filename
    # NOTE: You must check where your actual script saves the file. 
    # For now, we assume it saves to a temporary location we can grab.
    
    # Let's assume your script saves the output WAV file next to the input.txt, 
    # but with a .wav extension. You might need to adjust this path based on your 
    # actual generator script's behavior.
    output_wav_path = os.path.join(os.path.dirname(input_txt_path), 
                                   os.path.basename(input_txt_path).replace(".txt", ".wav"))

    command = [
        GENERATOR_SCRIPT_PATH,
        "--main_voice", main_voice,
        "--guest_voice", guest_voice,
        "--input", input_txt_path
        # You might need to add an --output argument here if your script supports it
    ]

    try:
        # Use subprocess to run the command
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,  # This will raise a CalledProcessError if the script fails
            cwd=os.path.dirname(GENERATOR_SCRIPT_PATH) # Run from the script's directory for relative paths
        )
        print("TTS Script Output:\n", result.stdout)
        
        # Check if the output file was created
        if os.path.exists(output_wav_path):
            print(f"TTS output file found at: {output_wav_path}")
            return True, output_wav_path
        else:
            return False, f"TTS script ran, but output file not found at {output_wav_path}"

    except subprocess.CalledProcessError as e:
        print(f"Error running TTS script (Code {e.returncode}): {e.stderr}")
        return False, f"TTS Script failed: {e.stderr}"
    except Exception as e:
        print(f"General error during script execution: {e}")
        return False, f"Script execution error: {e}"


def upload_to_supabase(file_path, file_name):
    """Uploads a file to Supabase Storage and returns the public URL."""
    if not all([SUPABASE_URL, SUPABASE_ANON_KEY]):
        print("Supabase credentials missing. Skipping upload.")
        return False, "Supabase not configured."

    upload_url = f"{SUPABASE_URL}/storage/v1/object/{SUPABASE_BUCKET}/{file_name}"

    try:
        # 1. Read the file content
        with open(file_path, 'rb') as f:
            file_data = f.read()

        # 2. Upload using the REST API (requires header)
        headers = {
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Content-Type": "audio/wav"  # Use the correct MIME type
        }
        
        # Use a POST request for the upload
        response = requests.post(
            upload_url, 
            data=file_data, 
            headers=headers
        )
        response.raise_for_status() # Check for errors

        # 3. Construct the public URL
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{file_name}"
        print(f"Successfully uploaded to Supabase: {public_url}")
        return True, public_url

    except requests.exceptions.RequestException as e:
        print(f"Error during Supabase upload: {e.response.text if e.response else e}")
        return False, f"Supabase Upload Error: {e.response.text if e.response else e}"
    except Exception as e:
        print(f"General error during Supabase process: {e}")
        return False, f"General Supabase Error: {e}"

# --- FLASK HANDLER ---

@app.route('/generate', methods=['POST'])
def handle_generate():
    """Handles the request from the n8n HTTP Request node."""
    data = request.json
    topic = data.get('topic', 'unknown topic')
    words = data.get('words', [])
    main_voice = data.get('mainVoice', 'albo') # Get new parameter
    guest_voice = data.get('guestVoice', 'lachlan') # Get new parameter

    if len(words) < 6:
        words.extend(["effortless", "consistent", "ubiquitous", "meticulous", "scrutinize", "peculiar"])
    words = words[:6] # Only take 6 words for mock script

    print(f"\n--- Starting Job ---")
    print(f"Topic: {topic}, Main Voice: {main_voice}, Guest Voice: {guest_voice}")

    # 1. GENERATE STORY MOCK & PREPARE INPUT.TXT
    story_title, story_transcript, input_txt_path = generate_story_mock(topic, words, main_voice, guest_voice)
    
    # 2. RUN LOCAL TTS SCRIPT
    success, result_path_or_error = run_local_tts_script(input_txt_path, main_voice, guest_voice)

    if not success:
        return jsonify({
            "transcript": f"Error: Failed to run TTS script: {result_path_or_error}",
            "audioUrl": "" 
        }), 500

    output_wav_path = result_path_or_error
    
    # 3. UPLOAD TO SUPABASE
    upload_filename = f"{story_title}_{int(time.time())}.wav"
    upload_success, public_url_or_error = upload_to_supabase(output_wav_path, upload_filename)

    if not upload_success:
         # Still return the transcript so the user can see the story
        return jsonify({
            "transcript": f"Error: Failed to upload to Supabase: {public_url_or_error}\n\nTranscript: {story_transcript}",
            "audioUrl": "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg" # Use a fallback
        }), 500

    # 4. SEND FINAL RESPONSE
    return jsonify({
        "storyTitle": story_title,
        "transcript": story_transcript,
        "audioUrl": public_url_or_error
    })

if __name__ == '__main__':
    if not all([SUPABASE_URL, SUPABASE_ANON_KEY]):
        print("\n⚠️ WARNING: Supabase credentials are not configured. Upload step will fail.")
        print("Please update SUPABASE_URL and SUPABASE_ANON_KEY in lingo_worker.py")
    
    if not os.path.exists(GENERATOR_SCRIPT_PATH):
        print(f"\n🚨 FATAL: TTS script not found at {GENERATOR_SCRIPT_PATH}. Please update GENERATOR_SCRIPT_PATH.")
        
    print("Starting Flask worker...")
    
    # Install requests package if missing
    try:
        import requests
    except ImportError:
        print("Installing required 'requests' package...")
        subprocess.run(['pip', 'install', 'requests'])

    app.run(host='0.0.0.0', port=5000)
