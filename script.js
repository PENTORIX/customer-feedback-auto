const state = {

  section: "feedback",

  feedbackFilter: "All",

  resolvedFilter: "All",

  items: [],

  currentImages: [],

  currentIndex: 0,

  zoom: 1

};


/*
 * ============================================================
 * SUPPORT STATUS
 * ============================================================
 *
 * Change online to false whenever you want to show OFFLINE.
 */

const SUPPORT_STATUS = {

  online: true,

  onlineText: "AVAILABLE FOR SUPPORT",

  offlineText: "CURRENTLY OFFLINE"

};


/*
 * ============================================================
 * DOM
 * ============================================================
 */

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

const totalTransactions =
  document.getElementById("totalTransactions");

const totalResolved =
  document.getElementById("totalResolved");

const totalPlatforms =
  document.getElementById("totalPlatforms");

const supportStatus =
  document.getElementById("supportStatus");

const supportStatusText =
  document.getElementById("supportStatusText");

const lightbox =
  document.getElementById("lightbox");

const lightboxImage =
  document.getElementById("lightboxImage");

const imageCounter =
  document.getElementById("imageCounter");

const closeLightbox =
  document.getElementById("closeLightbox");

const prevImage =
  document.getElementById("prevImage");

const nextImage =
  document.getElementById("nextImage");

const zoomIn =
  document.getElementById("zoomIn");

const zoomOut =
  document.getElementById("zoomOut");

const zoomReset =
  document.getElementById("zoomReset");


/*
 * ============================================================
 * PLATFORM INFORMATION
 * ============================================================
 */

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


/*
 * ============================================================
 * NORMALIZE PLATFORM
 * ============================================================
 */

function platformKey(value) {

  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

}


function platformInfo(value) {

  const key =
    platformKey(value);

  return (
    PLATFORM_INFO[key] || {

      name:
        String(value || "Other"),

      logo: "",

      fallback:
        String(value || "?")
          .slice(0, 1)
          .toUpperCase()

    }
  );

}


/*
 * ============================================================
 * PLATFORM LOGO
 * ============================================================
 */

