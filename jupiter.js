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

  /* По умолчанию тёмная: базовые цвета фирменного стиля — чёрный и серый,
     на них строится и логотип, и градиент. Светлая остаётся выбором
     посетителя и запоминается. */
  function currentTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === "light" || saved === "dark") return saved;
    } catch (e) { /* приватный режим */ }
    return "dark";
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

    // Прячем секции только теперь, когда есть кому их показать. В CSS они
    // видимы по умолчанию: страница без этого файла не должна остаться пустой.
    root.classList.add("has-reveal");

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

  /* ---------------------------------------------------------------
     Куки-баннер портала
     Битрикс закрепляет предупреждение о куках у нижнего края экрана
     (position: fixed, z-index 10150) и накрывает им последнюю строку
     подвала: 101 px на десктопе, 297 px на телефоне. Проверено кликом —
     по ссылкам «Доставка и оплата» и «Контакты» попасть было нельзя.
     Меряем баннер и отдаём высоту в --ja-cookie-bar, подвал резервирует
     под неё место. Согласие не нажимаем: это выбор посетителя.
     --------------------------------------------------------------- */
  var cookieBarWatched = null;

  function syncCookieBar() {
    var bar = document.getElementById("bx-landing-cookies-popup-warning");
    var height = 0;
    if (bar) {
      var box = bar.getBoundingClientRect();
      // Баннер закреплён снизу; принятый сворачивается в нулевую высоту.
      if (box.height > 0 && box.bottom > window.innerHeight - 2) height = Math.ceil(box.height);
      if (bar !== cookieBarWatched && window.ResizeObserver) {
        cookieBarWatched = bar;
        new ResizeObserver(syncCookieBar).observe(bar);
      }
    }
    root.style.setProperty("--ja-cookie-bar", height + "px");
  }

  /* ---------------------------------------------------------------
     Подсветка текущего раздела
     В прототипе активный пункт знает роутер, а на портале страницу отдаёт
     сервер — сверяем адрес ссылки с адресом страницы. Сравнение точное:
     «/» — префикс любого другого адреса, и по вхождению главная
     подсвечивалась бы на всех страницах сразу.
     --------------------------------------------------------------- */
  function markActiveNav() {
    var here = location.pathname.replace(/\/+$/, "") || "/";
    document.querySelectorAll(".main-nav a[href], .footer__links a[href]").forEach(function (link) {
      var path;
      try {
        path = new URL(link.getAttribute("href"), location.href).pathname;
      } catch (e) {
        return;
      }
      link.classList.toggle("is-active", (path.replace(/\/+$/, "") || "/") === here);
    });
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
    syncCookieBar();
    markActiveNav();
    initReveal();

    // Баннер появляется не сразу и исчезает после согласия — следим за телом.
    if (window.MutationObserver) {
      new MutationObserver(syncCookieBar).observe(document.body, { childList: true });
    }

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

    window.addEventListener("resize", function () {
      syncScrollbar();
      syncCookieBar();
    });
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


/* ==== site-header.js ==== */
/**
 * Шапка сайта: меню на узких экранах и подсветка текущего пункта.
 *
 * Кнопка «Меню» показывает и прячет .main-nav — на широких экранах она скрыта
 * стилями и в разметке остаётся.
 *
 * Подсветка вычисляется от адреса страницы, а не задаётся в разметке: иначе
 * редактору пришлось бы отмечать активный пункт на каждой странице руками,
 * а блок один на весь сайт.
 */
(function () {
  "use strict";

  function initHeader(header) {
    if (header.dataset.headerReady === "1") return;
    header.dataset.headerReady = "1";

    var nav = header.querySelector(".main-nav");
    var toggle = header.querySelector("[data-jupiter-menu-toggle]");

    if (nav && toggle) {
      toggle.addEventListener("click", function () {
        var open = !nav.classList.contains("is-open");
        setOpen(open);
      });

      // Клик по пункту закрывает меню: иначе на телефоне оно остаётся поверх
      // страницы, на которую только что перешли.
      nav.addEventListener("click", function (event) {
        if (event.target.closest("a")) setOpen(false);
      });

      document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") setOpen(false);
      });
    }

    function setOpen(open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      toggle.setAttribute("data-tip", open ? "Закрыть меню" : "Меню");
      toggle.querySelectorAll("[data-icon]").forEach(function (icon) {
        icon.hidden = icon.getAttribute("data-icon") !== (open ? "close" : "menu");
      });
    }

    markActive(header);
  }

  /** Отмечает пункт, ведущий на текущую страницу. */
  function markActive(header) {
    var here = location.pathname.replace(/\/+$/, "") || "/";
    // Подсвечиваем только первый подходящий пункт: в меню два пункта ведут
    // в каталог («Модели» и «Авто в наличии»), и подсвечивались оба сразу.
    var marked = false;

    header.querySelectorAll(".main-nav a").forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var active = false;

      if (href && href.charAt(0) !== "#" && !marked) {
        var path;
        try { path = new URL(href, location.href).pathname.replace(/\/+$/, "") || "/"; }
        catch (e) { path = null; }

        // Точное совпадение либо вложенный раздел: /katalog/item/… тоже «Каталог».
        if (path) active = path === here || (path !== "/" && here.indexOf(path + "/") === 0);
        if (active) marked = true;
      }

      link.classList.toggle("is-active", active);
    });
  }

  function initAll() {
    document.querySelectorAll(".jupiter-header").forEach(initHeader);
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
 * Пункт записывается одним из трёх способов:
 *   Nissan                     — подпись и значение совпадают;
 *   До 3 000 000 ₽ = 3000000   — подпись видит посетитель, значение уходит
 *                                в адрес (фильтр каталога ждёт число);
 *   Qashqai II @ Nissan        — пункт показывается только тогда, когда в
 *                                поле из data-after выбран «Nissan».
 *
 * Обёртка — div, а не form: санитайзер Битрикса вырезает тег form из CONTENT
 * блока (проверено через landing.repo.checkcontent). Отправка и так шла не
 * через submit, а сборкой адреса на клике по кнопке.
 */
(function () {
  "use strict";

  /** «Qashqai II @ Nissan» → { label, value, parent }. */
  function parseOption(raw) {
    var at = raw.lastIndexOf("@");
    var parent = at === -1 ? "" : raw.slice(at + 1).trim();
    var head = (at === -1 ? raw : raw.slice(0, at)).trim();
    var parts = head.split("=");
    var label = parts[0].trim();
    var value = parts.length > 1 ? parts.slice(1).join("=").trim() : label;
    return { label: label, value: value, parent: parent };
  }

  function initField(form, field) {
    var select = field.querySelector("select");
    if (!select) return null;

    var raw = field.getAttribute("data-options") || "";
    var options = raw.split(",").map(function (item) { return item.trim(); }).filter(Boolean).map(parseOption);
    var param = field.getAttribute("data-param") || "";
    // Поле, от которого зависит список: указывается через data-param родителя.
    var after = (field.getAttribute("data-after") || "").trim();
    var parentSelect = after
      ? form.querySelector('.landing-block-card-field[data-param="' + after + '"] select')
      : null;

    select.name = param;

    function render() {
      var was = select.value;
      var chosen = parentSelect ? parentSelect.value : "";
      select.innerHTML = "";
      options.forEach(function (item, index) {
        // Первый пункт — «любой», он остаётся всегда и в запрос не уходит.
        if (index && item.parent && chosen && item.parent !== chosen) return;
        var option = document.createElement("option");
        option.value = index === 0 ? "" : item.value;
        option.textContent = item.label;
        select.appendChild(option);
      });
      select.value = "";
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === was) { select.value = was; break; }
      }
      // Список без единственного варианта бесполезен — прячем.
      field.hidden = select.options.length < 2;
    }

    render();
    if (parentSelect) parentSelect.addEventListener("change", render);

    // Возвращаем выбор из адреса: со страницы каталога можно вернуться назад,
    // и строка поиска должна показывать то же, что и фильтр.
    var params = new URLSearchParams(location.search);
    if (param && params.has(param)) {
      var wanted = params.get(param);
      for (var k = 0; k < select.options.length; k++) {
        if (select.options[k].value === wanted) { select.value = wanted; break; }
      }
    }
    return render;
  }

  function initForm(form) {
    if (form.dataset.quickSearchReady === "1") return;
    form.dataset.quickSearchReady = "1";

    /* Родительское поле должно быть готово раньше зависимого, поэтому сначала
       поля без data-after, потом остальные. */
    var fields = Array.prototype.slice.call(form.querySelectorAll(".landing-block-card-field"));
    fields.sort(function (a, b) {
      return (a.getAttribute("data-after") ? 1 : 0) - (b.getAttribute("data-after") ? 1 : 0);
    });
    fields.forEach(function (field) { initField(form, field); });

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
 *
 * Фильтр может зависеть от другого: data-after="brand" означает, что варианты
 * собираются не из всех карточек, а только из тех, что прошли фильтр по марке.
 * Так «Модель» не предлагает Qashqai, когда выбрана Mazda.
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

  /**
   * Марка.
   *
   * Единственное, что берётся не из видимого текста, — и на то есть причина:
   * по названию марку не отделить. «Lynk & Co 900», «BYD Yuan Up», «Mazda Zhi
   * Shang Pro» — граница между маркой и моделью в них не на первом пробеле и
   * не на последнем. В фильтре из-за этого стояли «&», «Auto» и «Up».
   *
   * Атрибут заполняет сборка из карточки товара в магазине, руками его не
   * набирают. Карточка, добавленная в редакторе вручную, атрибута не имеет —
   * там маркой считается первое слово, как и раньше.
   */
  function brand(card) {
    var given = (card.getAttribute("data-brand") || "").trim();
    return given || text(card, SOURCES.name).split(/\s+/)[0] || "";
  }

  /**
   * Модель — остаток названия после марки: «Nissan Qashqai» → «Qashqai»,
   * «BYD Yuan Up» → «Yuan Up».
   *
   * Комплектации в названии нет, она стоит отдельной строкой в карточке,
   * поэтому «CX-5 Comfort» и «CX-5 Smart» и так приходят одной моделью.
   */
  function model(card) {
    var name = text(card, SOURCES.name);
    var mark = brand(card);
    var rest = name.slice(0, mark.length) === mark ? name.slice(mark.length) : name.replace(/^\S+/, "");
    return rest.trim() || name;
  }

  /** «от 2 500 000 ₽» → 2500000. Неразрывные пробелы тоже считаются. */
  function price(card) {
    var raw = text(card, ".landing-block-node-price").replace(/[^\d]/g, "");
    return raw ? parseInt(raw, 10) : 0;
  }

  function plural(n) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "автомобиль";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "автомобиля";
    return "автомобилей";
  }

  /**
   * Диапазоны бюджета: «2–3 млн ₽», …, последний открытый — «от 6 млн ₽».
   *
   * Шаг подбирается так, чтобы вариантов вышло не больше пяти: на четырёх
   * машинах это шаг в миллион, на полном каталоге — в три. Пустые диапазоны
   * не показываем: выбор, который заведомо ничего не находит, только мешает.
   *
   * Тот же расчёт повторён в bitrix/testpages.mjs для строки быстрого поиска
   * на главной — она собирает адрес с этими же значениями.
   */
  function priceRanges(cards) {
    var values = cards.map(price).filter(Boolean);
    if (!values.length) return [];

    var M = 1000000;
    var min = Math.floor(Math.min.apply(null, values) / M);
    var max = Math.max.apply(null, values) / M;
    var steps = [1, 2, 3, 5, 10, 20, 50];
    var step = steps[steps.length - 1];
    for (var i = 0; i < steps.length; i++) {
      if ((max - min) / steps[i] <= 5) { step = steps[i]; break; }
    }

    var has = function (from, to) {
      return values.some(function (value) { return value >= from && (!to || value < to); });
    };

    var out = [];
    for (var k = 0; k < 4; k++) {
      var from = (min + k * step) * M;
      var to = from + step * M;
      if (has(from, to)) out.push({ from: from, to: to, label: (from / M) + "–" + (to / M) + " млн ₽" });
    }
    var open = (min + 4 * step) * M;
    if (has(open, 0)) out.push({ from: open, to: 0, label: "от " + (open / M) + " млн ₽" });
    return out;
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

    var ranges = priceRanges(cards);

    /** Чем читается значение карточки для этого источника. */
    function reader(source) {
      if (source === "brand") return brand;
      if (source === "model") return model;
      if (SOURCES[source]) return function (card) { return text(card, SOURCES[source]); };
      return null;
    }

    /** Проходит ли карточка один фильтр. Пустой выбор пропускает всё. */
    function passes(card, field) {
      var select = field.querySelector("select");
      if (!select || !select.value) return true;
      var source = field.getAttribute("data-source") || "";

      if (source === "price") {
        var edge = select.value.split("-");
        var from = parseInt(edge[0], 10) || 0;
        var to = edge[1] ? parseInt(edge[1], 10) : 0;
        var value = price(card);
        return value >= from && (!to || value < to);
      }

      var read = reader(source);
      return read ? read(card) === select.value : true;
    }

    /** Карточки, из которых собираются варианты этого фильтра. */
    function poolFor(field) {
      var after = (field.getAttribute("data-after") || "").split(",")
        .map(function (name) { return name.trim(); })
        .filter(Boolean);
      if (!after.length) return cards;
      var parents = filters.filter(function (other) {
        return after.indexOf(other.getAttribute("data-source") || "") !== -1;
      });
      return cards.filter(function (card) {
        return parents.every(function (other) { return passes(card, other); });
      });
    }

    /** Пересобирает список вариантов, сохраняя выбор, если он ещё возможен. */
    function fill(field) {
      var select = field.querySelector("select");
      if (!select) return;
      var source = field.getAttribute("data-source") || "";
      var was = select.value;

      var list;
      if (source === "price") {
        list = ranges.map(function (range) {
          return { value: range.from + "-" + (range.to || ""), label: range.label };
        });
      } else {
        var read = reader(source);
        var seen = [];
        if (read) {
          poolFor(field).forEach(function (card) {
            var value = read(card);
            if (value && seen.indexOf(value) === -1) seen.push(value);
          });
          seen.sort(function (a, b) { return a.localeCompare(b, "ru"); });
        }
        list = seen.map(function (value) { return { value: value, label: value }; });
      }

      select.innerHTML = "";
      var blank = document.createElement("option");
      blank.value = "";
      blank.textContent = field.getAttribute("data-any") || "Любой";
      select.appendChild(blank);
      list.forEach(function (item) {
        var option = document.createElement("option");
        option.value = item.value;
        option.textContent = item.label;
        select.appendChild(option);
      });

      select.value = "";
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === was) { select.value = was; break; }
      }

      // Фильтр без единственного варианта бесполезен — прячем.
      field.hidden = select.options.length < 2;
    }

    filters.forEach(function (field) {
      fill(field);
      var select = field.querySelector("select");
      if (select) select.addEventListener("change", refresh);
    });

    if (sortSelect) sortSelect.addEventListener("change", apply);
    if (resetButton) {
      resetButton.addEventListener("click", function () {
        filters.forEach(function (field) {
          var select = field.querySelector("select");
          if (select) select.value = "";
        });
        if (sortSelect) sortSelect.value = "popular";
        refresh();
        if (window.Jupiter && window.Jupiter.toast) {
          window.Jupiter.toast({ title: "Фильтры сброшены", text: "Показаны все автомобили." });
        }
      });
    }

    /* Выбор фильтров живёт в адресе страницы.
       Так он переживает перезагрузку и «назад» из карточки товара, и так же
       приезжает из строки быстрого поиска на главной: она собирает тот же
       адрес. Ключ — источник фильтра (brand, model, price), а не порядковый
       номер: менеджер может переставить фильтры местами. */
    restoreFromUrl();
    refresh();

    /** Зависимые списки пересобираем на каждое изменение, потом фильтруем. */
    function refresh() {
      filters.forEach(function (field) {
        if (field.getAttribute("data-after")) fill(field);
      });
      apply();
    }

    function restoreFromUrl() {
      var params = new URLSearchParams(location.search);
      filters.forEach(function (field) {
        var select = field.querySelector("select");
        var source = field.getAttribute("data-source") || "";
        if (!select || !params.has(source)) return;

        var wanted = params.get(source);
        // Значение из адреса берём только если такой вариант есть в списке:
        // карточки меняются, и вчерашняя ссылка может звать несуществующее.
        for (var i = 0; i < select.options.length; i++) {
          if (select.options[i].value === wanted) { select.value = wanted; break; }
        }
      });

      var sort = params.get("sort");
      if (sortSelect && sort) sortSelect.value = sort;
    }

    function saveToUrl() {
      var params = new URLSearchParams(location.search);
      filters.forEach(function (field) {
        var select = field.querySelector("select");
        var source = field.getAttribute("data-source") || "";
        if (!select || !source) return;
        if (select.value) params.set(source, select.value);
        else params.delete(source);
      });

      if (sortSelect && sortSelect.value && sortSelect.value !== "popular") params.set("sort", sortSelect.value);
      else params.delete("sort");

      var query = params.toString();
      // replaceState, а не pushState: иначе каждый щелчок фильтра добавляет
      // запись в историю, и кнопка «назад» перестаёт работать по-человечески.
      history.replaceState(null, "", location.pathname + (query ? "?" + query : "") + location.hash);
    }

    function matches(card) {
      return filters.every(function (field) { return passes(card, field); });
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

      saveToUrl();
    }
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


