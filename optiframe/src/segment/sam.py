import cv2
from pathlib import Path
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from segment_anything import SamAutomaticMaskGenerator, sam_model_registry

register_heif_opener()  # enables opening .HEIC/.HEIF with PIL


def convert_to_jpg(input_path, output_dir=None, quality=95):
    """Convert any image PIL can open to a .jpg file and return the new path."""
    input_path = Path(input_path)
    output_dir = Path(output_dir) if output_dir else input_path.parent
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / (input_path.stem + ".jpg")

    image = Image.open(input_path)
    image = ImageOps.exif_transpose(image)  # respect iPhone rotation
    image = image.convert("RGB")            # JPG has no alpha channel
    image.save(output_path, "JPEG", quality=quality)
    return output_path


def load_image(path):
    """Load an image as an RGB numpy array, converting to .jpg first."""
    jpg_path = convert_to_jpg(path, output_dir="converted_jpgs")
    image = cv2.imread(str(jpg_path))
    return cv2.cvtColor(image, cv2.COLOR_BGR2RGB)


sam = sam_model_registry["vit_h"](checkpoint="sam_vit_h_4b8939.pth")
mask_generator = SamAutomaticMaskGenerator(sam)

image = load_image(
    "/Users/sidney/Documents/university/Fall20206/CodeML/optiframe-participants/iCloud Photos/IMG_8919.HEIC"
)
masks = mask_generator.generate(image)

print(len(masks), "masks found")