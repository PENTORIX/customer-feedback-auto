/* ============================================================
   STATE
   ============================================================ */

const state = {
  section: "feedback",
  feedbackFilter: "All",
  resolvedFilter: "All",

  items: [],

  currentImages: [],
  currentIndex: 0,

  zoom: 1
};


/* ============================================================
   SUPPORT STATUS

   true  = AVAILABLE FOR SUPPORT
   false = CURRENTLY OFFLINE
   ============================================================ */

const SUPPORT_STATUS = {
  online: true,
  onlineText: "AVAILABLE FOR SUPPORT",
  offlineText: "CURRENTLY OFFLINE"
};


/* ============================================================
   DOM ELEMENTS
   ============================================================ */

const feedbackGrid =
  document.getElementById("feedbackGrid");

const resolvedGrid =
  document.getElementById("resolvedGrid");

const latestGrid =
  document.getElementById("latestGrid");

const feedbackFilters =
  document.getElementById("feedbackFilters");

const resolvedFilters =
  document.getElementById("resolvedFilters");

const feedbackSection =
  document.getElementById("feedbackSection");

const resolvedSection =
  document.getElementById("resolvedSection");


/* Statistics */

const totalTransactions =
  document.getElementById("totalTransactions");

const totalResolved =
  document.getElementById("totalResolved");

const totalPlatforms =
  document.getElementById("totalPlatforms");


/* Support */

const supportStatus =
  document.getElementById("supportStatus");

const supportStatusText =
  document.getElementById("supportStatusText");


/* Lightbox */

const lightbox =
  document.getElementById("lightbox");

const lightboxImage =
  document.getElementById("lightboxImage");

const imageCounter =
  document.getElementById("imageCounter");

const closeLightboxButton =
  document.getElementById("closeLightbox");

const prevImageButton =
  document.getElementById("prevImage");

const nextImageButton =
  document.getElementById("nextImage");

const zoomInButton =
  document.getElementById("zoomIn");

const zoomOutButton =
  document.getElementById("zoomOut");

const zoomResetButton =
  document.getElementById("zoomReset");


/* ============================================================
   PLATFORM INFORMATION
   ============================================================ */

const PLATFORM_INFO = {

  crayoai: {
    name: "Crayo.ai",
    logo: "https://crayo.ai/favicon.ico",
    fallback: "C"
  },

  esim: {
    name: "Maya eSIM",
    logo: "https://www.maya.ph/favicon.ico",
    fallback: "M"
  },

  iwanttfc: {
    name: "iWantTFC",
    logo: "https://www.iwanttfc.com/favicon.ico",
    fallback: "i"
  },

  spotify: {
    name: "Spotify",
    logo: "https://open.spotify.com/favicon.ico",
    fallback: "S"
  }

};


/* ============================================================
   NORMALIZE PLATFORM KEY
   ============================================================ */

function platformKey(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

}


/* ============================================================
   GET PLATFORM INFO
   ============================================================ */

function platformInfo(value) {

  const key =
    platformKey(value);

  return PLATFORM_INFO[key] || {

    name:
      String(value || "Other"),

    logo: "",

    fallback:
      String(value || "?")
        .slice(0, 1)
        .toUpperCase()

  };

}


/* ============================================================
   PLATFORM LOGO HTML
   ============================================================ */

function platformLogoHtml(
  value,
  small = false
) {

  const platform =
    platformInfo(value);


  if (!platform.logo) {

    return `
      <span
        class="platform-fallback"
        aria-hidden="true"
      >
        ${escapeHtml(platform.fallback)}
      </span>
    `;

  }


  return `
    <img
      class="${small ? "filter-logo" : "platform-logo"}"
      src="${escapeHtml(platform.logo)}"
      alt=""
      loading="lazy"
      onerror="
        this.style.display='none';
        this.nextElementSibling.style.display='inline-grid';
      "
    >

    <span
      class="platform-fallback"
      aria-hidden="true"
      style="display:none"
    >
      ${escapeHtml(platform.fallback)}
    </span>
  `;

}


/* ============================================================
   LOAD feedback-index.json
   ============================================================ */

