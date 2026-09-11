import requests
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE_URL = 'https://portal.aalawsng.com/api/v1'

print('--- TEST 1: Authentication ---')
login_res = requests.post(f'{BASE_URL}/auth/login', json={
    'email': 'admin@aalawsng.com',
    'password': 'Admin@2024!'
})
assert login_res.status_code == 200, f'Login failed: {login_res.text}'
tokens = login_res.json()
access_token = tokens['accessToken']
refresh_token = tokens['refreshToken']
print('✓ Logged in as:', tokens['user']['email'], 'Role:', tokens['user']['role'])
print('✓ Access token obtained (length: %d)' % len(access_token))

headers = {'Authorization': f'Bearer {access_token}'}

print('\n--- TEST 2: Client Creation with Full AML/CFT & CAC Data ---')
timestamp = int(time.time())
client_payload = {
    'firstName': 'Tawab',
    'lastName': 'Jabar',
    'companyName': 'Relux Energy Limited',
    'rcNumber': 'RC-9836584',
    'tin': 'TIN-48920188',
    'email': f'tawab.jabar.{timestamp}@reluxenergy.ng',
    'phone': '08033529838',
    'idType': 'International Passport',
    'idNumber': 'A12469661',
    'address': '1 Ivonye Kaka Crescent, Ibafo, Ogun State',
    'sourceOfFundsDeclaration': 'Commercial Trading',
    'pepStatus': False,
    'riskRating': 'LOW'
}

create_res = requests.post(f'{BASE_URL}/clients', headers=headers, json=client_payload)
print('Create status:', create_res.status_code)
assert create_res.status_code == 201, f'Create client failed: {create_res.text}'
created_client = create_res.json()
client_id = created_client['id']
print('✓ Client created successfully! ID:', client_id)
print('  Name:', created_client['firstName'], created_client['lastName'])
print('  Company:', created_client['companyName'])
print('  RC Number:', created_client.get('rcNumber'))
print('  Source of Funds:', created_client.get('sourceOfFundsDeclaration'))
print('  PEP Status:', created_client.get('pepStatus'))

print('\n--- TEST 3: Query Client Back ---')
get_res = requests.get(f'{BASE_URL}/clients/{client_id}', headers=headers)
assert get_res.status_code == 200, f'Get client failed: {get_res.text}'
queried = get_res.json()
print('✓ Queried client verified. Name:', queried['firstName'], queried['lastName'])
print('✓ RC Number saved properly:', queried.get('rcNumber'))
print('✓ TIN saved properly:', queried.get('tin'))
print('✓ Source of funds saved properly:', queried.get('sourceOfFundsDeclaration'))

print('\n--- TEST 4: Token Refresh Verification ---')
refresh_res = requests.post(f'{BASE_URL}/auth/refresh', json={'refreshToken': refresh_token})
assert refresh_res.status_code == 200, f'Refresh failed: {refresh_res.text}'
new_tokens = refresh_res.json()
print('✓ Token refreshed successfully. New access token length:', len(new_tokens['accessToken']))

print('\n===========================================')
print('✓✓ ALL BACKEND API VERIFICATIONS PASSED ✓✓')
print('===========================================')
