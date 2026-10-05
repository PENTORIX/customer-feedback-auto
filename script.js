const state = {
  section: "feedback",
  feedbackFilter: "All",
  resolvedFilter: "All",
  items: [],
  currentImages: [],
  currentIndex: 0
};


/*
 * ============================================================
 * DOM ELEMENTS
 * ============================================================
 */

const feedbackGrid =
  document.getElementById("feedbackGrid");

const resolvedGrid =
  document.getElementById("resolvedGrid");

const feedbackFilters =
  document.getElementById("feedbackFilters");

const resolvedFilters =
  document.getElementById("resolvedFilters");

const feedbackSection =
  document.getElementById("feedbackSection");

const resolvedSection =
  document.getElementById("resolvedSection");


/*
 * ============================================================
 * PLATFORM BRANDING
 * ============================================================
 *
 * These correspond to the folder/item names in
 * feedback-index.json:
 *
 * crayoai
 * esim
 * iwanttfc
 * spotify
 */

const PLATFORM_INFO = {

  "crayoai": {
    name: "Crayo.ai",
    logo: "https://crayo.ai/favicon.ico",
    fallback: "C"
  },

  "esim": {
    name: "Maya eSIM",
    logo: "https://www.maya.ph/favicon.ico",
    fallback: "M"
  },

  "iwanttfc": {
    name: "iWantTFC",
    logo: "https://www.iwanttfc.com/favicon.ico",
    fallback: "i"
  },

  "spotify": {
    name: "Spotify",
    logo: "https://open.spotify.com/favicon.ico",
    fallback: "S"
  }

};


/*
 * ============================================================
 * NORMALIZE PLATFORM KEY
 * ============================================================
 */

function platformKey(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

}


/*
 * ============================================================
 * GET PLATFORM INFORMATION
 * ============================================================
 */

function platformInfo(value) {

  const key = platformKey(value);

  return PLATFORM_INFO[key] || {

    name: String(value || "Other"),

    logo: "",

    fallback: String(value || "?")
      .slice(0, 1)
      .toUpperCase()

  };

}


/*
 * ============================================================
 * PLATFORM LOGO HTML
 * ============================================================
 */

function platformLogoHtml(value, small = false) {

  const p = platformInfo(value);

  if (!p.logo) {

    return `
      <span
        class="platform-fallback"
        aria-hidden="true"
      >
        ${escapeHtml(p.fallback)}
      </span>
    `;

  }

  return `
    <img
      class="${small ? "filter-logo" : "platform-logo"}"
      src="${escapeHtml(p.logo)}"
      alt=""
      loading="lazy"
      onerror="
        this.outerHTML =
        '<span class=&quot;platform-fallback&quot; aria-hidden=&quot;true&quot;>${escapeHtml(p.fallback)}</span>'
      "
    >
  `;

}


/*
 * ============================================================
 * LOAD JSON DATA
 * ============================================================
 */

async function loadData() {

  try {

    const res = await fetch(
      "feedback-index.json?ts=" + Date.now()
    );

    if (!res.ok) {

      throw new Error(
        "Could not load feedback index"
      );

    }

    state.items = await res.json();

    render();

  } catch (err) {

    feedbackGrid.innerHTML =
      '<div class="empty">Feedback is temporarily unavailable.</div>';

    resolvedGrid.innerHTML =
      '<div class="empty">Resolved issues are temporarily unavailable.</div>';

    console.error(err);

  }

}


/*
 * ============================================================
 * GET ITEMS BY SECTION
 * ============================================================
 */

function getItems(section) {

  return state.items.filter(
    x => x.type === section
  );

}


/*
 * ============================================================
 * GET CURRENT FILTER
 * ============================================================
 */

function getFilter(section) {

  return section === "feedback"
    ? state.feedbackFilter
    : state.resolvedFilter;

}


/*
 * ============================================================
 * SET FILTER
 * ============================================================
 */

function setFilter(section, value) {

  if (section === "feedback") {

    state.feedbackFilter = value;

  } else {

    state.resolvedFilter = value;

  }

  render();

}


/*
 * ============================================================
 * GET PRODUCTS
 * ============================================================
 */

function products(items) {

  return [
    "All",
    ...new Set(
      items
        .map(x => x.item)
        .filter(Boolean)
    )
  ];

}


/*
 * ============================================================
 * RENDER FILTER BUTTONS
 * ============================================================
 */

function renderFilters(section, container) {

  container.innerHTML = "";

  products(getItems(section)).forEach(product => {

    const b =
      document.createElement("button");

    b.className =
      "filter" +
      (
        getFilter(section) === product
          ? " active"
          : ""
      );

    const label =
      product === "All"
        ? "All"
        : platformInfo(product).name;

    b.innerHTML =
      product === "All"

        ? "All"

        : `
          ${platformLogoHtml(product, true)}

          <span>
            ${escapeHtml(label)}
          </span>
        `;

    b.onclick = () => {

      setFilter(
        section,
        product
      );

    };

    container.appendChild(b);

  });

}


/*
 * ============================================================
 * GET FILTERED ITEMS
 * ============================================================
 */