/* ==== gallery.js ==== */
/**
 * Галерея в карточке автомобиля.
 *
 * Нажатие на миниатюру меняет крупный снимок. Полоса миниатюр показывается
 * только когда снимков больше одного — иначе под фотографией висела бы
 * строка с её же копией.
 *
 * Адрес снимка берём из самой миниатюры: подменять src у крупного снимка
 * достаточно, второй список путей заводить незачем.
 */
(function () {
  "use strict";

  function initGallery(root) {
    if (root.dataset.galleryReady === "1") return;

    var main = root.querySelector(".landing-block-node-photo");
    var thumbs = [].slice.call(root.querySelectorAll(".landing-block-card-shot"));
    if (!main || thumbs.length < 2) {
      // Один снимок — полосу прячем и выходим: показывать нечего.
      if (thumbs.length < 2) root.classList.add("is-single");
      root.dataset.galleryReady = "1";
      return;
    }
    root.dataset.galleryReady = "1";

    thumbs.forEach(function (thumb) {
      thumb.addEventListener("click", function () {
        var shot = thumb.querySelector("img");
        if (!shot) return;
        main.src = shot.currentSrc || shot.src;
        main.alt = shot.alt || main.alt;
        thumbs.forEach(function (other) { other.classList.toggle("is-active", other === thumb); });
      });
    });
  }

  function initAll() {
    document.querySelectorAll(".jupiter-gallery").forEach(initGallery);
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
 *
 * Взнос считается долей от цены, а не отдельной суммой в рублях. Так было
 * раньше, и получалось вот что: взнос можно было увести в ноль (кредит на
 * полную стоимость — таких программ у автокредита нет) и, наоборот, поднять
 * до самой цены, после чего платёж показывался «0 ₽». Теперь доля живёт в
 * границах 10–90%, а при движении цены сумма взноса пересчитывается сама и
 * остаётся той же долей.
 *
 * Показываем не только платёж, но и сумму кредита с переплатой: без них
 * человек видит красивое число в месяц и не видит, во что оно обходится.
 *
 * Ставка считается от ключевой ставки Банка России (data-key-rate) плюс
 * надбавка банка (data-rate-add). Так её видно и посетителю, и редактору:
 * зашитое «16% годовых» ничем не объяснялось и устаревало молча.
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
    var bodyOut = root.querySelector("[data-calc-body]");
    var overOut = root.querySelector("[data-calc-over]");
    var rateOut = root.querySelector("[data-calc-rate]");

    var priceMin = num(root, "data-price-min", 1000000);
    var priceMax = num(root, "data-price-max", 6000000);
    /* Старые блоки на странице могли остаться с data-rate — тогда берём его. */
    var keyRate = num(root, "data-key-rate", NaN);
    var ratePercent = isNaN(keyRate)
      ? num(root, "data-rate", 16)
      : keyRate + num(root, "data-rate-add", 0);
    var rate = ratePercent / 100;
    var downMin = num(root, "data-down-min", 10);
    var downMax = num(root, "data-down-max", 90);

    priceInput.min = priceMin;
    priceInput.max = priceMax;
    priceInput.step = 50000;
    priceInput.value = num(root, "data-price-start", 2500000);

    /* Ползунок взноса ходит в процентах, а рубли считаются от цены.
       Раньше он ходил в рублях, и его максимум приходилось двигать вслед за
       ценой; при уменьшении цены значение молча обрезалось. */
    downInput.min = downMin;
    downInput.max = downMax;
    downInput.step = 1;
    downInput.value = num(root, "data-down-start", 20);

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
      var share = parseFloat(downInput.value);
      var down = Math.round((price * share) / 100);
      var years = parseFloat(termInput.value);
      var body = Math.max(price - down, 0);
      var monthlyRate = rate / 12;
      var months = years * 12;
      /* Аннуитет. Ставка 0 — вырожденный случай: формула делится на ноль,
         а платёж при нулевой ставке это просто тело, делённое на срок. */
      var monthly = !body
        ? 0
        : monthlyRate
          ? (body * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months))
          : body / months;

      if (priceOut) priceOut.textContent = money(price);
      if (downOut) downOut.textContent = money(down) + " · " + Math.round(share) + "%";
      if (termOut) termOut.textContent = termLabel(years);
      if (monthlyOut) monthlyOut.textContent = money(monthly);
      if (monthlyTitle) monthlyTitle.textContent = money(monthly);
      if (bodyOut) bodyOut.textContent = money(body);
      if (overOut) overOut.textContent = money(Math.max(monthly * months - body, 0));
      if (rateOut) rateOut.textContent = String(Math.round(ratePercent * 100) / 100).replace(".", ",") + "% годовых";

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


/* ==== map.js ==== */
/**
 * Карта проезда.
 *
 * Карта показывается сразу, без нажатия: адрес без карты — это адрес, который
 * надо копировать в другое приложение.
 *
 * iframe создаётся скриптом, а не лежит в разметке блока: содержимое блока
 * проходит проверку безопасности портала, и полагаться на то, что она
 * пропустит чужой фрейм, не стоит. Скрипту это не мешает — он же и ставит
 * loading="lazy", поэтому карта не задерживает остальную страницу.
 */
(function () {
  "use strict";

  function initMap(frame) {
    if (frame.dataset.mapReady === "1") return;
    var src = frame.getAttribute("data-map-embed");
    if (!src) return;
    frame.dataset.mapReady = "1";

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Карта проезда";
    iframe.loading = "lazy";
    iframe.setAttribute("allowfullscreen", "");
    iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
    frame.appendChild(iframe);
    frame.classList.add("is-loaded");

    // Кнопка была нужна, пока карта грузилась по нажатию. Теперь она лишняя.
    var button = frame.querySelector("[data-map-open]");
    if (button) button.remove();
  }

  function initAll() {
    document.querySelectorAll(".jupiter-map [data-map-embed]").forEach(initMap);
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
