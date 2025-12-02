from flask import Flask, request, jsonify
import requests
import os
import time
import json 
import subprocess
import base64
from dotenv import load_dotenv
from supabase import create_client, Client
# StorageError import removed to avoid version-specific import issues

# Load environment variables from .env file
load_dotenv()

# Initialize Supabase client with service role key for backend operations
# Service role key bypasses RLS policies - required for database inserts
supabase: Client = create_client(
    os.getenv('SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY', '') or os.getenv('SUPABASE_ANON_KEY', '')
)

# --- CONFIGURATION (UPDATE THIS) ---
# Your specific Python script to run the TTS/story generation
# We will use this path to execute the script in a subprocess.
PYTHON_EXECUTABLE = "/home/ben/miniconda3/envs/tts/bin/python"
GENERATOR_SCRIPT_PATH = "/home/ben/projects/others/chatterbox/inference/effortless_story_generator.py"
CHATTERBOX_DIR = "/home/ben/projects/others/chatterbox"

# Template file path
STORY_TEMPLATE_PATH = os.path.join(os.path.dirname(__file__), "templates", "story_template.txt")

# Temporary folder to save the generated audio file
OUTPUT_DIR = "/home/ben/projects/others/chatterbox/output_audio" #os.path.join(os.path.expanduser('~'), 'lingocast_output')
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Supabase Credentials (You need to get these from your Supabase dashboard)
SUPABASE_URL = "https://xgitkcmskcqghwaiioue.supabase.co" # e.g., https://xyz123.supabase.co
SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY') # Get this from .env file

# The bucket name you created in Supabase Storage
SUPABASE_BUCKET = "podcasts"

# --- END CONFIGURATION ---

app = Flask(__name__)

# --- UTILITY FUNCTIONS ---

def load_story_template():
    """Load the story template from external file."""
    try:
        with open(STORY_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        # Don't use fallback - let the error bubble up to the web
        raise Exception(f"Template file not found at {STORY_TEMPLATE_PATH}")

def generate_story_mock(topic, words, main_voice, guest_voice):
    """Simple story generator - real content will come from LLM later."""
    story_title = f"Story about {topic}"
    
    # Load template from external file
    try:
        with open(STORY_TEMPLATE_PATH, 'r', encoding='utf-8') as f:
            template = f.read()
    except FileNotFoundError:
        # If template missing, return error instead of fallback
        raise Exception(f"Template file not found at {STORY_TEMPLATE_PATH}")
    
    # Simple template substitution
    story_transcript = template.format(
        topic=topic,
        words=", ".join(words) if words else "no words provided"
    )
    
    # Save input for TTS script
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
    
    # The script generates output with pattern: {input_basename}_{main_voice}_{guest_voice}_output.{format}
    # For input.txt with voices albo/lachlan, output would be: input_albo_lachlan_output.mp3
    # JSON file will have same base name: input_albo_lachlan_output.json
    input_basename = os.path.basename(input_txt_path).replace(".txt", "")
    output_filename = f"{input_basename}_{main_voice}_{guest_voice}_output.mp3"
    output_wav_path = os.path.join(os.path.dirname(input_txt_path), output_filename)

    command = [
        PYTHON_EXECUTABLE,
        GENERATOR_SCRIPT_PATH,
        "--main_voice", main_voice,
        "--guest_voice", guest_voice,
        "--input", input_txt_path,
        "--transcript", "json"  # TTS script will generate .json with same base name as audio
    ]

    try:
        # Use subprocess to run the command
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,  # This will raise a CalledProcessError if the script fails
            cwd=CHATTERBOX_DIR # Run from the chatterbox directory for relative paths
        )
        print("TTS Script Output:\n", result.stdout)
        
        # Check if the output file was created
        if os.path.exists(output_wav_path):
            print(f"TTS output file found at: {output_wav_path}")
            
            # Also check for JSON file with same base name
            json_path = output_wav_path.replace('.mp3', '.json')
            if os.path.exists(json_path):
                print(f"JSON transcript file found at: {json_path}")
                return True, (output_wav_path, json_path)
            else:
                print(f"Warning: JSON file not found at {json_path}")
                return True, (output_wav_path, None)
        else:
            return False, f"TTS script ran, but output file not found at {output_wav_path}"

    except subprocess.CalledProcessError as e:
        print(f"Error running TTS script (Code {e.returncode}): {e.stderr}")
        return False, f"TTS Script failed: {e.stderr}"
    except Exception as e:
        print(f"General error during script execution: {e}")
        return False, f"Script execution error: {e}"


