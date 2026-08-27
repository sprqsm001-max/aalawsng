import paramiko

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = "os.getenv("VPS_PASS", "")"

print("Connecting to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)

def run_sudo(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S bash -c '{cmd}'"
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')

print("1. Installing Node.js on VPS host...")
out, err = run_sudo("curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs")
print("Node.js setup:", out[-200:])

print("2. Installing Capacitor dependencies in /opt/aalawsng/frontend...")
out, err = run_sudo("cd /opt/aalawsng/frontend && npm install @capacitor/core@^6.0.0 @capacitor/cli@^6.0.0 @capacitor/android@^6.0.0 @capacitor/app@^6.0.0 @capacitor/camera@^6.0.0 @capacitor/haptics@^6.0.0 @capacitor/preferences@^6.0.0 @capacitor/push-notifications@^6.0.0 @capacitor/status-bar@^6.0.0 --legacy-peer-deps")
print("NPM install finished.")

print("3. Compiling Android APK with Gradle...")
build_cmd = """
export ANDROID_HOME=/home/ubuntu/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd /opt/aalawsng/frontend/android
./gradlew assembleDebug
"""
out, err = run_sudo(build_cmd)
print("Gradle Build Output:\n", out[-1200:])
if err:
    print("Gradle Stderr:\n", err[-500:])

print("4. Copying generated APK to downloads directory...")
run_sudo("mkdir -p /var/www/aalawsng_downloads")
run_sudo("cp /opt/aalawsng/frontend/android/app/build/outputs/apk/debug/app-debug.apk /var/www/aalawsng_downloads/AALAWSNG.apk")
run_sudo("chmod 644 /var/www/aalawsng_downloads/AALAWSNG.apk")

out, err = run_sudo("ls -lh /var/www/aalawsng_downloads/AALAWSNG.apk")
print("=== VERIFIED COMPILED ANDROID APK ===")
print(out)

ssh.close()
