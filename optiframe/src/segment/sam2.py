import numpy as np
import torch
from PIL import Image, ImageOps
from pillow_heif import register_heif_opener
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
from segment_anything import sam_model_registry, SamPredictor

register_heif_opener()
device = "cuda" if torch.cuda.is_available() else "cpu"

PATH = "C:/Users/sidne/OneDrive/Bureau/Fall2026/SNSF-Opti-SARA/images/IMG_9292.jpg"
# IMAGE_PATH = "C:/Users/sidne/OneDrive/Bureau/Fall2026/SNSF-Opti-SARA/images/IMG_9292.jpg"
# SAM_CHECKPOINT = "C:/Users/sidne/OneDrive/Bureau/Fall2026/SNSF-Opti-SARA/optiframe/src/sam_vit_h_4b8939.pth"
PROMPT = "eyeglass lens."  # en minuscules, terminé par un point

# Image
img = ImageOps.exif_transpose(Image.open(PATH)).convert("RGB")
img.thumbnail((1024, 1024))
image = np.array(img)

# 1) Texte -> boîtes (Grounding DINO)
model_id = "IDEA-Research/grounding-dino-tiny"
processor = AutoProcessor.from_pretrained(model_id)
dino = AutoModelForZeroShotObjectDetection.from_pretrained(model_id).to(device)

inputs = processor(images=img, text=PROMPT, return_tensors="pt").to(device)
with torch.no_grad():
    outputs = dino(**inputs)

results = processor.post_process_grounded_object_detection(
    outputs, inputs.input_ids,
    threshold=0.3, text_threshold=0.25,   # 'box_threshold=' dans les anciennes versions
    target_sizes=[img.size[::-1]],
)[0]
boxes = results["boxes"].cpu().numpy()
print(len(boxes), "lentilles détectées")

# 2) Boîtes -> masques (SAM)
sam = sam_model_registry["vit_h"](checkpoint="../sam_vit_h_4b8939.pth")
predictor = SamPredictor(sam)
predictor.set_image(image)

masks = []
for box in boxes:
    m, scores, _ = predictor.predict(box=box, multimask_output=False)
    masks.append(m[0])

print(len(masks), "masques")

import os
import matplotlib.pyplot as plt

os.makedirs("output", exist_ok=True)

# --- 1) Overlay: every mask in a different color, plus the detection boxes ---
rng = np.random.default_rng(0)
overlay = image.copy().astype(np.float32)
for m in masks:
    color = rng.integers(50, 255, size=3)
    overlay[m] = 0.5 * overlay[m] + 0.5 * color
overlay = overlay.astype(np.uint8)

fig, ax = plt.subplots(figsize=(10, 8))
ax.imshow(overlay)
for i, box in enumerate(boxes):
    x0, y0, x1, y1 = box
    ax.add_patch(plt.Rectangle((x0, y0), x1 - x0, y1 - y0,
                               fill=False, edgecolor="lime", linewidth=2))
    ax.text(x0, y0 - 4, f"lens {i}", color="lime", fontsize=10)
ax.axis("off")
fig.savefig("output/overlay.png", bbox_inches="tight", dpi=150)

# --- 2) Individual binary masks and transparent cutouts ---
for i, m in enumerate(masks):
    mask_u8 = (m * 255).astype(np.uint8)
    Image.fromarray(mask_u8).save(f"output/mask_{i}.png")
    cutout = np.dstack([image, mask_u8])
    Image.fromarray(cutout, "RGBA").save(f"output/cutout_{i}.png")

print(f"Saved {len(masks)} masks to ./output/")
plt.show()
