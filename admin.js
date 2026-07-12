"use strict";

const { client, configured, el, text, safeImageUrl, setBusy, config } = window.IFCIS;
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const TABLES = Object.freeze({
  courses: "courses",
  calendar: "course_dates",
  gallery: "gallery_items",
  team: "team_members"
});

let sessionUser = null;
let activeEditor = null;
let cache = {
  courses: [],
  calendar: [],
  gallery: [],
  team: [],
  leads: []
};

function toast(message) {
  const node = $("#adminToast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.__adminToast);
  window.__adminToast = setTimeout(() => node.classList.remove("show"), 2500);
}

function showLogin(message = "") {
  $("#loginView").hidden = false;
  $("#dashboardView").hidden = true;
  $("#loginFeedback").textContent = message;
}
function showDashboard() {
  $("#loginView").hidden = true;
  $("#dashboardView").hidden = false;
}

async function verifyAdmin(user) {
  const { data, error } = await client
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || data?.role !== "admin") {
    await client.auth.signOut();
    throw new Error("Esta cuenta no tiene permisos de administrador.");
  }
}

async function establishSession() {
  if (!configured || !client) {
    showLogin("Configurá Supabase antes de usar el panel.");
    return;
  }

  const { data, error } = await client.auth.getSession();
  if (error || !data.session) {
    showLogin();
    return;
  }

  try {
    sessionUser = data.session.user;
    await verifyAdmin(sessionUser);
    showDashboard();
    await refreshAll();
  } catch (authError) {
    showLogin(authError.message);
  }
}

$("#loginForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const email = text($("#loginUser").value).toLowerCase();
  const password = $("#loginPassword").value;

  try {
    if (!configured || !client) throw new Error("Supabase no está configurado.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresá un email válido.");
    if (password.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");

    setBusy(button, true, "INGRESANDO...");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    sessionUser = data.user;
    await verifyAdmin(sessionUser);
    showDashboard();
    await refreshAll();
  } catch (error) {
    $("#loginFeedback").textContent = error.message || "No se pudo iniciar sesión.";
  } finally {
    setBusy(button, false);
  }
});

$("#logoutBtn")?.addEventListener("click", async () => {
  await client?.auth.signOut();
  sessionUser = null;
  showLogin();
});

client?.auth.onAuthStateChange((_event, session) => {
  if (!session) {
    sessionUser = null;
    showLogin();
  }
});

/* Mobile navigation */
const sidebar = $("#sidebar");
const overlay = $("#adminSidebarOverlay");
function setSidebar(open) {
  sidebar?.classList.toggle("mobile-open", open);
  overlay?.classList.toggle("show", open);
  document.body.classList.toggle("admin-menu-open", open);
  $("#sidebarToggle")?.setAttribute("aria-expanded", String(open));
}
$("#sidebarToggle")?.addEventListener("click", () => setSidebar(!sidebar?.classList.contains("mobile-open")));
overlay?.addEventListener("click", () => setSidebar(false));

const titles = {
  overview: "RESUMEN GENERAL",
  courses: "GESTIÓN DE CURSOS",
  calendar: "CALENDARIO",
  gallery: "GALERÍA",
  team: "EQUIPO",
  registrations: "INSCRIPCIONES",
  messages: "MENSAJES"
};
$$(".nav-item").forEach(button => button.addEventListener("click", () => {
  $$(".nav-item").forEach(node => node.classList.toggle("active", node === button));
  $$(".panel-section").forEach(section => section.classList.remove("active"));
  $(`#${button.dataset.section}Section`)?.classList.add("active");
  $("#pageTitle").textContent = titles[button.dataset.section] || "";
  setSidebar(false);
}));

