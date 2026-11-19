/* ==========================================================================
   PeakShelf — Shared State & Page Controllers
   ========================================================================== */

const STORAGE_KEY = "peakshelf_books_v1";

const SEED_BOOKS = [
  {
    id: "seed-1",
    title: "Atomic Habits",
    author: "James Clear",
    genre: "Self-Help",
    lenderName: "Rohan Deshmukh",
    phone: "+91 98230 11223",
    note: "Weekends near Baner",
    available: true,
    isUserCreated: false,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    id: "seed-2",
    title: "The Pragmatic Programmer",
    author: "David Thomas & Andrew Hunt",
    genre: "Tech",
    lenderName: "Meera Kulkarni",
    phone: "+91 97654 33445",
    note: "Weekday evenings, Hinjawadi Phase 1",
    available: true,
    isUserCreated: false,
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: "seed-3",
    title: "Project Hail Mary",
    author: "Andy Weir",
    genre: "Fiction",
    lenderName: "Kabir Nair",
    phone: "+91 99123 55667",
    note: "Flexible pickup",
    available: true,
    isUserCreated: false,
    createdAt: Date.now() - 86400000,
  },
];

/* ---------- Data Layer ---------- */

function getBooks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_BOOKS));
      return [...SEED_BOOKS];
    }
    return JSON.parse(raw);
  } catch {
    return [...SEED_BOOKS];
  }
}

function saveBooks(books) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function escapeHTML(str = "") {
  return String(str).replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char];
  });
}

/* ---------- Toast Feedback ---------- */

let toastTimer;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2800);
}

/* ---------- Card Template ---------- */

function renderBookCard(book, { allowDelete = false } = {}) {
  const statusClass = book.available ? "badge-available" : "badge-borrowed";
  const statusText = book.available ? "Available" : "Borrowed";

  return `
    <article class="book-card glass">
      <div>
        <div class="book-meta-top">
          <span class="badge">${escapeHTML(book.genre)}</span>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
        <h3 class="book-title">${escapeHTML(book.title)}</h3>
        <p class="book-author">${escapeHTML(book.author || "Unknown Author")}</p>
      </div>

      <div class="lender-row">
        <div class="lender-info">
          <strong>${escapeHTML(book.lenderName)}</strong>
          <span>${escapeHTML(book.note || "Contact for pickup")}</span>
        </div>
        ${
          allowDelete
            ? `<button type="button" class="btn btn-danger" data-delete-id="${escapeHTML(book.id)}">Remove</button>`
            : `<button type="button" class="btn btn-glass" data-borrow-id="${escapeHTML(book.id)}">Borrow</button>`
        }
      </div>
    </article>
  `;
}

/* ---------- Borrow / Contact Modal ---------- */

let activeModalBookId = null;

function initModal(onStatusChange) {
  const backdrop = document.getElementById("borrow-modal");
  if (!backdrop) return;

  const closeBtn = document.getElementById("modal-close");
  const copyBtn = document.getElementById("modal-copy-btn");
  const toggleBtn = document.getElementById("modal-toggle-status");

  const closeModal = () => {
    backdrop.classList.remove("open");
    activeModalBookId = null;
  };

  closeBtn.addEventListener("click", closeModal);
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("open")) closeModal();
  });

  copyBtn.addEventListener("click", async () => {
    const phone = document.getElementById("modal-lender-phone").textContent;
    try {
      await navigator.clipboard.writeText(phone);
      showToast("Phone number copied to clipboard.");
    } catch {
      showToast("Could not copy automatically. Please select the number.");
    }
  });

  toggleBtn.addEventListener("click", () => {
    if (!activeModalBookId) return;
    const books = getBooks();
    const target = books.find((b) => b.id === activeModalBookId);
    if (!target) return;

    target.available = !target.available;
    saveBooks(books);
    showToast(target.available ? "Marked as available again." : "Marked as borrowed.");
    closeModal();
    if (typeof onStatusChange === "function") onStatusChange();
  });
}

function openBorrowModal(bookId) {
  const book = getBooks().find((b) => b.id === bookId);
  const backdrop = document.getElementById("borrow-modal");
  if (!book || !backdrop) return;

  activeModalBookId = book.id;
  document.getElementById("modal-book-genre").textContent = book.genre;
  document.getElementById("modal-book-title").textContent = book.title;
  document.getElementById("modal-book-author").textContent = book.author ? `by ${book.author}` : "";
  document.getElementById("modal-lender-name").textContent = book.lenderName;
  document.getElementById("modal-lender-phone").textContent = book.phone;
  document.getElementById("modal-lender-note").textContent = book.note || "Contact lender to coordinate";

  const cleanPhone = book.phone.replace(/[^\d+]/g, "");
  document.getElementById("modal-call-btn").setAttribute("href", `tel:${cleanPhone}`);
  document.getElementById("modal-toggle-status").textContent = book.available
    ? "Mark as Borrowed"
    : "Mark as Available";

  backdrop.classList.add("open");
}

