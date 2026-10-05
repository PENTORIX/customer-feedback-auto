from pathlib import Path
from PIL import Image, ImageOps
import pytesseract
import json
import re

ROOT = Path(".")
VALID_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}

def clean_line(s):
    s = re.sub(r"\s+", " ", s).strip()
    return s

def find_username(image):
    # Most forum screenshots put the username/avatar in the left profile area.
    # OCR that area first, then fall back to the full image.
    w, h = image.size
    crops = [
        image.crop((0, 0, int(w * 0.30), int(h * 0.80))),
        image
    ]

    banned = {
        "PH", "Elite", "VIP", "Member", "Staff", "Moderator",
        "Admin", "Online", "Offline", "You", "Love", "Reply",
        "Report", "Share", "Quote"
    }

    candidates = []
    for crop in crops:
        gray = ImageOps.grayscale(crop)
        # Upscale the small profile/sidebar text.
        scale = 2
        gray = gray.resize((gray.width * scale, gray.height * scale))
        txt = pytesseract.image_to_string(gray, config="--psm 11")
        for raw in txt.splitlines():
            line = clean_line(raw)
            if not line or line in banned:
                continue
            if len(line) > 35:
                continue
            # Remove common OCR junk/punctuation while keeping forum-name characters.
            line = re.sub(r"^[^A-Za-z0-9@._-]+|[^A-Za-z0-9@._-]+$", "", line)
            if not line:
                continue
            words = line.split()
            if len(words) > 4:
                continue
            # Prefer lines that look like a username/name rather than sentence text.
            if any(c.isalpha() for c in line):
                score = 0
                if len(words) <= 3: score += 3
                if 2 <= len(line) <= 24: score += 2
                if not re.search(r"[.!?,:;]", line): score += 1
                candidates.append((score, line))

    if not candidates:
        return "Buyer"

    candidates.sort(key=lambda x: (-x[0], len(x[1])))
    return candidates[0][1]

entries = []
for root_name in ("feedback", "resolved"):
    root = ROOT / "images" / root_name
    if not root.exists():
        continue

    for product_dir in sorted(p for p in root.iterdir() if p.is_dir()):
        product = product_dir.name.replace("-", " ").replace("_", " ").strip()
        product = product.title() if product else "Other"

        for img_path in sorted(product_dir.iterdir()):
            if img_path.suffix.lower() not in VALID_EXT:
                continue
            try:
                with Image.open(img_path) as im:
                    buyer = find_username(im.convert("RGB"))
            except Exception as exc:
                print(f"OCR failed for {img_path}: {exc}")
                buyer = "Buyer"

            entries.append({
                "buyer": buyer,
                "item": product,
                "type": root_name,
                "image": img_path.as_posix()
            })

Path("feedback-index.json").write_text(
    json.dumps(entries, ensure_ascii=False, indent=2),
    encoding="utf-8"
)
print(f"Indexed {len(entries)} images")