function platformLogoHtml(
  value,
  small = false
) {

  const p =
    platformInfo(value);


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
      class="${
        small
          ? "filter-logo"
          : "platform-logo"
      }"
      src="${escapeHtml(p.logo)}"
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
      ${escapeHtml(p.fallback)}
    </span>
  `;

}


/*
 * ============================================================
 * LOAD DATA
 * ============================================================
 */

async function loadData() {

  try {

    const res =
      await fetch(
        "feedback-index.json?ts=" +
        Date.now()
      );


    if (!res.ok) {

      throw new Error(
        "Could not load feedback index"
      );

    }


    state.items =
      await res.json();


    applyUrlState();

    updateStatistics();

    updateSupportStatus();

    render();

  }

  catch (error) {

    feedbackGrid.innerHTML =
      `
        <div class="empty">
          Feedback is temporarily unavailable.
        </div>
      `;


    resolvedGrid.innerHTML =
      `
        <div class="empty">
          Resolved issues are temporarily unavailable.
        </div>
      `;


    console.error(error);

  }

}


/*
 * ============================================================
 * SECTION DATA
 * ============================================================
 */

function getItems(section) {

  return state.items.filter(
    item =>
      item.type === section
  );

}


/*
 * ============================================================
 * FILTER
 * ============================================================
 */

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

  if (
    section === "feedback"
  ) {

    state.feedbackFilter =
      value;

  }

  else {

    state.resolvedFilter =
      value;

  }


  if (updateUrl) {

    updatePlatformUrl();

  }


  render();

}


/*
 * ============================================================
 * PLATFORM LIST
 * ============================================================
 */

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


/*
 * ============================================================
 * FILTER BUTTONS
 * ============================================================
 */

function renderFilters(
  section,
  container
) {

  container.innerHTML = "";


  products(
    getItems(section)
  ).forEach(product => {

    const button =
      document.createElement(
        "button"
      );


    button.className =
      "filter" +

      (
        getFilter(section) ===
        product

          ? " active"

          : ""
      );


    const label =
      product === "All"

        ? "All"

        : platformInfo(
            product
          ).name;


    button.innerHTML =

      product === "All"

        ? "All"

        : `
          ${platformLogoHtml(
            product,
            true
          )}

          <span>
            ${escapeHtml(label)}
          </span>
        `;


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


/*
 * ============================================================
 * FILTERED ITEMS
 * ============================================================
 */

function getFilteredItems(
  section
) {

  const filter =
    getFilter(section);


  return getItems(section)
    .filter(
      item =>
        filter === "All" ||
        item.item === filter
    );

}


/*
 * ============================================================
 * RENDER CARDS
 * ============================================================
 */

function renderCards(
  section,
  container
) {

  const items =
    getFilteredItems(section);


  if (!items.length) {

    container.innerHTML =
      `
        <div class="empty">
          No entries yet.
        </div>
      `;

    return;

  }


  container.innerHTML =
    items.map(
      item => {

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
                      "Buyer"
                    )}
                  </strong>

                </span>


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


              <span
                class="
                  status
                  ${
                    isResolved
                      ? "resolved"
                      : "positive"
                  }
                "
              >

                ${
                  isResolved
                    ? "● Resolved"
                    : "★ Feedback"
                }

              </span>

            </div>


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

      }
    ).join("");


  /*
   * Click screenshot.
   *
   * IMPORTANT:
   * Gallery contains all currently filtered
   * screenshots, not just the clicked screenshot.
   */

  const imageElements =
    container.querySelectorAll(
      ".feedback-image"
    );


  imageElements.forEach(
    (image, index) => {

      image.addEventListener(
        "click",
        () => {

          const images =
            items
              .map(
                item =>
                  item.image
              )
              .filter(Boolean);


          openLightbox(
            images,
            index
          );

        }
      );

    }
  );

}


/*
 * ============================================================
 * LATEST TRANSACTIONS
 * ============================================================
 *
 * Since no visible dates are stored, this uses the last
 * indexed entries from feedback-index.json.
 *
 * It does not display any date.
 * ============================================================
 */

function renderLatest() {

  if (!latestGrid) {
    return;
  }


  const latest =
    getItems("feedback")
      .slice()
      .reverse()
      .slice(0, 4);


  if (!latest.length) {

    latestGrid.innerHTML =
      `
        <div class="empty">
          No recent transactions yet.
        </div>
      `;

    return;

  }


  latestGrid.innerHTML =
    latest.map(
      item => {

        const platform =
          platformInfo(
            item.item
          );


        return `

          <article
            class="latest-card"
            data-image="${escapeHtml(
              item.image
            )}"
          >

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
                  "Buyer"
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

      }
    ).join("");


  const latestCards =
    latestGrid.querySelectorAll(
      ".latest-card"
    );


  latestCards.forEach(
    (card, index) => {

      card.addEventListener(
        "click",
        () => {

          const images =
            latest.map(
              item =>
                item.image
            );


          openLightbox(
            images,
            index
          );

        }
      );

    }
  );

}


/*
 * ============================================================
 * STATISTICS
 * ============================================================
 */

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
            item.item
        )

        .filter(Boolean)

    );


  if (totalTransactions) {

    totalTransactions.textContent =
      feedback.length.toLocaleString();

  }


  if (totalResolved) {

    totalResolved.textContent =
      resolved.length.toLocaleString();

  }


  if (totalPlatforms) {

    totalPlatforms.textContent =
      platforms.size.toLocaleString();

  }

}


/*
 * ============================================================
 * SUPPORT STATUS
 * ============================================================
 */

