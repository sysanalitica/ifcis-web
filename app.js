"use strict";

const { client, configured, el, text, safeImageUrl, setBusy, config } = window.IFCIS;
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const FALLBACK = Object.freeze({
  courses: [
    {id:"fallback-1",title:"LEGÍTIMO USUARIO",duration:"8 HORAS",level:"NIVEL INICIAL",icon:"⌖",image_url:"assets/legitimo.jpg",description:"Curso introductorio sobre seguridad, normativa y manipulación responsable de armas.",objectives:"Comprender las normas básicas de seguridad y adquirir hábitos responsables.",requirements:"Documento de identidad. No se requiere experiencia previa.",modality:"TEORÍA + PRÁCTICA",certification:"CERTIFICADO DE ASISTENCIA"},
    {id:"fallback-2",title:"INSTRUCTOR DE TIRO",duration:"120 HORAS",level:"NIVEL PROFESIONAL",icon:"◉",image_url:"assets/instructor.jpg",description:"Formación integral orientada a la enseñanza y conducción segura de prácticas.",objectives:"Desarrollar criterios pedagógicos, técnicos y de seguridad.",requirements:"Experiencia comprobable y documentación habilitante.",modality:"PRESENCIAL",certification:"CERTIFICACIÓN PROFESIONAL"},
    {id:"fallback-3",title:"ARMA CORTA",duration:"1 JORNADA",level:"NIVEL INTERMEDIO",icon:"⊕",image_url:"assets/arma-corta.jpg",description:"Entrenamiento técnico de postura, empuñe, control y precisión.",objectives:"Mejorar fundamentos, consistencia y seguridad.",requirements:"Conocimientos básicos y documentación correspondiente.",modality:"PRÁCTICA INTENSIVA",certification:"CERTIFICADO DE PARTICIPACIÓN"},
    {id:"fallback-4",title:"ARMA LARGA",duration:"1 JORNADA",level:"NIVEL INTERMEDIO",icon:"◒",image_url:"assets/arma-larga.jpg",description:"Capacitación progresiva en fundamentos técnicos y uso seguro.",objectives:"Incorporar postura, control y procedimientos de seguridad.",requirements:"Conocimientos básicos y documentación correspondiente.",modality:"PRÁCTICA GUIADA",certification:"CERTIFICADO DE PARTICIPACIÓN"},
    {id:"fallback-5",title:"CUSTODIA",duration:"40 HORAS",level:"NIVEL PROFESIONAL",icon:"◇",image_url:"assets/custodia.jpg",description:"Formación en protección, prevención y procedimientos de custodia.",objectives:"Desarrollar criterios de evaluación y respuesta profesional.",requirements:"Mayor de edad y aptitud para actividades prácticas.",modality:"TEORÍA + SIMULACIONES",certification:"CERTIFICACIÓN IFCIS"},
    {id:"fallback-6",title:"DEFENSA PERSONAL",duration:"12 HORAS",level:"NIVEL INICIAL",icon:"✦",image_url:"assets/defensa.jpg",description:"Herramientas prácticas de prevención, control y respuesta.",objectives:"Mejorar percepción, reacción y toma de decisiones.",requirements:"No se requiere experiencia previa.",modality:"PRÁCTICA PRESENCIAL",certification:"CERTIFICADO DE ASISTENCIA"}
  ],
  gallery: [
    {id:"g1",title:"CAMPO DE TIRO",image_url:"assets/gallery_1.png"},
    {id:"g2",title:"BRIEFING TÁCTICO",image_url:"assets/gallery_2.png"},
    {id:"g3",title:"EQUIPAMIENTO Y SEGURIDAD",image_url:"assets/gallery_3.png"},
    {id:"g4",title:"DEFENSA PERSONAL",image_url:"assets/gallery_4.png"}
  ],
  team: [
    {id:"t1",name:"Director Académico",role:"DIRECCIÓN Y COORDINACIÓN",image_url:"assets/team_1.png"},
    {id:"t2",name:"Instructor Principal",role:"TIRO Y TÁCTICAS",image_url:"assets/team_2.png"},
    {id:"t3",name:"Especialista en Custodia",role:"PROTECCIÓN EJECUTIVA",image_url:"assets/team_3.png"},
    {id:"t4",name:"Instructora de Defensa",role:"DEFENSA PERSONAL",image_url:"assets/team_4.png"}
  ],
  dates: [
    {id:"d1",day:"18",month:"JUL",title:"Legítimo Usuario",detail:"Sábado · 09:00 a 17:00 · Buenos Aires"},
    {id:"d2",day:"25",month:"JUL",title:"Arma Corta — Nivel Inicial",detail:"Sábado · Jornada completa · Vacantes limitadas"}
  ]
});

