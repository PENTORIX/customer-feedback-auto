from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import pytesseract
import json
import re


# ============================================================
# CONFIGURATION
# ============================================================

ROOT = Path(".")

VALID_EXT = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".bmp"
}


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_text(text):
    """
    Clean OCR output.
    """

    text = re.sub(r"\s+", " ", text).strip()

    # Remove non-name characters from beginning/end.
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


def valid_word(word):
    """
    Check whether an OCR word looks like a real username word.
    """

    word = clean_text(word)

    if not word:
        return False

    # Minimum length prevents OCR junk such as:
    # a
    # ay
    # cy
    # nn
    if len(word) < 3:
        return False

    # Maximum length prevents large text fragments.
    if len(word) > 24:
        return False

    # Must contain letters.
    if not any(char.isalpha() for char in word):
        return False

    # Reject obvious forum UI words.
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

    if word.lower() in {
        item.lower()
        for item in banned
    }:
        return False

    return True


# ============================================================
# USERNAME OCR
# ============================================================

def find_username(image):
    """
    Detect the buyer username.

    Expected screenshot format:

    ┌────────────────┬───────────────────────────────────┐
    │                │                                   │
    │     Avatar     │             Feedback              │
    │                │                                   │
    │    Genesis     │                                   │
    │     Storm      │                                   │
    │                │                                   │
    │     Elite      │                                   │
    └────────────────┴───────────────────────────────────┘

    Only the username area is sent to OCR.
    """

    width, height = image.size

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Based on the supplied forum screenshot, the username
    # is approximately here:
    #
    # X: 5.5% - 14.5%
    # Y: 30% - 53%
    #
    # This intentionally excludes:
    # - avatar
    # - PH
    # - feedback text
    # - date
    # - Elite badge
    # --------------------------------------------------------

    left = int(width * 0.055)
    top = int(height * 0.30)
    right = int(width * 0.145)
    bottom = int(height * 0.53)

    crop = image.crop(
        (
            left,
            top,
            right,
            bottom
        )
    )

    # --------------------------------------------------------
    # Upscale username.
    # --------------------------------------------------------

    crop = crop.resize(
        (
            crop.width * 8,
            crop.height * 8
        ),
        Image.Resampling.LANCZOS
    )

    # --------------------------------------------------------
    # Grayscale + contrast.
    # --------------------------------------------------------

    gray = ImageOps.grayscale(crop)

    gray = ImageOps.autocontrast(gray)

    # Slight sharpening.
    gray = gray.filter(
        ImageFilter.SHARPEN
    )

    # --------------------------------------------------------
    # Run OCR.
    # --------------------------------------------------------

    detected_lines = []

    for psm in (6, 11, 12):

        text = pytesseract.image_to_string(
            gray,
            config=f"--psm {psm}"
        )

        for raw_line in text.splitlines():

            line = clean_text(raw_line)

            if not line:
                continue

            # Split OCR line into words.
            words = line.split()

            valid_words = [
                word
                for word in words
                if valid_word(word)
            ]

            if not valid_words:
                continue

            # Keep at most 3 username words.
            if len(valid_words) > 3:
                continue

            cleaned = " ".join(valid_words)

            if cleaned:
                detected_lines.append(cleaned)

    # --------------------------------------------------------
    # Remove duplicates while keeping order.
    # --------------------------------------------------------

    unique_lines = []

    seen = set()

    for line in detected_lines:

        key = line.lower()

        if key in seen:
            continue

        seen.add(key)

        unique_lines.append(line)

    # --------------------------------------------------------
    # Most forum usernames are one or two words.
    #
    # Prefer a two-word result.
    #
    # Genesis
    # Storm
    #
    # becomes:
    #
    # Genesis Storm
    # --------------------------------------------------------

    two_word_names = [
        line
        for line in unique_lines
        if len(line.split()) == 2
    ]

    if two_word_names:

        # Prefer the longest reasonable two-word name.
        two_word_names.sort(
            key=lambda value: len(value),
            reverse=True
        )

        return two_word_names[0]

    # --------------------------------------------------------
    # One-word username fallback.
    # --------------------------------------------------------

    one_word_names = [
        line
        for line in unique_lines
        if len(line.split()) == 1
    ]

    if one_word_names:

        one_word_names.sort(
            key=lambda value: len(value),
            reverse=True
        )

        return one_word_names[0]

    # --------------------------------------------------------
    # Nothing detected.
    # --------------------------------------------------------

    return "Buyer"


# ============================================================
# PRODUCT NAME
# ============================================================

def format_product_name(folder_name):

    product = folder_name

    product = product.replace(
        "-",
        " "
    )

    product = product.replace(
        "_",
        " "
    )

    product = product.strip()

    if not product:
        return "Other"

    return product.title()


# ============================================================
# BUILD INDEX
# ============================================================

entries = []


for section in (
    "feedback",
    "resolved"
):

    root = ROOT / "images" / section

    if not root.exists():

        print(
            f"Skipping missing folder: {root}"
        )

        continue

    # --------------------------------------------------------
    # Product folders:
    #
    # images/
    #   feedback/
    #       esim/
    #       iwanttfc/
    #
    #   resolved/
    #       esim/
    #       iwanttfc/
    # --------------------------------------------------------

    for product_folder in sorted(
        root.iterdir()
    ):

        if not product_folder.is_dir():
            continue

        product = format_product_name(
            product_folder.name
        )

        # ----------------------------------------------------
        # Process every image.
        # ----------------------------------------------------

        for image_path in sorted(
            product_folder.iterdir()
        ):

            if image_path.suffix.lower() not in VALID_EXT:

                continue

            print(
                ""
            )

            print(
                "========================================"
            )

            print(
                f"Processing: {image_path}"
            )

            print(
                f"Product: {product}"
            )

            print(
                f"Type: {section}"
            )

            try:

                with Image.open(
                    image_path
                ) as image:

                    image = image.convert(
                        "RGB"
                    )

                    buyer = find_username(
                        image
                    )

                    print(
                        f"Detected buyer: {buyer}"
                    )

            except Exception as error:

                print(
                    f"OCR failed: {error}"
                )

                buyer = "Buyer"

            # ------------------------------------------------
            # Add entry.
            # ------------------------------------------------

            entries.append(
                {
                    "buyer": buyer,
                    "item": product,
                    "type": section,
                    "image": image_path.as_posix()
                }
            )


# ============================================================
# WRITE JSON
# ============================================================

output_file = ROOT / "feedback-index.json"

output_file.write_text(
    json.dumps(
        entries,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)


print("")
print("========================================")
print("FEEDBACK INDEX COMPLETE")
print("========================================")
print(
    f"Total images indexed: {len(entries)}"
)
print(
    f"Output: {output_file}"
)