def save_episode_to_db(title, topic, words, transcript, audio_url):
    """Saves the episode data to Supabase database."""
    if not all([os.getenv('SUPABASE_URL'), os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')]):
        return False, "Supabase credentials not configured"
    
    try:
        data = {
            "id": title,  # Use title as id (prevents duplicates)
            "title": title,
            "topic": topic,
            "words": words,
            "transcript": transcript, # This can now be a JSON object or string
            "audio_url": audio_url
        }
        
        # Use upsert to handle duplicate titles gracefully
        response = supabase.table('episodes').upsert(data).execute()
        print(f"Episode saved to database: {title}")
        return True, response.data[0] if response.data else None
    except Exception as e:
        error_msg = f"Failed to save to database: {e}"
        print(error_msg)
        return False, error_msg


def upload_to_supabase(file_path, file_name):
    """Uploads a file to Supabase Storage and returns the public URL."""
    if not os.getenv('SUPABASE_URL') or not (os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')):
        print("Supabase credentials missing. Skipping upload.")
        return False, "Supabase not configured."

    try:
        # Open the file in binary read mode
        with open(file_path, 'rb') as f:
            # Upload the file to the specified bucket
            response = supabase.storage.from_(SUPABASE_BUCKET).upload(
                file=f,
                path=file_name,
                file_options={"content-type": "audio/mpeg", "cache-control": "3600"}
            )
        
        # Check if the upload was successful
        if response.status_code == 200:
            print(f"File uploaded successfully to {SUPABASE_BUCKET}/{file_name}")
            
            # Retrieve the public URL
            public_url = supabase.storage.from_(SUPABASE_BUCKET).get_public_url(file_name)
            
            if public_url:
                # Remove any trailing question marks or whitespace
                public_url = public_url.rstrip('?').strip()
                print(f"Successfully uploaded to Supabase: {public_url}")
                return True, public_url
            else:
                print("Failed to retrieve public URL.")
                return False, "Failed to retrieve public URL."
        else:
            print(f"Upload failed: {response.json()}")
            return False, f"Upload failed: {response.json()}"

    except FileNotFoundError:
        error_msg = f"Error: The file '{file_path}' was not found."
        print(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"A storage or unexpected error occurred: {e}"
        print(error_msg)
        return False, error_msg
    except Exception as e:
        error_msg = f"An unexpected error occurred: {e}"
        print(error_msg)
        return False, error_msg

# --- FLASK HANDLER ---

@app.route('/generate', methods=['POST'])
def handle_generate():
    """Handles the request from the n8n HTTP Request node."""
    data = request.json
    topic = data.get('topic', 'unknown topic')
    words = data.get('words', [])
    main_voice = data.get('mainVoice', 'albo') # Get new parameter
    guest_voice = data.get('guestVoice', 'lachlan') # Get new parameter

    # Remove the hardcoded word limit - use whatever words are provided
    print(f"\n--- Starting Job ---")
    print(f"Topic: {topic}, Words: {words}, Voices: {main_voice}/{guest_voice}")

    try:
        # 1. GENERATE STORY & PREPARE INPUT.TXT
        story_title, story_transcript, input_txt_path = generate_story_mock(topic, words, main_voice, guest_voice)
        
        # 2. RUN LOCAL TTS SCRIPT
        success, result = run_local_tts_script(input_txt_path, main_voice, guest_voice)

        if not success:
            return jsonify({
                "error": f"TTS generation failed: {result}",
                "transcript": story_transcript
            }), 500

        # Extract audio and JSON paths
        if isinstance(result, tuple):
            output_wav_path, json_path = result
        else:
            output_wav_path = result
            json_path = None
        
        # 3. UPLOAD AUDIO TO SUPABASE
        safe_title = "".join(c for c in story_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_title = safe_title.replace(' ', '_')
        
        # Upload audio file
        audio_filename = f"{safe_title}_{int(time.time())}.mp3"
        upload_success, audio_url_or_error = upload_to_supabase(output_wav_path, audio_filename)

        if not upload_success:
            return jsonify({
                "error": f"Audio upload failed: {audio_url_or_error}",
                "transcript": story_transcript
            }), 500

        # 4. READ JSON TRANSCRIPT IF EXISTS
        final_transcript = story_transcript # Default to text
        if json_path:
            try:
                with open(json_path, 'r', encoding='utf-8') as f:
                    final_transcript = json.load(f)
                print("Successfully loaded JSON transcript")
            except Exception as e:
                print(f"Error reading JSON transcript: {e}")
                # Fallback to text transcript if JSON fails

        # 5. SAVE TO DATABASE
        db_success, db_result = save_episode_to_db(story_title, topic, words, final_transcript, audio_url_or_error)
        
        if not db_success:
            print(f"Warning: Database save failed: {db_result}")

        # 6. SUCCESS RESPONSE
        return jsonify({
            "storyTitle": story_title,
            "transcript": final_transcript,
            "audioUrl": audio_url_or_error,
            "episode": db_result if db_success else None
        })
        
    except Exception as e:
        # Push all errors to web instead of fallbacks
        return jsonify({
            "error": f"Generation failed: {str(e)}"
        }), 500

if __name__ == '__main__':
    if not os.getenv('SUPABASE_URL') or not (os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')):
        print("\n⚠️ WARNING: Supabase credentials are not configured. Upload and database save will fail.")
        print("Please add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to your .env file")
        print("NOTE: Service role key is required for backend database operations (bypasses RLS).")
    
    if not os.path.exists(GENERATOR_SCRIPT_PATH):
        print(f"\n🚨 FATAL: TTS script not found at {GENERATOR_SCRIPT_PATH}. Please update GENERATOR_SCRIPT_PATH.")
    
    if not os.path.exists(PYTHON_EXECUTABLE):
        print(f"\n🚨 FATAL: Python executable not found at {PYTHON_EXECUTABLE}. Please update PYTHON_EXECUTABLE.")
        
    print("Starting Flask worker...")
    
    # Install required packages if missing
    try:
        import requests
    except ImportError:
        print("Installing required 'requests' package...")
        subprocess.run(['pip', 'install', 'requests'])
    
    try:
        from dotenv import load_dotenv
    except ImportError:
        print("Installing required 'python-dotenv' package...")
        subprocess.run(['pip', 'install', 'python-dotenv'])
    
    try:
        from supabase import create_client
    except ImportError:
        print("Installing required 'supabase' package...")
        subprocess.run(['pip', 'install', 'supabase'])

    app.run(host='0.0.0.0', port=5000)
