import requests
import json
import sys

BASE_URL = "https://portal.aalawsng.com/api/v1"

print("Logging in as managing partner to verify API fixes...")
login_resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@aalawsng.com",
    "password": "Admin@2024!"
})

if login_resp.status_code != 200:
    print(f"Failed to log in: {login_resp.status_code} - {login_resp.text}")
    sys.exit(1)

data = login_resp.json()
token = data.get("accessToken") or data.get("token")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
print("Login successful. Token obtained.")

# 1. Test Matters / Types endpoint
print("\n--- 1. Testing /matters/types ---")
types_resp = requests.get(f"{BASE_URL}/matters/types", headers=headers)
print(f"Types status: {types_resp.status_code}")
types = types_resp.json()
print(f"Available matter types count: {len(types) if isinstance(types, list) else types}")

# 2. Fetch seeded matters & clients
print("\n--- 2. Fetching matters & clients ---")
m_resp = requests.get(f"{BASE_URL}/matters", headers=headers)
matters = m_resp.json().get("matters", [])
print(f"Found {len(matters)} matters in DB:")
for m in matters:
    print(f"  - [{m.get('referenceNumber')}] {m.get('title')} (ID: {m.get('id')})")

c_resp = requests.get(f"{BASE_URL}/clients", headers=headers)
clients = c_resp.json().get("clients", [])
print(f"Found {len(clients)} clients in DB:")
for c in clients:
    print(f"  - {c.get('firstName')} {c.get('lastName')} / {c.get('companyName')} (ID: {c.get('id')})")

target_matter = matters[0] if matters else None
target_client = clients[0] if clients else None

if not target_matter:
    print("ERROR: No matters found in DB!")
    sys.exit(1)

# 3. Test Task creation (with CRITICAL priority & matter/assignee resolution)
print("\n--- 3. Testing Task Creation ---")
task_payload = {
    "title": "Automated Verification Task - Engaging CDPOs",
    "description": "Verify that CDPO task creation succeeds without validation error",
    "matterId": target_matter["id"],
    "priority": "CRITICAL",  # Should be normalized or accepted
    "dueDate": "2026-09-30"
}
t_resp = requests.post(f"{BASE_URL}/tasks", headers=headers, json=task_payload)
print(f"Task creation status: {t_resp.status_code}")
if t_resp.status_code in [200, 201]:
    created_task = t_resp.json()
    print(f"SUCCESS: Task created: ID={created_task.get('id')}, priority={created_task.get('priority')}")
else:
    print(f"FAILED: {t_resp.text}")

# 4. Test Time Entry creation
print("\n--- 4. Testing Time Entry Creation ---")
time_payload = {
    "matterId": target_matter["id"],
    "date": "2026-09-02",
    "minutes": 120,
    "description": "Review of Shareholder Agreement and statutory filings",
    "isBillable": True
}
time_resp = requests.post(f"{BASE_URL}/time", headers=headers, json=time_payload)
print(f"Time entry creation status: {time_resp.status_code}")
if time_resp.status_code in [200, 201]:
    created_time = time_resp.json()
    print(f"SUCCESS: Time entry created: ID={created_time.get('id')}, hours={created_time.get('hours')}")
else:
    print(f"FAILED: {time_resp.text}")

# 5. Test Invoice creation
print("\n--- 5. Testing Invoice Creation ---")
invoice_payload = {
    "clientId": target_client["id"],
    "matterId": target_matter["id"],
    "currency": "NGN",
    "lineItems": [
        {"description": "Professional Legal Services - Shareholder Agreement Review", "quantity": 1, "unitPrice": 350000}
    ],
    "dueDate": "2026-09-20",
    "paymentDestination": "OFFICE_ACCOUNT",
    "notes": "Payment due within 14 days"
}
inv_resp = requests.post(f"{BASE_URL}/invoices", headers=headers, json=invoice_payload)
print(f"Invoice creation status: {inv_resp.status_code}")
if inv_resp.status_code in [200, 201]:
    created_inv = inv_resp.json()
    print(f"SUCCESS: Invoice created: ID={created_inv.get('id')}, total={created_inv.get('totalAmount')}")
else:
    print(f"FAILED: {inv_resp.text}")

# 6. Test Expense creation
print("\n--- 6. Testing Expense Creation ---")
exp_payload = {
    "matterId": target_matter["id"],
    "category": "SEARCH_FEE",
    "amount": 25000,
    "description": "Trademark Registry Search Fee (Class 41)",
    "isBillable": True,
    "incurredAt": "2026-09-02"
}
exp_resp = requests.post(f"{BASE_URL}/expenses", headers=headers, json=exp_payload)
print(f"Expense creation status: {exp_resp.status_code}")
if exp_resp.status_code in [200, 201]:
    created_exp = exp_resp.json()
    print(f"SUCCESS: Expense recorded: ID={created_exp.get('id')}, amount={created_exp.get('amount')}")
else:
    print(f"FAILED: {exp_resp.text}")

# 7. Test Calendar Event creation
print("\n--- 7. Testing Calendar Event Creation ---")
cal_payload = {
    "title": "Corporate Compliance Review Meeting",
    "type": "MEETING",
    "eventDate": "2026-09-15T10:00:00.000Z",
    "matterId": target_matter["id"],
    "isHardDeadline": False,
    "description": "Discuss compliance audit findings with board"
}
cal_resp = requests.post(f"{BASE_URL}/calendar", headers=headers, json=cal_payload)
print(f"Calendar event creation status: {cal_resp.status_code}")
if cal_resp.status_code in [200, 201]:
    created_cal = cal_resp.json()
    print(f"SUCCESS: Calendar event created: ID={created_cal.get('id')}")
else:
    print(f"FAILED: {cal_resp.text}")

print("\n==========================================")
print("ALL SYSTEM-WIDE TESTS COMPLETED!")
print("==========================================")
