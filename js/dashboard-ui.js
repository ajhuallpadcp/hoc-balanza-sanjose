/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   app.js — shell (parte 1/2): utilidades, iconos, modal de pesaje, navegación
   ========================================================================= */
(function(){
  "use strict";
  var S = window.Store;

  function $(sel, ctx){ return (ctx || document).querySelector(sel); }
  function $all(sel, ctx){ return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function esc(str){
    return String(str == null ? '' : str).replace(/[&<>"']/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function on(sel, evt, handler, ctx){
    $all(sel, ctx).forEach(function(el){ el.addEventListener(evt, handler); });
  }

  /* ---------------------------------------------------------------------
     Iconos SVG (trazo, 20x20 por defecto)
     --------------------------------------------------------------------- */
  var ICON = {
    home:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 4l8 7.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10v9.5h12V10" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M10 19.5v-6h4v6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    truck:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 7h11v9H3z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 10h4l3 3v3h-7z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="7.5" cy="18" r="1.6" stroke="currentColor" stroke-width="1.6"/><circle cx="17.5" cy="18" r="1.6" stroke="currentColor" stroke-width="1.6"/></svg>',
    tablet: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M11 18h2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    gate:   '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 10 21 6v3L3 13z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M6 12.3V20M18 8.6V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    users:  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8.5" r="3" stroke="currentColor" stroke-width="1.8"/><path d="M3.5 19c1-3 3-4.5 5.5-4.5S13.5 16 14.5 19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="17" cy="9" r="2.4" stroke="currentColor" stroke-width="1.7"/><path d="M15.3 14.2c2 .1 3.4 1.4 4.2 3.6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    plus:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    camera: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="13.2" r="3.3" stroke="currentColor" stroke-width="1.7"/></svg>',
    upload: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 15V4M12 4 7.5 8.5M12 4l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    check:  '<svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M4 12.5l5.5 5.5L20 6" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    x:      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    cloud:  '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M7 18a4.5 4.5 0 0 1-.6-8.96A5.5 5.5 0 0 1 17.4 8.1 4 4 0 0 1 17 16H7Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    bell:   '<svg width="17" height="17" viewBox="0 0 24 24" fill="none"><path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 14 6 10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    logout: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M14 8l4 4-4 4M8 12h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    warn:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 4 2 20h20L12 4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 10v4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="16.6" r="1" fill="currentColor"/></svg>',
    info:   '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="7.8" r="1" fill="currentColor"/></svg>',
    empty:  '<svg width="34" height="34" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M4 9h16" stroke="currentColor" stroke-width="1.5"/></svg>',
    swap:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    eye:    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2.6" stroke="currentColor" stroke-width="1.6"/></svg>',
    lock:   '<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="5" y="10.5" width="14" height="9.5" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 10.5V7.8a4 4 0 1 1 8 0v2.7" stroke="currentColor" stroke-width="1.7"/></svg>',
    userIco:'<svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z" stroke="currentColor" stroke-width="1.7"/><path d="M4 20c1.4-3.6 4.6-5.5 8-5.5s6.6 1.9 8 5.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>'
  };

  /* ---------------------------------------------------------------------
     Toasts
     --------------------------------------------------------------------- */
  function toast(message, type){
    var stack = $('#toast-stack');
    if(!stack) return;
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' is-' + type : '');
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(function(){
      el.style.opacity = '0';
      el.style.transition = 'opacity .2s ease';
      setTimeout(function(){ el.remove(); }, 200);
    }, 3400);
  }

  /* ---------------------------------------------------------------------
     Modal genérico (formularios, confirmaciones)
     --------------------------------------------------------------------- */
  function openModal(html, opts){
    opts = opts || {};
    var overlay = $('#modal-overlay');
    overlay.innerHTML = '<div class="modal' + (opts.wide ? ' modal-wide' : '') + '">' + html + '</div>';
    overlay.classList.add('is-open');
    on('.modal__close, .js-modal-cancel', 'click', closeModal, overlay);
    return overlay;
  }
  function closeModal(){
    var overlay = $('#modal-overlay');
    overlay.classList.remove('is-open');
    overlay.innerHTML = '';
  }
  function confirmDialog(opts, onConfirm){
    var html =
      '<div class="modal__head"><div><h3>' + esc(opts.title) + '</h3>' +
      (opts.subtitle ? '<p>' + esc(opts.subtitle) + '</p>' : '') + '</div>' +
      '<button class="modal__close">' + ICON.x + '</button></div>' +
      '<div class="modal__body">' + (opts.body || '') + '</div>' +
      '<div class="modal__foot">' +
        '<button class="btn btn-outline js-modal-cancel">Cancelar</button>' +
        '<button class="btn ' + (opts.danger ? 'btn-danger-outline' : 'btn-primary') + '" id="modal-confirm-btn">' + esc(opts.confirmLabel || 'Confirmar') + '</button>' +
      '</div>';
    var overlay = openModal(html);
    $('#modal-confirm-btn', overlay).addEventListener('click', function(){
      // Importante: leer el formulario ANTES de cerrar (closeModal vacía el DOM del modal).
      onConfirm && onConfirm();
      closeModal();
    });
    return overlay;
  }

  /* ---------------------------------------------------------------------
     Modal de pesaje / captura OCR (RF041–RF055)
     --------------------------------------------------------------------- */
  function openWeighModal(cfg, onConfirm){
    var state = { photo: false, ocrDone: false, ocrValue: null, estimated: false };

    var html =
      '<div class="modal__head"><div><h3>' + esc(cfg.title) + '</h3>' +
      (cfg.subtitle ? '<p>' + esc(cfg.subtitle) + '</p>' : '') + '</div>' +
      '<button class="modal__close">' + ICON.x + '</button></div>' +
      '<div class="modal__body">' +
        (cfg.allowOutOfService ? (
          '<div class="capture-toggle">' +
            '<div><strong>Balanza fuera de servicio</strong><span>Se aplicará un valor estimado por promedio histórico (RF052-RF053)</span></div>' +
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

    function renderCaptureUI(){
      captureZone.innerHTML =
        '<div class="display-frame" id="display-frame">' +
          '<div class="display-frame__guide"></div>' +
          ICON.camera +
          '<p>Encuadra el display de la balanza dentro de la guía y toma la fotografía.</p>' +
          '<div class="capture-actions">' +
            '<button class="btn btn-primary btn-sm" id="btn-simulate">Simular captura</button>' +
            '<button class="btn btn-outline btn-sm" id="btn-upload">' + ICON.upload + ' Subir foto</button>' +
            '<input type="file" accept="image/*" class="hidden-file-input" id="file-input">' +
          '</div>' +
        '</div>';
      $('#btn-simulate', captureZone).addEventListener('click', function(){ runCapture(null); });
      $('#btn-upload', captureZone).addEventListener('click', function(){ $('#file-input', captureZone).click(); });
      $('#file-input', captureZone).addEventListener('change', function(e){
        var file = e.target.files[0];
        if(!file) return;
        var reader = new FileReader();
        reader.onload = function(ev){ runCapture(ev.target.result); };
        reader.readAsDataURL(file);
      });
    }

    function runCapture(photoDataUrl){
      state.photo = true;
      var frame = $('#display-frame', captureZone);
      frame.classList.add('has-photo');
      frame.innerHTML = photoDataUrl
        ? '<img src="' + photoDataUrl + '" alt="Fotografia capturada del display">'
        : '<div style="color:#D8AC55;font-family:monospace;font-size:34px;letter-spacing:3px;">' + S.simulateWeight(cfg.kind) + '</div>';

      resultZone.innerHTML =
        '<ul class="preprocess-steps" id="steps">' +
          '<li data-s="0"><span class="dot">' + ICON.check + '</span> Recorte y correccion de orientacion</li>' +
          '<li data-s="1"><span class="dot">' + ICON.check + '</span> Escala de grises y ajuste de contraste</li>' +
          '<li data-s="2"><span class="dot">' + ICON.check + '</span> Binarizacion y reconocimiento OCR</li>' +
        '</ul>';
      var steps = $all('#steps li', resultZone);
      var i = 0;
      function stepNext(){
        if(i > 0) steps[i-1].classList.replace('is-active','is-done');
        if(i < steps.length){
          steps[i].classList.add('is-active');
          i++;
          setTimeout(stepNext, 480);
        } else {
          finishOcr();
        }
      }
      stepNext();
    }

    function finishOcr(){
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
          '<p class="form-hint">Revisa el valor contra el display fisico. Si no coincide, corrigelo antes de confirmar: el valor OCR original queda conservado para auditoria (RF045).</p>' +
          '<div class="ocr-manual-flag" id="manual-flag" style="display:none;">' + ICON.warn + ' Correccion manual registrada</div>' +
        '</div>';
      var input = $('#ocr-value', resultZone);
      input.addEventListener('input', function(){
        $('#manual-flag', resultZone).style.display = (Number(input.value) !== val) ? 'flex' : 'none';
      });
      confirmBtn.disabled = false;
    }

    function renderEstimatedUI(){
      var est = S.estimateWeight(cfg.kind);
      state.estimated = true;
      state.ocrValue = est;
      captureZone.innerHTML = '';
      if(cfg.hideEstimatedValue){
        resultZone.innerHTML =
          '<div class="estimated-note">' + ICON.lock +
          '<span>Balanza fuera de servicio: se aplicara automaticamente un valor estimado por promedio historico. Conforme al flujo definido para volquetes propios, el valor estimado no se muestra al conductor (RF055).</span></div>';
      } else {
        resultZone.innerHTML =
          '<div class="estimated-note">' + ICON.warn +
          '<span>Balanza fuera de servicio. Valor estimado por promedio historico:</span></div>' +
          '<div class="ocr-result__value-row" style="margin-top:12px;">' +
            '<div class="field"><label>Valor estimado</label>' +
              '<div class="field-shell"><input type="number" id="ocr-value" class="plain" value="' + est + '" style="border:none;padding:11px 12px;"></div>' +
            '</div><div class="ocr-unit">kg</div>' +
          '</div>' +
          '<p class="form-hint">El registro quedara identificado como <strong>Estimado</strong> para diferenciarlo de un pesaje real (RF054).</p>';
      }
      confirmBtn.disabled = false;
    }

    renderCaptureUI();

    if(cfg.allowOutOfService){
      $('#oos-toggle', overlay).addEventListener('change', function(e){
        confirmBtn.disabled = true;
        if(e.target.checked){ renderEstimatedUI(); }
        else { state.estimated = false; renderCaptureUI(); resultZone.innerHTML = ''; }
      });
    }

    confirmBtn.addEventListener('click', function(){
      var finalVal = state.ocrValue;
      var manual = false;
      var inputEl = $('#ocr-value', overlay);
      if(inputEl){
        finalVal = Number(inputEl.value);
        manual = !state.estimated && (finalVal !== state.ocrValue);
      }
      closeModal();
      onConfirm && onConfirm({
        value: finalVal,
        ocrValue: state.ocrValue,
        manual: manual,
        estimated: state.estimated,
        hasPhoto: state.photo
      });
    });
  }

  window.UI = {
    $: $, $all: $all, esc: esc, on: on, ICON: ICON,
    toast: toast, openModal: openModal, closeModal: closeModal,
    confirmDialog: confirmDialog, openWeighModal: openWeighModal
  };
})();
