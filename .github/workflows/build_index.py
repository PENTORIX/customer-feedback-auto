from pathlib import Path
from PIL import Image, ImageOps
import pytesseract
import json
import re

ROOT = Path(".")
VALID_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def clean_line(text):
    return re.sub(r"\s+", " ", text).strip()


def find_username(image):
    width, height = image.size

    # Forum screenshots usually show the username
    # in the left/profile area.
    crops = [
        image.crop((0, 0, int(width * 0.30), int(height * 0.80))),
        image
    ]

    banned = {
        "PH",
        "Elite",
        "VIP",
        "Member",
        "Staff",
        "Moderator",
        "Admin",
        "Online",
        "Offline",
        "You",
        "Love",
        "Reply",
        "Report",
        "Share",
        "Quote"
    }

    candidates = []

    for crop in crops:
        gray = ImageOps.grayscale(crop)

        # Make small forum usernames easier for OCR.
        gray = gray.resize(
            (gray.width * 2, gray.height * 2)
        )

        text = pytesseract.image_to_string(
            gray,
            config="--psm 11"
        )

        for raw_line in text.splitlines():

            line = clean_line(raw_line)

            if not line:
                continue

            if line in banned:
                continue

            if len(line) > 35:
                continue

            # Remove OCR junk around the name.
            line = re.sub(
                r"^[^A-Za-z0-9@._-]+|[^A-Za-z0-9@._-]+$",
                "",
                line
            )

            if not line:
                continue

            words = line.split()

            if len(words) > 4:
                continue

            if not any(char.isalpha() for char in line):
                continue

            score = 0

            if len(words) <= 3:
                score += 3

            if 2 <= len(line) <= 24:
                score += 2

            if not re.search(r"[.!?,:;]", line):
                score += 1

            candidates.append((score, line))

    if not candidates:
        return "Buyer"

    candidates.sort(
        key=lambda item: (-item[0], len(item[1]))
    )

    return candidates[0][1]


entries = []

for section in ("feedback", "resolved"):

    root = ROOT / "images" / section

    if not root.exists():
        continue

    # Each folder inside feedback/resolved is the product.
    for product_folder in sorted(root.iterdir()):

        if not product_folder.is_dir():
            continue

        product = product_folder.name

        product = product.replace("-", " ")
        product = product.replace("_", " ")
        product = product.strip()

        if product:
            product = product.title()
        else:
            product = "Other"

        # Process every image in the product folder.
        for image_path in sorted(product_folder.iterdir()):

            if image_path.suffix.lower() not in VALID_EXT:
                continue

            try:

                with Image.open(image_path) as image:

                    image = image.convert("RGB")

                    buyer = find_username(image)

            except Exception as error:

                print(
                    f"OCR failed for {image_path}: {error}"
                )

                buyer = "Buyer"

            entries.append({
                "buyer": buyer,
                "item": product,
                "type": section,
                "image": image_path.as_posix()
            })


Path("feedback-index.json").write_text(
    json.dumps(
        entries,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)

print(
    f"Indexed {len(entries)} feedback images."
)
