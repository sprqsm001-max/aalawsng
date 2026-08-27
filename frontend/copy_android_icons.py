import os
import shutil

src_logo = os.path.abspath(os.path.join(os.path.dirname(__file__), "public", "logo.png"))
res_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "android", "app", "src", "main", "res"))

mipmaps = [
    "mipmap-mdpi",
    "mipmap-hdpi",
    "mipmap-xhdpi",
    "mipmap-xxhdpi",
    "mipmap-xxxhdpi",
    "drawable",
]

for m in mipmaps:
    target_folder = os.path.join(res_dir, m)
    os.makedirs(target_folder, exist_ok=True)
    shutil.copyfile(src_logo, os.path.join(target_folder, "ic_launcher.png"))
    shutil.copyfile(src_logo, os.path.join(target_folder, "ic_launcher_round.png"))
    shutil.copyfile(src_logo, os.path.join(target_folder, "ic_launcher_foreground.png"))

print("Official AALAWSNG app icon copied to all Android resource directories!")
