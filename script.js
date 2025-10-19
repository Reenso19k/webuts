// === KONSTANTA & VARIABEL GLOBAL ===
const TASK_STORAGE_KEY = "tasks";
let focusInterval = null;
let isFocusing = false;
let focusTimeRemaining = 0;

// === DARK MODE ===
const darkToggle = document.getElementById("darkModeToggle");
darkToggle.addEventListener("click", () => {
  document.body.classList.toggle("dark");
});

// === SIDEBAR & TAB NAVIGATION ===
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

menuToggle.addEventListener("click", () => {
    sidebar.classList.toggle("open");
    document.body.classList.toggle("menu-open");
});

document.querySelectorAll(".tab-link").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    
    // Tutup sidebar jika di klik
    sidebar.classList.remove("open");
    document.body.classList.remove("menu-open");

    // Kelola class active
    document.querySelectorAll(".tab-link").forEach((a) => a.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((tab) => tab.classList.remove("active"));

    link.classList.add("active");
    const targetTab = link.dataset.tab;
    document.getElementById(targetTab).classList.add("active");

    // Refresh data saat pindah tab
    if (targetTab === "home") showDeadlineList();
    if (targetTab === "tasks") showTaskList();
    if (targetTab === "task-log") showAllTasksLog();

    // Hentikan fokus jika pindah tab
    if (isFocusing) stopFocusMode(false);
  });
});

// === UTILS ===
function getTasks() {
    return JSON.parse(localStorage.getItem(TASK_STORAGE_KEY)) || [];
}

function saveTasks(tasks) {
    localStorage.setItem(TASK_STORAGE_KEY, JSON.stringify(tasks));
}

// Format waktu dalam jam, menit, detik (string)
function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [minutes.toString().padStart(2, '0'), seconds.toString().padStart(2, '0')];
    if (hours > 0) {
        parts.unshift(hours.toString().padStart(2, '0'));
    }
    return parts.join(':');
}


// === TAMBAH TUGAS ===
document.getElementById("addTask").addEventListener("click", () => {
  const name = document.getElementById("taskName").value.trim();
  const deadline = document.getElementById("taskDeadline").value;

  if (!name || !deadline) {
    alert("Isi nama tugas dan deadline dulu ya 🌷");
    return;
  }

  const tasks = getTasks();
  // Tambahkan properti isFinished (default: false)
  tasks.push({ name, deadline, isFinished: false });
  saveTasks(tasks);

  document.getElementById("taskName").value = "";
  document.getElementById("taskDeadline").value = "";

  showTaskList();
  showDeadlineList();
});

// === HAPUS TUGAS (Listener di showTaskList) ===

// === TOGGLE STATUS SELESAI ===
function toggleTaskFinish(index) {
    const tasks = getTasks();
    if (tasks[index]) {
        tasks[index].isFinished = !tasks[index].isFinished;
        saveTasks(tasks);
        // Refresh semua tampilan yang relevan
        showTaskList();
        showDeadlineList();
        showAllTasksLog();
    }
}


// Fungsi Pembantu untuk Membuat Task Item HTML
function createTaskItemHTML(task, index, showCheckbox = true, showDelete = false) {
    const deadline = new Date(task.deadline);
    const now = new Date();
    const timeDiffHours = (deadline - now) / (1000 * 60 * 60); // jam
    
    let statusClass = '';
    let statusTag = '';

    if (task.isFinished) {
        statusClass = 'finished';
        statusTag = '<span class="finished-tag">✅ Selesai</span>';
    } else if (timeDiffHours < 0) {
        statusClass = 'overdue';
        statusTag = '<span class="overdue-tag">❌ Kelewat</span>';
    } else if (timeDiffHours <= 24) {
        statusClass = 'urgent';
        statusTag = '<span class="urgent-tag">⚠️ Mepet!</span>';
    }
    
    // Checkbox dan Tombol Hapus hanya ditambahkan jika diminta
    const checkboxHTML = showCheckbox ? `<input type="checkbox" data-index="${index}" ${task.isFinished ? 'checked' : ''} class="finish-checkbox">` : '';
    const deleteButtonHTML = showDelete ? `<button class="delete" data-index="${index}">Hapus</button>` : '';

    return `
      <div class="task-item ${statusClass}">
        <div class="task-info">
            <strong>${task.name}</strong><br>
            <small>Deadline: ${deadline.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</small>
        </div>
        <div class="task-status">
            ${statusTag}
            ${checkboxHTML}
            ${deleteButtonHTML}
        </div>
      </div>
    `;
}

// Menghubungkan listener untuk checkbox
function addFinishCheckboxListeners(containerId) {
    document.querySelectorAll(`#${containerId} .finish-checkbox`).forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
            const index = e.target.dataset.index;
            toggleTaskFinish(index);
        });
    });
}

// === TAMPILKAN SEMUA TUGAS (Untuk Edit/Hapus di Kelola Tugas) ===
function showTaskList() {
  const container = document.getElementById("taskList");
  const tasks = getTasks();
  container.innerHTML = "";

  if (tasks.length === 0) {
    container.innerHTML = "<p>Belum ada tugas disimpan 🌱</p>";
    return;
  }

  tasks.forEach((task, index) => {
    // Tampilkan checkbox dan tombol hapus
    container.innerHTML += createTaskItemHTML(task, index, true, true);
  });

  addFinishCheckboxListeners("taskList");
  
  // Hapus tugas
  document.querySelectorAll(".delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = btn.dataset.index;
      const tasks = getTasks();
      tasks.splice(index, 1);
      saveTasks(tasks);
      showTaskList();
      showDeadlineList();
      showAllTasksLog();
    });
  });
}