/* Data */
async function selectTable(table, columns = "*", order = "position") {
  let query = client.from(table).select(columns);
  if (order) query = query.order(order, { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function refreshAll() {
  try {
    const [courses, calendar, gallery, team, leads] = await Promise.all([
      selectTable("courses"),
      selectTable("course_dates"),
      selectTable("gallery_items"),
      selectTable("team_members"),
      selectTable("leads", "*", "created_at")
    ]);

    cache = { courses, calendar, gallery, team, leads };
    renderAll();
  } catch (error) {
    console.error(error);
    toast(error.message || "No se pudieron cargar los datos.");
  }
}

function renderAll() {
  renderStats();
  renderRecent();
  renderCourses();
  renderCalendar();
  renderGallery();
  renderTeam();
  renderLeads();
}

function emptyNode(message) {
  return el("div", { className: "empty", text: message });
}
function imageNode(url, alt, fallback) {
  const image = el("img", {
    src: safeImageUrl(url) || fallback,
    alt: text(alt),
    loading: "lazy",
    decoding: "async"
  });
  image.addEventListener("error", () => { image.src = fallback; }, { once: true });
  return image;
}
function actionButtons(onEdit, onDelete) {
  return el("div", { className: "card-actions" }, [
    el("button", { type: "button", text: "EDITAR", on: { click: onEdit } }),
    el("button", { type: "button", text: "ELIMINAR", on: { click: onDelete } })
  ]);
}

function renderStats() {
  const stats = [
    ["INSCRIPCIONES", cache.leads.filter(item => item.kind === "registration").length],
    ["MENSAJES", cache.leads.filter(item => item.kind === "contact").length],
    ["CURSOS", cache.courses.length],
    ["GALERÍA", cache.gallery.length],
    ["EQUIPO", cache.team.length],
    ["FECHAS ACTIVAS", cache.calendar.length]
  ];
  const grid = $("#statsGrid");
  grid.replaceChildren(...stats.map(([label, value]) =>
    el("article", { className: "stat-card" }, [
      el("small", { text: label }),
      el("strong", { text: value })
    ])
  ));
}

function leadList(items) {
  if (!items.length) return emptyNode("Sin registros todavía.");
  return el("div", {}, items.slice(-5).reverse().map(item =>
    el("div", { className: "list-item" }, [
      el("div", {}, [
        el("strong", { text: item.full_name || "Sin nombre" }),
        el("span", { text: item.course || item.message || "Sin detalle" })
      ]),
      el("span", { text: item.email || "" })
    ])
  ));
}
function renderRecent() {
  $("#recentRegistrations").replaceChildren(leadList(cache.leads.filter(item => item.kind === "registration")));
  $("#recentMessages").replaceChildren(leadList(cache.leads.filter(item => item.kind === "contact")));
}

function renderCourses() {
  const grid = $("#courseAdminGrid");
  grid.replaceChildren();
  if (!cache.courses.length) return grid.append(emptyNode("No hay cursos cargados."));

  cache.courses.forEach(item => {
    grid.append(el("article", { className: "admin-card course-admin-card" }, [
      imageNode(item.image_url, item.title, "assets/legitimo.jpg"),
      el("div", { className: "course-admin-body" }, [
        el("span", { text: item.level || "NIVEL GENERAL" }),
        el("h3", { text: item.title }),
        el("p", { className: "admin-course-description", text: item.description || "Sin descripción." }),
        el("div", { className: "admin-course-meta", text: `${item.duration || "A definir"} · ${item.modality || "Presencial"}` }),
        actionButtons(() => editCourse(item), () => removeRecord("courses", item))
      ])
    ]));
  });
}

function renderCalendar() {
  const container = $("#calendarAdminList");
  container.replaceChildren();
  if (!cache.calendar.length) return container.append(emptyNode("No hay fechas cargadas."));

  const list = el("div", { className: "admin-calendar-list" });
  cache.calendar.forEach(item => {
    list.append(el("article", { className: "admin-calendar-item" }, [
      el("div", { className: "admin-calendar-date" }, [
        el("strong", { text: item.day || "--" }),
        el("span", { text: item.month || "" })
      ]),
      el("div", { className: "admin-calendar-copy" }, [
        el("h3", { text: item.title }),
        el("p", { text: item.detail || "" })
      ]),
      actionButtons(() => editDate(item), () => removeRecord("calendar", item))
    ]));
  });
  container.append(list);
}

function renderGallery() {
  const grid = $("#galleryAdminGrid");
  grid.replaceChildren();
  if (!cache.gallery.length) return grid.append(emptyNode("No hay imágenes cargadas."));

  cache.gallery.forEach(item => {
    grid.append(el("article", { className: "admin-card gallery-admin-card" }, [
      imageNode(item.image_url, item.title, "assets/gallery_1.png"),
      el("div", { className: "gallery-admin-body" }, [
        el("span", { className: "gallery-admin-badge", text: item.featured ? "DESTACADA" : "GALERÍA" }),
        el("h3", { text: item.title }),
        el("p", { text: "Imagen almacenada en Supabase Storage" }),
        actionButtons(() => editGallery(item), () => removeRecord("gallery", item))
      ])
    ]));
  });
}

function renderTeam() {
  const grid = $("#teamAdminGrid");
  grid.replaceChildren();
  if (!cache.team.length) return grid.append(emptyNode("No hay integrantes cargados."));

  cache.team.forEach(item => {
    grid.append(el("article", { className: "admin-card team-admin-card" }, [
      imageNode(item.image_url, item.name, "assets/team_1.png"),
      el("div", { className: "team-admin-body" }, [
        el("span", { text: item.role || "" }),
        el("h3", { text: item.name }),
        actionButtons(() => editTeam(item), () => removeRecord("team", item))
      ])
    ]));
  });
}

function tableForLeads(items) {
  if (!items.length) return emptyNode("Sin registros todavía.");
  const table = el("table", { className: "data-table" });
  table.append(el("thead", {}, [el("tr", {}, ["FECHA","NOMBRE","EMAIL","TELÉFONO","CURSO","MENSAJE","ESTADO"].map(label => el("th", { text: label })))]));
  const body = el("tbody");

  items.slice().reverse().forEach(item => {
    const status = el("select", {
      value: item.status || "new",
      on: { change: event => updateLeadStatus(item.id, event.currentTarget.value) }
    }, [
      el("option", { value: "new", text: "Nuevo" }),
      el("option", { value: "contacted", text: "Contactado" }),
      el("option", { value: "closed", text: "Cerrado" })
    ]);

    body.append(el("tr", {}, [
      el("td", { text: new Date(item.created_at).toLocaleString("es-AR") }),
      el("td", { text: item.full_name }),
      el("td", { text: item.email }),
      el("td", { text: item.phone || "" }),
      el("td", { text: item.course || "" }),
      el("td", { text: item.message || "" }),
      el("td", {}, [status])
    ]));
  });

  table.append(body);
  return table;
}
function renderLeads() {
  $("#registrationsTable").replaceChildren(tableForLeads(cache.leads.filter(item => item.kind === "registration")));
  $("#messagesTable").replaceChildren(tableForLeads(cache.leads.filter(item => item.kind === "contact")));
}

async function updateLeadStatus(id, status) {
  try {
    const { error } = await client.from("leads").update({ status }).eq("id", id);
    if (error) throw error;
    const item = cache.leads.find(entry => entry.id === id);
    if (item) item.status = status;
    toast("Estado actualizado");
  } catch (error) {
    toast(error.message || "No se pudo actualizar.");
    await refreshAll();
  }
}

/* Storage */
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
async function optimizeImage(file) {
  if (!allowedTypes.has(file.type)) throw new Error("Solo se permiten JPG, PNG o WEBP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen no puede superar 5 MB.");

  const bitmap = await createImageBitmap(file);
  if (bitmap.width > 6000 || bitmap.height > 6000) throw new Error("La imagen tiene dimensiones excesivas.");

  const max = 1800;
  const ratio = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
  canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
  canvas.getContext("2d", { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(value => value ? resolve(value) : reject(new Error("No se pudo procesar la imagen.")), "image/webp", 0.84)
  );
  return blob;
}

async function uploadImage(file, folder) {
  if (!sessionUser) throw new Error("La sesión expiró.");
  const blob = await optimizeImage(file);
  const path = `${folder}/${sessionUser.id}/${crypto.randomUUID()}.webp`;

  const { error } = await client.storage
    .from(config.STORAGE_BUCKET || "ifcis-media")
    .upload(path, blob, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false
    });
  if (error) throw error;

  const { data } = client.storage.from(config.STORAGE_BUCKET || "ifcis-media").getPublicUrl(path);
  return { url: data.publicUrl, path };
}

/* Editor */
const editorModal = $("#editorModal");
const editorForm = $("#editorForm");
function closeEditor() {
  activeEditor = null;
  editorModal.classList.remove("open");
  editorModal.setAttribute("aria-hidden", "true");
  editorForm.replaceChildren();
}
$("#closeEditor")?.addEventListener("click", closeEditor);
editorModal?.addEventListener("click", event => { if (event.target === editorModal) closeEditor(); });

function fieldNode(field) {
  const label = el("label", {}, [document.createTextNode(field.label)]);
  let input;

  if (field.type === "textarea") {
    input = el("textarea", { name: field.name, rows: field.rows || 3, value: field.value || "", required: field.required !== false });
    input.textContent = field.value || "";
  } else if (field.type === "checkbox") {
    input = el("input", { type: "checkbox", name: field.name, checked: Boolean(field.value) });
  } else if (field.type === "image") {
    const hidden = el("input", { type: "hidden", name: field.name, value: field.value || "" });
    const pathHidden = el("input", { type: "hidden", name: `${field.name}_path`, value: field.path || "" });
    const preview = imageNode(field.value, "Vista previa", field.fallback || "assets/legitimo.jpg");
    preview.className = "image-preview";
    const fileInput = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp", hidden: true });
    const uploadButton = el("button", { type: "button", className: "upload-image-btn", text: "SUBIR IMAGEN" });

    uploadButton.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      try {
        setBusy(uploadButton, true, "SUBIENDO...");
        const uploaded = await uploadImage(file, field.folder);
        hidden.value = uploaded.url;
        pathHidden.value = uploaded.path;
        preview.src = uploaded.url;
        toast("Imagen subida correctamente");
      } catch (error) {
        toast(error.message || "No se pudo subir la imagen.");
      } finally {
        setBusy(uploadButton, false);
        fileInput.value = "";
      }
    });

    label.className = "image-upload-field";
    label.append(hidden, pathHidden, el("div", { className: "image-preview-wrap" }, [preview]), uploadButton, fileInput,
      el("small", { text: "JPG, PNG o WEBP. Máximo 5 MB." }));
    return label;
  } else {
    input = el("input", {
      type: field.type || "text",
      name: field.name,
      value: field.value || "",
      required: field.required !== false,
      maxLength: field.maxLength || 300
    });
  }

  label.append(input);
  return label;
}

function openEditor({ title, eyebrow, fields, table, id = null, onNormalize }) {
  activeEditor = { table, id, onNormalize };
  $("#editorTitle").textContent = title;
  $("#editorEyebrow").textContent = eyebrow;
  editorForm.replaceChildren(...fields.map(fieldNode));

  const cancel = el("button", { type: "button", className: "secondary-btn", text: "CANCELAR", on: { click: closeEditor } });
  const save = el("button", { type: "submit", className: "gold-btn", text: "GUARDAR CAMBIOS" });
  editorForm.append(el("div", { className: "form-actions" }, [cancel, save]));

  editorModal.classList.add("open");
  editorModal.setAttribute("aria-hidden", "false");
}

editorForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (!activeEditor) return;

  const button = event.currentTarget.querySelector('button[type="submit"]');
  const raw = Object.fromEntries(new FormData(event.currentTarget));
  event.currentTarget.querySelectorAll('input[type="checkbox"]').forEach(input => { raw[input.name] = input.checked; });
  const payload = activeEditor.onNormalize ? activeEditor.onNormalize(raw) : raw;

  try {
    setBusy(button, true, "GUARDANDO...");
    let query = client.from(activeEditor.table);
    const result = activeEditor.id
      ? await query.update(payload).eq("id", activeEditor.id).select().single()
      : await query.insert(payload).select().single();

    if (result.error) throw result.error;
    closeEditor();
    await refreshAll();
    toast("Cambios guardados");
  } catch (error) {
    toast(error.message || "No se pudo guardar.");
  } finally {
    setBusy(button, false);
  }
});

