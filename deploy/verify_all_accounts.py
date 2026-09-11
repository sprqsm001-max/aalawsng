import requests
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = 'https://portal.aalawsng.com/api/v1'

accounts = [
    ('admin@aalawsng.com', 'Admin@2024!', 'Managing Partner (ADMIN)'),
    ('associate@aalawsng.com', 'Staff@2024!', 'Associate Attorney (STAFF)'),
    ('paralegal@aalawsng.com', 'Staff@2024!', 'Emeka Okonkwo (STAFF)'),
    ('client@demo.com', 'Client@2024!', 'Demo Account (ADMIN)')
]

print('=== TESTING ALL ACCOUNTS FOR CLIENT INTAKE ===')
for email, password, label in accounts:
    login = requests.post(f'{BASE_URL}/auth/login', json={'email': email, 'password': password})
    if login.status_code != 200:
        print(f'FAIL Login {label} ({email}): {login.text}')
        continue
    token = login.json()['accessToken']
    headers = {'Authorization': f'Bearer {token}'}

    username = email.split('@')[0]
    post = requests.post(f'{BASE_URL}/clients', headers=headers, json={
        'firstName': 'Verify',
        'lastName': label.split()[0],
        'email': f'verify.{username}.auto@test.com'
    })
    if post.status_code == 201:
        print(f'✓ SUCCESS: {label} ({email}) -> Status {post.status_code} (Client ID: {post.json()["id"][:8]}...)')
    else:
        print(f'✗ FAILED: {label} ({email}) -> Status {post.status_code}: {post.text}')

print('=== ALL ACCOUNTS VERIFIED ===')
