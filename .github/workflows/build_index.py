from pathlib import Path
from PIL import Image, ImageOps, ImageFilter
import pytesseract
import json
import re

ROOT = Path(".")
VALID_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}


# ============================================================
# TEXT CLEANING
# ============================================================

def clean_line(text):
    text = re.sub(r"\s+", " ", text).strip()

    # Remove junk characters from beginning/end
    text = re.sub(r"^[^A-Za-z0-9@._' -]+", "", text)
    text = re.sub(r"[^A-Za-z0-9@._' -]+$", "", text)

    return text.strip()


# ============================================================
# USERNAME VALIDATION
# ============================================================

def looks_like_username(text):
    if not text:
        return False

    text = clean_line(text)

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
        "Sun",
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
        "on",
        "off",
        "yes",
        "no",
        "pm",
        "am"
    }

    if text.lower() in {x.lower() for x in banned}:
        return False

    # Username should not be extremely short.
    if len(text) < 3:
        return False

    # Prevent very long sentences.
    if len(text) > 30:
        return False

    # Forum names normally contain only a few words.
    words = text.split()

    if len(words) > 4:
        return False

    # Don't accept obvious sentences.
    if re.search(r"[.!?,:;]", text):
        return False

    # Must contain letters.
    if not any(c.isalpha() for c in text):
        return False

    return True


# ============================================================
# IMAGE PREPROCESSING
# ============================================================

def prepare_variants(image):
    """
    Creates several OCR versions of the same username crop.
    This makes small forum usernames easier for Tesseract to read.
    """

    gray = ImageOps.grayscale(image)

    # Upscale
    gray = gray.resize(
        (
            gray.width * 4,
            gray.height * 4
        )
    )

    # Contrast
    gray = ImageOps.autocontrast(gray)

    variants = []

    # Normal grayscale
    variants.append(gray)

    # Sharpen
    sharp = gray.filter(ImageFilter.SHARPEN)
    variants.append(sharp)

    # Threshold version
    threshold = gray.point(
        lambda p: 255 if p > 150 else 0
    )
    variants.append(threshold)

    return variants


# ============================================================
# FIND USERNAME
# ============================================================

