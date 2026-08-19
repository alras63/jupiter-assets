/* Юпитер Авто — интерактив блоков. Действует только по нашим селекторам.
   Генерируется: node bitrix/build-portal-js.mjs — руками не править. */

/* ==== jupiter.js ==== */
/**
 * Общий JS сайта «Юпитер Авто» для Битрикс24.Сайты.
 *
 * Подключается один раз на весь сайт (Настройки сайта → своя JS) либо через
 * assets.js любого блока — Битрикс не подключает один и тот же файл дважды.
 *
 * Содержит то, что не привязано к конкретному блоку: тема, тосты, появление
 * секций при скролле, поправка на полосу прокрутки. Интерактив отдельных
 * блоков лежит рядом с блоком.
 *
 * Зависимостей нет. Инлайновый скрипт в CONTENT блока не подойдёт: содержимое
 * блока проходит проверку безопасности, JS оттуда вырезается.
 */
(function () {
  "use strict";

  var THEME_KEY = "jupiter-theme";
  var root = document.documentElement;

  /* ---------------------------------------------------------------
     Тема
     --------------------------------------------------------------- */
  function applyTheme(theme) {
    root.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* приватный режим */ }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#0b0c0d" : "#ffffff");

    document.querySelectorAll("[data-jupiter-theme-toggle]").forEach(function (button) {
      var toDark = theme === "light";
      button.setAttribute("aria-pressed", String(theme === "dark"));
      button.setAttribute("aria-label", toDark ? "Включить тёмную тему" : "Включить светлую тему");
      button.setAttribute("data-tip", toDark ? "Тёмная тема" : "Светлая тема");
      button.querySelectorAll("[data-icon]").forEach(function (icon) {
        icon.hidden = icon.getAttribute("data-icon") !== (toDark ? "moon" : "sun");
      });
    });
  }

  function currentTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) { /* приватный режим */ }
    return "light";
  }

  /* ---------------------------------------------------------------
     Тосты
     --------------------------------------------------------------- */
  var toaster = null;

  function ensureToaster() {
    if (toaster && document.body.contains(toaster)) return toaster;
    toaster = document.createElement("div");
    toaster.className = "toaster";
    toaster.setAttribute("role", "status");
    toaster.setAttribute("aria-live", "polite");
    document.body.appendChild(toaster);
    return toaster;
  }

  function toast(options) {
    var host = ensureToaster();
    var node = document.createElement("div");
    node.className = "toast";
    var title = document.createElement("strong");
    title.textContent = options.title || "";
    var body = document.createElement("div");
    body.appendChild(title);
    if (options.text) {
      var text = document.createElement("span");
      text.textContent = options.text;
      body.appendChild(text);
    }
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Закрыть уведомление");
    close.textContent = "✕";

    node.appendChild(body);
    node.appendChild(close);
    host.appendChild(node);

    // Больше трёх тостов подряд превращаются в стену — держим последние три.
    while (host.children.length > 3) host.removeChild(host.firstChild);

    var timer = setTimeout(dismiss, 4000);
    close.addEventListener("click", function () { clearTimeout(timer); dismiss(); });

    function dismiss() {
      node.classList.add("is-leaving");
      setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 200);
    }
  }

  /* ---------------------------------------------------------------
     Появление секций при скролле
     --------------------------------------------------------------- */
  function initReveal() {
    var nodes = document.querySelectorAll(".reveal:not(.is-visible)");
    if (!nodes.length) return;

    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      nodes.forEach(function (node) { node.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.05 });
    nodes.forEach(function (node) { observer.observe(node); });
  }

  /* ---------------------------------------------------------------
     Поправка на полосу прокрутки
     100vw шире раскладки на её ширину — без этого полноширинные блоки
     вылезают за вьюпорт и появляется горизонтальная прокрутка.
     --------------------------------------------------------------- */
  function syncScrollbar() {
    var width = window.innerWidth - root.clientWidth;
    root.style.setProperty("--ja-scrollbar", Math.max(width, 0) + "px");
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---------------------------------------------------------------
     Старт
     --------------------------------------------------------------- */
  /** Есть ли на странице наша разметка. На портале общий JS подключается
      ко всему сайту, и без этой проверки тема и правка --ja-scrollbar
      применялись бы к чужим страницам. */
  function ours() {
    return !!document.querySelector(
      "[class*=\"block-repo-\"], .site-shell, [data-jupiter-theme-toggle], .hero--slider, .jupiter-calc, .jupiter-accordion, .jupiter-catalog"
    );
  }

  function init() {
    if (!ours()) return;
    applyTheme(currentTheme());
    syncScrollbar();
    initReveal();

    document.addEventListener("click", function (event) {
      var button = event.target.closest("[data-jupiter-theme-toggle]");
      if (!button) return;
      var next = currentTheme() === "light" ? "dark" : "light";
      applyTheme(next);
      toast({
        title: next === "dark" ? "Тёмная тема включена" : "Светлая тема включена",
        text: "Выбор сохранится для следующих визитов.",
      });
    });

    window.addEventListener("resize", syncScrollbar);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Точка входа для JS отдельных блоков: слайдер, калькулятор, фильтры.
  window.Jupiter = window.Jupiter || {};
  window.Jupiter.toast = toast;
  window.Jupiter.initReveal = initReveal;
  window.Jupiter.prefersReducedMotion = prefersReducedMotion;
})();


