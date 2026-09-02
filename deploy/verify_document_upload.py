import requests

BASE_URL = "https://portal.aalawsng.com/api/v1"

login_resp = requests.post(f"{BASE_URL}/auth/login", json={
    "email": "admin@aalawsng.com",
    "password": "Admin@2024!"
})
token = login_resp.json().get("accessToken")
headers = {"Authorization": f"Bearer {token}"}

# Fetch MOSIBYL matter
m_resp = requests.get(f"{BASE_URL}/matters", headers=headers)
matters = m_resp.json().get("matters", [])
mosibyl = next((m for m in matters if "MOSIBYL" in m["title"] or "MOSIBYL" in m["referenceNumber"]), matters[0])

print(f"Target Matter for Document: [{mosibyl['referenceNumber']}] {mosibyl['title']}")

# Test uploading document by matter UUID
files = {
    'file': ('Search_Report_MOSIBYL_Class41.pdf', b'%PDF-1.4 Mock Search Report Content for Mosibyl Class 41', 'application/pdf')
}
data = {
    'matterId': mosibyl['id'],
    'title': 'Search Report MOSIBYL (CLASS 41)',
    'category': 'PLEADING'
}

doc_resp = requests.post(f"{BASE_URL}/documents", headers=headers, data=data, files=files)
print(f"Document upload with UUID status: {doc_resp.status_code}")
if doc_resp.status_code in [200, 201]:
    doc = doc_resp.json()
    print(f"SUCCESS: Document created: ID={doc.get('id')}, title={doc.get('title')}")
else:
    print(f"FAILED: {doc_resp.text}")

# Test uploading document by matter title / name string directly (e.g. "MOSIBYL")
files2 = {
    'file': ('Search_Report_MOSIBYL_Class41_v2.pdf', b'%PDF-1.4 Mock Content 2', 'application/pdf')
}
data2 = {
    'matterId': 'MOSIBYL',  # Resilient name lookup
    'title': 'Search Report MOSIBYL (CLASS 41) - Secondary Filing',
    'category': 'CORRESPONDENCE'
}
doc_resp2 = requests.post(f"{BASE_URL}/documents", headers=headers, data=data2, files=files2)
print(f"Document upload with title string 'MOSIBYL' status: {doc_resp2.status_code}")
if doc_resp2.status_code in [200, 201]:
    doc2 = doc_resp2.json()
    print(f"SUCCESS: Document created with name resolution: ID={doc2.get('id')}, title={doc2.get('title')}")
else:
    print(f"FAILED: {doc_resp2.text}")
