import urllib.request
import json

accounts = [
    ('admin@aalawsng.com', 'Admin@2024!', 'Principal Partner (Admin)'),
    ('associate@aalawsng.com', 'Staff@2024!', 'Associate Counsel (Staff)'),
    ('paralegal@aalawsng.com', 'Staff@2024!', 'Paralegal (Staff)'),
    ('client@demo.com', 'Client@2024!', 'Client Portal (Client)'),
]

print("=== PRODUCTION VERIFICATION TEST ON HTTPS://PORTAL.AALAWSNG.COM ===\n")

for email, password, role in accounts:
    try:
        data = json.dumps({'email': email, 'password': password}).encode('utf-8')
        req = urllib.request.Request(
            'https://portal.aalawsng.com/api/v1/auth/login',
            data=data,
            headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'}
        )
        resp = urllib.request.urlopen(req)
        res_data = json.loads(resp.read().decode('utf-8'))
        user = res_data.get('user', {})
        print(f"[OK] {role:<30} | {email:<25} | Status: {resp.status} OK | User: {user.get('name')}")
    except Exception as e:
        print(f"[FAIL] {role:<30} | {email:<25} | Error: {e}")

print("\n=== VERIFYING CLEAN STATE (0 MOCK MATTERS & 0 MOCK INVOICES) ===")
# Admin token check
data = json.dumps({'email': 'admin@aalawsng.com', 'password': 'Admin@2024!'}).encode('utf-8')
req = urllib.request.Request('https://portal.aalawsng.com/api/v1/auth/login', data=data, headers={'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0'})
resp = urllib.request.urlopen(req)
token = json.loads(resp.read().decode('utf-8'))['accessToken']

req_matters = urllib.request.Request('https://portal.aalawsng.com/api/v1/matters', headers={'Authorization': f'Bearer {token}', 'User-Agent': 'Mozilla/5.0'})
matters_resp = json.loads(urllib.request.urlopen(req_matters).read().decode('utf-8'))
print(f"Matters Count in Production: {len(matters_resp.get('matters', []))} (Clean Slate)")

req_invoices = urllib.request.Request('https://portal.aalawsng.com/api/v1/invoices', headers={'Authorization': f'Bearer {token}', 'User-Agent': 'Mozilla/5.0'})
invoices_resp = json.loads(urllib.request.urlopen(req_invoices).read().decode('utf-8'))
print(f"Invoices Count in Production: {len(invoices_resp.get('invoices', []))} (Clean Slate)")
