
const STORAGE_KEY = "mykas_personal_transactions";

let transactions = loadTransactions();

function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function rupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);
}

function formatDate(date) {
  if (!date) return "-";

  return new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function today() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000)
    .toISOString().slice(0, 10);
}

// TANGGAL DASHBOARD
document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

// NAVIGASI
function showPage(page) {
  document.querySelectorAll(".page-section").forEach(section => {
    section.classList.add("hidden");
  });

  document.getElementById("page-" + page).classList.remove("hidden");

  document.querySelectorAll(".nav-link[data-page]").forEach(button => {
    button.classList.toggle("active", button.dataset.page === page);
  });

  const headings = {
    dashboard: "Dashboard",
    transactions: "Semua Transaksi",
    income: "Pemasukan",
    expense: "Pengeluaran",
    statistics: "Statistik Keuangan"
  };

  document.getElementById("pageHeading").textContent = headings[page];
  document.getElementById("sidebar").classList.remove("open");

  refreshAll();
}

document.querySelectorAll(".nav-link[data-page]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.page));
});

document.querySelectorAll("[data-goto]").forEach(button => {
  button.addEventListener("click", () => showPage(button.dataset.goto));
});

document.getElementById("mobileMenu").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
});

// MODAL
function openModal(type = "all") {
  document.getElementById("transactionForm").reset();
  document.getElementById("date").value = today();

  const typeSelect = document.getElementById("type");

  if (type === "income") typeSelect.value = "income";
  else if (type === "expense") typeSelect.value = "expense";
  else typeSelect.value = "income";

  document.getElementById("transactionModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("transactionModal").classList.add("hidden");
}

document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", closeModal);
});

document.getElementById("quickAddBtn").addEventListener("click", () => openModal());
document.getElementById("addTransactionBtn").addEventListener("click", () => openModal());
document.getElementById("incomeAddBtn").addEventListener("click", () => openModal("income"));
document.getElementById("expenseAddBtn").addEventListener("click", () => openModal("expense"));

// TAMBAH TRANSAKSI
document.getElementById("transactionForm").addEventListener("submit", function(event) {
  event.preventDefault();

  const description = document.getElementById("description").value.trim();
  const type = document.getElementById("type").value;
  const category = document.getElementById("category").value;
  const amount = Number(document.getElementById("amount").value);
  const date = document.getElementById("date").value;

  if (!description || !date || !Number.isFinite(amount) || amount <= 0) {
    alert("Periksa kembali data transaksi.");
    return;
  }

  transactions.push({
    id: "trx-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    description,
    type,
    category,
    amount,
    date
  });

  saveTransactions();
  closeModal();
  refreshAll();

  alert("Transaksi berhasil disimpan!");
});

// HITUNG TOTAL
function calculateFinance() {
  const income = transactions
    .filter(item => item.type === "income")
    .reduce((total, item) => total + Number(item.amount), 0);

  const expense = transactions
    .filter(item => item.type === "expense")
    .reduce((total, item) => total + Number(item.amount), 0);

  return {
    income,
    expense,
    balance: income - expense
  };
}

// BARIS TABEL
function transactionRow(item, showAction = false) {
  const isIncome = item.type === "income";

  return `
    <tr>
      <td>${escapeHTML(item.description)}</td>
      <td>${escapeHTML(item.category)}</td>
      <td>${formatDate(item.date)}</td>
      ${showAction ? "" : ""}
      <td>
        <span class="type-badge ${isIncome ? "badge-income" : "badge-expense"}">
          ${isIncome ? "Pemasukan" : "Pengeluaran"}
        </span>
      </td>
      <td class="${isIncome ? "amount-income" : "amount-expense"}">
        ${isIncome ? "+" : "-"} ${rupiah(item.amount)}
      </td>
      ${showAction ? `
        <td>
          <button class="action-btn" onclick="deleteTransaction('${escapeHTML(item.id)}')">
            Hapus
          </button>
        </td>
      ` : ""}
    </tr>
  `;
}

// DASHBOARD
function renderDashboard() {
  const finance = calculateFinance();

  document.getElementById("balanceValue").textContent = rupiah(finance.balance);
  document.getElementById("incomeValue").textContent = rupiah(finance.income);
  document.getElementById("expenseValue").textContent = rupiah(finance.expense);

  document.getElementById("transactionCount").textContent = transactions.length;
  document.getElementById("incomeCount").textContent =
    transactions.filter(item => item.type === "income").length;
  document.getElementById("expenseCount").textContent =
    transactions.filter(item => item.type === "expense").length;

  const max = Math.max(finance.income, finance.expense, 1);

  document.getElementById("incomeBar").style.height =
    Math.max(3, finance.income / max * 100) + "%";

  document.getElementById("expenseBar").style.height =
    Math.max(3, finance.expense / max * 100) + "%";

  const latest = [...transactions].sort((a, b) =>
    b.date.localeCompare(a.date)
  ).slice(0, 5);

  document.getElementById("recentTable").innerHTML = latest.length
    ? latest.map(item => transactionRow(item)).join("")
    : `<tr><td colspan="5" class="empty-row">Belum ada transaksi.</td></tr>`;
}