const state = {
  courses: [...FALLBACK.courses],
  gallery: [...FALLBACK.gallery],
  team: [...FALLBACK.team],
  dates: [...FALLBACK.dates],
  allCoursesVisible: false
};

function toast(message) {
  const node = qs("#toast");
  if (!node) return;
  node.textContent = message;
  node.classList.add("show");
  clearTimeout(window.__ifcisToast);
  window.__ifcisToast = setTimeout(() => node.classList.remove("show"), 2800);
}

async function loadPublicData() {
  if (!configured || !client) {
    renderAll();
    console.warn("Supabase no está configurado. Se muestran datos de demostración.");
    return;
  }

  const queries = await Promise.allSettled([
    client.from("courses").select("*").eq("is_published", true).order("position"),
    client.from("gallery_items").select("*").eq("is_published", true).order("position"),
    client.from("team_members").select("*").eq("is_published", true).order("position"),
    client.from("course_dates").select("*").eq("is_published", true).order("position")
  ]);

  const [courses, gallery, team, dates] = queries;
  if (courses.status === "fulfilled" && !courses.value.error && courses.value.data?.length) state.courses = courses.value.data;
  if (gallery.status === "fulfilled" && !gallery.value.error && gallery.value.data?.length) state.gallery = gallery.value.data;
  if (team.status === "fulfilled" && !team.value.error && team.value.data?.length) state.team = team.value.data;
  if (dates.status === "fulfilled" && !dates.value.error && dates.value.data?.length) state.dates = dates.value.data;

  renderAll();
}

function imageElement(src, alt, fallback) {
  const image = el("img", { src: safeImageUrl(src) || fallback, alt: text(alt), loading: "lazy", decoding: "async" });
  image.addEventListener("error", () => { image.src = fallback; }, { once: true });
  return image;
}

function renderCourses() {
  const grid = qs("#courseGrid");
  const toggle = qs("#toggleCourses");
  if (!grid || !toggle) return;

  grid.replaceChildren();
  const visible = state.allCoursesVisible ? state.courses : state.courses.slice(0, 6);

  visible.forEach(course => {
    const openButton = el("button", {
      className: "btn btn-secondary",
      type: "button",
      on: { click: () => openCourseModal(course) }
    }, ["VER CURSO ", el("span", { text: "↗" })]);

    const card = el("article", { className: "course-card" }, [
      imageElement(course.image_url, course.title, "assets/legitimo.jpg"),
      el("div", { className: "course-top" }, [
        el("span", { className: "course-icon", text: course.icon || "⌖" }),
        el("span", { className: "course-level", text: course.level || "NIVEL GENERAL" })
      ]),
      el("div", { className: "course-body" }, [
        el("h3", { text: course.title }),
        el("p", { className: "course-summary", text: course.description }),
        el("div", { className: "course-meta", text: `◷ ${course.duration || "A DEFINIR"} · ${course.modality || "PRESENCIAL"}` }),
        openButton
      ])
    ]);
    grid.append(card);
  });

  toggle.replaceChildren(
    document.createTextNode(state.allCoursesVisible ? "VER MENOS " : "VER TODOS LOS CURSOS "),
    el("span", { text: state.allCoursesVisible ? "↑" : "↗" })
  );
}

function renderGallery() {
  const grid = qs("#publicGalleryGrid");
  if (!grid) return;
  grid.replaceChildren();

  state.gallery.forEach(item => {
    const button = el("button", {
      className: "gallery-item",
      type: "button",
      attrs: { "aria-label": `Abrir ${text(item.title)}` },
      on: { click: () => openLightbox(safeImageUrl(item.image_url) || "assets/gallery_1.png") }
    }, [
      imageElement(item.image_url, item.title, "assets/gallery_1.png"),
      el("span", { text: item.title })
    ]);
    grid.append(button);
  });
}

function renderTeam() {
  const grid = qs("#publicTeamGrid");
  if (!grid) return;
  grid.replaceChildren();

  state.team.forEach(member => {
    grid.append(el("article", { className: "team-card" }, [
      imageElement(member.image_url, member.name, "assets/team_1.png"),
      el("div", { className: "team-info" }, [
        el("h4", { text: member.name }),
        el("span", { text: member.role })
      ])
    ]));
  });
}

function renderSchedule() {
  const container = qs("#schedule");
  if (!container) return;
  container.replaceChildren();

  state.dates.forEach(item => {
    const button = el("button", {
      className: "btn btn-secondary",
      type: "button",
      on: { click: () => openRegistration(item.title) }
    }, ["INSCRIBIRME ", el("span", { text: "↗" })]);

    container.append(el("article", { className: "schedule-item" }, [
      el("div", { className: "schedule-date" }, [
        el("strong", { text: item.day || "--" }),
        el("span", { text: `${item.month || ""} ${item.year || ""}`.trim() })
      ]),
      el("div", { className: "schedule-copy" }, [
        el("h3", { text: item.title }),
        el("p", { text: item.detail })
      ]),
      button
    ]));
  });
}