// === DEADLINE URUT + PENANDA (Untuk Beranda) ===
function showDeadlineList() {
  const container = document.getElementById("deadlineList");
  let tasks = getTasks();
  container.innerHTML = "";

  if (tasks.length === 0) {
    container.innerHTML = "<p>Belum ada tugas 🌷</p>";
    return;
  }

  // Hanya tampilkan tugas yang BELUM SELESAI
  tasks = tasks.filter(task => !task.isFinished);
  
  // Urutkan berdasarkan deadline (paling dekat duluan)
  tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  if (tasks.length === 0) {
    container.innerHTML = "<p>Semua tugas sudah selesai! Yeay! 🎉</p>";
    return;
  }

  tasks.forEach((task, index) => {
    // NOTE: Index di sini adalah index dari array 'tasks' yang sudah difilter/diurutkan. 
    // Untuk checkbox, kita perlu index ASLI di localStorage.
    
    // Cari index asli dari task ini di array tugas global
    const originalIndex = getTasks().findIndex(t => t.name === task.name && t.deadline === task.deadline);
    
    container.innerHTML += createTaskItemHTML(task, originalIndex, true, false);
  });
  
  addFinishCheckboxListeners("deadlineList");
}

// === DAFTAR TUGAS (LOG) ===
function showAllTasksLog() {
    const container = document.getElementById("allTasksLog");
    let tasks = getTasks();
    container.innerHTML = "";

    if (tasks.length === 0) {
        container.innerHTML = "<p>Belum ada tugas disimpan 🌱</p>";
        return;
    }

    // Urutkan berdasarkan deadline (paling dekat duluan, termasuk yang kelewat)
    tasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    tasks.forEach((task, index) => {
        // Tampilkan checkbox (tidak perlu tombol hapus di sini)
        container.innerHTML += createTaskItemHTML(task, index, true, false);
    });

    addFinishCheckboxListeners("allTasksLog");
}


// === MODE FOKUS (SIMULASI) ===
document.getElementById("startFocus").addEventListener("click", () => {
    if (isFocusing) {
        stopFocusMode(true);
    } else {
        startFocusMode();
    }
});

function startFocusMode() {
    const durationInput = document.getElementById("focusDuration");
    const durationMinutes = parseInt(durationInput.value, 10);
    const startButton = document.getElementById("startFocus");
    const timerDisplay = document.getElementById("focusTimer");
    const message = document.getElementById("focusMessage");

    if (isNaN(durationMinutes) || durationMinutes < 5) {
        alert("Durasi fokus minimal 5 menit ya!");
        return;
    }

    focusTimeRemaining = durationMinutes * 60; // dalam detik
    isFocusing = true;
    startButton.textContent = "Berhenti Fokus";
    startButton.style.backgroundColor = 'var(--overdue)'; // Warna merah untuk berhenti
    message.textContent = "Fokus dimulai! Jangan sentuh HP ya! 🧘";
    durationInput.disabled = true;

    // Tampilkan waktu awal
    timerDisplay.textContent = formatTime(focusTimeRemaining);

    focusInterval = setInterval(() => {
        focusTimeRemaining--;
        timerDisplay.textContent = formatTime(focusTimeRemaining);

        if (focusTimeRemaining <= 0) {
            stopFocusMode(true);
            message.textContent = "Waktu fokus selesai! Ambil jeda sebentar. 🎉";
            // Simulasi notifikasi suara/pemberitahuan
            alert("⏰ Sesi fokus 🧘 telah berakhir!");
        }
    }, 1000);
}

function stopFocusMode(alertUser = true) {
    if (focusInterval) {
        clearInterval(focusInterval);
        focusInterval = null;
    }
    
    isFocusing = false;
    const startButton = document.getElementById("startFocus");
    const durationInput = document.getElementById("focusDuration");
    const timerDisplay = document.getElementById("focusTimer");

    startButton.textContent = "Mulai Fokus";
    startButton.style.backgroundColor = 'var(--button)';
    durationInput.disabled = false;
    timerDisplay.textContent = formatTime(focusTimeRemaining > 0 ? focusTimeRemaining : 0);
    
    if (alertUser && focusTimeRemaining > 0) {
        document.getElementById("focusMessage").textContent = "Fokus dihentikan. Semangat lagi nanti! 💪";
    }
}


// === KONTAK FORM (SIMULASI) ===
document.getElementById("contactForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const notification = document.getElementById("contactNotification");
    
    // Simulasi kirim data
    notification.style.display = "block";
    
    // Hapus notif setelah 4 detik
    setTimeout(() => {
        notification.style.display = "none";
        document.getElementById("contactMessage").value = ""; // Kosongkan pesan
    }, 4000);
});

// === INISIALISASI AWAL ===
showTaskList();
showDeadlineList();

// Tampilkan log jika tabnya aktif saat load (meskipun defaultnya 'home')
if(document.getElementById('task-log').classList.contains('active')) {
    showAllTasksLog();
}