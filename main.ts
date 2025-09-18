// ===== Tipos =====
type Filter = "all" | "active" | "done";
type Prioridad = 'alta' | 'media' | 'baja';
type Categoria = 'matematicas' | 'espanol';

interface Task {
  id: string;
  title: string;
  description?: string;
  done: boolean;
  createdAt: number;
  dueDate?: number;
  prioridad: Prioridad;
  categoria?: Categoria;
}

interface AppState {
  tasks: Task[];
  filter: Filter;
  search?: string; // 🔹 Nuevo campo para búsqueda
}

// ===== Estado =====
const state: AppState = { tasks: [], filter: "all", search: "" };
const uid = (): string => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 10));

// ===== Persistencia con localStorage =====
const STORAGE_KEY = "todo-app-tasks";

function saveTasks(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch {
    // Ignorar errores
  }
}

function loadTasks(): Task[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as Task[]) : [];
  } catch {
    return [];
  }
}

function clearAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}

// ===== DOM =====
const $tituloTarea = document.getElementById("tituloTarea") as HTMLInputElement;
const $prioridadTarea = document.getElementById("prioridadTarea") as HTMLSelectElement;
const $categoriaTarea = document.getElementById("categoriaTarea") as HTMLSelectElement;
const $taskForm = document.getElementById("task-form") as HTMLFormElement;
const $input = document.getElementById("task-input") as HTMLInputElement;
const $addBtn = document.getElementById("add-btn") as HTMLButtonElement;
const $list = document.getElementById("list") as HTMLElement;
const $counter = document.getElementById("counter") as HTMLSpanElement;
const $empty = document.getElementById("empty") as HTMLDivElement;
const $clearDone = document.getElementById("clear-done") as HTMLButtonElement;
const $filterButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>('button[data-filter]')
);
const $description = document.getElementById("task-description") as HTMLTextAreaElement;
const $search = document.getElementById("search") as HTMLInputElement; // 🔹 Nuevo
const $dueDate = document.getElementById("task-due-date") as HTMLInputElement; // Nueva fecha límite

// Stats
const $statActive = document.getElementById("stat-active") as HTMLElement | null;
const $statDone = document.getElementById("stat-done") as HTMLElement | null;
const $statTotal = document.getElementById("stat-total") as HTMLElement | null;

// ===== CRUD =====
function addTask(title: string): void {
  const trimmed = (title ?? "").trim();
  if (!trimmed) return;
  const description = $description.value.trim() || undefined;
  const dueDateValue = $dueDate.value;
  const dueDate = dueDateValue ? new Date(dueDateValue).getTime() : undefined;
  const prioridad = $prioridadTarea.value as Prioridad;
  const categoria = $categoriaTarea.value as Categoria;

  state.tasks.unshift({ 
    id: uid(), 
    title: trimmed, 
    description, 
    done: false, 
    createdAt: Date.now(),
    dueDate,
    prioridad,
    categoria
  });
  render();
  $tituloTarea.value = "";
  $description.value = "";
  $dueDate.value = "";
  $prioridadTarea.value = "media"; // Reset to default
  $categoriaTarea.value = "matematicas"; // Reset to default
  $tituloTarea.focus();
}

function toggleTask(id: string): void {
  state.tasks = state.tasks.map(t => (t.id === id ? { ...t, done: !t.done } : t));
  render();
}

function removeTask(id: string): void {
  state.tasks = state.tasks.filter(t => t.id !== id);
  render();
}

function clearDone(): void {
  state.tasks = state.tasks.filter(t => !t.done);
  render();
}

function setFilter(f: Filter): void {
  state.filter = f;
  render();
}

