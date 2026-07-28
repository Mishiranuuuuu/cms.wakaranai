/* Column index constants */
const COL = {
  ID: 0,
  TITLE: 1,
  ARTIST: 2,
  IMAGE: 3,
  CATEGORY: 4,
  DATE: 5,
  DESCRIPTION: 6,
  ARTIST_URL: 7
};

/* Artwork Data fetched from Google Sheets */
let artworks = [];
let currentFilter = 'All';
let currentIndex = 0;
let filteredArtworks = [];

let currentPage = 1;
const itemsPerPage = 9;

const sheetId = '1-Cj5ksHOIEcZLtuIY07wE2NXufshZNxU42jToMGI9Mo';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

/* Shared sheet-row parser */
function parseSheetRows(data) {
  return data.table.rows.map(row => {
    // Parse Google Sheets Date(YYYY,M,D) format to dd/mm/yyyy
    let dateVal = '';
    if (row.c[COL.DATE]) {
      const rawDate = row.c[COL.DATE].v;
      if (typeof rawDate === 'string' && rawDate.startsWith('Date(')) {
        const parts = rawDate.replace('Date(', '').replace(')', '').split(',');
        if (parts.length >= 3) {
          const y = parts[0];
          const m = String(parseInt(parts[1]) + 1).padStart(2, '0');
          const d = String(parts[2]).padStart(2, '0');
          dateVal = `${d}/${m}/${y}`;
        }
      } else {
        dateVal = row.c[COL.DATE].f || row.c[COL.DATE].v || '';
      }
    }

    return {
      id: row.c[COL.ID] ? row.c[COL.ID].v : '',
      title: row.c[COL.TITLE] ? row.c[COL.TITLE].v : 'Untitled',
      artist: row.c[COL.ARTIST] ? row.c[COL.ARTIST].v : 'Unknown',
      image: row.c[COL.IMAGE] ? row.c[COL.IMAGE].v : '',
      category: row.c[COL.CATEGORY] ? row.c[COL.CATEGORY].v : 'Other',
      date: dateVal,
      description: row.c[COL.DESCRIPTION] ? row.c[COL.DESCRIPTION].v : '',
      artist_url: row.c[COL.ARTIST_URL] ? row.c[COL.ARTIST_URL].v : ''
    };
  });
}

/* Data fetching */
async function fetchArtworks() {
  try {
    const response = await fetch(sheetUrl);
    const text = await response.text();

    // Google Sheets gviz API wraps the JSON in a function call. We slice it out.
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    artworks = parseSheetRows(data);
    filteredArtworks = [...artworks];

  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);
    showFetchError();
  }
}

