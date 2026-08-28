import os
import json

b64 = open("deploy/logo_b64.txt", "r", encoding="utf-8").read().strip()

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>No Connection — AALAWSNG</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; user-select: none; }}
    body {{
      background-color: #0b0f17;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      text-align: center;
      overflow: hidden;
    }}
    .container {{ max-width: 360px; width: 100%; display: flex; flex-direction: column; align-items: center; }}
    .logo-wrapper {{ position: relative; margin-bottom: 24px; }}
    .logo-img {{ width: 88px; height: 88px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255, 255, 255, 0.15); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.8); display: block; }}
    .pulse-ring {{ position: absolute; top: -6px; left: -6px; right: -6px; bottom: -6px; border-radius: 50%; border: 2px solid rgba(0, 184, 98, 0.4); animation: pulse 2.5s infinite; }}
    @keyframes pulse {{ 0% {{ transform: scale(0.95); opacity: 0.8; }} 50% {{ transform: scale(1.15); opacity: 0; }} 100% {{ transform: scale(0.95); opacity: 0; }} }}
    .offline-badge {{ display: inline-flex; align-items: center; gap: 6px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3); color: #f87171; padding: 5px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }}
    .offline-dot {{ width: 7px; height: 7px; border-radius: 50%; background-color: #ef4444; }}
    h1 {{ font-size: 21px; font-weight: 700; margin-bottom: 8px; color: #ffffff; }}
    p {{ font-size: 13px; line-height: 1.5; color: #94a3b8; margin-bottom: 28px; }}
    .btn-retry {{ width: 100%; background: #00b862; color: #052e16; border: none; border-radius: 8px; padding: 13px 20px; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 14px rgba(0, 184, 98, 0.35); }}
    .btn-retry:active {{ transform: scale(0.98); background: #009e53; }}
    .spinner {{ width: 16px; height: 16px; border: 2px solid #052e16; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; display: none; }}
    @keyframes spin {{ to {{ transform: rotate(360deg); }} }}
    .footer-text {{ position: absolute; bottom: 24px; font-size: 11px; color: #475569; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="logo-wrapper">
      <div class="pulse-ring"></div>
      <img src="data:image/png;base64,{b64}" alt="AALAWSNG" class="logo-img">
    </div>
    <div class="offline-badge">
      <span class="offline-dot"></span>
      <span>No Internet Connection</span>
    </div>
    <h1>Unable to Connect</h1>
    <p>Please check your mobile data or Wi-Fi connection and tap below to retry.</p>
    <button id="retryBtn" class="btn-retry" onclick="retryConnection()">
      <span id="spinner" class="spinner"></span>
      <span id="btnText">Try Again</span>
    </button>
  </div>
  <div class="footer-text">Adeola Kolawole & Associates · Legal Management System</div>
  <script>
    function retryConnection() {{
      const btn = document.getElementById('retryBtn');
      const spinner = document.getElementById('spinner');
      const text = document.getElementById('btnText');
      spinner.style.display = 'inline-block';
      text.textContent = 'Connecting…';
      btn.style.opacity = '0.8';
      btn.disabled = true;
      setTimeout(() => {{
        window.location.href = 'https://portal.aalawsng.com';
      }}, 600);
    }}
    window.addEventListener('online', () => {{ retryConnection(); }});
  </script>
</body>
</html>"""

# Convert to JSON string for safe Java string literal
json_str = json.dumps(html)

java_code = f"""package com.aalawsng.portal;

import android.os.Bundle;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

public class MainActivity extends BridgeActivity {{
    private static final String OFFLINE_HTML = {json_str};

    @Override
    public void onCreate(Bundle savedInstanceState) {{
        super.onCreate(savedInstanceState);

        if (this.bridge != null && this.bridge.getWebView() != null) {{
            this.bridge.getWebView().setWebViewClient(new BridgeWebViewClient(this.bridge) {{
                @Override
                public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {{
                    if (request != null && request.isForMainFrame()) {{
                        view.loadDataWithBaseURL("https://portal.aalawsng.com", OFFLINE_HTML, "text/html", "UTF-8", null);
                    }} else {{
                        super.onReceivedError(view, request, error);
                    }}
                }}

                @Override
                public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {{
                    view.loadDataWithBaseURL("https://portal.aalawsng.com", OFFLINE_HTML, "text/html", "UTF-8", null);
                }}
            }});
        }}
    }}
}}
"""

target_java = r"C:\Users\user\.gemini\antigravity-ide\scratch\aalawsng\frontend\android\app\src\main\java\com\aalawsng\portal\MainActivity.java"
with open(target_java, "w", encoding="utf-8") as f:
    f.write(java_code)

print("Generated MainActivity.java with embedded offline page.")
