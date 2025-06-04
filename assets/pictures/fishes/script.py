from PIL import Image
import os

# Get the current directory
current_dir = os.getcwd()

# Supported image formats
image_extensions = ('.png', '.jpg', '.jpeg', '.bmp', '.gif')

# Iterate through all files in the current directory
for filename in os.listdir(current_dir):
    if filename.lower().endswith(image_extensions):
        try:
            # Open the image
            with Image.open(filename) as img:
                # Calculate new height maintaining aspect ratio
                aspect_ratio = img.height / img.width
                new_height = int(78 * aspect_ratio)
                
                # Resize image
                resized_img = img.resize((78, new_height), Image.Resampling.LANCZOS)
                
                # Save and replace the original file
                resized_img.save(filename, quality=95)
                print(f"Resized and replaced: {filename}")
                
        except Exception as e:
            print(f"Error processing {filename}: {str(e)}")