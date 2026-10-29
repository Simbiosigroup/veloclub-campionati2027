(function () {
  'use strict';

  /* --------------------------------------------------------------------
   * Menu mobile
   * ------------------------------------------------------------------ */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = mainNav.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // chiude il menu mobile dopo aver selezionato una voce
    mainNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        mainNav.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* --------------------------------------------------------------------
   * Voce di menu attiva ("Open", da Figma nodo 33:1433): evidenzia nel
   * menu la sezione attualmente visibile mentre si scorre la pagina.
   * ------------------------------------------------------------------ */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.main-nav a'));
  var sectionIds = navLinks
    .map(function (link) { return link.getAttribute('href'); })
    .filter(function (href) { return href && href.charAt(0) === '#'; });
  var sections = sectionIds
    .map(function (href) { return document.querySelector(href); })
    .filter(Boolean);

  function setActiveNavLink(id) {
    navLinks.forEach(function (link) {
      if (link.getAttribute('href') === '#' + id) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  // Determina la sezione attiva scegliendo, tra quelle il cui bordo
  // superiore ha già superato una fascia poco sotto l'header fisso, quella
  // più in basso: è l'algoritmo standard di scroll-spy e resta corretto
  // anche quando più sezioni intersecano la fascia nello stesso istante
  // (es. con uno scroll istantaneo anziché fluido).
  function updateActiveSection() {
    var bandY = window.innerHeight * 0.35;
    var current = sections[0];
    sections.forEach(function (section) {
      if (section.getBoundingClientRect().top <= bandY) {
        current = section;
      }
    });
    if (current) {
      setActiveNavLink(current.id);
    }
  }

  if (sections.length && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(updateActiveSection, {
      rootMargin: '-35% 0px -55% 0px',
      threshold: 0
    });

    sections.forEach(function (section) {
      observer.observe(section);
    });

    updateActiveSection();
  }

  /* --------------------------------------------------------------------
   * Popup (Privacy Policy / Cookie Policy): sistema generico di modali,
   * apribili da qualsiasi trigger con [data-modal-trigger="<id-modale>"].
   * ------------------------------------------------------------------ */
  var openModal = null;
  var modalLastFocused = null;

  function onModalKeydown(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      closeModal();
    }
  }

  function openModalById(id, event) {
    if (event) event.preventDefault();
    var modal = document.getElementById(id);
    if (!modal) return;
    openModal = modal;
    modalLastFocused = document.activeElement;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.addEventListener('keydown', onModalKeydown);
    var dialog = modal.querySelector('.modal__dialog');
    if (dialog) dialog.focus();
  }

  function closeModal() {
    if (!openModal) return;
    openModal.classList.remove('is-open');
    openModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.removeEventListener('keydown', onModalKeydown);
    if (modalLastFocused && typeof modalLastFocused.focus === 'function') {
      modalLastFocused.focus();
    }
    openModal = null;
  }

  document.querySelectorAll('[data-modal-trigger]').forEach(function (trigger) {
    trigger.addEventListener('click', function (event) {
      openModalById(trigger.getAttribute('data-modal-trigger'), event);
    });
  });

  document.querySelectorAll('.modal [data-modal-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });

  /* --------------------------------------------------------------------
   * Carousel sponsor (Swiper.js) — 3 loghi visibili da desktop
   * ------------------------------------------------------------------ */
  var partnersCarouselEl = document.querySelector('[data-partners-carousel]');
  if (partnersCarouselEl && window.Swiper) {
    new window.Swiper(partnersCarouselEl, {
      slidesPerView: 1,
      spaceBetween: 40,
      centeredSlides: false,
      navigation: {
        nextEl: partnersCarouselEl.querySelector('.swiper-button-next'),
        prevEl: partnersCarouselEl.querySelector('.swiper-button-prev')
      },
      breakpoints: {
        576: { slidesPerView: 2, spaceBetween: 48 },
        768: { slidesPerView: 3, spaceBetween: 64 }
      }
    });
  }

  /* --------------------------------------------------------------------
   * Accordion (Soggiorno / Area Team)
   * ------------------------------------------------------------------ */
  var triggers = document.querySelectorAll('.accordion__trigger');

  function openPanel(trigger) {
    var panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    trigger.setAttribute('aria-expanded', 'true');
    panel.classList.add('is-open');
    var item = trigger.closest('.accordion__item');
    if (item) item.classList.add('is-open');
  }

  function closePanel(trigger) {
    var panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    trigger.setAttribute('aria-expanded', 'false');
    panel.classList.remove('is-open');
    var item = trigger.closest('.accordion__item');
    if (item) item.classList.remove('is-open');
  }

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', function () {
      var isOpen = trigger.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closePanel(trigger);
      } else {
        openPanel(trigger);
      }
    });
  });

  // Apre e scrolla automaticamente all'accordion corretto quando si
  // arriva da un'ancora di menu (#soggiorno oppure #area-team)
  function openFromHash(hash) {
    if (!hash) return;
    var item = document.querySelector(hash);
    if (!item || !item.classList.contains('accordion__item')) return;
    var trigger = item.querySelector('.accordion__trigger');
    if (trigger) {
      openPanel(trigger);
    }
  }

  window.addEventListener('hashchange', function () {
    openFromHash(window.location.hash);
  });

  if (window.location.hash) {
    // piccolo timeout per assicurarsi che lo scroll nativo dell'ancora
    // avvenga prima/insieme all'apertura del pannello
    window.setTimeout(function () {
      openFromHash(window.location.hash);
    }, 50);
  }

  /* --------------------------------------------------------------------
   * Stepper "Dettaglio camere" (+ / -)
   * ------------------------------------------------------------------ */
  document.querySelectorAll('[data-stepper]').forEach(function (control) {
    var valueEl = control.querySelector('[data-stepper-value]');
    var hiddenInput = control.querySelector('input[type="hidden"]');
    var decrementBtn = control.querySelector('[data-stepper-decrement]');
    var incrementBtn = control.querySelector('[data-stepper-increment]');
    var min = 0;
    var max = 99;

    function setValue(next) {
      next = Math.max(min, Math.min(max, next));
      valueEl.textContent = next;
      if (hiddenInput) hiddenInput.value = next;
    }

    if (decrementBtn) {
      decrementBtn.addEventListener('click', function () {
        setValue(parseInt(valueEl.textContent, 10) - 1);
      });
    }
    if (incrementBtn) {
      incrementBtn.addEventListener('click', function () {
        setValue(parseInt(valueEl.textContent, 10) + 1);
      });
    }
  });

  /* --------------------------------------------------------------------
   * Selezione a card singola (radiogroup): "Trattamento desiderato"
   * ------------------------------------------------------------------ */
  document.querySelectorAll('.treatment-options').forEach(function (group) {
    var cards = group.querySelectorAll('.treatment-card');
    var hiddenInput = group.querySelector('[data-treatment-input]');

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        cards.forEach(function (c) {
          c.classList.remove('is-selected');
          c.setAttribute('aria-checked', 'false');
        });
        card.classList.add('is-selected');
        card.setAttribute('aria-checked', 'true');
        if (hiddenInput) {
          hiddenInput.value = card.getAttribute('data-treatment') || card.getAttribute('data-vehicle-type') || '';
        }
      });
    });
  });

  /* --------------------------------------------------------------------
   * Selezione a card MULTIPLA (group di checkbox): "Tipologia di mezzo"
   * (Accrediti Area Team). Ogni card si attiva/disattiva da sola; i valori
   * scelti finiscono, separati da virgola, nel campo nascosto tipo_mezzo.
   * ------------------------------------------------------------------ */
  document.querySelectorAll('.vehicle-options').forEach(function (group) {
    var cards = group.querySelectorAll('.treatment-card');
    var hiddenInput = group.querySelector('[data-treatment-input]');

    function syncHiddenInput() {
      if (!hiddenInput) {
        return;
      }
      var values = [];
      cards.forEach(function (c) {
        if (c.classList.contains('is-selected')) {
          values.push(c.getAttribute('data-vehicle-type'));
        }
      });
      hiddenInput.value = values.join(', ');
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var selected = !card.classList.contains('is-selected');
        card.classList.toggle('is-selected', selected);
        card.setAttribute('aria-checked', selected ? 'true' : 'false');
        syncHiddenInput();
      });
    });
  });

  /* --------------------------------------------------------------------
   * "+ Aggiungi veicolo" (Accrediti Area Team): duplica la riga
   * targa/modello e aggiunge un pulsante per rimuoverla.
   * ------------------------------------------------------------------ */
  var removeIconSvg = '<svg viewBox="0 0 12 12" aria-hidden="true"><line x1="1.5" y1="1.5" x2="10.5" y2="10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><line x1="10.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  var vehicleCounter = 1;

  document.querySelectorAll('[data-add-vehicle]').forEach(function (addBtn) {
    var section = addBtn.closest('.accordion-form__section');
    var list = section ? section.querySelector('[data-vehicle-list]') : null;
    if (!list) return;

    addBtn.addEventListener('click', function () {
      vehicleCounter += 1;
      var template = list.querySelector('.vehicle-entry');
      var clone = template.cloneNode(true);

      clone.querySelectorAll('input').forEach(function (input) {
        input.value = '';
        if (input.id) {
          var newId = input.id.replace(/-\d+$/, '') + '-' + vehicleCounter;
          input.id = newId;
        }
      });
      clone.querySelectorAll('label').forEach(function (label) {
        var forAttr = label.getAttribute('for');
        if (forAttr) label.setAttribute('for', forAttr.replace(/-\d+$/, '') + '-' + vehicleCounter);
      });

      var removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'vehicle-entry__remove';
      removeBtn.setAttribute('aria-label', 'Rimuovi veicolo');
      removeBtn.innerHTML = removeIconSvg;
      removeBtn.addEventListener('click', function () {
        clone.remove();
      });
      clone.appendChild(removeBtn);

      list.appendChild(clone);
    });
  });

  /* --------------------------------------------------------------------
   * Esito invio form (redirect da send-form.php con ?sent=<id> oppure
   * ?error=<id> nell'URL): mostra il messaggio dentro il form giusto e
   * pulisce l'URL senza ricaricare la pagina.
   * ------------------------------------------------------------------ */
  (function () {
    var params = new URLSearchParams(window.location.search);
    var sentId = params.get('sent');
    var errorId = params.get('error');
    var formId = sentId || errorId;
    if (!formId) return;

    var status = sentId ? 'sent' : 'error';
    var hiddenInput = document.querySelector('input[name="form_id"][value="' + formId + '"]');
    var form = hiddenInput ? hiddenInput.closest('form') : null;
    if (form) {
      var feedback = form.querySelector('[data-form-feedback="' + status + '"]');
      if (feedback) feedback.hidden = false;
    }

    params.delete('sent');
    params.delete('error');
    var newQuery = params.toString();
    var newUrl = window.location.pathname + (newQuery ? '?' + newQuery : '') + window.location.hash;
    window.history.replaceState({}, '', newUrl);
  })();
})();
