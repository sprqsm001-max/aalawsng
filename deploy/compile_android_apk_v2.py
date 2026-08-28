import os
import tarfile
import tempfile
import paramiko
import time

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = os.getenv("VPS_PASS", "VrrGnSSqskNyp")

print("1. Creating tar of updated frontend and android project...")
temp_tar = tempfile.mktemp(suffix="_android_update.tar.gz")
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))

with tarfile.open(temp_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(base_dir):
        # Skip node_modules and .next
        if "node_modules" in dirs:
            dirs.remove("node_modules")
        if ".next" in dirs:
            dirs.remove(".next")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_dir)
            tar.add(full_path, arcname=rel_path)

print(f"Archive size: {os.path.getsize(temp_tar)} bytes")

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
print(f"Connecting to {VPS_IP}...")
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Connected to VPS!")

def run_sudo(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S {cmd}"
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

print("2. Uploading updated frontend & Android source...")
sftp = ssh.open_sftp()
sftp.put(temp_tar, "/tmp/android_update.tar.gz")
sftp.close()

print("3. Extracting files on VPS...")
run_sudo("mkdir -p /opt/aalawsng/frontend")
run_sudo("tar -xzf /tmp/android_update.tar.gz -C /opt/aalawsng/frontend")
run_sudo("rm -f /tmp/android_update.tar.gz")

print("4. Syncing Capacitor and compiling APK with Gradle...")
# Sync capacitor and build APK
build_cmd = """
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=/home/ubuntu/android-sdk
export ANDROID_SDK_ROOT=/home/ubuntu/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools
cd /opt/aalawsng/frontend
npx cap sync android
cd /opt/aalawsng/frontend/android
echo "sdk.dir=/home/ubuntu/android-sdk" > local.properties
chmod +x gradlew
./gradlew assembleDebug --no-daemon
"""
out, err = run_sudo(f"bash -c '{build_cmd}'")
print("Gradle Build Output:")
print(out[-800:].encode('ascii', 'replace').decode('ascii'))
if err:
    print("Gradle Errors:", err[-400:].encode('ascii', 'replace').decode('ascii'))

print("5. Publishing compiled APK to Nginx downloads directory...")
run_sudo("mkdir -p /var/www/aalawsng_downloads")
run_sudo("cp -f /opt/aalawsng/frontend/android/app/build/outputs/apk/debug/app-debug.apk /var/www/aalawsng_downloads/AALAWSNG.apk")
run_sudo("chmod 644 /var/www/aalawsng_downloads/AALAWSNG.apk")

out, err = run_sudo("ls -lh /var/www/aalawsng_downloads/AALAWSNG.apk")
print("Verified APK File:", out.encode('ascii', 'replace').decode('ascii'))

ssh.close()
os.remove(temp_tar)
print("[SUCCESS] APK Rebuild and Deployment Complete!")
