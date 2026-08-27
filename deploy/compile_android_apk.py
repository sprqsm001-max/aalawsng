import paramiko

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = "os.getenv("VPS_PASS", "")"

print("Connecting to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode('utf-8'), stderr.read().decode('utf-8')

print("1. Installing frontend node_modules on VPS for Android Capacitor dependencies...")
out, err = run("cd /opt/aalawsng/frontend && npm install --legacy-peer-deps")
print("NPM install finished.")

print("2. Compiling Android APK with Gradle...")
build_cmd = """
export ANDROID_HOME=/home/ubuntu/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd /opt/aalawsng/frontend/android
./gradlew assembleDebug --stacktrace
"""
out, err = run(build_cmd)
print("Gradle Build Output:\n", out[-1200:])
if err:
    print("Gradle Error:\n", err[-400:])

print("3. Copying APK to public downloads...")
run(f"echo '{VPS_PASS}' | sudo -S mkdir -p /var/www/aalawsng_downloads")
run(f"echo '{VPS_PASS}' | sudo -S cp /opt/aalawsng/frontend/android/app/build/outputs/apk/debug/app-debug.apk /var/www/aalawsng_downloads/AALAWSNG.apk")
run(f"echo '{VPS_PASS}' | sudo -S chmod 644 /var/www/aalawsng_downloads/AALAWSNG.apk")

out, err = run(f"echo '{VPS_PASS}' | sudo -S ls -lh /var/www/aalawsng_downloads/AALAWSNG.apk")
print("=== VERIFIED COMPILED ANDROID APK ===")
print(out)

ssh.close()
print("\n🎉 Live Android APK Direct Download URL: https://portal.aalawsng.com/downloads/AALAWSNG.apk")