/* ==== hero-slider.js ==== */
/**
 * Слайдер первого экрана для блока jupiter.hero-slider.
 *
 * Работает от разметки: количество слайдов берётся из DOM, поэтому редактор
 * Битрикс24 может добавлять и удалять карточки, а точки и стрелки
 * перестраиваются сами. Инициализация идемпотентна — редактор пересобирает
 * блок при каждом изменении, и повторный вызов не должен плодить обработчики.
 */
(function () {
  "use strict";

  var INTERVAL = 7000;

  function initSlider(root) {
    if (root.dataset.sliderReady === "1") return;
    root.dataset.sliderReady = "1";

    var slides = Array.prototype.slice.call(root.querySelectorAll(".hero-slide"));
    if (slides.length === 0) return;

    var dotsHost = root.querySelector(".hero-slider__dots");
    var prev = root.querySelector("[data-slider-prev]");
    var next = root.querySelector("[data-slider-next]");
    var index = 0;
    var paused = false;
    var timer = null;
    var reduced = window.Jupiter && window.Jupiter.prefersReducedMotion
      ? window.Jupiter.prefersReducedMotion()
      : false;

    // Точки строим по факту слайдов, а не берём из разметки блока.
    var dots = [];
    if (dotsHost) {
      dotsHost.innerHTML = "";
      dotsHost.setAttribute("role", "tablist");
      dotsHost.setAttribute("aria-label", "Выбор предложения");
      slides.forEach(function (slide, i) {
        var brandNode = slide.querySelector(".hero-slide__brand");
        var brand = brandNode ? brandNode.textContent.trim() : "Слайд " + (i + 1);
        var dot = document.createElement("button");
        dot.type = "button";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", brand);
        dot.setAttribute("data-tip", brand);
        var fill = document.createElement("span");
        fill.className = "hero-slider__progress";
        fill.style.animationDuration = INTERVAL + "ms";
        dot.appendChild(fill);
        dot.addEventListener("click", function () { go(i); });
        dotsHost.appendChild(dot);
        dots.push(dot);
      });
    }

    // Одиночный слайд не нуждается в управлении.
    var controls = root.querySelector(".hero-slider__controls");
    if (controls && slides.length < 2) controls.hidden = true;

    function render() {
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle("is-active", active);
        slide.setAttribute("aria-hidden", String(!active));
        if (active) slide.removeAttribute("inert");
        else slide.setAttribute("inert", "");
      });
      dots.forEach(function (dot, i) {
        var active = i === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-selected", String(active));
        var fill = dot.firstChild;
        if (fill) fill.style.animationPlayState = active && !paused && !reduced ? "running" : "paused";
      });
      schedule();
    }

    function go(next) {
      index = (next + slides.length) % slides.length;
      render();
    }

    function schedule() {
      clearTimeout(timer);
      if (paused || reduced || slides.length < 2) return;
      timer = setTimeout(function () { go(index + 1); }, INTERVAL);
    }

    if (prev) prev.addEventListener("click", function () { go(index - 1); });
    if (next) next.addEventListener("click", function () { go(index + 1); });

    root.addEventListener("mouseenter", function () { paused = true; render(); });
    root.addEventListener("mouseleave", function () { paused = false; render(); });
    root.addEventListener("focusin", function () { paused = true; render(); });
    root.addEventListener("focusout", function (event) {
      if (!root.contains(event.relatedTarget)) { paused = false; render(); }
    });

    root.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1); }
      if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1); }
    });

    var touchStart = null;
    root.addEventListener("touchstart", function (event) {
      touchStart = event.changedTouches[0].clientX;
    }, { passive: true });
    root.addEventListener("touchend", function (event) {
      if (touchStart === null) return;
      var delta = event.changedTouches[0].clientX - touchStart;
      if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1));
      touchStart = null;
    });

    render();
  }

  function initAll() {
    document.querySelectorAll(".hero--slider").forEach(initSlider);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  // Редактор Битрикс24 перерисовывает блок после правок — переинициализируем.
  if (window.BX && window.BX.addCustomEvent) {
    window.BX.addCustomEvent("BX.Landing.Block:init", initAll);
    window.BX.addCustomEvent("BX.Landing.Block:afterUpdateContent", initAll);
  }

  window.Jupiter = window.Jupiter || {};
  window.Jupiter.initHeroSlider = initAll;
})();