def find_username(image):

    width, height = image.size

    # --------------------------------------------------------
    # IMPORTANT:
    #
    # Forum layout:
    #
    # +---------------- USERNAME AREA
    # |
    # |  avatar
    # |  Genesis
    # |  Storm
    # |
    # +---------------- message
    #
    # We intentionally focus on the upper-left profile area.
    # --------------------------------------------------------

    crops = [

        # Main username area
        image.crop((
            0,
            int(height * 0.05),
            int(width * 0.23),
            int(height * 0.42)
        )),

        # Slightly wider backup
        image.crop((
            0,
            0,
            int(width * 0.30),
            int(height * 0.50)
        )),

        # Very focused left profile area
        image.crop((
            0,
            int(height * 0.08),
            int(width * 0.20),
            int(height * 0.35)
        ))
    ]

    candidates = []

    # --------------------------------------------------------
    # OCR each crop using several processing methods
    # --------------------------------------------------------

    for crop_index, crop in enumerate(crops):

        variants = prepare_variants(crop)

        for variant_index, processed in enumerate(variants):

            # Different Tesseract layouts
            for psm in (6, 11, 12):

                try:
                    data = pytesseract.image_to_data(
                        processed,
                        config=f"--psm {psm}",
                        output_type=pytesseract.Output.DICT
                    )

                except Exception:
                    continue

                lines = {}

                # ------------------------------------------------
                # Collect OCR words by line.
                # This is important because:
                #
                # Genesis
                # Storm
                #
                # needs to become:
                #
                # Genesis Storm
                # ------------------------------------------------

                for i in range(len(data["text"])):

                    raw = data["text"][i].strip()

                    if not raw:
                        continue

                    try:
                        confidence = float(data["conf"][i])
                    except Exception:
                        confidence = 0

                    if confidence < 15:
                        continue

                    block = data["block_num"][i]
                    paragraph = data["par_num"][i]
                    line_num = data["line_num"][i]

                    key = (
                        block,
                        paragraph,
                        line_num
                    )

                    if key not in lines:
                        lines[key] = []

                    lines[key].append({
                        "text": raw,
                        "confidence": confidence,
                        "left": data["left"][i],
                        "top": data["top"][i]
                    })

                # ------------------------------------------------
                # Process detected lines
                # ------------------------------------------------

                for line_words in lines.values():

                    line_words.sort(
                        key=lambda x: x["left"]
                    )

                    line = " ".join(
                        word["text"]
                        for word in line_words
                    )

                    line = clean_line(line)

                    if looks_like_username(line):

                        avg_conf = sum(
                            x["confidence"]
                            for x in line_words
                        ) / len(line_words)

                        score = 0

                        # Multi-word names are highly desirable.
                        word_count = len(line.split())

                        if word_count == 2:
                            score += 12

                        elif word_count == 3:
                            score += 8

                        elif word_count == 1:
                            score += 3

                        # Prefer reasonable username length.
                        if 5 <= len(line) <= 25:
                            score += 5

                        # OCR confidence
                        score += min(avg_conf / 15, 6)

                        # First crop is our strongest target area.
                        if crop_index == 0:
                            score += 8

                        # Normal/sharpened images preferred.
                        if variant_index == 0:
                            score += 2

                        candidates.append(
                            (
                                score,
                                line,
                                avg_conf
                            )
                        )

                # ------------------------------------------------
                # Also combine consecutive OCR lines.
                #
                # Example:
                #
                # Genesis
                # Storm
                #
                # -> Genesis Storm
                # ------------------------------------------------

                ordered_lines = []

                for line_words in lines.values():

                    line_words.sort(
                        key=lambda x: x["left"]
                    )

                    text = clean_line(
                        " ".join(
                            x["text"]
                            for x in line_words
                        )
                    )

                    if text:
                        ordered_lines.append({
                            "text": text,
                            "top": min(
                                x["top"]
                                for x in line_words
                            ),
                            "confidence": sum(
                                x["confidence"]
                                for x in line_words
                            ) / len(line_words)
                        })

                ordered_lines.sort(
                    key=lambda x: x["top"]
                )

                for i in range(len(ordered_lines) - 1):

                    first = ordered_lines[i]
                    second = ordered_lines[i + 1]

                    combined = clean_line(
                        first["text"]
                        + " "
                        + second["text"]
                    )

                    if not looks_like_username(combined):
                        continue

                    avg_conf = (
                        first["confidence"]
                        + second["confidence"]
                    ) / 2

                    score = 20

                    # Two-line username is exactly what
                    # our forum screenshot uses.
                    score += min(avg_conf / 12, 7)

                    if crop_index == 0:
                        score += 10

                    candidates.append(
                        (
                            score,
                            combined,
                            avg_conf
                        )
                    )

    # ========================================================
    # NO RESULT
    # ========================================================

    if not candidates:
        return "Buyer"

    # ========================================================
    # REMOVE DUPLICATES
    # ========================================================

    unique = {}

    for score, name, confidence in candidates:

        key = name.lower()

        if key not in unique:
            unique[key] = (
                score,
                name,
                confidence
            )

        else:

            if score > unique[key][0]:

                unique[key] = (
                    score,
                    name,
                    confidence
                )

    # ========================================================
    # RANK RESULTS
    # ========================================================

    ranked = sorted(
        unique.values(),
        key=lambda x: (
            -x[0],
            -x[2],
            len(x[1])
        )
    )

    best = ranked[0][1]

    return best


# ============================================================
# BUILD FEEDBACK INDEX
# ============================================================

entries = []

for root_name in ("feedback", "resolved"):

    root = ROOT / "images" / root_name

    if not root.exists():
        continue

    # --------------------------------------------------------
    # Product folders
    #
    # feedback/esim
    # feedback/iwanttfc
    # resolved/esim
    # resolved/iwanttfc
    # --------------------------------------------------------

    product_dirs = sorted(
        p for p in root.iterdir()
        if p.is_dir()
    )

    for product_dir in product_dirs:

        product = product_dir.name

        product = product.replace("-", " ")
        product = product.replace("_", " ")
        product = product.strip()

        if product:
            product = product.title()
        else:
            product = "Other"

        # ----------------------------------------------------
        # Images inside product folder
        # ----------------------------------------------------

        for image_path in sorted(
            product_dir.iterdir()
        ):

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
    "buyer": "PHC Legit Transaction",
    "item": product,
    "type": root_name,
    "image": img_path.as_posix()
})

# ============================================================
# WRITE JSON
# ============================================================

Path("feedback-index.json").write_text(
    json.dumps(
        entries,
        ensure_ascii=False,
        indent=2
    ),
    encoding="utf-8"
)


print(
    f"Indexed {len(entries)} images."
)
