from PIL import Image
import numpy as np
import os

def process(input_path, output_path):
    print(f"Processing {input_path} -> {output_path}")
    img = Image.open(input_path).convert('RGB')
    
    # Crop top 120 and bottom 140
    w, h = img.size
    img = img.crop((0, 120, w, h - 140))
    
    # Convert to numpy for color adjust
    arr = np.array(img, dtype=np.float32)
    # Reduce blue channel and green channel slightly to counteract cyan tint
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.05, 0, 255) # R
    arr[:, :, 1] = np.clip(arr[:, :, 1] * 0.98, 0, 255) # G
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.92, 0, 255) # B
    
    img_fixed = Image.fromarray(arr.astype(np.uint8))
    img_fixed.save(output_path, quality=95)

in_files = [
    r"C:\Users\Ayoub Berbache\.gemini\antigravity\brain\806a7c7d-3a55-4c34-9744-34dc53489640\media__1774532476064.jpg",
    r"C:\Users\Ayoub Berbache\.gemini\antigravity\brain\806a7c7d-3a55-4c34-9744-34dc53489640\media__1774532476026.jpg",
    r"C:\Users\Ayoub Berbache\.gemini\antigravity\brain\806a7c7d-3a55-4c34-9744-34dc53489640\media__1774532475918.jpg"
]

out_files = [
    r"c:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\achievements-assets\hackathon-1.jpg",
    r"c:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\achievements-assets\hackathon-2.jpg",
    r"c:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\achievements-assets\hackathon-3.jpg"
]

# Create output dir if not exist
os.makedirs(r"c:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\achievements-assets", exist_ok=True)

for inf, outf in zip(in_files, out_files):
    if os.path.exists(inf):
        process(inf, outf)
    else:
        print(f"Not found: {inf}")
