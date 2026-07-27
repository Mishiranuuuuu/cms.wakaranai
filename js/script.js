/* Artwork Data fetched from Google Sheets */
let artworks = [];
let currentFilter = 'All';
let currentIndex = 0;
let filteredArtworks = [];

let currentPage = 1;
const itemsPerPage = 9;

const sheetId = '1-Cj5ksHOIEcZLtuIY07wE2NXufshZNxU42jToMGI9Mo';
const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;

async function fetchArtworks() {
  try {
    const response = await fetch(sheetUrl);
    const text = await response.text();

    // Google Sheets gviz API wraps the JSON in a function call. We slice it out.
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);

    // Map rows to our artwork object structure
    artworks = data.table.rows.map(row => {
      // Parse Google Sheets Date(YYYY,M,D) format to dd/mm/yyyy
      let dateVal = '';
      if (row.c[5]) {
        const rawDate = row.c[5].v;
        if (typeof rawDate === 'string' && rawDate.startsWith('Date(')) {
          const parts = rawDate.replace('Date(', '').replace(')', '').split(',');
          if (parts.length >= 3) {
            const y = parts[0];
            const m = String(parseInt(parts[1]) + 1).padStart(2, '0');
            const d = String(parts[2]).padStart(2, '0');
            dateVal = `${d}/${m}/${y}`;
          }
        } else {
          dateVal = row.c[5].f || row.c[5].v || '';
        }
      }

      // row.c is an array of columns: 0=id, 1=title, 2=artist, 3=image_url, 4=category, 5=date, 6=description, 7=artist_url
      return {
        id: row.c[0] ? row.c[0].v : '',
        title: row.c[1] ? row.c[1].v : 'Untitled',
        artist: row.c[2] ? row.c[2].v : 'Unknown',
        image: row.c[3] ? row.c[3].v : '',
        category: row.c[4] ? row.c[4].v : 'Other',
        date: dateVal,
        description: row.c[6] ? row.c[6].v : '',
        artist_url: row.c[7] ? row.c[7].v : ''
      };
    });

    filteredArtworks = [...artworks];

  } catch (error) {
    console.error("Error fetching from Google Sheets:", error);
  }
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




// Gallery rendering
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

  paginatedArtworks.forEach((art, i) => {
    const realIndex = startIdx + i;
    const item = document.createElement('div');
    item.className = 'gallery-item';
    item.setAttribute('data-index', realIndex);
    item.innerHTML = `
      <img src="${art.image}" alt="${art.title} by ${art.artist}" loading="lazy">
      <div class="gallery-overlay">
        <h3>${art.title}</h3>
        <span class="artist">by ${art.artist}</span>
        <span class="category-tag">${art.category}</span>
      </div>
    `;
    item.addEventListener('click', () => openLightbox(realIndex));
    galleryGrid.appendChild(item);
  });

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
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('active');
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
    document.body.style.overflow = '';
    navbar.classList.remove('menu-open');
  }
}, { passive: true });


// Mobile Menu Toggle
navToggle.addEventListener('click', () => {
  navToggle.classList.toggle('open');
  navLinks.classList.toggle('open');
  const isOpen = navLinks.classList.contains('open');
  document.body.style.overflow = isOpen ? 'hidden' : '';
  navbar.classList.toggle('menu-open', isOpen);
});

// Close menu on link click
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navToggle.classList.remove('open');
    navLinks.classList.remove('open');
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

  themeToggle.addEventListener('click', () => {
    // Add transition class for smooth animation
    document.body.classList.add('theme-transition');

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

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

  await fetchArtworks();

  renderFilters();
  renderGallery();
  updateStats();

  // Start polling for updates every 30 seconds
  setInterval(pollForUpdates, 30000);
}

// Background poll — only re-renders if data changed
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

    const newArtworks = data.table.rows.map(row => {
      let dateVal = '';
      if (row.c[5]) {
        const rawDate = row.c[5].v;
        if (typeof rawDate === 'string' && rawDate.startsWith('Date(')) {
          const parts = rawDate.replace('Date(', '').replace(')', '').split(',');
          if (parts.length >= 3) {
            const y = parts[0];
            const m = String(parseInt(parts[1]) + 1).padStart(2, '0');
            const d = String(parts[2]).padStart(2, '0');
            dateVal = `${d}/${m}/${y}`;
          }
        } else {
          dateVal = row.c[5].f || row.c[5].v || '';
        }
      }
      return {
        id: row.c[0] ? row.c[0].v : '',
        title: row.c[1] ? row.c[1].v : 'Untitled',
        artist: row.c[2] ? row.c[2].v : 'Unknown',
        image: row.c[3] ? row.c[3].v : '',
        category: row.c[4] ? row.c[4].v : 'Other',
        date: dateVal,
        description: row.c[6] ? row.c[6].v : '',
        artist_url: row.c[7] ? row.c[7].v : ''
      };
    });

    console.log(`[Poll #${pollCount}] Fetched ${newArtworks.length} rows from sheet`);

    // Only update if data actually changed
    if (JSON.stringify(newArtworks) !== JSON.stringify(artworks)) {
      console.log(`[Poll #${pollCount}] ✅ DATA CHANGED! Updating gallery...`);
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
