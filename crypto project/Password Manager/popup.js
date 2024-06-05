const saveButton = document.getElementById('save');
const generateButton = document.getElementById('generate');
const showButton = document.getElementById('show');
const loginTableContainer = document.getElementById('login-table-container');
const loginList = document.getElementById('loginList');
let generatedPassword = '';

// Function to generate a password
function generatePassword(length = 16) {
    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specialChars = '!@#$%^&*()_+{}:"<>?|[];,./`~';
    
    let characters = '';
    if (document.getElementById('useAlphabets').checked) characters += alphabets;
    if (document.getElementById('useNumbers').checked) characters += numbers;
    if (document.getElementById('useSpecial').checked) characters += specialChars;

    let password = '';
    for (let i = 0; i < length; i++) {
        password += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return password;
}

// Function to encrypt a password
async function encryptPassword(plaintext) {
    const response = await fetch('http://localhost:5000/encrypt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plaintext })
    });
    const data = await response.json();
    return data;
}

// Function to decrypt a password
async function decryptPassword(ciphertext, providedKey, storedKey) {
    const response = await fetch('http://localhost:5000/decrypt', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ciphertext, key: providedKey, storedKey })
    });
    const data = await response.json();
    return data;
}

// Event listener for the generate password button
generateButton.addEventListener('click', () => {
    generatedPassword = generatePassword();
    alert(`Generated Password: ${generatedPassword}`); // Displaying the generated password
});

// Save functionality
saveButton.addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const url = tab.url;
    const username = document.getElementById('username').value;

    if (username === '' || generatedPassword === '') {
        alert('Please fill in the username and generate a password.');
        return;
    }

    const encryptedData = await encryptPassword(generatedPassword);

    chrome.storage.local.set({ [url]: { username, password: encryptedData.ciphertext, key: encryptedData.key } }, () => {
        // Show key dialog with the key
        showKeyDialog(encryptedData.key);
    });

    generatedPassword = ''; // Reset the generated password
});

// Function to show the key dialog
function showKeyDialog(key) {
    const keyModal = document.getElementById("keyModal");
    document.getElementById("keyText").value = key;
    keyModal.style.display = "block";

    // Copy Key Button Event Listener
    document.getElementById("copyButton").onclick = function() {
        const keyText = document.getElementById("keyText");
        keyText.select();
        document.execCommand("copy");
        alert("Key copied to clipboard.");
        keyModal.style.display = "none";
    };

    // Close Modal When Clicked Outside
    window.onclick = function(event) {
        if (event.target === keyModal) {
            keyModal.style.display = "none";
        }
    };
}

// Close button in the modal
const span = document.getElementsByClassName("close")[0];
span.onclick = function() {
    document.getElementById("keyModal").style.display = "none";
};

// Delete login function
function deleteLogin(url) {
    chrome.storage.local.remove(url, () => {
        refreshLoginList();
    });
}

// Refresh login list
function refreshLoginList() {
    chrome.storage.local.get(null, async (items) => {
        loginList.innerHTML = '';

        for (const url of Object.keys(items)) {
            const credentials = items[url];
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${url}</td>
                <td>${credentials.username}</td>
                <td>
                    <input type="password" value="********" class="password-field" readonly/>
                    <button class="toggle-password">Show</button>
                </td>
                <td>
                    <button class="delete-button" data-url="${url}">Delete</button>
                </td>
            `;
            loginList.appendChild(tr);
        }

        if (Object.keys(items).length === 0) {
            loginList.innerHTML = '<tr><td colspan="4">No saved logins</td></tr>';
        }

        attachEventListeners();
    });
}

// Attach event listeners to buttons in the login list
function attachEventListeners() {
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', async function () {
            const row = this.closest('tr');
            const url = row.querySelector('.delete-button').getAttribute('data-url');
            const passwordField = row.querySelector('.password-field');
            const credentials = await chrome.storage.local.get(url);
            const storedKey = credentials[url].key;

            if (this.textContent === 'Show') {
                const providedKey = prompt("Enter your key to view the password:");
                if (!providedKey) return; // Exit if no key is provided

                const result = await decryptPassword(credentials[url].password, providedKey, storedKey);
                
                if (result.error) {
                    alert("Wrong key");
                    return;
                }

                passwordField.type = 'text';
                passwordField.value = result.decrypted;
                this.textContent = 'Hide';
            } else {
                passwordField.type = 'password';
                passwordField.value = '********';
                this.textContent = 'Show';
            }
        });
    });

    document.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', function () {
            const url = this.getAttribute('data-url');
            if (url) {
                deleteLogin(url);
            }
        });
    });
}

// Show/hide saved logins
showButton.addEventListener('click', () => {
    if (loginTableContainer.style.display === 'block' || loginTableContainer.style.display === '') {
        loginTableContainer.style.display = 'none';
        showButton.textContent = 'Show Saved Logins';
    } else {
        refreshLoginList();
        loginTableContainer.style.display = 'block';
        showButton.textContent = 'Hide Saved Logins';
    }
});

// Initialize with the saved logins hidden
document.addEventListener('DOMContentLoaded', function () {
    loginTableContainer.style.display = 'none';
});
