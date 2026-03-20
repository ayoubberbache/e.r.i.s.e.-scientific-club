from PIL import Image

def process_logo(input_path, output_path):
    img = Image.open(input_path).convert('RGBA')
    bg = Image.new('RGBA', img.size, (255, 255, 255, 0))
    diff = Image.composite(img, bg, img)
    bbox = diff.getbbox()
    if bbox:
        img_cropped = img.crop(bbox)
        
        # Max dimension to make a square
        max_dim = max(img_cropped.width, img_cropped.height)
        
        # Create a new square image with a transparent background
        new_img = Image.new('RGBA', (max_dim, max_dim), (255, 255, 255, 0))
        
        # Paste the cropped image in the center
        paste_x = (max_dim - img_cropped.width) // 2
        paste_y = (max_dim - img_cropped.height) // 2
        new_img.paste(img_cropped, (paste_x, paste_y))
        
        # We save this
        new_img.save(output_path)
        print(f"Processed {input_path} -> {output_path} (Size: {max_dim}x{max_dim})")
    else:
        print(f"Failed to find bounding box for {input_path}")

process_logo(r'C:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\logo-cyan-full.png', r'C:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\logo-cyan-full.png')
process_logo(r'C:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\logo-teal-full.png', r'C:\Users\Ayoub Berbache\Desktop\e.r.i.s.e.-scientific-club\public\logo-teal-full.png')
