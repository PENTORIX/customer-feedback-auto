from pathlib import Path
import json


# ============================================================
# SETTINGS
# ============================================================

ROOT = Path(".")

VALID_EXT = {
    ".png",
    ".jpg",
    ".jpeg",
    ".webp",
    ".gif",
    ".bmp"
}

BUYER_LABEL = "PHC Legit Transaction"


# ============================================================
# BUILD FEEDBACK INDEX
# ============================================================

entries = []


for root_name in ("feedback", "resolved"):

    root = ROOT / "images" / root_name

    # Skip folder if it doesn't exist
    if not root.exists():
        continue

    # --------------------------------------------------------
    # Product folders
    #
    # images/
    # ├── feedback/
    # │   ├── esim/
    # │   ├── iwanttfc/
    # │   ├── spotify/
    # │   └── crayoai/
    #
    # └── resolved/
    #     ├── esim/
    #     ├── iwanttfc/
    #     └── ...
    # --------------------------------------------------------

    product_dirs = sorted(
        p for p in root.iterdir()
        if p.is_dir()
    )


    for product_dir in product_dirs:

        # Get product name from folder name
        product = product_dir.name

        product = product.replace("-", " ")
        product = product.replace("_", " ")
        product = product.strip()

        if product:
            product = product.title()
        else:
            product = "Other"


        # ----------------------------------------------------
        # Read every image inside the product folder
        # ----------------------------------------------------

        image_files = sorted(
            p for p in product_dir.iterdir()
            if p.is_file()
            and p.suffix.lower() in VALID_EXT
        )


        for image_path in image_files:

            # Convert path to web-friendly format
            image_url = image_path.as_posix()


            # ------------------------------------------------
            # Add entry
            # ------------------------------------------------

            entries.append({
                "buyer": BUYER_LABEL,
                "item": product,
                "type": root_name,
                "image": image_url
            })


            print(
                f"Added: {image_url}"
            )


# ============================================================
# WRITE feedback-index.json
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


# ============================================================
# DONE
# ============================================================

print()
print(
    f"Indexed {len(entries)} images."
)
print(
    f"Created: {output_file}"
)