function renderAll() {
  renderCourses();
  renderGallery();
  renderTeam();
  renderSchedule();
  refreshCourseSelect();
  initRevealEffects();
}

/* Course modal */
const courseModal = qs("#courseModal");
function openCourseModal(course) {
  if (!courseModal) return;
  qs("#courseModalImage").src = safeImageUrl(course.image_url) || "assets/legitimo.jpg";
  qs("#courseModalImage").alt = text(course.title);
  qs("#courseModalLevel").textContent = text(course.level);
  qs("#courseModalTitle").textContent = text(course.title);
  qs("#courseModalDescription").textContent = text(course.description);
  qs("#courseModalDuration").textContent = text(course.duration);
  qs("#courseModalModality").textContent = text(course.modality);
  qs("#courseModalCertification").textContent = text(course.certification);
  qs("#courseModalObjectives").textContent = text(course.objectives);
  qs("#courseModalRequirements").textContent = text(course.requirements);
  qs("#courseModalRegister").dataset.selectedCourse = text(course.title);
  courseModal.classList.add("open");
  courseModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}
function closeCourseModal() {
  courseModal?.classList.remove("open");
  courseModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
qsa("[data-close-course-modal]").forEach(button => button.addEventListener("click", closeCourseModal));
courseModal?.addEventListener("click", event => { if (event.target === courseModal) closeCourseModal(); });
qs("#courseModalRegister")?.addEventListener("click", event => {
  const selected = event.currentTarget.dataset.selectedCourse || "";
  closeCourseModal();
  openRegistration(selected);
});

/* Registration */
const registrationModal = qs("#registrationModal");
const courseSelect = qs("#courseSelect");
function refreshCourseSelect() {
  if (!courseSelect) return;
  courseSelect.replaceChildren(el("option", { value: "", text: "Seleccioná un curso" }));
  state.courses.forEach(course => courseSelect.append(el("option", { value: course.title, text: course.title })));
}
function openRegistration(course = "") {
  refreshCourseSelect();
  registrationModal?.classList.add("open");
  registrationModal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  if (course && courseSelect) courseSelect.value = course;
}
function closeRegistration() {
  registrationModal?.classList.remove("open");
  registrationModal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
qsa("[data-open-registration]").forEach(button => button.addEventListener("click", () => openRegistration()));
qsa("[data-close-modal]").forEach(button => button.addEventListener("click", closeRegistration));
registrationModal?.addEventListener("click", event => { if (event.target === registrationModal) closeRegistration(); });

/* Lightbox */
const lightbox = qs("#lightbox");
function openLightbox(source) {
  const image = qs("#lightboxImage");
  if (!lightbox || !image) return;
  image.src = source;
  lightbox.classList.add("open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}
function closeLightbox() {
  lightbox?.classList.remove("open");
  lightbox?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}
qsa("[data-close-lightbox]").forEach(button => button.addEventListener("click", closeLightbox));
lightbox?.addEventListener("click", event => { if (event.target === lightbox) closeLightbox(); });

/* Forms through protected Edge Function */
function validateLead(data) {
  const name = text(data.fullName || data.name);
  const email = text(data.email).toLowerCase();
  const phone = text(data.phone);
  const message = text(data.notes || data.message);
  if (name.length < 2 || name.length > 120) throw new Error("Revisá el nombre.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) throw new Error("Revisá el email.");
  if (phone && phone.length > 40) throw new Error("El teléfono es demasiado largo.");
  if (message.length > 2000) throw new Error("El mensaje es demasiado largo.");
}
async function submitLead(form, kind, feedback) {
  const button = form.querySelector('button[type="submit"]');
  const payload = Object.fromEntries(new FormData(form));
  payload.kind = kind;
  payload.source = location.pathname;

  try {
    validateLead(payload);
    if (!configured || !client) throw new Error("El formulario todavía no está conectado a Supabase.");
    setBusy(button, true, "ENVIANDO...");

    const { data, error } = await client.functions.invoke(config.LEAD_FUNCTION || "submit-lead", {
      body: payload
    });
    if (error) throw error;
    if (!data?.success) throw new Error(data?.error || "No se pudo enviar.");

    form.reset();
    feedback.textContent = "Consulta enviada correctamente. Te contactaremos pronto.";
    toast("Consulta enviada correctamente");
    if (kind === "registration") setTimeout(closeRegistration, 1200);
  } catch (error) {
    console.error(error);
    feedback.textContent = error.message || "No se pudo enviar. Intentá nuevamente.";
  } finally {
    setBusy(button, false);
  }
}
qs("#contactForm")?.addEventListener("submit", event => {
  event.preventDefault();
  submitLead(event.currentTarget, "contact", qs("#contactFeedback"));
});
qs("#registrationForm")?.addEventListener("submit", event => {
  event.preventDefault();
  submitLead(event.currentTarget, "registration", qs("#registrationFeedback"));
});

/* Menu, navigation, parallax */
const drawer = qs("#mobileDrawer");
const menuToggle = qs("#menuToggle");
function setDrawer(open) {
  drawer?.classList.toggle("open", open);
  drawer?.setAttribute("aria-hidden", String(!open));
  menuToggle?.setAttribute("aria-expanded", String(open));
}
menuToggle?.addEventListener("click", () => setDrawer(true));
qsa("[data-close-drawer]").forEach(node => node.addEventListener("click", () => setDrawer(false)));
qsa(".drawer-nav a").forEach(link => link.addEventListener("click", () => setDrawer(false)));
qs("#toggleCourses")?.addEventListener("click", () => {
  state.allCoursesVisible = !state.allCoursesVisible;
  renderCourses();
});
window.addEventListener("scroll", () => qs("#siteHeader")?.classList.toggle("scrolled", window.scrollY > 30), { passive: true });

function initRevealEffects() {
  const nodes = qsa(".section-header,.course-card,.feature-card,.team-card,.gallery-item,.schedule-item,.contact-panel");
  if (!("IntersectionObserver" in window)) return nodes.forEach(node => node.classList.add("in-view"));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("in-view");
      observer.unobserve(entry.target);
    }
  }), { threshold: 0.1 });
  nodes.forEach(node => { node.classList.add("reveal"); observer.observe(node); });
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    closeRegistration();
    closeCourseModal();
    closeLightbox();
    setDrawer(false);
  }
});