function viewTask(id: string): void {
  const t = state.tasks.find(x => x.id === id);
  if (!t) {
    alert("No se encontró la tarea.");
    return;
  }
  const created = new Date(t.createdAt).toLocaleString();
  const description = t.description ? `\nDescripción: ${t.description}` : "";
  const dueInfo = t.dueDate ? `\nVence: ${new Date(t.dueDate).toLocaleString()}` : "";
  const overdue = t.dueDate && t.dueDate < Date.now() && !t.done ? "\n⚠️ VENCIDA" : "";
  const prioridadText = `\nPrioridad: ${t.prioridad.charAt(0).toUpperCase() + t.prioridad.slice(1)}`;
  const categoriaText = `\nCategoría: ${t.categoria === 'matematicas' ? 'Matemáticas' : 'Español'}`;

  alert(
    `📄 Detalle de la tarea\n\n` +
    `ID: ${t.id}\n` +
    `Título: ${t.title}${description}${dueInfo}${overdue}\n` +
    `Estado: ${t.done ? "Completada" : "Activa"}\n` +
    `Prioridad: ${t.prioridad}\n` +
    `Categoría: ${t.categoria}\n` +
    `Creada: ${created}`
  );
}
function editTaskTitle(id: string): void {
  const t = state.tasks.find(x => x.id === id);
  if (!t) {
    alert("No se encontró la tarea.");
    return;
  }
  const nuevo = prompt("Nuevo título para la tarea:", t.title);
  if (nuevo === null) return;
  const trimmed = nuevo.trim();
  if (!trimmed) {
    alert("El título no puede estar vacío.");
    return;
  }
  state.tasks = state.tasks.map(x => (x.id === id ? { ...x, title: trimmed } : x));
  render();
}

// ===== Reset total =====
function resetAll(): void {
  const ok = confirm("¿Seguro que quieres borrar TODAS las tareas? Esta acción no se puede deshacer.");
  if (!ok) return;
  state.tasks = [];
  clearAllStorage();
  render();
}

// ===== Helpers =====
function visibleTasks(): Task[] {
  let filtered: Task[] = [];
  switch (state.filter) {
    case "active": filtered = state.tasks.filter(t => !t.done); break;
    case "done":   filtered = state.tasks.filter(t =>  t.done); break;
    default:       filtered = state.tasks;
  }
  // 🔹 aplicar búsqueda
  const query = (state.search ?? "").toLowerCase();
  if (query) {
    filtered = filtered.filter(t => t.title.toLowerCase().includes(query));
  }
  return filtered;
}

function setSearch(q: string): void {
  state.search = q;
  render();
}

// Función para verificar si una tarea está vencida
function isOverdue(task: Task): boolean {
  return !!(task.dueDate && task.dueDate < Date.now() && !task.done);
}

// Función para obtener el estado de vencimiento
function getDueDateStatus(task: Task): "overdue" | "today" | "soon" | "normal" {
  if (!task.dueDate || task.done) return "normal";
  
  const now = Date.now();
  const due = task.dueDate;
  const dayInMs = 24 * 60 * 60 * 1000;
  
  if (due < now) return "overdue";
  if (due < now + dayInMs) return "today";
  if (due < now + (3 * dayInMs)) return "soon";
  return "normal";
}

// Función para mostrar notificaciones de tareas vencidas
function checkOverdueTasks(): void {
  const overdue = state.tasks.filter(isOverdue);
  if (overdue.length > 0) {
    const titles = overdue.map(t => `• ${t.title}`).join('\n');
    console.warn(`⚠️ Tienes ${overdue.length} tarea(s) vencida(s):\n${titles}`);
  }
}

// ===== Reset Button =====
function ensureResetButton(): void {
  const existing = document.getElementById("reset-all") as HTMLButtonElement | null;
  if (existing) return;

  const container = $clearDone?.parentElement ?? document.body;
  const btn = document.createElement("button");
  btn.id = "reset-all";
  btn.type = "button";
  btn.className = "btn btn-outline-warning btn-sm";
  btn.innerHTML = '<i class="bi bi-x-circle me-1"></i> Resetear lista';
  btn.addEventListener("click", resetAll);

  const spacer = document.createElement("span");
  spacer.className = "d-inline-block";
  spacer.style.width = "6px";

  container.append(spacer, btn);
}
// Función para obtener clase CSS del badge de prioridad
function getPriorityBadgeClass(prioridad: Prioridad): string {
  switch (prioridad) {
    case 'alta': return 'badge bg-danger';
    case 'media': return 'badge bg-warning text-dark';
    case 'baja': return 'badge bg-success';
    default: return 'badge bg-secondary';
  }
}