function basePublished(item) {
  return {
    position: Number(item.position || 0),
    is_published: item.is_published !== false
  };
}

function editCourse(item = {}) {
  openEditor({
    title: item.id ? "Editar curso" : "Nuevo curso",
    eyebrow: "GESTIÓN ACADÉMICA",
    table: "courses",
    id: item.id,
    fields: [
      { label:"Título", name:"title", value:item.title, maxLength:150 },
      { label:"Duración", name:"duration", value:item.duration, maxLength:80 },
      { label:"Nivel", name:"level", value:item.level, maxLength:80 },
      { label:"Icono", name:"icon", value:item.icon || "⌖", maxLength:8 },
      { label:"Modalidad", name:"modality", value:item.modality, maxLength:100 },
      { label:"Certificación", name:"certification", value:item.certification, maxLength:120 },
      { label:"Descripción", name:"description", type:"textarea", value:item.description },
      { label:"Objetivos", name:"objectives", type:"textarea", value:item.objectives },
      { label:"Requisitos", name:"requirements", type:"textarea", value:item.requirements },
      { label:"Posición", name:"position", type:"number", value:item.position ?? cache.courses.length },
      { label:"Publicado", name:"is_published", type:"checkbox", value:item.is_published ?? true },
      { label:"Imagen", name:"image_url", type:"image", value:item.image_url, path:item.storage_path, folder:"courses", fallback:"assets/legitimo.jpg" }
    ],
    onNormalize: raw => ({
      title:text(raw.title), duration:text(raw.duration), level:text(raw.level), icon:text(raw.icon),
      modality:text(raw.modality), certification:text(raw.certification),
      description:text(raw.description), objectives:text(raw.objectives), requirements:text(raw.requirements),
      position:Number(raw.position || 0), is_published:Boolean(raw.is_published),
      image_url:text(raw.image_url), storage_path:text(raw.image_url_path)
    })
  });
}
function editGallery(item = {}) {
  openEditor({
    title:item.id ? "Editar imagen" : "Nueva imagen", eyebrow:"GALERÍA", table:"gallery_items", id:item.id,
    fields:[
      {label:"Título",name:"title",value:item.title,maxLength:150},
      {label:"Posición",name:"position",type:"number",value:item.position ?? cache.gallery.length},
      {label:"Destacada",name:"featured",type:"checkbox",value:item.featured},
      {label:"Publicada",name:"is_published",type:"checkbox",value:item.is_published ?? true},
      {label:"Imagen",name:"image_url",type:"image",value:item.image_url,path:item.storage_path,folder:"gallery",fallback:"assets/gallery_1.png"}
    ],
    onNormalize:raw=>({title:text(raw.title),position:Number(raw.position||0),featured:Boolean(raw.featured),is_published:Boolean(raw.is_published),image_url:text(raw.image_url),storage_path:text(raw.image_url_path)})
  });
}
function editTeam(item = {}) {
  openEditor({
    title:item.id ? "Editar integrante" : "Nuevo integrante", eyebrow:"EQUIPO", table:"team_members", id:item.id,
    fields:[
      {label:"Nombre o cargo",name:"name",value:item.name,maxLength:150},
      {label:"Función",name:"role",value:item.role,maxLength:150},
      {label:"Posición",name:"position",type:"number",value:item.position ?? cache.team.length},
      {label:"Publicado",name:"is_published",type:"checkbox",value:item.is_published ?? true},
      {label:"Foto",name:"image_url",type:"image",value:item.image_url,path:item.storage_path,folder:"team",fallback:"assets/team_1.png"}
    ],
    onNormalize:raw=>({name:text(raw.name),role:text(raw.role),position:Number(raw.position||0),is_published:Boolean(raw.is_published),image_url:text(raw.image_url),storage_path:text(raw.image_url_path)})
  });
}
function editDate(item = {}) {
  openEditor({
    title:item.id ? "Editar fecha" : "Nueva fecha", eyebrow:"CALENDARIO", table:"course_dates", id:item.id,
    fields:[
      {label:"Día",name:"day",value:item.day,maxLength:2},
      {label:"Mes",name:"month",value:item.month,maxLength:10},
      {label:"Año",name:"year",type:"number",value:item.year || new Date().getFullYear()},
      {label:"Título",name:"title",value:item.title,maxLength:150},
      {label:"Detalle",name:"detail",type:"textarea",value:item.detail},
      {label:"Posición",name:"position",type:"number",value:item.position ?? cache.calendar.length},
      {label:"Publicado",name:"is_published",type:"checkbox",value:item.is_published ?? true}
    ],
    onNormalize:raw=>({day:text(raw.day),month:text(raw.month).toUpperCase(),year:Number(raw.year),title:text(raw.title),detail:text(raw.detail),position:Number(raw.position||0),is_published:Boolean(raw.is_published)})
  });
}