function getFilteredItems(section) {

  const filter =
    getFilter(section);

  return getItems(section).filter(
    x =>
      filter === "All" ||
      x.item === filter
  );

}


/*
 * ============================================================
 * RENDER FEEDBACK CARDS
 * ============================================================
 */

function renderCards(section, container) {

  const items =
    getFilteredItems(section);


  /*
   * ----------------------------------------------------------
   * No results
   * ----------------------------------------------------------
   */

  if (!items.length) {

    container.innerHTML =
      '<div class="empty">No entries yet.</div>';

    return;

  }


  /*
   * ----------------------------------------------------------
   * Build cards
   * ----------------------------------------------------------
   */

  container.innerHTML =
    items.map(item => {

      const platform =
        platformInfo(item.item);

      const statusClass =
        section === "resolved"
          ? "resolved"
          : "positive";

      const statusText =
        section === "resolved"
          ? "Resolved"
          : "Feedback";


      return `

        <article class="card">

          <div class="card-info">

            <div class="meta">

              <!-- BUYER -->

              <span class="buyer">

                <span
                  class="buyer-icon"
                  aria-hidden="true"
                >
                  ●
                </span>

                <strong>
                  ${escapeHtml(
                    item.buyer || "Buyer"
                  )}
                </strong>

              </span>


              <!-- PLATFORM -->

              <span class="platform">

                ${platformLogoHtml(
                  item.item
                )}

                <strong>
                  ${escapeHtml(
                    platform.name
                  )}
                </strong>

              </span>

            </div>


            <!-- STATUS -->

            <span
              class="status ${statusClass}"
            >

              ${
                section === "resolved"
                  ? "●"
                  : "★"
              }

              ${statusText}

            </span>

          </div>


          <!-- FEEDBACK IMAGE -->

          <div class="images">

            <img
              class="feedback-image"
              src="${encodeURI(
                item.image
              )}"
              alt="${escapeHtml(
                platform.name
              )} customer feedback"
              loading="lazy"
              data-image="${escapeHtml(
                item.image
              )}"
            >

          </div>

        </article>

      `;

    }).join("");


  /*
   * ----------------------------------------------------------
   * ADD CLICK EVENTS AFTER CARDS ARE RENDERED
   * ----------------------------------------------------------
   *
   * IMPORTANT:
   * Instead of opening only the clicked image,
   * we create a gallery from ALL currently filtered
   * screenshots.
   */

  const imageElements =
    container.querySelectorAll(
      ".feedback-image"
    );


  imageElements.forEach(
    (imageElement, clickedIndex) => {

      imageElement.addEventListener(
        "click",
        () => {

          const gallery =
            items
              .map(item => item.image)
              .filter(Boolean);


          openLightbox(
            gallery,
            clickedIndex
          );

        }
      );

    }
  );

}


/*
 * ============================================================
 * MAIN RENDER
 * ============================================================
 */

function render() {

  feedbackSection.classList.toggle(
    "hidden",
    state.section !== "feedback"
  );

  resolvedSection.classList.toggle(
    "hidden",
    state.section !== "resolved"
  );


  renderFilters(
    "feedback",
    feedbackFilters
  );

  renderFilters(
    "resolved",
    resolvedFilters
  );


  renderCards(
    "feedback",
    feedbackGrid
  );

  renderCards(
    "resolved",
    resolvedGrid
  );


  /*
   * Update active tab
   */

  document
    .querySelectorAll(".tab")
    .forEach(b => {

      b.classList.toggle(
        "active",
        b.dataset.section === state.section
      );

      b.setAttribute(
        "aria-selected",
        b.dataset.section === state.section
          ? "true"
          : "false"
      );

    });

}


/*
 * ============================================================
 * ESCAPE HTML
 * ============================================================
 */

function escapeHtml(v) {

  return String(v)

    .replaceAll(
      "&",
      "&amp;"
    )

    .replaceAll(
      "<",
      "&lt;"
    )

    .replaceAll(
      ">",
      "&gt;"
    )

    .replaceAll(
      '"',
      "&quot;"
    )

    .replaceAll(
      "'",
      "&#039;"
    );

}


/*
 * ============================================================
 * LIGHTBOX ELEMENTS
 * ============================================================
 */

const lightbox =
  document.getElementById(
    "lightbox"
  );

const lightboxImage =
  document.getElementById(
    "lightboxImage"
  );


/*
 * ============================================================
 * OPEN LIGHTBOX
 * ============================================================
 */

function openLightbox(
  images,
  index = 0
) {

  if (
    !Array.isArray(images) ||
    !images.length
  ) {

    return;

  }


  state.currentImages =
    images.filter(Boolean);


  if (
    index < 0 ||
    index >= state.currentImages.length
  ) {

    index = 0;

  }


  state.currentIndex =
    index;


  lightbox.classList.remove(
    "hidden"
  );

  lightbox.setAttribute(
    "aria-hidden",
    "false"
  );


  /*
   * Prevent background page scrolling
   * while lightbox is open.
   */

  document.body.style.overflow =
    "hidden";


  updateLightbox();

}


/*
 * ============================================================
 * UPDATE LIGHTBOX IMAGE
 * ============================================================
 */