// SEMUA TRANSAKSI
function renderTransactions() {
  const search = document.getElementById("searchTransaction").value.toLowerCase();
  const filter = document.getElementById("filterType").value;

  const filtered = [...transactions]
    .filter(item => {
      const matchText =
        item.description.toLowerCase().includes(search) ||
        item.category.toLowerCase().includes(search);

      const matchType = filter === "all" || item.type === filter;

      return matchText && matchType;
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("transactionTable").innerHTML = filtered.length
    ? filtered.map(item => transactionRow(item, true)).join("")
    : `<tr><td colspan="6" class="empty-row">Transaksi tidak ditemukan.</td></tr>`;
}

document.getElementById("searchTransaction").addEventListener("input", renderTransactions);
document.getElementById("filterType").addEventListener("change", renderTransactions);

// PEMASUKAN
function renderIncome() {
  const finance = calculateFinance();

  document.getElementById("incomePageValue").textContent = rupiah(finance.income);

  const items = transactions
    .filter(item => item.type === "income")
    .sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("incomeTable").innerHTML = items.length
    ? items.map(item => `
      <tr>
        <td>${escapeHTML(item.description)}</td>
        <td>${escapeHTML(item.category)}</td>
        <td>${formatDate(item.date)}</td>
        <td class="amount-income">+ ${rupiah(item.amount)}</td>
        <td><button class="action-btn" onclick="deleteTransaction('${escapeHTML(item.id)}')">Hapus</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="5" class="empty-row">Belum ada pemasukan.</td></tr>`;
}

// PENGELUARAN
function renderExpense() {
  const finance = calculateFinance();

  document.getElementById("expensePageValue").textContent = rupiah(finance.expense);

  const items = transactions
    .filter(item => item.type === "expense")
    .sort((a, b) => b.date.localeCompare(a.date));

  document.getElementById("expenseTable").innerHTML = items.length
    ? items.map(item => `
      <tr>
        <td>${escapeHTML(item.description)}</td>
        <td>${escapeHTML(item.category)}</td>
        <td>${formatDate(item.date)}</td>
        <td class="amount-expense">- ${rupiah(item.amount)}</td>
        <td><button class="action-btn" onclick="deleteTransaction('${escapeHTML(item.id)}')">Hapus</button></td>
      </tr>
    `).join("")
    : `<tr><td colspan="5" class="empty-row">Belum ada pengeluaran.</td></tr>`;
}

// HAPUS TRANSAKSI
function deleteTransaction(id) {
  if (!confirm("Yakin ingin menghapus transaksi ini?")) return;

  transactions = transactions.filter(item => item.id !== id);
  saveTransactions();
  refreshAll();
}

// STATISTIK
function renderStatistics() {
  const finance = calculateFinance();
  const total = finance.income + finance.expense;

  document.getElementById("statIncome").textContent = rupiah(finance.income);
  document.getElementById("statExpense").textContent = rupiah(finance.expense);
  document.getElementById("statBalance").textContent = rupiah(finance.balance);

  const incomePercent = total ? finance.income / total * 100 : 0;
  const expensePercent = total ? finance.expense / total * 100 : 0;

  document.getElementById("statIncomeBar").style.width = incomePercent + "%";
  document.getElementById("statExpenseBar").style.width = expensePercent + "%";

  document.getElementById("statIncomePercent").textContent =
    Math.round(incomePercent) + "%";

  document.getElementById("statExpensePercent").textContent =
    Math.round(expensePercent) + "%";
}

// EXPORT CSV
document.getElementById("exportBtn").addEventListener("click", function() {
  if (!transactions.length) {
    alert("Belum ada transaksi untuk diekspor.");
    return;
  }

  const rows = [
    ["Keterangan", "Kategori", "Jenis", "Nominal", "Tanggal"],
    ...transactions.map(item => [
      item.description,
      item.category,
      item.type === "income" ? "Pemasukan" : "Pengeluaran",
      item.amount,
      item.date
    ])
  ];

  const csv = rows.map(row =>
    row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(";")
  ).join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "laporan-keuangan-mykas.csv";
  link.click();

  URL.revokeObjectURL(url);
});

// DARK MODE
document.getElementById("themeBtn").addEventListener("click", function() {
  document.body.classList.toggle("dark");

  const dark = document.body.classList.contains("dark");

  this.textContent = dark ? "☀" : "☾";
  localStorage.setItem("mykas_personal_theme", dark ? "dark" : "light");
});

function loadTheme() {
  if (localStorage.getItem("mykas_personal_theme") === "dark") {
    document.body.classList.add("dark");
    document.getElementById("themeBtn").textContent = "☀";
  }
}

// RESET DATA
document.getElementById("resetBtn").addEventListener("click", function() {
  const answer = confirm(
    "PERHATIAN! Semua data pemasukan dan pengeluaran akan dihapus. Lanjutkan?"
  );

  if (!answer) return;

  transactions = [];
  saveTransactions();
  refreshAll();

  alert("Semua data transaksi berhasil direset.");
});

// REFRESH
function refreshAll() {
  renderDashboard();
  renderTransactions();
  renderIncome();
  renderExpense();
  renderStatistics();
}

// JALANKAN
document.getElementById("date").value = today();
loadTheme();
refreshAll();