// Función para obtener clase CSS del badge de categoría
function getCategoryBadgeClass(categoria: Categoria): string {
  switch (categoria) {
    case 'matematicas': return 'badge bg-purple';
    case 'espanol': return 'badge bg-teal';
    default: return 'badge bg-secondary';
  }
}
// ===== Render =====
function render(): void {
  const tasks = visibleTasks();

  $empty.classList.toggle("d-none", tasks.length !== 0);
  $list.innerHTML = "";

  for (const t of tasks) {
    const col = document.createElement("div");
    col.className = "col";

    const card = document.createElement("div");
    card.className = "card h-100 shadow-sm";
    if (t.done) {
      card.classList.add("border-success", "opacity-75");
    } else if (isOverdue(t)) {
      card.classList.add("border-danger");
    }

    const header = document.createElement("div");
    header.className = "card-header bg-transparent d-flex align-items-center gap-2";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "form-check-input";
    checkbox.checked = t.done;
    checkbox.title = "Marcar como completada / activa";
    checkbox.addEventListener("change", () => toggleTask(t.id));

    const title = document.createElement("div");
    title.className = "ms-1 fw-semibold task-title";
    title.textContent = t.title;
    if (t.done) title.classList.add("text-decoration-line-through");
    
// Badge de prioridad
    const priorityBadge = document.createElement("span");
    priorityBadge.className = `badge ${getPriorityBadgeClass(t.prioridad)}`;
    priorityBadge.textContent = t.prioridad.toUpperCase();
    
    header.append(checkbox, title, priorityBadge);

    const body = document.createElement("div");
    body.className = "card-body py-2";

  
    // Badge de categoría
    const categoryBadge = document.createElement("span");
    categoryBadge.className = `${getCategoryBadgeClass(t.categoria ?? 'matematicas')} mb-2`;
    categoryBadge.textContent = t.categoria === 'matematicas' ? 'Matemáticas' : 'Español';
    body.appendChild(categoryBadge);
    // Mostrar badge de vencida si la tarea está vencida y no está completada
    if (isOverdue(t)) {
      const overdueBadge = document.createElement("span");
      overdueBadge.className = "badge bg-danger ms-2";
      overdueBadge.textContent = "VENCIDA";
      body.appendChild(overdueBadge);
    }    
    if (t.description) {
      const descDiv = document.createElement("div");
      descDiv.className = "text-muted small mb-2";
      descDiv.textContent = t.description;
      body.appendChild(descDiv);
    }

    // Fecha límite si existe
    if (t.dueDate) {
      const dueDateDiv = document.createElement("div");
      const dueStatus = getDueDateStatus(t);
      const dueText = new Date(t.dueDate).toLocaleDateString();
      
      switch (dueStatus) {
        case "overdue":
          dueDateDiv.className = "text-danger small fw-bold mb-2";
          dueDateDiv.innerHTML = `⚠️ Vencida: ${dueText}`;
          break;
        case "today":
          dueDateDiv.className = "text-warning small fw-bold mb-2";
          dueDateDiv.innerHTML = `🔥 Vence hoy: ${dueText}`;
          break;
        case "soon":
          dueDateDiv.className = "text-primary small fw-semibold mb-2";
          dueDateDiv.innerHTML = `📅 Vence: ${dueText}`;
          break;
        default:
          dueDateDiv.className = "text-muted small mb-2";
          dueDateDiv.innerHTML = `📅 Vence: ${dueText}`;
      }
      body.appendChild(dueDateDiv);
    }
    const meta = document.createElement("div");
    meta.className = "text-secondary small";
    meta.textContent = "Creada: " + new Date(t.createdAt).toLocaleString();
    body.appendChild(meta);

    const footer = document.createElement("div");
    footer.className = "card-footer bg-transparent d-flex justify-content-end gap-2";

    const viewBtn = document.createElement("button");
    viewBtn.className = "btn btn-sm btn-outline-secondary";
    viewBtn.innerHTML = '<i class="bi bi-eye me-1"></i>Ver';
    viewBtn.addEventListener("click", () => viewTask(t.id));

    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-sm btn-outline-primary";
    editBtn.innerHTML = '<i class="bi bi-pencil-square me-1"></i>Editar';
    editBtn.addEventListener("click", () => editTaskTitle(t.id));

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-sm btn-outline-danger";
    removeBtn.innerHTML = '<i class="bi bi-trash3 me-1"></i>Eliminar';
    removeBtn.addEventListener("click", () => removeTask(t.id));

    footer.append(viewBtn, editBtn, removeBtn);

    card.append(header, body, footer);
    col.appendChild(card);
    $list.appendChild(col);
  }

  const total = state.tasks.length;
  const done = state.tasks.filter(t => t.done).length;
  const active = total - done;

  $counter.textContent = `${total} tareas • ${done} completadas`;
  if ($statActive) $statActive.textContent = String(active);
  if ($statDone) $statDone.textContent = String(done);
  if ($statTotal) $statTotal.textContent = String(total);

  for (const b of $filterButtons) {
    b.classList.toggle("active", b.dataset.filter === state.filter);
  }

  ensureResetButton();
  checkOverdueTasks();
  saveTasks();
}

