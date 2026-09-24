/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   app.js — shell (parte 1/2): utilidades, iconos, modal de pesaje, navegación
   ========================================================================= */
(function () {
  "use strict";
  var S = window.Store;

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function on(sel, evt, handler, ctx) {
    $all(sel, ctx).forEach(function (el) { el.addEventListener(evt, handler); });
  }

  /* ---------------------------------------------------------------------
     Iconos SVG (trazo, 20x20 por defecto)
     --------------------------------------------------------------------- */
  var ICON = {
    home: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9.5h12V10" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 19.5v-6h4v6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    truck: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="18" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="18" r="1.6" stroke="currentColor" stroke-width="1.6"/></svg>',
    tablet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M11 18h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    gate: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 10 21 6v3L3 13z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 12.3V20M18 8.6V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    users: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8.5" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c1-3 3-4.5 5.5-4.5S13.5 16 14.5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M15.3 14.2c2 .1 3.4 1.4 4.2 3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    plus: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    camera: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.3" stroke="currentColor" stroke-width="1.7"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V4M12 4 7.5 8.5M12 4l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    check: '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5.5 5.5L20 6" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cloud: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A5.5 5.5 0 0 1 17.4 8.1 4 4 0 0 1 17 16H7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    bell: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 8l4 4-4 4M8 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4 2 20h20L12 4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1" fill="currentColor"/></svg>',
    info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1" fill="currentColor"/></svg>',
    empty: '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 9h16" stroke="currentColor" stroke-width="1.5"/></svg>',
    swap: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.6"/></svg>',
    lock: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10.5V7.8a4 4 0 1 1 8 0v2.7" stroke="currentColor" stroke-width="1.7"/></svg>',
    userIco: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" stroke="currentColor" stroke-width="1.7"/><path d="M4 20c1.4-3.6 4.6-5.5 8-5.5s6.6 1.9 8 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    trash: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fileImg: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" stroke-width="1.8"/><circle cx="8.5" cy="8.5" r="1.8" stroke="currentColor" stroke-width="1.8"/><path d="M21 16l-5-5-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    edit: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  function formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  /* ---------------------------------------------------------------------
     Toasts
     --------------------------------------------------------------------- */
  function toast(message, type) {
    var stack = $('#toast-stack');
    if (!stack) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' is-' + type : '');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function () {
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s ease';
      setTimeout(function () { el.remove(); }, 200);
    }, 3400);
  }

  /* ---------------------------------------------------------------------
     Modal genérico (formularios, confirmaciones)
     --------------------------------------------------------------------- */
  function openModal(html, opts) {
    opts = opts || {};
    var overlay = $('#modal-overlay');
    overlay.innerHTML = '<div class="modal' + (opts.wide ? ' modal-wide' : '') + '">' + html + '</div>';
    overlay.classList.add('is-open');
    on('.modal__close, .js-modal-cancel', 'click', closeModal, overlay);
    return overlay;
  }
  function closeModal() {
    var overlay = $('#modal-overlay');
    overlay.classList.remove('is-open');
    overlay.innerHTML = '';
  }
  function confirmDialog(opts, onConfirm) {
    var html =
      '<div class="modal__head"><div><h3>' + esc(opts.title) + '</h3>' +
      (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') + '</div></div>' +
      '<div class="modal__body">' + (opts.body || '') + '</div>' +
      '<div class="modal__foot">' +
      '<button class="btn btn-outline js-modal-cancel">' + esc(opts.cancelLabel || 'Cancelar') + '</button>' +
      '<button class="btn ' + (opts.danger ? 'btn-danger-outline' : 'btn-primary') + '" id="modal-confirm-btn">' + esc(opts.confirmLabel || 'Confirmar') + '</button>' +
      '</div>';
    var overlay = openModal(html);
    $('#modal-confirm-btn', overlay).addEventListener('click', function () {
      // Importante: leer el formulario ANTES de cerrar (closeModal vacía el DOM del modal).
      onConfirm && onConfirm();
      closeModal();
    });
    return overlay;
  }

  /* ---------------------------------------------------------------------
     Modal de pesaje / captura OCR (RF041–RF055)
     --------------------------------------------------------------------- */
  function openWeighModal(cfg, onConfirm) {
    var state = { photo: false, ocrDone: false, ocrValue: null, outOfService: false, timer: null, fileName: null };

    var html =
      '<div class="modal__head"><div><h3>' + esc(cfg.title) + '</h3>' +
      (cfg.subtitle ? '<p>' + esc(cfg.subtitle) + '</p>' : '') + '</div></div>' +
      '<div class="modal__body">' +
      (cfg.allowOutOfService ? (
        '<div class="capture-toggle">' +
        '<div><strong>Balanza fuera de servicio</strong><span id="oos-subtitle">Activa si la balanza no está disponible para registrar evidencia</span></div>' +
        '<label class="switch"><input type="checkbox" id="oos-toggle"><span class="switch-track"></span></label>' +
        '</div>'
      ) : '') +
      '<div id="capture-zone"></div>' +
      '<div id="ocr-result-zone"></div>' +
      '</div>' +
      '<div class="modal__foot">' +
      '<button class="btn btn-outline js-modal-cancel">Cancelar</button>' +
      '<button class="btn btn-primary" id="weigh-confirm-btn" disabled>Confirmar peso</button>' +
      '</div>';

    var overlay = openModal(html);
    var captureZone = $('#capture-zone', overlay);
    var resultZone = $('#ocr-result-zone', overlay);
    var confirmBtn = $('#weigh-confirm-btn', overlay);

    on('.js-modal-cancel', 'click', function () {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
    }, overlay);

    function renderCaptureUI(isEvidence) {
      state.outOfService = !!isEvidence;
      state.photo = false;
      state.ocrDone = false;
      state.ocrValue = null;
      state.fileName = null;
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      resultZone.innerHTML = '';
      confirmBtn.disabled = true;
      confirmBtn.textContent = isEvidence ? 'Confirmar evidencia' : 'Confirmar peso';

      var instruction = isEvidence
        ? '<span style="display:inline-block;background:#FEF3C7;color:#92400E;font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:4px;margin-bottom:6px;letter-spacing:.03em;">EVIDENCIA DE AUDITORÍA</span><br>Toma o sube una fotografía como EVIDENCIA de que la balanza está fuera de servicio.'
        : 'Encuadra el display de la balanza dentro de la guía y toma la fotografía.';

      var btnSimulateText = isEvidence ? 'Simular foto de evidencia' : 'Simular captura';

      captureZone.innerHTML =
        '<div class="display-frame' + (isEvidence ? ' is-evidence' : '') + '" id="display-frame">' +
        '<div class="display-frame__guide"></div>' +
        ICON.camera +
        '<p style="max-width:320px;margin:0 auto;">' + instruction + '</p>' +
        '<div class="capture-actions">' +
        '<button class="btn btn-primary btn-sm" id="btn-simulate">' + btnSimulateText + '</button>' +
        '<button class="btn btn-outline btn-sm" id="btn-upload">' + ICON.upload + ' Subir foto</button>' +
        '<input type="file" accept="image/*" class="hidden-file-input" id="file-input">' +
        '</div>' +
        '</div>';

      $('#btn-simulate', captureZone).addEventListener('click', function () {
        var defaultName = isEvidence ? 'evidencia_balanza_fueraservicio.jpg' : 'captura_display_balanza.jpg';
        runCapture(null, isEvidence, defaultName, 'Captura de cámara');
      });
      $('#btn-upload', captureZone).addEventListener('click', function () { $('#file-input', captureZone).click(); });
      $('#file-input', captureZone).addEventListener('change', function (e) {
        var file = e.target.files[0];
        if (!file) return;
        var sizeStr = formatFileSize(file.size);
        var reader = new FileReader();
        reader.onload = function (ev) {
          runCapture(ev.target.result, isEvidence, file.name, sizeStr);
        };
        reader.readAsDataURL(file);
      });
    }

    function runCapture(photoDataUrl, isEvidence, fileName, subText) {
      if (state.timer) { clearInterval(state.timer); state.timer = null; }
      state.photo = true;
      state.fileName = fileName || (isEvidence ? 'evidencia_balanza.jpg' : 'captura_display.jpg');
      var metaSub = subText ? (esc(subText) + ' · Archivo adjunto') : 'Fotografía adjunta';

      // En lugar de mostrar la previsualización fotográfica, mostramos la tarjeta con nombre del archivo y botón para quitarlo
      captureZone.innerHTML =
        '<div class="attached-file-box">' +
        '<div class="attached-file-info">' +
        '<div class="attached-file-icon' + (isEvidence ? ' is-evidence' : '') + '">' +
        (isEvidence ? ICON.camera : ICON.fileImg) +
        '</div>' +
        '<div class="attached-file-meta">' +
        '<div class="attached-file-name" title="' + esc(state.fileName) + '">' + esc(state.fileName) + '</div>' +
        '<div class="attached-file-sub">' + metaSub + '</div>' +
        '</div>' +
        '</div>' +
        '<button type="button" class="btn-remove-file" id="btn-remove-file" title="Quitar archivo adjunto">' +
        ICON.trash + '<span>Quitar</span>' +
        '</button>' +
        '</div>';

      $('#btn-remove-file', captureZone).addEventListener('click', function () {
        renderCaptureUI(isEvidence);
        toast('Archivo adjunto quitado.', 'info');
      });

      if (isEvidence) {
        resultZone.innerHTML =
          '<div class="evidence-box">' +
          '<div style="display:flex;align-items:center;gap:8px;font-weight:600;color:var(--navy-900);font-size:13.5px;">' +
          '<span class="ocr-check-badge">' + ICON.check + '</span>' +
          '<span>Fotografía de evidencia registrada</span>' +
          '</div>' +
          '<p class="form-hint" style="margin-top:6px;color:var(--gray-600);">Se ha registrado la evidencia fotográfica para auditoría certificando que la balanza está fuera de servicio. No se registrará pesaje.</p>' +
          '</div>';

        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Confirmar evidencia';
      } else {
        resultZone.innerHTML =
          '<div class="ocr-progress-box" id="ocr-progress-box">' +
          '<div class="ocr-progress-head">' +
          '<span class="ocr-progress-title" id="ocr-progress-title">Procesando captura con OCR...</span>' +
          '<span class="ocr-progress-pct" id="ocr-progress-pct">0%</span>' +
          '</div>' +
          '<div class="ocr-progress-track">' +
          '<div class="ocr-progress-bar" id="ocr-progress-bar" style="width:0%;"></div>' +
          '</div>' +
          '</div>';

        var bar = $('#ocr-progress-bar', resultZone);
        var pctText = $('#ocr-progress-pct', resultZone);
        var titleText = $('#ocr-progress-title', resultZone);
        var box = $('#ocr-progress-box', resultZone);
        var currentPct = 0;

        state.timer = setInterval(function () {
          currentPct += Math.floor(Math.random() * 14) + 8;
          if (currentPct >= 100) {
            currentPct = 100;
            clearInterval(state.timer);
            state.timer = null;
            bar.style.width = '100%';
            bar.classList.add('is-done');
            pctText.textContent = '100%';
            box.classList.add('is-done');
            titleText.innerHTML = '<span class="ocr-check-badge">' + ICON.check + '</span> Procesamiento OCR completado';
            setTimeout(function () {
              finishOcr();
            }, 350);
          } else {
            bar.style.width = currentPct + '%';
            pctText.textContent = currentPct + '%';
          }
        }, 70);
      }
    }

    function finishOcr() {
      var val = S.simulateWeight(cfg.kind);
      state.ocrDone = true;
      state.ocrValue = val;
      resultZone.innerHTML +=
        '<div class="ocr-result">' +
        '<div class="ocr-result__value-row">' +
        '<div class="field"><label>Valor reconocido (OCR)</label>' +
        '<div class="field-shell"><input type="number" id="ocr-value" class="plain" value="' + val + '" style="border:none;padding:11px 12px;"></div>' +
        '</div>' +
        '<div class="ocr-unit">kg</div>' +
        '</div>' +
        '<p class="form-hint">Revisa el valor contra el display fisico. Si no coincide, corrigelo antes de confirmar: el valor OCR original queda conservado para auditoria.</p>' +
        '<div class="ocr-manual-flag" id="manual-flag" style="display:none;">' + ICON.warn + ' Correccion manual registrada</div>' +
        '</div>';
      var input = $('#ocr-value', resultZone);
      input.addEventListener('input', function () {
        $('#manual-flag', resultZone).style.display = (Number(input.value) !== val) ? 'flex' : 'none';
      });
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Confirmar peso';
    }

    renderCaptureUI(false);

    if (cfg.allowOutOfService) {
      $('#oos-toggle', overlay).addEventListener('change', function (e) {
        if (state.timer) { clearInterval(state.timer); state.timer = null; }
        var sub = $('#oos-subtitle', overlay);
        if (e.target.checked) {
          if (sub) sub.textContent = 'Registrar fotografía como EVIDENCIA para auditoría';
          renderCaptureUI(true);
        } else {
          if (sub) sub.textContent = 'Activa si la balanza no está disponible para registrar evidencia';
          renderCaptureUI(false);
        }
      });
    }

    confirmBtn.addEventListener('click', function () {
      var isOOS = state.outOfService;
      var finalVal = isOOS ? null : state.ocrValue;
      var manual = false;
      var inputEl = $('#ocr-value', overlay);
      if (inputEl && !isOOS) {
        finalVal = Number(inputEl.value);
        manual = (finalVal !== state.ocrValue);
      }
      closeModal();
      onConfirm && onConfirm({
        value: finalVal,
        ocrValue: isOOS ? null : state.ocrValue,
        manual: manual,
        estimated: false,
        outOfService: isOOS,
        hasPhoto: state.photo,
        fileName: state.fileName
      });
    });
  }

  window.UI = {
    $: $, $all: $all, esc: esc, on: on, ICON: ICON,
    toast: toast, openModal: openModal, closeModal: closeModal,
    confirmDialog: confirmDialog, openWeighModal: openWeighModal
  };
})();