$("#newCourseBtn")?.addEventListener("click", () => editCourse());
$("#newGalleryBtn")?.addEventListener("click", () => editGallery());
$("#newTeamBtn")?.addEventListener("click", () => editTeam());
$("#newDateBtn")?.addEventListener("click", () => editDate());

async function removeRecord(type, item) {
  const table = TABLES[type];
  if (!table || !confirm("¿Eliminar este registro?")) return;

  try {
    const { error } = await client.from(table).delete().eq("id", item.id);
    if (error) throw error;

    if (item.storage_path) {
      await client.storage.from(config.STORAGE_BUCKET || "ifcis-media").remove([item.storage_path]);
    }
    await refreshAll();
    toast("Registro eliminado");
  } catch (error) {
    toast(error.message || "No se pudo eliminar.");
  }
}

/* CSV formula injection protection */
function safeCsvCell(value) {
  let output = String(value ?? "").replaceAll('"', '""');
  if (/^[=+\-@]/.test(output)) output = `'${output}`;
  return `"${output}"`;
}
function exportLeads(kind) {
  const items = cache.leads.filter(item => item.kind === kind);
  if (!items.length) return toast("No hay datos para exportar.");

  const headers = ["created_at","full_name","email","phone","course","message","status"];
  const csv = [
    headers.map(safeCsvCell).join(","),
    ...items.map(item => headers.map(header => safeCsvCell(item[header])).join(","))
  ].join("\r\n");

  const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type:"text/csv;charset=utf-8" }));
  const anchor = el("a", { href:url, download:`ifcis-${kind}-${new Date().toISOString().slice(0,10)}.csv` });
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
$$("[data-export]").forEach(button => button.addEventListener("click", () =>
  exportLeads(button.dataset.export === "registrations" ? "registration" : "contact")
));

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeEditor();
    setSidebar(false);
  }
});

establishSession();
