const TIME_ZONE = "America/Sao_Paulo";

const WEEK = [
  { name: "domingo", open: null, close: null },
  { name: "segunda", open: 9 * 60, close: 18 * 60 },
  { name: "terça", open: 9 * 60, close: 18 * 60 },
  { name: "quarta", open: 9 * 60, close: 18 * 60 },
  { name: "quinta", open: 9 * 60, close: 18 * 60 },
  { name: "sexta", open: 9 * 60, close: 18 * 60 },
  { name: "sábado", open: 9 * 60, close: 12 * 60 },
];

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function localParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(value.hour);
  const minute = Number(value.minute);

  return {
    weekday: WEEKDAY_INDEX[value.weekday],
    minutes: hour * 60 + minute,
  };
}

function formatClock(minutes) {
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return minute === 0 ? `${hour}h` : `${hour}h${String(minute).padStart(2, "0")}`;
}

function openWindow(dayIndex) {
  return WEEK[dayIndex].open === null ? null : WEEK[dayIndex];
}

function findCurrentWindow(now) {
  const today = openWindow(now.weekday);

  if (today && now.minutes >= today.open && now.minutes < today.close) {
    return today;
  }

  return null;
}

function findNextOpening(now) {
  for (let step = 0; step <= 7; step += 1) {
    const dayIndex = (now.weekday + step) % 7;
    const window = openWindow(dayIndex);

    if (!window) continue;
    if (step === 0 && now.minutes >= window.open) continue;

    if (step === 0) return { window, label: "hoje" };
    if (step === 1) return { window, label: "amanhã" };
    return { window, label: window.name };
  }

  return null;
}

function describeStatus() {
  const now = localParts();
  const current = findCurrentWindow(now);

  if (current) {
    return { open: true, text: `Atendendo agora · fecha às ${formatClock(current.close)}` };
  }

  const next = findNextOpening(now);

  if (!next) {
    return { open: false, text: "Fechado" };
  }

  return {
    open: false,
    text: `Fechado · abre ${next.label} às ${formatClock(next.window.open)}`,
  };
}

function renderStatus() {
  const container = document.querySelector("[data-status]");
  const label = document.querySelector("[data-status-text]");
  if (!container || !label) return;

  const status = describeStatus();
  label.textContent = status.text;
  container.classList.toggle("status--closed", !status.open);
  container.hidden = false;
}

function renderToday() {
  const node = document.querySelector("[data-hoje]");
  if (!node) return;

  const now = new Date();
  node.textContent = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);
}

function currentMonthValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

const FIELDS = [
  {
    input: "[name='nome']",
    error: "#e-nome",
    invalid: () => "Escreva seu nome.",
    test: (value) => {
      const name = value.trim();
      if (!name) return "Escreva seu nome.";
      if (name.length < 3) return "O nome está curto demais.";
      return null;
    },
  },
  {
    input: "[name='email']",
    error: "#e-email",
    invalid: () => "Deixe um e-mail para respondermos.",
    test: (value) => {
      const email = value.trim();
      if (!email) return "Deixe um e-mail para respondermos.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Esse e-mail não parece completo.";
      return null;
    },
  },
  {
    input: "[name='tipo']",
    error: "#e-tipo",
    invalid: () => "Escolha o tipo de book.",
    test: (value) => (value ? null : "Escolha o tipo de book, ou “Ainda não sei”."),
  },
  {
    input: "[name='prazo']",
    error: "#e-prazo",
    invalid: () => "Diga para quando é o book.",
    test: (value) =>
      value && value >= currentMonthValue() ? null : "Escolha este mês ou um mês futuro.",
  },
  {
    input: "[name='mensagem']",
    error: "#e-mensagem",
    invalid: () => "Conte um pouco sobre o book.",
    test: (value) => {
      const text = value.trim();
      if (!text) return "Conte um pouco sobre o book.";
      if (text.length < 10) return "Conte um pouco mais, para podermos orçar.";
      return null;
    },
  },
];

function clearFieldError(field, form) {
  const input = form.querySelector(field.input);
  const error = form.querySelector(field.error);
  input.removeAttribute("aria-invalid");
  input.removeAttribute("aria-describedby");
  error.hidden = true;
  error.textContent = "";
}

function showFieldError(field, form, message) {
  const input = form.querySelector(field.input);
  const error = form.querySelector(field.error);
  const errorId = error.id;

  error.textContent = message;
  error.hidden = false;
  input.setAttribute("aria-invalid", "true");
  input.setAttribute("aria-describedby", errorId);
}

function validate(form) {
  const failures = [];

  for (const field of FIELDS) {
    const input = form.querySelector(field.input);
    const message = field.test(input.value);

    if (message) {
      showFieldError(field, form, message);
      failures.push({ input, message });
    } else {
      clearFieldError(field, form);
    }
  }

  return failures;
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function collectValues(form) {
  return {
    nome: form.querySelector("[name='nome']").value.trim(),
    email: form.querySelector("[name='email']").value.trim(),
    tipo: form.querySelector("[name='tipo']").value,
    prazo: form.querySelector("[name='prazo']").value,
  };
}

function setLoading(button, loading) {
  if (loading) {
    button.dataset.loading = "true";
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.dataset.label = button.textContent;
    button.textContent = "Enviando pedido";
    return;
  }

  delete button.dataset.loading;
  button.disabled = false;
  button.removeAttribute("aria-busy");
  if (button.dataset.label) button.textContent = button.dataset.label;
}

function setUpQuote() {
  const form = document.querySelector("[data-form]");
  const done = document.querySelector("[data-done]");
  const failed = document.querySelector("[data-failed]");
  if (!form || !done || !failed) return;

  const submit = form.querySelector("[data-submit]");
  const summary = form.querySelector("[data-form-summary]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    summary.hidden = true;

    const failures = validate(form);

    if (failures.length > 0) {
      failures[0].input.focus();
      return;
    }

    const values = collectValues(form);
    setLoading(submit, true);

    try {
      // Demonstração: nenhuma requisição real é feita.
      await sleep(900);
      form.hidden = true;
      done.querySelector("[data-done-nome]").textContent = values.nome;
      done.querySelector("[data-done-email]").textContent = values.email;
      done.querySelector("[data-done-tipo]").textContent = values.tipo;
      done.querySelector("[data-done-prazo]").textContent = values.prazo;
      done.hidden = false;
      done.focus();
    } catch {
      failed.hidden = false;
      failed.focus();
    } finally {
      setLoading(submit, false);
    }
  });

  const reset = done.querySelector("[data-reset]");
  if (reset) {
    reset.addEventListener("click", () => {
      done.hidden = true;
      form.reset();
      form.hidden = false;
      form.querySelector("[name='nome']").focus();
    });
  }
}

function setUpReveal() {
  const targets = document.querySelectorAll("[data-reveal]");
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((target) => target.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
  );

  targets.forEach((target) => observer.observe(target));
}

function init() {
  renderStatus();
  renderToday();
  setUpQuote();
  setUpReveal();
}

init();
