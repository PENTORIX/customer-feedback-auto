from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import pytesseract
import json
import re


ROOT = Path(".")
VALID_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


def clean_text(text):
    text = re.sub(r"\s+", " ", text).strip()

    # Remove common OCR junk at the beginning/end.
    text = re.sub(
        r"^[^A-Za-z0-9@._-]+",
        "",
        text
    )

    text = re.sub(
        r"[^A-Za-z0-9@._-]+$",
        "",
        text
    )

    return text.strip()


def looks_like_username(text):
    if not text:
        return False

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
        "Quote",
        "Thanks",
        "Thank",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat",
        "Sun"
    }

    if text in banned:
        return False

    if len(text) < 3 or len(text) > 30:
        return False

    if len(text.split()) > 4:
        return False

    # Don't accept obvious sentence fragments.
    if re.search(r"[.!?,:;]", text):
        return False

    # Must contain at least one letter.
    if not any(c.isalpha() for c in text):
        return False

    return True


def preprocess(image):
    gray = ImageOps.grayscale(image)

    # Upscale the username.
    gray = gray.resize(
        (
            gray.width * 4,
            gray.height * 4
        )
    )

    # Improve small text.
    gray = ImageOps.autocontrast(gray)

    return gray


def find_username(image):

    width, height = image.size

    # IMPORTANT:
    # The forum screenshot places the username
    # in the left profile/sidebar area.
    #
    # We test several slightly different crops because
    # screenshots can have different heights.

    crops = [
        image.crop((
            0,
            int(height * 0.20),
            int(width * 0.22),
            int(height * 0.70)
        )),

        image.crop((
            0,
            int(height * 0.25),
            int(width * 0.20),
            int(height * 0.60)
        )),

        image.crop((
            0,
            int(height * 0.15),
            int(width * 0.25),
            int(height * 0.75)
        ))
    ]

    candidates = []

    for crop_number, crop in enumerate(crops):

        processed = preprocess(crop)

        # Try several Tesseract layouts.
        for psm in (6, 11, 12):

            text = pytesseract.image_to_string(
                processed,
                config=f"--psm {psm}"
            )

            raw_lines = [
                clean_text(x)
                for x in text.splitlines()
            ]

            lines = [
                x for x in raw_lines
                if looks_like_username(x)
            ]

            # -------------------------------------------------
            # Single-line candidates
            # -------------------------------------------------

            for line in lines:

                score = 0

                # Prefer names with 1-3 words.
                words = line.split()

                if len(words) <= 3:
                    score += 4

                # Username-sized text.
                if 3 <= len(line) <= 24:
                    score += 3

                # Prefer alphabetic names.
                if sum(c.isalpha() for c in line) >= 4:
                    score += 2

                # First/second crop is usually the best area.
                if crop_number == 0:
                    score += 3

                candidates.append(
                    (score, line)
                )

            # -------------------------------------------------
            # Combine adjacent lines.
            #
            # Example:
            #
            # Genesis
            # Storm
            #
            # becomes:
            #
            # Genesis Storm
            # -------------------------------------------------

            for i in range(len(lines) - 1):

                combined = (
                    lines[i]
                    + " "
                    + lines[i + 1]
                )

                combined = clean_text(combined)

                if not looks_like_username(combined):
                    continue

                score = 12

                if crop_number == 0:
                    score += 4

                candidates.append(
                    (score, combined)
                )

    # ---------------------------------------------------------
    # Remove duplicates and prefer the strongest candidate.
    # ---------------------------------------------------------

    unique = {}

    for score, name in candidates:

        key = name.lower()

        if key not in unique:
            unique[key] = (score, name)
        else:
            if score > unique[key][0]:
                unique[key] = (score, name)

    if not unique:
        return "Buyer"

    ranked = sorted(
        unique.values(),
        key=lambda x: (-x[0], len(x[1]))
    )

    return ranked[0][1]


entries = []


for section in ("feedback", "resolved"):

    root = ROOT / "images" / section

    if not root.exists():
        continue

    # Product is determined by the folder name.
    #
    # feedback/esim
    # feedback/iwanttfc
    #
    # resolved/esim
    # resolved/iwanttfc

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

        for image_path in sorted(product_folder.iterdir()):

            if image_path.suffix.lower() not in VALID_EXT:
                continue

            try:

                with Image.open(image_path) as image:

                    image = image.convert("RGB")

                    buyer = find_username(image)

                    print(
                        f"OCR: {image_path} -> {buyer}"
                    )

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