function updateLightbox() {

  if (
    !state.currentImages.length
  ) {

    return;

  }


  const image =
    state.currentImages[
      state.currentIndex
    ];


  lightboxImage.src =
    encodeURI(image);


  /*
   * Update alt text
   */

  lightboxImage.alt =
    `Feedback image ${
      state.currentIndex + 1
    } of ${
      state.currentImages.length
    }`;

}


/*
 * ============================================================
 * CLOSE LIGHTBOX
 * ============================================================
 */

function closeLightbox() {

  lightbox.classList.add(
    "hidden"
  );

  lightbox.setAttribute(
    "aria-hidden",
    "true"
  );


  /*
   * Restore page scrolling.
   */

  document.body.style.overflow =
    "";


  /*
   * Clear gallery state.
   */

  state.currentImages = [];

  state.currentIndex = 0;

}


/*
 * ============================================================
 * PREVIOUS IMAGE
 * ============================================================
 */

function previousImage() {

  if (
    !state.currentImages.length
  ) {

    return;

  }


  state.currentIndex =
    (
      state.currentIndex - 1 +
      state.currentImages.length
    ) %
    state.currentImages.length;


  updateLightbox();

}


/*
 * ============================================================
 * NEXT IMAGE
 * ============================================================
 */

function nextImage() {

  if (
    !state.currentImages.length
  ) {

    return;

  }


  state.currentIndex =
    (
      state.currentIndex + 1
    ) %
    state.currentImages.length;


  updateLightbox();

}


/*
 * ============================================================
 * TAB BUTTONS
 * ============================================================
 */

document
  .querySelectorAll(".tab")
  .forEach(b => {

    b.addEventListener(
      "click",
      () => {

        state.section =
          b.dataset.section;

        render();

      }
    );

  });


/*
 * ============================================================
 * LIGHTBOX CLOSE BUTTON
 * ============================================================
 */

const closeButton =
  document.getElementById(
    "closeLightbox"
  );


if (closeButton) {

  closeButton.onclick =
    closeLightbox;

}


/*
 * ============================================================
 * PREVIOUS BUTTON
 * ============================================================
 */

const previousButton =
  document.getElementById(
    "prevImage"
  );


if (previousButton) {

  previousButton.onclick =
    previousImage;

}


/*
 * ============================================================
 * NEXT BUTTON
 * ============================================================
 */

const nextButton =
  document.getElementById(
    "nextImage"
  );


if (nextButton) {

  nextButton.onclick =
    nextImage;

}


/*
 * ============================================================
 * CLICK IMAGE = NEXT IMAGE
 * ============================================================
 *
 * This is the new behavior:
 *
 * Click screenshot
 *       ↓
 * Next screenshot
 *
 * The arrows continue to work normally.
 * ============================================================
 */

lightboxImage.addEventListener(
  "click",
  event => {

    /*
     * Prevent the click from reaching
     * the lightbox background.
     */

    event.stopPropagation();


    /*
     * Go to the next screenshot.
     */

    nextImage();

  }
);


/*
 * ============================================================
 * CLOSE LIGHTBOX WHEN CLICKING OUTSIDE IMAGE
 * ============================================================
 */

lightbox.addEventListener(
  "click",
  event => {

    /*
     * Only close when the actual
     * dark background is clicked.
     */

    if (
      event.target === lightbox
    ) {

      closeLightbox();

    }

  }
);


/*
 * ============================================================
 * KEYBOARD CONTROLS
 * ============================================================
 *
 * ESC        = Close
 * ArrowLeft  = Previous
 * ArrowRight = Next
 * ============================================================
 */

document.addEventListener(
  "keydown",
  event => {

    if (
      lightbox.classList.contains(
        "hidden"
      )
    ) {

      return;

    }


    if (
      event.key === "Escape"
    ) {

      closeLightbox();

      return;

    }


    if (
      event.key === "ArrowLeft"
    ) {

      previousImage();

      return;

    }


    if (
      event.key === "ArrowRight"
    ) {

      nextImage();

      return;

    }

  }
);


/*
 * ============================================================
 * MOBILE TOUCH / SWIPE SUPPORT
 * ============================================================
 *
 * Swipe left  = Next
 * Swipe right = Previous
 * ============================================================
 */

let touchStartX = 0;
let touchEndX = 0;


lightboxImage.addEventListener(
  "touchstart",
  event => {

    if (
      event.touches &&
      event.touches.length
    ) {

      touchStartX =
        event.touches[0].clientX;

    }

  },
  {
    passive: true
  }
);


lightboxImage.addEventListener(
  "touchend",
  event => {

    if (
      event.changedTouches &&
      event.changedTouches.length
    ) {

      touchEndX =
        event.changedTouches[0].clientX;

    }


    const distance =
      touchEndX - touchStartX;


    /*
     * Ignore tiny movements.
     */

    if (
      Math.abs(distance) < 50
    ) {

      return;

    }


    if (distance < 0) {

      nextImage();

    } else {

      previousImage();

    }

  },
  {
    passive: true
  }
);


/*
 * ============================================================
 * START APPLICATION
 * ============================================================
 */

loadData();