// ===== Eventos =====
$addBtn.addEventListener("click", () => addTask($input.value));
$input.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter") addTask($input.value);
});
$clearDone.addEventListener("click", clearDone);
for (const b of $filterButtons) {
  b.addEventListener("click", () => setFilter((b.dataset.filter as Filter) ?? "all"));
}
$search.addEventListener("input", () => setSearch($search.value)); // 🔹 Nuevo

document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.ctrlKey && e.shiftKey && (e.key.toLowerCase() === "r")) {
    e.preventDefault();
    resetAll();
  }
});

// ===== Inicialización =====
state.tasks = loadTasks();
if (state.tasks.length === 0) {
  state.tasks = [
    { 
      id: uid(), 
      title: "Revisar TypeScript", 
      done: true, 
      createdAt: Date.now() - 60000,
      prioridad: 'media',
      categoria: 'matematicas'
    },
    { 
      id: uid(), 
      title: "Agregar validación de tipos", 
      done: false, 
      createdAt: Date.now() - 40000,
      prioridad: 'alta',
      categoria: 'espanol'
    },
    { 
      id: uid(), 
      title: "Probar filtros y cards", 
      done: false, 
      createdAt: Date.now() - 20000,
      prioridad: 'baja',
      categoria: 'matematicas'
    },
  ];
}


// ===== Modo oscuro =====
const THEME_KEY = "todo-app-theme";

function getStoredTheme(): string {
  try {
    return localStorage.getItem(THEME_KEY) || "light";
  } catch {
    return "light";
  }
}

function saveTheme(theme: string): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Ignorar errores de localStorage
  }
}

function updateThemeButton(theme: string): void {
  const $toggleDark = document.getElementById("toggle-dark") as HTMLButtonElement | null;
  if ($toggleDark) {
    $toggleDark.innerHTML = theme === "dark"
      ? '<i class="bi bi-sun me-1"></i> Modo claro'
      : '<i class="bi bi-moon me-1"></i> Modo oscuro';
  }
}

function setTheme(theme: string): void {
  document.documentElement.setAttribute("data-bs-theme", theme);
  updateThemeButton(theme);
  saveTheme(theme);
}

// Inicializar tema al cargar
const storedTheme = getStoredTheme();
setTheme(storedTheme);

const $toggleDark = document.getElementById("toggle-dark") as HTMLButtonElement | null;
if ($toggleDark) {
  $toggleDark.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-bs-theme") || "light";
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  });
}

render();