async function loadData() {

  try {

    const response =
      await fetch(
        "feedback-index.json?ts=" +
        Date.now()
      );


    if (!response.ok) {

      throw new Error(
        "Could not load feedback-index.json"
      );

    }


    const data =
      await response.json();


    if (!Array.isArray(data)) {

      throw new Error(
        "feedback-index.json is not an array"
      );

    }


    state.items =
      data;


    applyUrlState();

    updateStatistics();

    updateSupportStatus();

    render();


    console.log(
      `Loaded ${state.items.length} feedback entries.`
    );

  }

  catch (error) {

    console.error(
      "Feedback loading error:",
      error
    );


    if (feedbackGrid) {

      feedbackGrid.innerHTML = `
        <div class="empty">
          Feedback is temporarily unavailable.
        </div>
      `;

    }


    if (resolvedGrid) {

      resolvedGrid.innerHTML = `
        <div class="empty">
          Resolved issues are temporarily unavailable.
        </div>
      `;

    }


    if (latestGrid) {

      latestGrid.innerHTML = `
        <div class="empty">
          Recent transactions are temporarily unavailable.
        </div>
      `;

    }

  }

}


/* ============================================================
   GET ITEMS BY SECTION
   ============================================================ */

function getItems(section) {

  return state.items.filter(
    item =>
      item.type === section
  );

}


/* ============================================================
   FILTER STATE
   ============================================================ */

function getFilter(section) {

  return section === "feedback"
    ? state.feedbackFilter
    : state.resolvedFilter;

}


function setFilter(
  section,
  value,
  updateUrl = true
) {

  if (section === "feedback") {

    state.feedbackFilter =
      value;

  }

  else {

    state.resolvedFilter =
      value;

  }


  /*
   * Switch to the section whose filter
   * was clicked.
   */

  state.section =
    section;


  if (updateUrl) {

    updatePlatformUrl();

  }


  render();

}


/* ============================================================
   PRODUCT / PLATFORM LIST
   ============================================================ */

function products(items) {

  return [

    "All",

    ...new Set(

      items

        .map(
          item =>
            item.item
        )

        .filter(Boolean)

    )

  ];

}


/* ============================================================
   RENDER FILTER BUTTONS
   ============================================================ */

function renderFilters(
  section,
  container
) {

  if (!container) {
    return;
  }


  container.innerHTML = "";


  products(
    getItems(section)
  ).forEach(product => {

    const button =
      document.createElement(
        "button"
      );


    button.type =
      "button";


    button.className =
      "filter" +

      (
        getFilter(section) === product
          ? " active"
          : ""
      );


    if (product === "All") {

      button.textContent =
        "All";

    }

    else {

      const platform =
        platformInfo(product);


      button.innerHTML = `
        ${platformLogoHtml(
          product,
          true
        )}

        <span>
          ${escapeHtml(
            platform.name
          )}
        </span>
      `;

    }


    button.addEventListener(
      "click",
      () => {

        setFilter(
          section,
          product
        );

      }
    );


    container.appendChild(
      button
    );

  });

}


/* ============================================================
   GET FILTERED ITEMS
   ============================================================ */

function getFilteredItems(section) {

  const filter =
    getFilter(section);


  return getItems(section)
    .filter(
      item =>
        filter === "All" ||
        item.item === filter
    );

}


/* ============================================================
   RENDER MAIN FEEDBACK CARDS
   ============================================================ */