loadPublicData();
/* Fondo premium de puntos luminosos — Galería */
(function initGalleryDottedGlow() {
  const canvas = document.getElementById("galleryDottedGlow");
  const section = document.querySelector(".gallery-section");

  if (!canvas || !section) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const context = canvas.getContext("2d", {
    alpha: true
  });

  if (!context) return;

  const dots = [];
  const gap = 16;
  const baseRadius = 1.25;
  let width = 0;
  let height = 0;
  let animationFrame = null;
  let visible = true;

  function resizeCanvas() {
    const rect = section.getBoundingClientRect();
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    width = Math.max(1, Math.floor(rect.width));
    height = Math.max(1, Math.floor(section.offsetHeight));

    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    createDots();
  }

  function createDots() {
    dots.length = 0;

    const columns = Math.ceil(width / gap);
    const rows = Math.ceil(height / gap);

    for (let row = 0; row <= rows; row += 1) {
      for (let column = 0; column <= columns; column += 1) {
        dots.push({
          x: column * gap,
          y: row * gap,
          phase: Math.random() * Math.PI * 2,
          speed: 0.3 + Math.random() * 1.3,
          intensity: 0.2 + Math.random() * 0.8
        });
      }
    }
  }

  function draw(time) {
    if (!visible) {
      animationFrame = requestAnimationFrame(draw);
      return;
    }

    context.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const maxDistance = Math.hypot(centerX, centerY);

    dots.forEach((dot) => {
      const pulse =
        (Math.sin(time * 0.001 * dot.speed + dot.phase) + 1) / 2;

      const distance = Math.hypot(
        dot.x - centerX,
        dot.y - centerY
      );

      const centerFade = 1 - Math.min(distance / maxDistance, 1);
      const glowStrength =
        0.12 +
        pulse * 0.58 * dot.intensity * centerFade;

      const radius =
        baseRadius +
        pulse * 0.7 * dot.intensity;

      context.beginPath();
      context.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
      context.fillStyle =
        `rgba(96, 188, 247, ${glowStrength})`;
      context.shadowBlur = 8 + pulse * 12;
      context.shadowColor =
        `rgba(33, 145, 214, ${0.3 + pulse * 0.45})`;
      context.fill();
    });

    context.shadowBlur = 0;
    animationFrame = requestAnimationFrame(draw);
  }

  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0]?.isIntersecting ?? true;
    },
    {
      threshold: 0.05
    }
  );

  observer.observe(section);

  const resizeObserver = new ResizeObserver(() => {
    resizeCanvas();
  });

  resizeObserver.observe(section);
  resizeCanvas();
  animationFrame = requestAnimationFrame(draw);

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(animationFrame);
    observer.disconnect();
    resizeObserver.disconnect();
  });
})();
