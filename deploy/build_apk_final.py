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

print("1. Accepting all Android SDK Licenses...")
accept_licenses = """
mkdir -p /home/ubuntu/android-sdk/licenses
echo -e "24333f8a63b6825ea9c5514f83c2829b004d1fee\\nd56f5187479451eabf01fb78ba6ed6e792491847\\n84831b9409646a2b8eac4440230a9e7d0c647723" > /home/ubuntu/android-sdk/licenses/android-sdk-license
echo -e "84831b9409646a2b8eac4440230a9e7d0c647723" > /home/ubuntu/android-sdk/licenses/android-sdk-preview-license
echo -e "8933ed6d28850404b2a83da04d10f47d6f0852eb\\n73976229e235bd7e7b21f9b3a48014568b27a55c" > /home/ubuntu/android-sdk/licenses/android-googletv-license
echo -e "33b6a2b64920268e6d14a456010789619645601b" > /home/ubuntu/android-sdk/licenses/google-gdk-license
echo -e "e9acab5b5fbb560a72cfaecce23460d90867b63e" > /home/ubuntu/android-sdk/licenses/mips-android-sysimage-license
"""
run(accept_licenses)

print("2. Compiling Android APK with Gradle...")
build_cmd = """
export ANDROID_HOME=/home/ubuntu/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd /opt/aalawsng/frontend/android
./gradlew assembleDebug
"""
out, err = run(build_cmd)
print("Gradle Output:\n", out[-1000:])
print("Gradle Error:\n", err[-500:])

print("3. Copying APK to downloads...")
run(f"echo '{VPS_PASS}' | sudo -S mkdir -p /var/www/aalawsng_downloads")
run(f"echo '{VPS_PASS}' | sudo -S cp /opt/aalawsng/frontend/android/app/build/outputs/apk/debug/app-debug.apk /var/www/aalawsng_downloads/AALAWSNG.apk")
run(f"echo '{VPS_PASS}' | sudo -S chmod 644 /var/www/aalawsng_downloads/AALAWSNG.apk")

out, err = run(f"echo '{VPS_PASS}' | sudo -S ls -lh /var/www/aalawsng_downloads/AALAWSNG.apk")
print("Compiled APK:\n", out)

ssh.close()
