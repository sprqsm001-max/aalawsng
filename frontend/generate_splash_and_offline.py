import os
from PIL import Image

logo_path = r"C:\Users\user\.gemini\antigravity-ide\scratch\aalawsng\frontend\public\logo.png"
logo = Image.open(logo_path).convert("RGBA")

bg_color = (11, 15, 23, 255) # #0b0f17 dark background

resolutions = {
    "drawable": (720, 1280),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
}

base_res_dir = r"C:\Users\user\.gemini\antigravity-ide\scratch\aalawsng\frontend\android\app\src\main\res"

for folder, (width, height) in resolutions.items():
    target_dir = os.path.join(base_res_dir, folder)
    os.makedirs(target_dir, exist_ok=True)
    target_file = os.path.join(target_dir, "splash.png")

    img = Image.new("RGBA", (width, height), bg_color)
    
    # Calculate logo scale (about 35% of min dimension)
    min_dim = min(width, height)
    logo_size = int(min_dim * 0.40)
    resized_logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Paste logo at center
    x = (width - logo_size) // 2
    y = (height - logo_size) // 2
    img.paste(resized_logo, (x, y), resized_logo)
    
    img.save(target_file, "PNG")
    print(f"Generated Android splash: {target_file} ({width}x{height})")

# iOS Splash Assets
ios_splash_dir = r"C:\Users\user\.gemini\antigravity-ide\scratch\aalawsng\frontend\ios\App\App\Assets.xcassets\Splash.imageset"
if os.path.exists(ios_splash_dir):
    for splash_name in ["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"]:
        target_file = os.path.join(ios_splash_dir, splash_name)
        img = Image.new("RGBA", (2732, 2732), bg_color)
        logo_size = int(2732 * 0.35)
        resized_logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
        x = (2732 - logo_size) // 2
        y = (2732 - logo_size) // 2
        img.paste(resized_logo, (x, y), resized_logo)
        img.save(target_file, "PNG")
        print(f"Generated iOS splash: {target_file}")

print("All splash screens generated successfully!")
