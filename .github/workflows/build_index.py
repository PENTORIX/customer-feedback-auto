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

    text = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

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


# ============================================================
# VALID USERNAME WORD
# ============================================================

def valid_word(word):

    word = clean_text(word)

    if not word:
        return False

    if len(word) < 3:
        return False

    if len(word) > 24:
        return False

    if not any(
        char.isalpha()
        for char in word
    ):
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

    if word.lower() in {
        item.lower()
        for item in banned
    }:
        return False

    return True


# ============================================================
# USERNAME VALIDATION
# ============================================================

def looks_like_username(text):

    if not text:
        return False

    text = clean_text(text)

    if len(text) < 3:
        return False

    if len(text) > 30:
        return False

    if len(text.split()) > 3:
        return False

    if not any(
        char.isalpha()
        for char in text
    ):
        return False

    # Reject obvious sentence fragments.
    if re.search(
        r"[.!?,:;]",
        text
    ):
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
        "Thank"
    }

    if text.lower() in {
        item.lower()
        for item in banned
    }:
        return False

    return True


# ============================================================
# USERNAME DETECTION
# ============================================================

def find_username(image):

    width, height = image.size

    # --------------------------------------------------------
    # Username area from the forum screenshot.
    #
    # Example screenshot:
    #
    # ┌────────────────┬──────────────────────────────────┐
    # │                │                                  │
    # │    Avatar      │            Feedback              │
    # │                │                                  │
    # │    Genesis     │                                  │
    # │     Storm      │                                  │
    # │                │                                  │
    # │     Elite      │                                  │
    # └────────────────┴──────────────────────────────────┘
    #
    # We intentionally exclude the avatar, PH and Elite badge.
    # --------------------------------------------------------

    left = int(
        width * 0.055
    )

    top = int(
        height * 0.30
    )

    right = int(
        width * 0.145
    )

    bottom = int(
        height * 0.53
    )

    crop = image.crop(
        (
            left,
            top,
            right,
            bottom
        )
    )

    # --------------------------------------------------------
    # Enlarge username.
    # --------------------------------------------------------

    crop = crop.resize(
        (
            crop.width * 10,
            crop.height * 10
        ),
        Image.Resampling.LANCZOS
    )

    # --------------------------------------------------------
    # Grayscale / contrast / sharpening.
    # --------------------------------------------------------

    gray = ImageOps.grayscale(
        crop
    )

    gray = ImageOps.autocontrast(
        gray
    )

    gray = gray.filter(
        ImageFilter.SHARPEN
    )

    # ========================================================
    # OCR USING WORD POSITIONS
    # ========================================================

    all_words = []

    for psm in (
        6,
        11,
        12
    ):

        data = pytesseract.image_to_data(
            gray,
            config=f"--psm {psm}",
            output_type=pytesseract.Output.DICT
        )

        for i in range(
            len(data["text"])
        ):

            raw = data["text"][i]

            text = clean_text(
                raw
            )

            if not text:
                continue

            try:

                confidence = float(
                    data["conf"][i]
                )

            except Exception:

                confidence = 0

            # Ignore extremely low confidence OCR.
            if confidence < 20:
                continue

            if not valid_word(
                text
            ):
                continue

            x = int(
                data["left"][i]
            )

            y = int(
                data["top"][i]
            )

            w = int(
                data["width"][i]
            )

            h = int(
                data["height"][i]
            )

            all_words.append(
                {
                    "text": text,
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "conf": confidence
                }
            )

    # ========================================================
    # REMOVE DUPLICATE OCR RESULTS
    # ========================================================

    unique_words = []

    for word in all_words:

        duplicate = False

        for existing in unique_words:

            same_text = (
                word["text"].lower()
                ==
                existing["text"].lower()
            )

            close_x = (
                abs(
                    word["x"]
                    -
                    existing["x"]
                )
                < 50
            )

            close_y = (
                abs(
                    word["y"]
                    -
                    existing["y"]
                )
                < 50
            )

            if (
                same_text
                and close_x
                and close_y
            ):

                duplicate = True

                # Keep the higher-confidence result.
                if (
                    word["conf"]
                    >
                    existing["conf"]
                ):

                    existing.update(
                        word
                    )

                break

        if not duplicate:

            unique_words.append(
                word
            )

    # ========================================================
    # SORT WORDS BY POSITION
    # ========================================================

    unique_words.sort(
        key=lambda item: (
            item["y"],
            item["x"]
        )
    )

    # ========================================================
    # FIND TWO-LINE USERNAME
    #
    # Genesis
    # Storm
    #
    # -> Genesis Storm
    # ========================================================

    candidates = []

    for i, first in enumerate(
        unique_words
    ):

        for second in unique_words[
            i + 1:
        ]:

            # Second word should be below first.
            if (
                second["y"]
                <=
                first["y"]
            ):
                continue

            vertical_distance = (
                second["y"]
                -
                first["y"]
            )

            # They should be close vertically.
            if (
                vertical_distance
                >
                250
            ):
                continue

            # They should generally be aligned.
            horizontal_distance = abs(
                second["x"]
                -
                first["x"]
            )

            if (
                horizontal_distance
                >
                450
            ):
                continue

            combined = (
                first["text"]
                +
                " "
                +
                second["text"]
            )

            combined = clean_text(
                combined
            )

            if not looks_like_username(
                combined
            ):
                continue

            # ----------------------------------------------
            # Score
            # ----------------------------------------------

            score = 100

            # OCR confidence.
            score += (
                first["conf"]
                +
                second["conf"]
            ) / 10

            # Prefer words that are close together.
            score -= (
                vertical_distance
                /
                10
            )

            # Prefer roughly aligned words.
            score -= (
                horizontal_distance
                /
                20
            )

            candidates.append(
                (
                    score,
                    combined
                )
            )

    # ========================================================
    # RETURN BEST TWO-WORD USERNAME
    # ========================================================

    if candidates:

        candidates.sort(
            key=lambda item: item[0],
            reverse=True
        )

        return candidates[0][1]

    # ========================================================
    # FALLBACK NORMAL OCR
    # ========================================================

    text = pytesseract.image_to_string(
        gray,
        config="--psm 6"
    )

    lines = []

    for raw_line in text.splitlines():

        line = clean_text(
            raw_line
        )

        if not line:
            continue

        if looks_like_username(
            line
        ):

            lines.append(
                line
            )

    # Prefer two-word result.
    for line in lines:

        if len(
            line.split()
        ) == 2:

            return line

    # One-word fallback.
    if lines:

        return lines[0]

    return "Buyer"


# ============================================================
# PRODUCT NAME
# ============================================================

def format_product_name(
    folder_name
):

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
# BUILD FEEDBACK INDEX
# ============================================================

entries = []


for section in (
    "feedback",
    "resolved"
):

    root = (
        ROOT
        /
        "images"
        /
        section
    )

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

            if (
                image_path.suffix.lower()
                not in VALID_EXT
            ):

                continue

            print("")
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
                    f"OCR failed for "
                    f"{image_path}: {error}"
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
# WRITE feedback-index.json
# ============================================================

output_file = (
    ROOT
    /
    "feedback-index.json"
)

output_file.write_text(
    json.dumps(
        entries,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)


# ============================================================
# FINAL OUTPUT
# ============================================================

print("")
print(
    "========================================"
)

print(
    "FEEDBACK INDEX COMPLETE"
)

print(
    "========================================"
)

print(
    f"Total images indexed: {len(entries)}"
)

print(
    f"Output: {output_file}"
)