/* ---------- Page 1: Home ---------- */

function initHomePage() {
  const render = () => {
    const books = getBooks();
    const availableCount = books.filter((b) => b.available).length;
    const uniqueLenders = new Set(books.map((b) => b.lenderName.trim().toLowerCase())).size;

    document.getElementById("stat-total").textContent = books.length;
    document.getElementById("stat-available").textContent = availableCount;
    document.getElementById("stat-lenders").textContent = uniqueLenders;

    const recent = [...books].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
    const grid = document.getElementById("recent-books-grid");
    grid.innerHTML = recent.map((book) => renderBookCard(book)).join("");
  };

  initModal(render);
  render();

  document.getElementById("recent-books-grid").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-borrow-id]");
    if (btn) openBorrowModal(btn.dataset.borrowId);
  });
}

/* ---------- Page 2: Browse ---------- */

function initBrowsePage() {
  let activeFilter = "All";
  let searchQuery = "";

  const grid = document.getElementById("browse-books-grid");
  const emptyState = document.getElementById("browse-empty");
  const searchInput = document.getElementById("search-input");
  const filterGroup = document.getElementById("genre-filters");

  const render = () => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = getBooks()
      .sort((a, b) => b.createdAt - a.createdAt)
      .filter((book) => {
        if (activeFilter === "Available" && !book.available) return false;
        if (activeFilter !== "All" && activeFilter !== "Available" && book.genre !== activeFilter) {
          return false;
        }
        if (!q) return true;
        return (
          book.title.toLowerCase().includes(q) ||
          (book.author || "").toLowerCase().includes(q) ||
          book.lenderName.toLowerCase().includes(q)
        );
      });

    if (filtered.length === 0) {
      grid.innerHTML = "";
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      grid.innerHTML = filtered.map((book) => renderBookCard(book)).join("");
    }
  };

  initModal(render);
  render();

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value;
    render();
  });

  filterGroup.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    filterGroup.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    activeFilter = chip.dataset.filter;
    render();
  });

  grid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-borrow-id]");
    if (btn) openBorrowModal(btn.dataset.borrowId);
  });
}

/* ---------- Page 3: Lend / Upload ---------- */

function initLendPage() {
  const form = document.getElementById("lend-form");
  const myGrid = document.getElementById("my-books-grid");
  const myEmpty = document.getElementById("my-books-empty");

  const renderMyBooks = () => {
    const mine = getBooks()
      .filter((b) => b.isUserCreated)
      .sort((a, b) => b.createdAt - a.createdAt);

    if (mine.length === 0) {
      myGrid.innerHTML = "";
      myEmpty.hidden = false;
    } else {
      myEmpty.hidden = true;
      myGrid.innerHTML = mine.map((book) => renderBookCard(book, { allowDelete: true })).join("");
    }
  };

  renderMyBooks();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const title = form.title.value.trim();
    const author = form.author.value.trim();
    const genre = form.genre.value;
    const lenderName = form.lenderName.value.trim();
    const phone = form.phone.value.trim();
    const note = form.note.value.trim();

    // Clear previous errors
    document.getElementById("err-title").textContent = "";
    document.getElementById("err-name").textContent = "";
    document.getElementById("err-phone").textContent = "";

    let hasError = false;
    if (title.length < 2) {
      document.getElementById("err-title").textContent = "Please enter the book name.";
      hasError = true;
    }
    if (lenderName.length < 2) {
      document.getElementById("err-name").textContent = "Please enter your name.";
      hasError = true;
    }
    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      document.getElementById("err-phone").textContent = "Enter a valid phone number (7–15 digits).";
      hasError = true;
    }

    if (hasError) return;

    const newBook = {
      id: `book-${Date.now()}`,
      title,
      author,
      genre,
      lenderName,
      phone,
      note,
      available: true,
      isUserCreated: true,
      createdAt: Date.now(),
    };

    const books = getBooks();
    books.unshift(newBook);
    saveBooks(books);

    form.reset();
    renderMyBooks();
    showToast(`"${title}" is now live on PeakShelf!`);
  });

  myGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-delete-id]");
    if (!btn) return;
    const updated = getBooks().filter((b) => b.id !== btn.dataset.deleteId);
    saveBooks(updated);
    renderMyBooks();
    showToast("Listing removed.");
  });
}

/* ---------- Bootstrap ---------- */

document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "home") initHomePage();
  if (page === "browse") initBrowsePage();
  if (page === "lend") initLendPage();
});