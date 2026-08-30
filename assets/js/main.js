(function () {
  'use strict';

  var pageLoadedAt = Date.now();

  /* ---- Footer year ---- */
  var yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Mobile nav ---- */
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { navLinks.classList.remove('open'); });
    });
  }

  /* ---- Header: chowa się przy scrollu w dół, pokazuje przy scrollu w górę ---- */
  var siteHeader = document.querySelector('.site-header');
  if (siteHeader) {
    var lastScrollY = window.scrollY;
    var headerHidden = false;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY;
        if (!navLinks || !navLinks.classList.contains('open')) {
          var shouldHide = y > lastScrollY && y > 80;
          if (shouldHide !== headerHidden) {
            headerHidden = shouldHide;
            siteHeader.classList.toggle('site-header--hidden', headerHidden);
          }
        }
        lastScrollY = y;
        ticking = false;
      });
    }, { passive: true });
  }

  /* ---- Lightbox gallery ---- */
  var lightbox = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');
  var currentGroup = [];
  var currentIndex = 0;

  function openLightbox(groupName, startSrc) {
    var imgs = Array.from(document.querySelectorAll('img[data-lightbox-group="' + groupName + '"]'));
    currentGroup = imgs.map(function (img) { return img.getAttribute('src'); });
    currentIndex = Math.max(0, currentGroup.indexOf(startSrc));
    showLightboxImage();
    lightbox.classList.add('open');
  }
  function showLightboxImage() {
    if (!currentGroup.length) return;
    lbImage.src = currentGroup[currentIndex];
  }
  function closeLightbox() { lightbox.classList.remove('open'); }
  function nextLightbox() { currentIndex = (currentIndex + 1) % currentGroup.length; showLightboxImage(); }
  function prevLightbox() { currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length; showLightboxImage(); }

  document.querySelectorAll('img[data-lightbox-group]').forEach(function (img) {
    img.addEventListener('click', function () {
      openLightbox(img.getAttribute('data-lightbox-group'), img.getAttribute('src'));
    });
  });
  if (lbClose) lbClose.addEventListener('click', closeLightbox);
  if (lbNext) lbNext.addEventListener('click', nextLightbox);
  if (lbPrev) lbPrev.addEventListener('click', prevLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
  }
  document.addEventListener('keydown', function (e) {
    if (!lightbox || !lightbox.classList.contains('open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
  });

  /* ---- Forms: normalize + submit to api/contact.php ---- */
  var ALLOWED_MODELS = ['BOKA TWO', 'BOKA ONE', 'BOKA COMFORT', 'Sauna BOX', 'Sauna MODERN', 'Projekt na wymiar'];

  function setStatus(el, ok, text) {
    if (!el) return;
    el.textContent = text;
    el.className = 'form-status ' + (ok ? 'ok' : 'err');
  }

  function submitContact(payload, statusEl, form) {
    setStatus(statusEl, true, 'Wysyłanie...');
    fetch('api/contact.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json().then(function (data) { return { status: res.status, data: data }; }); })
      .then(function (r) {
        if (r.data && r.data.ok) {
          setStatus(statusEl, true, 'Dziękujemy! Odezwiemy się najszybciej, jak to możliwe.');
          form.reset();
        } else {
          setStatus(statusEl, false, 'Nie udało się wysłać wiadomości. Spróbuj ponownie lub zadzwoń: +48 668 476 538.');
        }
      })
      .catch(function () {
        setStatus(statusEl, false, 'Błąd połączenia. Spróbuj ponownie lub zadzwoń: +48 668 476 538.');
      });
  }

  /* ---- Kontakt: walidacja z podświetleniem pól (jak na promocja.bokagardenroom.pl) ---- */
  var kontaktForm = document.getElementById('kontaktForm');
  var kontaktStatus = document.getElementById('kontaktFormStatus');
  if (kontaktForm) {
    var fNameInput = kontaktForm.querySelector('[name=name]');
    var fContactInput = kontaktForm.querySelector('[name=contact]');
    [fNameInput, fContactInput].forEach(function (input) {
      input.addEventListener('input', function () { input.classList.remove('invalid'); });
    });

    kontaktForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = fNameInput.value.trim();
      var contact = fContactInput.value.trim();
      var consent = kontaktForm.querySelector('[name=consent]').checked;

      fNameInput.classList.toggle('invalid', !name);
      fContactInput.classList.toggle('invalid', !contact);

      if (!name || !contact) {
        setStatus(kontaktStatus, false, 'Podaj imię oraz telefon lub e-mail, żebyśmy mogli się odezwać.');
        return;
      }
      if (!consent) {
        setStatus(kontaktStatus, false, 'Zaznacz zgodę na kontakt zwrotny, żeby wysłać zapytanie.');
        return;
      }

      var model = (kontaktForm.querySelector('[name=model]') || {}).value || '';
      submitContact({
        name: name,
        contact: contact,
        model: ALLOWED_MODELS.indexOf(model) !== -1 ? model : 'Projekt na wymiar',
        message: (kontaktForm.querySelector('[name=message]') || {}).value || '',
        consent: consent,
        website: '', // honeypot (zawsze puste — pole nie jest renderowane)
        elapsed: Date.now() - pageLoadedAt
      }, kontaktStatus, kontaktForm);
    });
  }

  /* ---- "Zobacz na żywo" — mapa Google na kliknięcie (bez cookies do czasu zgody) ---- */
  var mapPlaceholder = document.getElementById('mapPlaceholder');
  function loadMap() {
    if (!mapPlaceholder || !mapPlaceholder.parentElement) return;
    var frame = mapPlaceholder.parentElement;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.google.com/maps?q=Aroniowa+9A,+62-023+Robakowo&output=embed';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.setAttribute('title', 'Mapa — BOKA Garden Room, Robakowo');
    frame.replaceChild(iframe, mapPlaceholder);
    mapPlaceholder = null;
  }
  if (mapPlaceholder) {
    mapPlaceholder.addEventListener('click', loadMap);
  }

  /* ---- Baner cookies ---- */
  var COOKIE_CONSENT_KEY = 'boka_cookie_consent';
  var cookieBanner = document.getElementById('cookieBanner');
  if (cookieBanner) {
    var consent = null;
    try { consent = localStorage.getItem(COOKIE_CONSENT_KEY); } catch (e) {}

    if (consent === 'all') {
      loadMap();
    } else if (!consent) {
      cookieBanner.hidden = false;
    }

    function decideCookies(value) {
      try { localStorage.setItem(COOKIE_CONSENT_KEY, value); } catch (e) {}
      cookieBanner.hidden = true;
      if (value === 'all') loadMap();
    }

    var essentialBtn = document.getElementById('cookieEssential');
    var acceptAllBtn = document.getElementById('cookieAcceptAll');
    if (essentialBtn) essentialBtn.addEventListener('click', function () { decideCookies('essential'); });
    if (acceptAllBtn) acceptAllBtn.addEventListener('click', function () { decideCookies('all'); });
  }

  /* ---- Filmiki produktowe: pełny ekran ---- */
  document.querySelectorAll('.video-fullscreen-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var iframe = btn.parentElement.querySelector('iframe');
      if (!iframe) return;
      var request = iframe.requestFullscreen || iframe.webkitRequestFullscreen || iframe.msRequestFullscreen;
      if (request) request.call(iframe);
    });
  });

})();