function renderCards(
  section,
  container
) {

  if (!container) {
    return;
  }


  const items =
    getFilteredItems(section);


  if (!items.length) {

    container.innerHTML = `
      <div class="empty">
        No entries yet.
      </div>
    `;

    return;

  }


  container.innerHTML =
    items.map(item => {

      const platform =
        platformInfo(
          item.item
        );


      const isResolved =
        section === "resolved";


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
                    item.buyer ||
                    "PHC Legit Transaction"
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
              class="status ${
                isResolved
                  ? "resolved"
                  : "positive"
              }"
            >

              ${
                isResolved
                  ? "● Resolved"
                  : "★ Feedback"
              }

            </span>

          </div>


          <!-- SCREENSHOT -->

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
            >

          </div>

        </article>

      `;

    }).join("");


  /*
   * Create gallery using currently
   * visible/filtered cards.
   */

  const galleryImages =
    items
      .map(
        item =>
          item.image
      )
      .filter(Boolean);


  const imageElements =
    container.querySelectorAll(
      ".feedback-image"
    );


  imageElements.forEach(
    (imageElement, index) => {

      imageElement.addEventListener(
        "click",
        () => {

          openLightbox(
            galleryImages,
            index
          );

        }
      );

    }
  );

}


/* ============================================================
   LATEST TRANSACTIONS
   ============================================================ */

function renderLatest() {

  if (!latestGrid) {
    return;
  }


  /*
   * Last indexed feedback images.
   *
   * No date is displayed.
   */

  const latest =
    getItems("feedback")
      .slice()
      .reverse()
      .slice(0, 4);


  if (!latest.length) {

    latestGrid.innerHTML = `
      <div class="empty">
        No recent transactions yet.
      </div>
    `;

    return;

  }


  latestGrid.innerHTML =
    latest.map(item => {

      const platform =
        platformInfo(
          item.item
        );


      return `

        <article class="latest-card">

          <img
            src="${encodeURI(
              item.image
            )}"
            alt="${escapeHtml(
              platform.name
            )} transaction"
            loading="lazy"
          >


          <div class="latest-info">

            <span class="latest-buyer">
              ${escapeHtml(
                item.buyer ||
                "PHC Legit Transaction"
              )}
            </span>


            <span class="latest-platform">
              ${escapeHtml(
                platform.name
              )}
            </span>

          </div>

        </article>

      `;

    }).join("");


  const latestCards =
    latestGrid.querySelectorAll(
      ".latest-card"
    );


  const images =
    latest.map(
      item =>
        item.image
    );


  latestCards.forEach(
    (card, index) => {

      card.addEventListener(
        "click",
        () => {

          openLightbox(
            images,
            index
          );

        }
      );

    }
  );

}


/* ============================================================
   STATISTICS
   ============================================================ */

function updateStatistics() {

  const feedback =
    getItems("feedback");


  const resolved =
    getItems("resolved");


  const platforms =
    new Set(

      state.items

        .map(
          item =>
            platformKey(
              item.item
            )
        )

        .filter(Boolean)

    );


  /*
   * TOTAL TRANSACTIONS
   *
   * Counts all screenshots/entries including
   * resolved transactions.
   */

  if (totalTransactions) {

    totalTransactions.textContent =
      state.items.length
        .toLocaleString();

  }


  if (totalResolved) {

    totalResolved.textContent =
      resolved.length
        .toLocaleString();

  }


  if (totalPlatforms) {

    totalPlatforms.textContent =
      platforms.size
        .toLocaleString();

  }

}


/* ============================================================
   SUPPORT STATUS
   ============================================================ */

function updateSupportStatus() {

  if (
    !supportStatus ||
    !supportStatusText
  ) {

    return;

  }


  if (SUPPORT_STATUS.online) {

    supportStatus.classList
      .remove("offline");

    supportStatus.classList
      .add("online");


    supportStatusText.textContent =
      SUPPORT_STATUS.onlineText;

  }

  else {

    supportStatus.classList
      .remove("online");

    supportStatus.classList
      .add("offline");


    supportStatusText.textContent =
      SUPPORT_STATUS.offlineText;

  }

}


/* ============================================================
   SHAREABLE URL FILTER
   ============================================================ */

function applyUrlState() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const section =
    params.get("section");


  const platform =
    params.get("platform");


  /*
   * Section
   */

  if (
    section === "feedback" ||
    section === "resolved"
  ) {

    state.section =
      section;

  }


  /*
   * Platform
   */

  if (platform) {

    const normalized =
      platformKey(platform);


    const allPlatforms =
      [
        ...new Set(

          state.items

            .map(
              item =>
                item.item
            )

            .filter(Boolean)

        )
      ];


    const match =
      allPlatforms.find(
        item =>
          platformKey(item) ===
          normalized
      );


    if (match) {

      if (
        state.section ===
        "resolved"
      ) {

        state.resolvedFilter =
          match;

      }

      else {

        state.feedbackFilter =
          match;

      }

    }

  }

}


/* ============================================================
   UPDATE SHAREABLE URL
   ============================================================ */

function updatePlatformUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const filter =
    getFilter(
      state.section
    );


  /*
   * Platform
   */

  if (
    filter &&
    filter !== "All"
  ) {

    params.set(
      "platform",
      platformKey(
        filter
      )
    );

  }

  else {

    params.delete(
      "platform"
    );

  }


  /*
   * Section
   */

  if (
    state.section === "resolved"
  ) {

    params.set(
      "section",
      "resolved"
    );

  }

  else {

    params.delete(
      "section"
    );

  }


  const query =
    params.toString();


  const newUrl =
    window.location.pathname +

    (
      query
        ? "?" + query
        : ""
    );


  window.history.replaceState(
    {},
    "",
    newUrl
  );

}


/* ============================================================
   MAIN RENDER
   ============================================================ */

function render() {

  if (feedbackSection) {

    feedbackSection.classList.toggle(
      "hidden",
      state.section !== "feedback"
    );

  }


  if (resolvedSection) {

    resolvedSection.classList.toggle(
      "hidden",
      state.section !== "resolved"
    );

  }


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


  renderLatest();


  /*
   * Tab active state.
   */

  document
    .querySelectorAll(".tab")
    .forEach(button => {

      const active =
        button.dataset.section ===
        state.section;


      button.classList.toggle(
        "active",
        active
      );


      button.setAttribute(
        "aria-selected",
        active
          ? "true"
          : "false"
      );

    });

}


/* ============================================================
   ESCAPE HTML
   ============================================================ */

function escapeHtml(value) {

  return String(value)

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


/* ============================================================
   OPEN LIGHTBOX
   ============================================================ */

function openLightbox(
  images,
  index = 0
) {

  if (
    !lightbox ||
    !lightboxImage
  ) {

    return;

  }


  if (
    !Array.isArray(images) ||
    !images.length
  ) {

    return;

  }


  state.currentImages =
    images.filter(Boolean);


  if (
    !state.currentImages.length
  ) {

    return;

  }


  state.currentIndex =
    Math.max(
      0,
      Math.min(
        index,
        state.currentImages.length - 1
      )
    );


  state.zoom =
    1;


  lightbox.classList
    .remove("hidden");


  lightbox.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";


  updateLightbox();

}


/* ============================================================
   UPDATE LIGHTBOX
   ============================================================ */

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


  lightboxImage.style.transform =
    `scale(${state.zoom})`;


  /*
   * Counter
   */

  if (imageCounter) {

    imageCounter.textContent =
      `${state.currentIndex + 1} / ${state.currentImages.length}`;

  }


  /*
   * Hide arrows if one image only.
   */

  const multiple =
    state.currentImages.length > 1;


  if (prevImageButton) {

    prevImageButton.style.display =
      multiple
        ? ""
        : "none";

  }


  if (nextImageButton) {

    nextImageButton.style.display =
      multiple
        ? ""
        : "none";

  }

}


/* ============================================================
   CLOSE LIGHTBOX
   ============================================================ */

function closeLightboxViewer() {

  if (!lightbox) {
    return;
  }


  lightbox.classList
    .add("hidden");


  lightbox.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";


  state.currentImages =
    [];


  state.currentIndex =
    0;


  state.zoom =
    1;


  if (lightboxImage) {

    lightboxImage.style.transform =
      "scale(1)";

  }

}


/* ============================================================
   NEXT IMAGE
   ============================================================ */

function nextImageAction() {

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


  state.zoom =
    1;


  updateLightbox();

}


/* ============================================================
   PREVIOUS IMAGE
   ============================================================ */

function previousImageAction() {

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


  state.zoom =
    1;


  updateLightbox();

}


/* ============================================================
   ZOOM
   ============================================================ */

function setZoom(value) {

  state.zoom =
    Math.max(
      0.5,
      Math.min(
        3,
        value
      )
    );


  if (lightboxImage) {

    lightboxImage.style.transform =
      `scale(${state.zoom})`;

  }

}


/* ============================================================
   ZOOM BUTTONS
   ============================================================ */

if (zoomInButton) {

  zoomInButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      setZoom(
        state.zoom + 0.25
      );

    }
  );

}


if (zoomOutButton) {

  zoomOutButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      setZoom(
        state.zoom - 0.25
      );

    }
  );

}


if (zoomResetButton) {

  zoomResetButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      setZoom(1);

    }
  );

}


/* ============================================================
   MOUSE WHEEL ZOOM
   ============================================================ */

if (lightboxImage) {

  lightboxImage.addEventListener(
    "wheel",
    event => {

      event.preventDefault();


      setZoom(

        state.zoom +

        (
          event.deltaY < 0
            ? 0.15
            : -0.15
        )

      );

    },

    {
      passive: false
    }
  );

}


/* ============================================================
   CLICK IMAGE = NEXT IMAGE
   ============================================================ */

if (lightboxImage) {

  lightboxImage.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      nextImageAction();

    }
  );

}


/* ============================================================
   LIGHTBOX BUTTONS
   ============================================================ */

if (closeLightboxButton) {

  closeLightboxButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      closeLightboxViewer();

    }
  );

}


if (prevImageButton) {

  prevImageButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      previousImageAction();

    }
  );

}


if (nextImageButton) {

  nextImageButton.addEventListener(
    "click",
    event => {

      event.stopPropagation();

      nextImageAction();

    }
  );

}


/* ============================================================
   CLICK DARK BACKGROUND = CLOSE
   ============================================================ */

if (lightbox) {

  lightbox.addEventListener(
    "click",
    event => {

      if (
        event.target === lightbox
      ) {

        closeLightboxViewer();

      }

    }
  );

}


/* ============================================================
   KEYBOARD CONTROLS
   ============================================================ */

document.addEventListener(
  "keydown",
  event => {

    if (
      !lightbox ||
      lightbox.classList
        .contains("hidden")
    ) {

      return;

    }


    /*
     * ESC
     */

    if (
      event.key === "Escape"
    ) {

      closeLightboxViewer();

      return;

    }


    /*
     * Previous
     */

    if (
      event.key === "ArrowLeft"
    ) {

      previousImageAction();

      return;

    }


    /*
     * Next
     */

    if (
      event.key === "ArrowRight"
    ) {

      nextImageAction();

      return;

    }


    /*
     * Zoom +
     */

    if (
      event.key === "+" ||
      event.key === "="
    ) {

      setZoom(
        state.zoom + 0.25
      );

      return;

    }


    /*
     * Zoom -
     */

    if (
      event.key === "-"
    ) {

      setZoom(
        state.zoom - 0.25
      );

      return;

    }


    /*
     * Reset zoom
     */

    if (
      event.key === "0"
    ) {

      setZoom(1);

    }

  }
);


/* ============================================================
   MOBILE SWIPE
   ============================================================ */

let touchStartX = 0;

let touchStartY = 0;


if (lightboxImage) {

  lightboxImage.addEventListener(
    "touchstart",
    event => {

      if (
        !event.touches.length
      ) {

        return;

      }


      touchStartX =
        event.touches[0].clientX;


      touchStartY =
        event.touches[0].clientY;

    },

    {
      passive: true
    }
  );


  lightboxImage.addEventListener(
    "touchend",
    event => {

      if (
        !event.changedTouches.length
      ) {

        return;

      }


      const endX =
        event.changedTouches[0].clientX;


      const endY =
        event.changedTouches[0].clientY;


      const distanceX =
        endX - touchStartX;


      const distanceY =
        endY - touchStartY;


      /*
       * Ignore small or vertical movements.
       */

      if (
        Math.abs(distanceX) < 50 ||
        Math.abs(distanceX) <
          Math.abs(distanceY)
      ) {

        return;

      }


      /*
       * Swipe left = next
       */

      if (
        distanceX < 0
      ) {

        nextImageAction();

      }

      /*
       * Swipe right = previous
       */

      else {

        previousImageAction();

      }

    },

    {
      passive: true
    }
  );

}


/* ============================================================
   TAB BUTTONS
   ============================================================ */

document
  .querySelectorAll(".tab")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        state.section =
          button.dataset.section;


        updatePlatformUrl();

        render();

      }
    );

  });


/* ============================================================
   BROWSER BACK / FORWARD
   ============================================================ */

window.addEventListener(
  "popstate",
  () => {

    /*
     * Reset filters first.
     */

    state.feedbackFilter =
      "All";


    state.resolvedFilter =
      "All";


    state.section =
      "feedback";


    applyUrlState();

    render();

  }
);


/* ============================================================
   START
   ============================================================ */

loadData();