/* Show a user-visible error message inside the gallery grid */
function showFetchError() {
  galleryGrid.innerHTML = '';
  const errorEl = document.createElement('div');
  errorEl.className = 'gallery-error';
  errorEl.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="48" height="48">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    <h3>Couldn't load the gallery</h3>
    <p>Something went wrong while fetching artwork data. Please check your connection and try again.</p>
  `;
  const retryBtn = document.createElement('button');
  retryBtn.className = 'hero-cta';
  retryBtn.textContent = 'Try Again';
  retryBtn.addEventListener('click', async () => {
    // Re-show skeletons while retrying
    galleryGrid.innerHTML = '';
    for (let i = 0; i < 6; i++) {
      const skel = document.createElement('div');
      skel.className = 'gallery-item skeleton';
      skel.style.height = `${250 + Math.floor(Math.random() * 200)}px`;
      galleryGrid.appendChild(skel);
    }
    await fetchArtworks();
    if (artworks.length > 0) {
      renderFilters();
      renderGallery();
      updateStats();
    }
  });
  errorEl.appendChild(retryBtn);
  galleryGrid.appendChild(errorEl);
}


// DOM ref
const galleryGrid = document.getElementById('galleryGrid');
const filterBar = document.getElementById('filterBar');
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxArtist = document.getElementById('lightboxArtist');
const lightboxDesc = document.getElementById('lightboxDesc');
const lightboxCategory = document.getElementById('lightboxCategory');
const lightboxDate = document.getElementById('lightboxDate');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');
const themeToggle = document.getElementById('themeToggle');


/* Gallery rendering */
function renderGallery(filter = currentFilter, page = 1) {
  currentFilter = filter;
  currentPage = page;

  filteredArtworks = filter === 'All'
    ? [...artworks]
    : artworks.filter(a => a.category === filter);

  galleryGrid.innerHTML = '';

  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedArtworks = filteredArtworks.slice(startIdx, endIdx);

  // Build all items into a fragment first
  const fragment = document.createDocumentFragment();

  paginatedArtworks.forEach((art, i) => {
    const realIndex = startIdx + i;
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.setAttribute('data-index', realIndex);

    // build card with createElement / textContent instead of innerHTML
    const img = document.createElement('img');
    img.src = art.image;
    img.alt = `${art.title} by ${art.artist}`;
    img.loading = 'lazy';

    const overlay = document.createElement('div');
    overlay.className = 'gallery-overlay';

    const h3 = document.createElement('h3');
    h3.textContent = art.title;

    const artistSpan = document.createElement('span');
    artistSpan.className = 'artist';
    artistSpan.textContent = `by ${art.artist}`;

    const categorySpan = document.createElement('span');
    categorySpan.className = 'category-tag';
    categorySpan.textContent = art.category;

    overlay.append(h3, artistSpan, categorySpan);
    item.append(img, overlay);

    item.addEventListener('click', () => openLightbox(realIndex));
    fragment.appendChild(item);
  });

  // Single DOM write
  galleryGrid.appendChild(fragment);

  renderPagination();

  // Re-observe new items for scroll animation
  observeGalleryItems();
}

// Pagination Rendering
function renderPagination() {
  const paginationContainer = document.getElementById('pagination');
  if (!paginationContainer) return;

  const totalPages = Math.ceil(filteredArtworks.length / itemsPerPage);
  paginationContainer.innerHTML = '';

  if (totalPages <= 1) return; // Hide pagination if 1 page or less

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement('button');
    btn.className = `page-btn${i === currentPage ? ' active' : ''}`;
    btn.textContent = i;
    btn.addEventListener('click', () => {
      renderGallery(currentFilter, i);
      // Smooth scroll back to gallery top
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    });
    paginationContainer.appendChild(btn);
  }
}


// Filter Buttons
function renderFilters() {
  const categories = ['All', ...new Set(artworks.map(a => a.category))];

  filterBar.innerHTML = '';
  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = `filter-btn${cat === currentFilter ? ' active' : ''}`;
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGallery(cat, 1); // Reset to page 1 on filter
    });
    filterBar.appendChild(btn);
  });
}


// Lightbox
function openLightbox(index) {
  currentIndex = index;
  updateLightboxContent();
  lightbox.classList.add('active');
  lightbox.setAttribute('aria-hidden', 'false'); // Fix 6
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
  lightbox.setAttribute('aria-hidden', 'true'); // Fix 6
  document.body.style.overflow = '';
}

function updateLightboxContent() {
  const art = filteredArtworks[currentIndex];
  if (!art) return;

  lightboxImg.src = art.image;
  lightboxImg.alt = `${art.title} by ${art.artist}`;
  lightboxTitle.textContent = art.title;
  lightboxArtist.textContent = `by ${art.artist}`;

  if (art.artist_url) {
    lightboxArtist.href = art.artist_url;
    lightboxArtist.style.pointerEvents = 'auto';
    lightboxArtist.style.textDecoration = 'underline';
  } else {
    lightboxArtist.removeAttribute('href');
    lightboxArtist.style.pointerEvents = 'none';
    lightboxArtist.style.textDecoration = 'none';
  }

  lightboxDesc.textContent = art.description;
  lightboxCategory.textContent = art.category;
  lightboxDate.textContent = art.date;

  // Toggle nav visibility at edges
  lightboxPrev.style.visibility = currentIndex > 0 ? 'visible' : 'hidden';
  lightboxNext.style.visibility = currentIndex < filteredArtworks.length - 1 ? 'visible' : 'hidden';
}

function navigateLightbox(direction) {
  const newIndex = currentIndex + direction;
  if (newIndex >= 0 && newIndex < filteredArtworks.length) {
    currentIndex = newIndex;
    updateLightboxContent();
  }
}

// Lightbox event listeners
lightboxClose.addEventListener('click', closeLightbox);
lightboxPrev.addEventListener('click', () => navigateLightbox(-1));
lightboxNext.addEventListener('click', () => navigateLightbox(1));

// Close on backdrop click
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (!lightbox.classList.contains('active')) return;

  switch (e.key) {
    case 'Escape':
      closeLightbox();
      break;
    case 'ArrowLeft':
      navigateLightbox(-1);
      break;
    case 'ArrowRight':
      navigateLightbox(1);
      break;
  }
});


// Navbar scroll effect
let lastScrollY = 0;

window.addEventListener('scroll', () => {
  const scrollY = window.scrollY;
  navbar.classList.toggle('scrolled', scrollY > 50);
  lastScrollY = scrollY;

  // Auto-close mobile menu on scroll
  if (navLinks.classList.contains('open')) {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false'); // Fix 6
    document.body.style.overflow = '';
    navbar.classList.remove('menu-open');
  }
}, { passive: true });


// Mobile Menu Toggle (Fix 6 — aria-expanded)
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
  const isOpen = navLinks.classList.contains('open');
  navToggle.setAttribute('aria-expanded', String(isOpen)); // Fix 6
  document.body.style.overflow = isOpen ? 'hidden' : '';
  navbar.classList.toggle('menu-open', isOpen);
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false'); // Fix 6
    document.body.style.overflow = '';
    navbar.classList.remove('menu-open');
  });
});


// Scroll Animations (Intersection Observer)
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      scrollObserver.unobserve(entry.target);
    }
  });
}, observerOptions);

function setupScrollAnimations() {
  document.querySelectorAll('.fade-in').forEach(el => {
    scrollObserver.observe(el);
  });
}

// Theme Toggle Logic
function initTheme() {
  // Check local storage first
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  } else {
    // Check system preference if no saved preference
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    document.documentElement.setAttribute('data-theme', prefersLight ? 'light' : 'dark');
  }

  // Set initial aria-pressed state
  const isDark = (document.documentElement.getAttribute('data-theme') || 'dark') === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));

  themeToggle.addEventListener('click', () => {
    // Add transition class for smooth animation
    document.body.classList.add('theme-transition');

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Update aria-pressed
    themeToggle.setAttribute('aria-pressed', String(newTheme === 'dark'));

    // Remove transition class after animation completes
    setTimeout(() => {
      document.body.classList.remove('theme-transition');
    }, 400);
  });
}

// Observe gallery items (called after rendering)
function observeGalleryItems() {
  const items = document.querySelectorAll('.gallery-item');
  items.forEach((item, i) => {
    item.style.transitionDelay = `${i * 0.08}s`;
    scrollObserver.observe(item);
  });
}


// Stats Counter
function updateStats() {
  const pieceCount = artworks.length;
  const artistCount = new Set(artworks.map(a => a.artist)).size;

  animateCounter('statPieces', pieceCount);
  animateCounter('statArtists', artistCount);
}

function animateCounter(elementId, target) {
  const el = document.getElementById(elementId);
  let current = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 40);
}


// Initialize
async function init() {
  initTheme();
  setupScrollAnimations();

  // set initial ARIA states
  navToggle.setAttribute('aria-expanded', 'false');
  lightbox.setAttribute('aria-hidden', 'true');

  await fetchArtworks();

  renderFilters();
  renderGallery();
  updateStats();

  // Start polling for updates every 30 seconds
  setInterval(pollForUpdates, 30000);
}

// Background poll only re-renders if data changed
let pollCount = 0;
async function pollForUpdates() {
  pollCount++;
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[Poll #${pollCount}] Checking for updates... (${timestamp})`);

  try {
    const startTime = performance.now();
    const response = await fetch(sheetUrl);
    const fetchTime = (performance.now() - startTime).toFixed(0);
    console.log(`[Poll #${pollCount}] Fetch completed in ${fetchTime}ms (status: ${response.status})`);

    const text = await response.text();
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    // reuse shared parser
    const newArtworks = parseSheetRows(data);

    console.log(`[Poll #${pollCount}] Fetched ${newArtworks.length} rows from sheet`);

    // Only update if data actually changed
    if (JSON.stringify(newArtworks) !== JSON.stringify(artworks)) {
      console.log(`[Poll #${pollCount}] DATA CHANGED! Updating gallery...`);
      console.log(`   Old: ${artworks.length} items → New: ${newArtworks.length} items`);
      artworks = newArtworks;
      filteredArtworks = currentFilter === 'All'
        ? [...artworks]
        : artworks.filter(a => a.category === currentFilter);
      renderFilters();
      renderGallery(currentFilter, currentPage);
      updateStats();
      console.log(`[Poll #${pollCount}] Gallery re-rendered successfully`);
    } else {
      console.log(`[Poll #${pollCount}] No changes detected`);
    }
  } catch (err) {
    console.warn(`[Poll #${pollCount}] Error: ${err.message} — will retry in 30s`);
  }
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
