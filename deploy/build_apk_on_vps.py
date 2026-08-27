import os
import tarfile
import tempfile
import paramiko
import time

VPS_IP = "145.239.78.148"
VPS_USER = "ubuntu"
VPS_PASS = "os.getenv("VPS_PASS", "")"

print("1. Creating tar archive of frontend/android project...")
android_tar = tempfile.mktemp(suffix="_android.tar.gz")
base_android = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "android"))

with tarfile.open(android_tar, "w:gz") as tar:
    for root, dirs, files in os.walk(base_android):
        if ".gradle" in dirs:
            dirs.remove(".gradle")
        if "build" in dirs:
            dirs.remove("build")
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, base_android)
            tar.add(full_path, arcname=rel_path)

print("Connecting to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_IP, username=VPS_USER, password=VPS_PASS, timeout=30)
print("Connected!")

def run_cmd(cmd):
    full_cmd = f"echo '{VPS_PASS}' | sudo -S bash -c \"{cmd}\""
    stdin, stdout, stderr = ssh.exec_command(full_cmd)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    return out, err

print("2. Uploading Android codebase to VPS...")
sftp = ssh.open_sftp()
sftp.put(android_tar, "/tmp/android_code.tar.gz")
sftp.close()

run_cmd("mkdir -p /opt/aalawsng/frontend/android")
run_cmd("tar -xzf /tmp/android_code.tar.gz -C /opt/aalawsng/frontend/android")
run_cmd("chmod +x /opt/aalawsng/frontend/android/gradlew")
run_cmd("rm -f /tmp/android_code.tar.gz")

print("3. Setting up Android SDK on VPS...")
sdk_setup_script = """
set -e
export ANDROID_HOME=/opt/android-sdk
if [ ! -d "/opt/android-sdk/cmdline-tools" ]; then
    echo "Downloading Android Command Line Tools..."
    mkdir -p /opt/android-sdk/cmdline-tools
    cd /tmp
    wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
    unzip -q commandlinetools-linux-11076708_latest.zip
    mkdir -p /opt/android-sdk/cmdline-tools/latest
    cp -r cmdline-tools/* /opt/android-sdk/cmdline-tools/latest/
    rm -rf cmdline-tools commandlinetools-linux-11076708_latest.zip
fi

export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$PATH
echo "Accepting licenses and installing Android SDK Platform 34..."
yes | sdkmanager --licenses > /dev/null 2>&1 || true
sdkmanager "platform-tools" "platforms;android-34" "build-tools;34.0.0" > /dev/null 2>&1
"""

out, err = run_cmd(sdk_setup_script)
print("SDK Setup complete!")

print("4. Building Android APK using Gradle on VPS...")
build_script = """
set -e
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
cd /opt/aalawsng/frontend/android
./gradlew assembleDebug --no-daemon
"""

out, err = run_cmd(build_script)
print("Gradle Build Output:\n", out[-800:])

print("5. Publishing APK to web downloads directory...")
publish_script = """
mkdir -p /var/www/aalawsng_downloads
cp /opt/aalawsng/frontend/android/app/build/outputs/apk/debug/app-debug.apk /var/www/aalawsng_downloads/AALAWSNG-app.apk
chmod 644 /var/www/aalawsng_downloads/AALAWSNG-app.apk
"""
out, err = run_cmd(publish_script)

print("6. Configuring Nginx for /downloads location...")
nginx_config = """
server {
    server_name portal.aalawsng.com;

    location /downloads/ {
        alias /var/www/aalawsng_downloads/;
        autoindex off;
        add_header Content-Disposition 'attachment; filename="AALAWSNG.apk"';
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl http2;
    ssl_certificate /etc/letsencrypt/live/portal.aalawsng.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.aalawsng.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = portal.aalawsng.com) {
        return 301 https://$host$request_uri;
    }
    listen 80;
    server_name portal.aalawsng.com;
    return 404;
}
"""

with open(tempfile.mktemp(), "w") as f:
    f.write(nginx_config)
    tmp_path = f.name

sftp = ssh.open_sftp()
sftp.put(tmp_path, "/tmp/nginx_downloads.conf")
sftp.close()
os.remove(tmp_path)

run_cmd("cp /tmp/nginx_downloads.conf /etc/nginx/sites-available/portal.aalawsng.com")
run_cmd("nginx -t && systemctl reload nginx")

print("Verification: Checking APK file size...")
out, err = run_cmd("ls -lh /var/www/aalawsng_downloads/AALAWSNG-app.apk")
print("File:", out)

ssh.close()
os.remove(android_tar)
print("Android APK Build & Hosting Complete!")
print("Download URL: https://portal.aalawsng.com/downloads/AALAWSNG-app.apk")