function updateSupportStatus() {

  if (!supportStatus) {
    return;
  }


  if (
    SUPPORT_STATUS.online
  ) {

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


/*
 * ============================================================
 * URL FILTERING
 * ============================================================
 *
 * Examples:
 *
 * ?platform=esim
 *
 * ?platform=iwanttfc
 *
 * ?platform=spotify
 *
 * ?platform=esim&section=resolved
 * ============================================================
 */

function applyUrlState() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const platform =
    params.get("platform");


  const section =
    params.get("section");


  if (
    section === "resolved" ||
    section === "feedback"
  ) {

    state.section =
      section;

  }


  if (platform) {

    const normalized =
      platformKey(
        platform
      );


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


/*
 * ============================================================
 * UPDATE URL
 * ============================================================
 */

function updatePlatformUrl() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const filter =
    getFilter(
      state.section
    );


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


  if (
    state.section ===
    "resolved"
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


/*
 * ============================================================
 * MAIN RENDER
 * ============================================================
 */

function render() {

  feedbackSection.classList.toggle(
    "hidden",
    state.section !==
    "feedback"
  );


  resolvedSection.classList.toggle(
    "hidden",
    state.section !==
    "resolved"
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


  renderLatest();


  document
    .querySelectorAll(".tab")
    .forEach(
      button => {

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

      }
    );

}


/*
 * ============================================================
 * ESCAPE HTML
 * ============================================================
 */

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


/*
 * ============================================================
 * LIGHTBOX
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
    images;


  state.currentIndex =
    Math.max(
      0,
      Math.min(
        index,
        images.length - 1
      )
    );


  state.zoom = 1;


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


  imageCounter.textContent =
    `${state.currentIndex + 1} / ${state.currentImages.length}`;


  /*
   * Hide navigation if gallery has only one image.
   */

  const multiple =
    state.currentImages.length > 1;


  prevImage.style.display =
    multiple
      ? ""
      : "none";


  nextImage.style.display =
    multiple
      ? ""
      : "none";

}


function closeLightbox() {

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

}


/*
 * ============================================================
 * NEXT / PREVIOUS
 * ============================================================
 */

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


/*
 * ============================================================
 * ZOOM
 * ============================================================
 */

function setZoom(
  value
) {

  state.zoom =
    Math.max(
      0.5,
      Math.min(
        3,
        value
      )
    );


  lightboxImage.style.transform =
    `scale(${state.zoom})`;

}


zoomIn.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    setZoom(
      state.zoom + 0.25
    );

  }
);


zoomOut.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    setZoom(
      state.zoom - 0.25
    );

  }
);


zoomReset.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    setZoom(1);

  }
);


/*
 * ============================================================
 * MOUSE WHEEL ZOOM
 * ============================================================
 */

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


/*
 * ============================================================
 * CLICK IMAGE = NEXT
 * ============================================================
 */

lightboxImage.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    nextImageAction();

  }
);


/*
 * ============================================================
 * BUTTONS
 * ============================================================
 */

closeLightbox.addEventListener(
  "click",
  closeLightbox
);


prevImage.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    previousImageAction();

  }
);


nextImage.addEventListener(
  "click",
  event => {

    event.stopPropagation();

    nextImageAction();

  }
);


/*
 * ============================================================
 * CLICK OUTSIDE = CLOSE
 * ============================================================
 */

lightbox.addEventListener(
  "click",
  event => {

    if (
      event.target ===
      lightbox
    ) {

      closeLightbox();

    }

  }
);


/*
 * ============================================================
 * KEYBOARD
 * ============================================================
 */

document.addEventListener(
  "keydown",
  event => {

    if (
      lightbox.classList
        .contains("hidden")
    ) {

      return;

    }


    if (
      event.key ===
      "Escape"
    ) {

      closeLightbox();

      return;

    }


    if (
      event.key ===
      "ArrowLeft"
    ) {

      previousImageAction();

      return;

    }


    if (
      event.key ===
      "ArrowRight"
    ) {

      nextImageAction();

      return;

    }


    if (
      event.key ===
      "+"
      ||
      event.key ===
      "="
    ) {

      setZoom(
        state.zoom + 0.25
      );

      return;

    }


    if (
      event.key ===
      "-"
    ) {

      setZoom(
        state.zoom - 0.25
      );

      return;

    }


    if (
      event.key ===
      "0"
    ) {

      setZoom(1);

    }

  }
);


/*
 * ============================================================
 * MOBILE SWIPE
 * ============================================================
 */

let touchStartX = 0;

let touchStartY = 0;


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
     * Only treat horizontal movement as swipe.
     */

    if (
      Math.abs(distanceX) < 50 ||
      Math.abs(distanceX) <
      Math.abs(distanceY)
    ) {

      return;

    }


    if (
      distanceX < 0
    ) {

      nextImageAction();

    }

    else {

      previousImageAction();

    }

  },
  {
    passive: true
  }
);


/*
 * ============================================================
 * TAB BUTTONS
 * ============================================================
 */

document
  .querySelectorAll(".tab")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => {

          state.section =
            button.dataset.section;


          /*
           * Reset filter when switching sections
           * only if current filter doesn't exist there.
           */

          updatePlatformUrl();

          render();

        }
      );

    }
  );


/*
 * ============================================================
 * BROWSER BACK / FORWARD
 * ============================================================
 */

window.addEventListener(
  "popstate",
  () => {

    applyUrlState();

    render();

  }
);


/*
 * ============================================================
 * START
 * ============================================================
 */

loadData();