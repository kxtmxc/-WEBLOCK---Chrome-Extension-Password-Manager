from flask import Flask, request, jsonify
from flask_cors import CORS
import pyaes
import random
import string

app = Flask(__name__)
CORS(app)

# Function to generate a random 32-byte key
def generate_key():
    characters = string.ascii_letters + string.digits + string.punctuation
    return ''.join(random.choice(characters) for _ in range(32)).encode()

@app.route('/encrypt', methods=['POST'])
def encrypt():
    data = request.json
    plaintext = data['plaintext']

    # Ensure plaintext is a string, then encode to bytes
    if not isinstance(plaintext, str):
        plaintext = str(plaintext)
    plaintext_bytes = plaintext.encode()

    key = generate_key()
    aes = pyaes.AES(key)
    ciphertext = aes.encrypt(plaintext_bytes)

    # Convert ciphertext to byte string if it's a list of integers
    if isinstance(ciphertext, list):
        ciphertext_bytes = bytes(ciphertext)
    else:
        ciphertext_bytes = ciphertext

    return jsonify({'ciphertext': ciphertext_bytes.hex(), 'key': key.decode()})

@app.route('/decrypt', methods=['POST'])
def decrypt():
    data = request.json
    provided_key = data['key'].encode()
    stored_key = data['storedKey'].encode()  # Key stored during encryption
    ciphertext = bytes.fromhex(data['ciphertext'])

    # Verify if provided key matches the stored key
    if provided_key != stored_key:
        return jsonify({'error': 'Wrong key'}), 401  # Unauthorized access

    aes = pyaes.AES(provided_key)
    decrypted = aes.decrypt(ciphertext)

    # Convert decrypted output to byte string if it's a list of integers
    if isinstance(decrypted, list):
        decrypted_bytes = bytes(decrypted)
    else:
        decrypted_bytes = decrypted

    return jsonify({'decrypted': decrypted_bytes.decode()})

if __name__ == '__main__':
    app.run(port=5000)
