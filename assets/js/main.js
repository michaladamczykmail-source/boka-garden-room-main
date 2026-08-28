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

  function collectContact(form) {
    var email = (form.querySelector('[name=email]') || {}).value || '';
    var phone = (form.querySelector('[name=phone]') || {}).value || '';
    if (email && phone) return email + ' / ' + phone;
    return email || phone;
  }

  function buildConfiguratorMessage(form) {
    var parts = [];
    ['przeznaczenie', 'styl', 'elewacja', 'stolarka'].forEach(function (name) {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      if (checked) parts.push(checked.value);
    });
    var opts = Array.from(form.querySelectorAll('input[name="opcje"]:checked')).map(function (i) { return i.value; });
    if (opts.length) parts.push('Opcje dodatkowe: ' + opts.join(', '));
    var notes = (form.querySelector('[name=notes]') || {}).value || '';
    if (notes.trim()) parts.push('Uwagi: ' + notes.trim());
    return parts.join('\n');
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

  function wireForm(formId, statusId, buildPayload) {
    var form = document.getElementById(formId);
    var statusEl = document.getElementById(statusId);
    if (!form) return;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var payload = buildPayload(form);
      payload.website = ''; // honeypot (zawsze puste — pole nie jest renderowane)
      payload.elapsed = Date.now() - pageLoadedAt;
      submitContact(payload, statusEl, form);
    });
  }

  wireForm('configForm', 'configFormStatus', function (form) {
    var przeznaczenie = (form.querySelector('input[name=przeznaczenie]:checked') || {}).value || 'Konfigurator';
    return {
      name: przeznaczenie + ' — konfigurator',
      contact: collectContact(form),
      model: 'Projekt na wymiar',
      message: buildConfiguratorMessage(form),
      consent: form.querySelector('[name=consent]').checked
    };
  });

  wireForm('kontaktForm', 'kontaktFormStatus', function (form) {
    var model = (form.querySelector('[name=model]') || {}).value || '';
    return {
      name: (form.querySelector('[name=name]') || {}).value || 'Klient',
      contact: (form.querySelector('[name=contact]') || {}).value || '',
      model: ALLOWED_MODELS.indexOf(model) !== -1 ? model : 'Projekt na wymiar',
      message: (form.querySelector('[name=message]') || {}).value || '',
      consent: form.querySelector('[name=consent]').checked
    };
  });

  /* ---- "Zobacz na żywo" — mapa Google na kliknięcie (bez cookies do czasu zgody) ---- */
  var mapPlaceholder = document.getElementById('mapPlaceholder');
  if (mapPlaceholder) {
    mapPlaceholder.addEventListener('click', function () {
      var frame = mapPlaceholder.parentElement;
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.google.com/maps?q=Aroniowa+9A,+62-023+Robakowo&output=embed';
      iframe.loading = 'lazy';
      iframe.referrerPolicy = 'no-referrer-when-downgrade';
      iframe.setAttribute('title', 'Mapa — BOKA Garden Room, Robakowo');
      frame.replaceChild(iframe, mapPlaceholder);
    });
  }

})();