/* ==== quick-search.js ==== */
/**
 * Строка быстрого поиска.
 *
 * Варианты каждого списка редактор задаёт строкой в data-options через запятую —
 * так их можно править в интерфейсе, не трогая разметку. Скрипт разворачивает
 * строку в <option> и подставляет имя параметра из data-param.
 *
 * Первый вариант считается пустым («Любая марка») и в ссылку не попадает.
 *
 * Обёртка — div, а не form: санитайзер Битрикса вырезает тег form из CONTENT
 * блока (проверено через landing.repo.checkcontent). Отправка и так шла не
 * через submit, а сборкой адреса на клике по кнопке.
 */
(function () {
  "use strict";

  function initField(field) {
    var select = field.querySelector("select");
    if (!select) return;

    var raw = field.getAttribute("data-options") || "";
    var options = raw.split(",").map(function (item) { return item.trim(); }).filter(Boolean);
    var param = field.getAttribute("data-param") || "";

    select.name = param;
    select.innerHTML = "";
    options.forEach(function (label, index) {
      var option = document.createElement("option");
      // Первый пункт — «любой», он не должен уходить в запрос.
      option.value = index === 0 ? "" : label;
      option.textContent = label;
      select.appendChild(option);
    });
  }

  function initForm(form) {
    if (form.dataset.quickSearchReady === "1") return;
    form.dataset.quickSearchReady = "1";

    form.querySelectorAll(".landing-block-card-field").forEach(initField);

    var submit = form.querySelector(".landing-block-node-submit");
    if (!submit) return;

    // Кнопка — ссылка, а не submit: так редактор Битрикс может править её текст
    // и адрес штатным инструментом для ссылок.
    submit.addEventListener("click", function (event) {
      event.preventDefault();
      var base = form.getAttribute("data-action") || submit.getAttribute("href") || "/katalog/";
      var params = new URLSearchParams();
      form.querySelectorAll("select").forEach(function (select) {
        if (select.name && select.value) params.set(select.name, select.value);
      });
      var query = params.toString();
      window.location.href = query ? base + (base.indexOf("?") === -1 ? "?" : "&") + query : base;
    });
  }

  function initAll() {
    document.querySelectorAll(".quick-search").forEach(initForm);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  if (window.BX && window.BX.addCustomEvent) {
    window.BX.addCustomEvent("BX.Landing.Block:init", initAll);
    window.BX.addCustomEvent("BX.Landing.Block:afterUpdateContent", initAll);
  }
})();


/* ==== calculator.js ==== */
/**
 * Кредитный калькулятор.
 *
 * Границы сумм, срок и ставка задаются data-атрибутами блока, поэтому
 * менеджер меняет их в редакторе, не трогая код. Формула — аннуитет.
 */
(function () {
  "use strict";

  function money(value) {
    return Math.round(value).toLocaleString("ru-RU") + " ₽";
  }

  function termLabel(years) {
    var mod10 = years % 10;
    var mod100 = years % 100;
    if (mod10 === 1 && mod100 !== 11) return years + " год";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return years + " года";
    return years + " лет";
  }

  function num(root, name, fallback) {
    var raw = parseFloat(root.getAttribute(name));
    return isNaN(raw) ? fallback : raw;
  }

  function initCalc(root) {
    if (root.dataset.calcReady === "1") return;
    root.dataset.calcReady = "1";

    var priceInput = root.querySelector("[data-calc-price]");
    var downInput = root.querySelector("[data-calc-down]");
    var termInput = root.querySelector("[data-calc-term]");
    if (!priceInput || !downInput || !termInput) return;

    var priceOut = root.querySelector("[data-calc-price-out]");
    var downOut = root.querySelector("[data-calc-down-out]");
    var termOut = root.querySelector("[data-calc-term-out]");
    var monthlyOut = root.querySelector("[data-calc-monthly]");
    var monthlyTitle = root.querySelector("[data-calc-monthly-title]");

    var priceMin = num(root, "data-price-min", 1000000);
    var priceMax = num(root, "data-price-max", 6000000);
    var rate = num(root, "data-rate", 16) / 100;

    priceInput.min = priceMin;
    priceInput.max = priceMax;
    priceInput.step = 50000;
    priceInput.value = num(root, "data-price-start", 2500000);

    downInput.min = 0;
    // max обязательно до value: браузер обрезает значение по текущему максимуму,
    // а у range он по умолчанию 100 — иначе взнос молча схлопнется в 100 ₽.
    downInput.max = priceMax;
    downInput.step = 50000;
    downInput.value = num(root, "data-down-start", 750000);

    termInput.min = num(root, "data-term-min", 1);
    termInput.max = num(root, "data-term-max", 7);
    termInput.step = 1;
    termInput.value = num(root, "data-term-start", 5);

    function paintTrack(input) {
      var min = parseFloat(input.min);
      var max = parseFloat(input.max);
      var filled = max > min ? ((parseFloat(input.value) - min) / (max - min)) * 100 : 0;
      input.style.background =
        "linear-gradient(90deg, var(--ja-orange) " + filled + "%, var(--ja-line) " + filled + "%)";
    }

    function render() {
      var price = parseFloat(priceInput.value);
      // Взнос не может превышать стоимость — двигаем верхнюю границу следом.
      downInput.max = price;
      if (parseFloat(downInput.value) > price) downInput.value = price;

      var down = parseFloat(downInput.value);
      var years = parseFloat(termInput.value);
      var body = Math.max(price - down, 0);
      var monthlyRate = rate / 12;
      var months = years * 12;
      var monthly = body
        ? (body * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
        : 0;

      if (priceOut) priceOut.textContent = money(price);
      if (downOut) downOut.textContent = money(down);
      if (termOut) termOut.textContent = termLabel(years);
      if (monthlyOut) monthlyOut.textContent = money(monthly);
      if (monthlyTitle) monthlyTitle.textContent = money(monthly);

      [priceInput, downInput, termInput].forEach(paintTrack);
    }

    [priceInput, downInput, termInput].forEach(function (input) {
      input.addEventListener("input", render);
    });
    render();
  }

  function initAll() {
    document.querySelectorAll(".jupiter-calc").forEach(initCalc);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  if (window.BX && window.BX.addCustomEvent) {
    window.BX.addCustomEvent("BX.Landing.Block:init", initAll);
    window.BX.addCustomEvent("BX.Landing.Block:afterUpdateContent", initAll);
  }
})();


/* ==== faq.js ==== */
/**
 * Аккордеон «Частые вопросы».
 *
 * Разметка содержит и вопрос, и ответ в открытом виде — это важно: поисковики
 * и редактор Битрикс должны видеть текст ответа. Скрытие делает скрипт.
 * По умолчанию раскрыт первый пункт, если у блока задан data-open="first".
 */
(function () {
  "use strict";

  function initAccordion(root) {
    if (root.dataset.accordionReady === "1") return;
    root.dataset.accordionReady = "1";

    var items = Array.prototype.slice.call(root.querySelectorAll(".accordion__item"));
    if (!items.length) return;

    var openFirst = root.getAttribute("data-open") === "first";

    items.forEach(function (item, index) {
      var button = item.querySelector("button");
      var answer = item.querySelector("p");
      if (!button || !answer) return;

      var id = "jupiter-faq-" + Math.random().toString(36).slice(2, 8);
      answer.id = id;
      button.setAttribute("aria-controls", id);

      setOpen(item, openFirst && index === 0);

      button.addEventListener("click", function () {
        var willOpen = !item.classList.contains("is-open");
        // Одновременно открыт один пункт — так список не разъезжается.
        items.forEach(function (other) { setOpen(other, false); });
        setOpen(item, willOpen);
      });
    });

    function setOpen(item, open) {
      var button = item.querySelector("button");
      var answer = item.querySelector("p");
      if (!button || !answer) return;
      item.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", String(open));
      answer.hidden = !open;
    }
  }

  function initAll() {
    document.querySelectorAll(".jupiter-accordion").forEach(initAccordion);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  if (window.BX && window.BX.addCustomEvent) {
    window.BX.addCustomEvent("BX.Landing.Block:init", initAll);
    window.BX.addCustomEvent("BX.Landing.Block:afterUpdateContent", initAll);
  }
})();


/* ==== catalog.js ==== */
/**
 * Каталог: фильтрация и сортировка карточек на клиенте.
 *
 * Принцип: у карточки нет скрытых полей. Всё, по чему фильтруем и сортируем,
 * берётся из того же текста, который менеджер видит в карточке. Дублировать
 * «Кроссовер» ещё и в data-type не нужно — опечатка в невидимом атрибуте
 * молча ломала бы фильтр, и заметить это было бы нечем.
 *
 * Фильтр объявляет только источник (data-source) — выбирается из списка,
 * так что ошибиться нельзя. Варианты фильтра собираются из значений,
 * которые реально есть в карточках, и обновляются сами.
 */
(function () {
  "use strict";

  var SOURCES = {
    name: ".landing-block-node-name",
    meta: ".landing-block-node-meta",
    "spec-one": ".landing-block-node-spec-one",
    "spec-two": ".landing-block-node-spec-two",
    "spec-three": ".landing-block-node-spec-three",
  };

  function text(card, selector) {
    var node = card.querySelector(selector);
    return node ? node.textContent.trim() : "";
  }

  /** «от 2 500 000 ₽» → 2500000. Неразрывные пробелы тоже считаются. */
  function price(card) {
    var raw = text(card, ".landing-block-node-price").replace(/[^\d]/g, "");
    return raw ? parseInt(raw, 10) : 0;
  }

  function money(value) {
    return value.toLocaleString("ru-RU") + " ₽";
  }

  function plural(n) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "автомобиль";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "автомобиля";
    return "автомобилей";
  }

  /** Пороги бюджета считаем от реальных цен: 4 ступени, округление вверх до 500 тыс. */
  function priceSteps(cards) {
    var values = cards.map(price).filter(Boolean);
    if (!values.length) return [];
    var max = Math.max.apply(null, values);
    var min = Math.min.apply(null, values);
    var step = 500000;
    var steps = [];
    for (var i = 1; i <= 4; i++) {
      var edge = Math.ceil((min + ((max - min) * i) / 4) / step) * step;
      if (steps.indexOf(edge) === -1) steps.push(edge);
    }
    return steps;
  }

  function initCatalog(root) {
    if (root.dataset.catalogReady === "1") return;
    root.dataset.catalogReady = "1";

    var grid = root.querySelector("[data-catalog-grid]");
    if (!grid) return;

    var countOut = root.querySelector("[data-catalog-count]");
    var emptyState = root.querySelector("[data-catalog-empty]");
    var sortSelect = root.querySelector("[data-catalog-sort]");
    var resetButton = root.querySelector("[data-catalog-reset]");
    var filters = Array.prototype.slice.call(root.querySelectorAll(".landing-block-card-filter"));

    // Исходный порядок = «сначала популярные»: его задаёт менеджер, перетаскивая
    // карточки в редакторе, поэтому запоминаем до любых сортировок.
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".vehicle-card"));
    cards.forEach(function (card, index) { card.dataset.order = String(index); });

    var steps = priceSteps(cards);

    filters.forEach(function (field) {
      var select = field.querySelector("select");
      if (!select) return;
      var source = field.getAttribute("data-source") || "";
      var anyLabel = field.getAttribute("data-any") || "Любой";

      select.innerHTML = "";
      var blank = document.createElement("option");
      blank.value = "";
      blank.textContent = anyLabel;
      select.appendChild(blank);

      if (source === "price") {
        steps.forEach(function (edge) {
          var option = document.createElement("option");
          option.value = String(edge);
          option.textContent = "До " + money(edge);
          select.appendChild(option);
        });
      } else if (SOURCES[source]) {
        // Варианты — только те, что реально встречаются в карточках.
        var seen = [];
        cards.forEach(function (card) {
          var value = text(card, SOURCES[source]);
          if (value && seen.indexOf(value) === -1) seen.push(value);
        });
        seen.sort(function (a, b) { return a.localeCompare(b, "ru"); });
        seen.forEach(function (value) {
          var option = document.createElement("option");
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });
      }

      // Фильтр без единственного варианта бесполезен — прячем.
      field.hidden = select.options.length < 2;
      select.addEventListener("change", apply);
    });

    if (sortSelect) sortSelect.addEventListener("change", apply);
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        filters.forEach(function (field) {
          var select = field.querySelector("select");
          if (select) select.value = "";
        });
        if (sortSelect) sortSelect.value = "popular";
        apply();
        if (window.Jupiter && window.Jupiter.toast) {
          window.Jupiter.toast({ title: "Фильтры сброшены", text: "Показаны все автомобили." });
        }
      });
    }

    function matches(card) {
      return filters.every(function (field) {
        var select = field.querySelector("select");
        if (!select || !select.value) return true;
        var source = field.getAttribute("data-source");
        if (source === "price") return price(card) <= parseInt(select.value, 10);
        if (!SOURCES[source]) return true;
        return text(card, SOURCES[source]) === select.value;
      });
    }

    function apply() {
      var visible = [];
      cards.forEach(function (card) {
        var ok = matches(card);
        card.hidden = !ok;
        if (ok) visible.push(card);
      });

      var mode = sortSelect ? sortSelect.value : "popular";
      visible.sort(function (a, b) {
        if (mode === "asc") return price(a) - price(b);
        if (mode === "desc") return price(b) - price(a);
        if (mode === "name") {
          return text(a, SOURCES.name).localeCompare(text(b, SOURCES.name), "ru");
        }
        return Number(a.dataset.order) - Number(b.dataset.order);
      });
      visible.forEach(function (card) { grid.appendChild(card); });

      if (countOut) countOut.textContent = visible.length + " " + plural(visible.length);
      if (emptyState) emptyState.hidden = visible.length > 0;
      grid.hidden = visible.length === 0;
    }

    apply();
  }

  function initAll() {
    document.querySelectorAll(".jupiter-catalog").forEach(initCatalog);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAll);
  } else {
    initAll();
  }

  if (window.BX && window.BX.addCustomEvent) {
    window.BX.addCustomEvent("BX.Landing.Block:init", initAll);
    window.BX.addCustomEvent("BX.Landing.Block:afterUpdateContent", initAll);
  }
})();
