/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   modules.js — pantallas de negocio (dashboard + 4 módulos operativos)
   ========================================================================= */
(function () {
  "use strict";
  var S = window.Store;
  var $ = UI.$, $all = UI.$all, esc = UI.esc, ICON = UI.ICON, toast = UI.toast;
  var openModal = UI.openModal, closeModal = UI.closeModal, confirmDialog = UI.confirmDialog, openWeighModal = UI.openWeighModal;

  function syncStatusFor(ref) {
    var item = S.syncQueue.find(function (i) { return i.referencia === ref; });
    return item ? item.status : 'sincronizado';
  }
  function syncBadge(status) {
    if (status === 'pendiente') return '<span class="badge badge-warning">' + ICON.cloud + ' Pendiente</span>';
    if (status === 'sincronizando') return '<span class="badge badge-info">' + ICON.cloud + ' Sincronizando</span>';
    if (status === 'error') return '<span class="badge badge-danger">Error</span>';
    return '<span class="badge badge-success">Sincronizado</span>';
  }
  function optionList(arr, current) {
    return arr.map(function (v) { return '<option value="' + esc(v) + '"' + (v === current ? ' selected' : '') + '>' + esc(v) + '</option>'; }).join('');
  }
  function fieldSel(label, id, options, extra) {
    return '<div><label class="form-label">' + esc(label) + '</label>' +
      '<select class="plain" id="' + id + '">' + options + '</select>' + (extra || '') + '</div>';
  }
  function fieldTxt(label, id, placeholder, value) {
    return '<div><label class="form-label">' + esc(label) + '</label>' +
      '<input class="plain" id="' + id + '" type="text" placeholder="' + esc(placeholder || '') + '" value="' + esc(value || '') + '"></div>';
  }

  /* -----------------------------------------------------------------------
     Lectura de balanza (OCR) vs. valor enviado por el conductor.
     El sistema siempre almacena el valor del OCR (w.ocrValue); el conductor puede
     editar el peso antes de confirmar (w.value, w.manual = true).
     ----------------------------------------------------------------------- */
  function ocrDe(w) { return !w ? null : w.ocrValue != null ? w.ocrValue : (w.manual || w.estimated ? null : w.value); }
  function fmtKg(v) { return v == null ? '—' : v.toLocaleString('es-PE') + ' kg'; }
  // rows: filas adicionales del pesaje [etiqueta, valor] (fecha y hora, descarga / carga)
  // ocultarEstimado: vista del conductor, que no ve el peso estimado ante balanza fuera de servicio
  function lecturaHtml(w, rows, ocultarEstimado) {
    if (!w) return '';
    var meta = (rows || []).map(function (r) {
      return '<div class="lect__row lect__row--meta"><span>' + ICON.calendar + esc(r[0]) + '</span><strong>' + esc(r[1]) + '</strong></div>';
    }).join('');
    if (w.outOfService) {
      if (ocultarEstimado || w.value == null) {
        return '<div class="lect is-oos"><div class="lect__note lect__note--oos">' + ICON.warn +
          '<span>Balanza fuera de servicio · sin lectura OCR. La foto queda como evidencia.</span></div>' + meta + '</div>';
      }
      return '<div class="lect is-oos">' +
        '<div class="lect__row lect__row--ocr"><span>' + ICON.scale + 'Lectura de balanza (OCR)</span><strong><em>Fuera de servicio</em></strong></div>' +
        '<div class="lect__row lect__row--drv"><span>' + ICON.warn + 'Peso estimado por el sistema</span><strong>' + esc(fmtKg(w.value)) + '</strong></div>' +
        meta +
        '<div class="lect__note lect__note--oos">' + ICON.warn + '<span>Balanza fuera de servicio: el peso fue estimado por el sistema.</span></div>' +
        '</div>';
    }
    var ocr = ocrDe(w);
    var editado = !!w.manual && ocr != null && w.value !== ocr;
    var note = '';
    if (w.estimated) {
      note = '<div class="lect__note lect__note--warn">' + ICON.warn + '<span>Peso estimado por el sistema (sin lectura de balanza).</span></div>';
    }
    return '<div class="lect' + (editado ? ' is-edited' : '') + '">' +
      '<div class="lect__row lect__row--ocr"><span>' + ICON.scale + 'Lectura de balanza (OCR)</span><strong>' + (ocr != null ? esc(fmtKg(ocr)) : '<em>Sin lectura</em>') + '</strong></div>' +
      '<div class="lect__row lect__row--drv"><span>' + ICON.userIco + (w.estimated ? 'Peso estimado' : 'Enviado por el conductor') + '</span><strong>' + esc(fmtKg(w.value)) + '</strong></div>' +
      meta + note + '</div>';
  }
  // Texto corto para pies de foto / lightbox
  function lecturaTxt(w, ocultarEstimado) {
    if (!w) return '';
    if (w.outOfService) return 'Evidencia · balanza fuera de servicio' + (!ocultarEstimado && w.value != null ? ' · Peso estimado ' + fmtKg(w.value) : '');
    var ocr = ocrDe(w);
    if (w.estimated) return 'Peso estimado ' + fmtKg(w.value);
    return 'OCR ' + fmtKg(ocr) + ' · Conductor ' + fmtKg(w.value);
  }

  function weighSummary(w) {
    if (!w) return '<span class="muted" style="color:var(--gray-400)">—</span>';
    if (w.outOfService) {
      return '<span class="badge badge-warning" title="Balanza fuera de servicio · Evidencia en auditoría">Fuera de servicio (Evidencia)</span>';
    }
    if (w.value == null) return '<span class="muted" style="color:var(--gray-400)">—</span>';
    var bits = [w.value.toLocaleString('es-PE') + ' kg'];
    return w.value.toLocaleString('es-PE') + ' kg' +
      (w.estimated ? ' <span class="badge badge-warning" style="margin-left:4px;">Estimado</span>' : '') +
      '';
  }

  /* =======================================================================
     DASHBOARD
     ======================================================================= */
  function renderDashboard(root) {
    if (S.role === 'garita') {
      var poolEnUso = S.tablets.filter(function (t) { return t.clas === 'pool' && (t.status === 'ocupado' || t.status === 'ocupada'); }).length;
      var poolSinAsociar = S.tablets.filter(function (t) { return t.clas === 'pool' && t.status === 'sin_asociar'; }).length;

      root.innerHTML =
        '<div class="kpi-grid">' +
        kpiCard('info', ICON.users, poolEnUso, 'Pool en uso', 'Tablets asignadas a estadías activas') +
        kpiCard('warning', ICON.tablet, poolSinAsociar, 'Pool sin asociar', 'Tablets libres para asignación') +
        '</div>';
      return;
    }

    var camionesPropios = S.tablets.filter(function (t) { return t.clas === 'fija'; }).length;
    var poolTerceros = S.tablets.filter(function (t) { return t.clas === 'pool'; }).length;
    var repuestos = S.tablets.filter(function (t) { return t.clas === 'repuesto'; }).length;
    var enMantenimiento = S.tablets.filter(function (t) { return t.status === 'danada' || t.status === 'mantenimiento'; }).length;

    root.innerHTML =
      '<div class="kpi-grid">' +
      kpiCard('info', ICON.truck, camionesPropios, 'Camión propio') +
      kpiCard('warning', ICON.users, poolTerceros, 'Pool de terceros') +
      kpiCard('success', ICON.tablet, repuestos, 'De repuesto') +
      kpiCard('danger', ICON.warn, enMantenimiento, 'Mantenimiento') +
      '</div>';
  }

  function kpiCard(tone, icon, value, label, sub) {
    var bg = tone === 'warning' ? 'var(--warning-bg)' : tone === 'info' ? 'var(--info-bg)' : tone === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)';
    var fg = tone === 'warning' ? 'var(--warning-fg)' : tone === 'info' ? 'var(--info-fg)' : tone === 'success' ? 'var(--success-fg)' : 'var(--danger-fg)';
    return '<div class="kpi-card"><div class="kpi-card__top"><div class="kpi-card__icon" style="background:' + bg + ';color:' + fg + ';">' + icon + '</div></div>' +
      '<div class="kpi-card__value">' + value + '</div><div class="kpi-card__label">' + esc(label) + '</div>' +
      (sub ? '<div class="kpi-card__sub" style="font-size:14px;color:var(--gray-500);margin-top:-2px;">' + esc(sub) + '</div>' : '') +
      '</div>';
  }

  /* =======================================================================
     MÓDULO 2 · MIS VIAJES (Conductor Propio)
     ======================================================================= */
  function renderMisViajes(root) {
    var t = S.turno;
    var hasOpenTicket = S.tickets.some(function (k) { return k.estado === 'Abierto'; });

    root.innerHTML =
      '<div class="grid-2">' +
      '<div class="card"><div class="card__head"><div><h3>Turno</h3><p>Identificación automática del camión</p></div></div>' +
      '<div class="card__body">' +
      '<div class="info-row"><span class="label">Conductor</span><span class="value">' + esc(S.users.propio.name) + '</span></div>' +
      '<div class="info-row"><span class="label">Camión asociado</span><span class="value">' + (t.camion ? esc(t.camion) : '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Turno</span><span class="value">' + (t.turnoNombre ? esc(t.turnoNombre) : '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Estado</span><span class="value">' + (t.activo ? '<span class="badge badge-success">Vigente</span>' : '<span class="badge badge-neutral">No iniciado</span>') + '</span></div>' +
      '<div style="margin-top:14px;">' +
      (!t.activo
        ? '<button class="btn btn-primary btn-block" id="btn-start-shift">Iniciar turno</button>'
        : '<button class="btn btn-outline btn-block" id="btn-end-shift"' + (hasOpenTicket ? ' disabled title="Existe un ticket abierto"' : '') + '>Cerrar turno</button>'
      ) +
      '</div>' +
      '</div></div>' +

      '<div class="card"><div class="card__head"><div><h3>Tara del camión</h3><p>Obligatoria antes de crear viajes</p></div></div>' +
      '<div class="card__body">' +
      (!t.activo ? '<div class="empty-state">' + ICON.empty + '<p>Inicia el turno para registrar la tara.</p></div>' :
        !t.tara ? (
          '<p style="font-size:15px;color:var(--gray-600);margin-bottom:14px;">Aún no se ha registrado la tara del turno vigente.</p>' +
          '<button class="btn btn-gold btn-block" id="btn-register-tara">Registrar tara</button>'
        ) : (
          '<div class="info-row"><span class="label">Valor confirmado</span><span class="value">' + weighSummary(t.tara) + '</span></div>' +
          '<div class="info-row"><span class="label">Registrada</span><span class="value">' + esc(t.tara.ts) + '</span></div>' +
          '<div class="info-row"><span class="label">Sincronización</span><span class="value">' + syncBadge(syncStatusFor('Tara ' + t.camion)) + '</span></div>'
        )
      ) +
      '</div></div>' +
      '</div>' +

      '<div class="card"><div class="card__head">' +
      '<div><h3>Mis viajes del turno</h3><p>Ticket de extracción</p></div>' +
      '<button class="btn btn-primary" id="btn-new-ticket"' + (!t.tara || hasOpenTicket ? ' disabled' : '') + '>' + ICON.plus + ' Nuevo viaje</button>' +
      '</div>' +
      // En tablet no hay tooltips: el motivo de un botón deshabilitado se muestra como texto visible
      (t.activo && (!t.tara || hasOpenTicket)
        ? '<p class="hint-bar">' + ICON.info + '<span>' + (!t.tara ? 'Registra la tara del camión para crear un viaje.' : 'Cierra el viaje abierto para crear uno nuevo.') + '</span></p>'
        : '') +
      '<div class="card__body">' +
      renderTicketsTable() +
      '</div></div>';

    attachMisViajesHandlers(root);
  }

  function renderTicketsTable() {
    if (S.tickets.length === 0) {
      return '<div class="empty-state">' + ICON.empty + '<p>No se han creado viajes en este turno todavía.</p></div>';
    }
    // Tarjetas táctiles (no tabla): en tablet la acción del siguiente paso siempre queda visible
    var dash = '<em>—</em>';
    var cards = S.tickets.map(function (k) {
      var action;
      if (!k.pesajeCargado) {
        action = '<button class="btn btn-gold js-ticket-cargado" data-id="' + k.id + '">' + ICON.scale + ' Registrar pesaje cargado</button>';
      } else if (!k.descarga) {
        action = '<button class="btn btn-gold js-ticket-descarga" data-id="' + k.id + '">' + ICON.check + ' Descarga y cierre</button>';
      } else {
        action = '<button class="btn btn-outline js-ticket-view" data-id="' + k.id + '">' + ICON.eye + ' Ver detalle</button>';
      }
      // El conductor no ve el peso estimado: si hubo balanza fuera de servicio el neto queda oculto
      var neto = k.neto != null && !ticketFueraServicio(k) ? esc(kgTxt(k.neto)) : dash;
      return '<article class="trip-card">' +
        '<div class="trip-card__head">' +
        '<strong>' + esc(k.id) + '</strong>' + ticketEstadoBadge(k) + syncBadge(syncStatusFor(k.id)) +
        '<span class="trip-card__route">' + esc(k.tipoMaterial) + ' · ' + esc(k.tolva) + ' → ' + esc(k.destino) + '</span>' +
        '</div>' +
        '<dl class="trip-card__data">' +
        '<div><dt>Pesaje cargado</dt><dd>' + weighSummary(k.pesajeCargado) + '</dd></div>' +
        '<div><dt>Peso neto</dt><dd>' + neto + '</dd></div>' +
        '<div><dt>Descarga</dt><dd>' + (k.descarga ? esc(k.descarga) : dash) + '</dd></div>' +
        '</dl>' +
        '<div class="trip-card__action">' + action + '</div>' +
        '</article>';
    }).join('');
    return '<div class="trip-list">' + cards + '</div>';
  }

  function attachMisViajesHandlers(root) {
    var btnStart = $('#btn-start-shift', root);
    if (btnStart) btnStart.addEventListener('click', function () {
      var h = new Date().getHours();
      var turnoNombre = (h >= 7 && h < 15) ? 'Turno Mañana' : (h >= 15 && h < 23) ? 'Turno Tarde' : 'Turno Noche';
      var html =
        '<div class="info-row"><span class="label">Turno asignado</span><span class="value"><strong>' + esc(turnoNombre) + '</strong></span></div>' +
        '<p class="form-hint" style="margin-top:10px;">Turno asignado automáticamente según la programación operativa.</p>';
      confirmDialog({ title: 'Iniciar turno', subtitle: 'Camión V-101 · ' + S.users.propio.name, body: html, confirmLabel: 'Iniciar turno' }, function () {
        S.turno.activo = true;
        S.turno.camion = 'V-101';
        S.turno.turnoNombre = turnoNombre;
        S.turno.iniciadoEn = S.nowStr();
        S.addActivity('Inicio de turno', S.turno.turnoNombre + ' · Camión V-101', 'ok');
        toast('Turno iniciado. Camión V-101 identificado automáticamente.', 'success');
        Shell.refreshCurrent();
      });
    });

    var btnEnd = $('#btn-end-shift', root);
    if (btnEnd) btnEnd.addEventListener('click', function () {
      confirmDialog({ title: 'Cerrar turno', body: '<p style="font-size:15.5px;color:var(--gray-600);">Se cerrará la operación del conductor para el turno vigente.</p>' }, function () {
        S.turno = { activo: false, camion: null, turnoNombre: null, tara: null, iniciadoEn: null };
        S.addActivity('Cierre de turno', 'Turno finalizado sin viajes pendientes', 'ok');
        toast('Turno cerrado.', 'success');
        Shell.refreshCurrent();
      });
    });

    var btnTara = $('#btn-register-tara', root);
    if (btnTara) btnTara.addEventListener('click', function () {
      openWeighModal({ title: 'Registrar tara', subtitle: 'Camión ' + S.turno.camion, kind: 'tara', allowOutOfService: true }, function (res) {
        S.applyFueraServicio(res, 'tara');
        res.ts = S.nowStr();
        S.turno.tara = res;
        S.enqueueSync('Tara', 'Tara ' + S.turno.camion);
        var actDet = res.outOfService ? ' · Balanza fuera de servicio (evidencia)' : ' · ' + res.value.toLocaleString('es-PE') + ' kg';
        S.addActivity('Tara registrada', 'Camión ' + S.turno.camion + actDet, 'ok');
        toast((res.outOfService ? 'Evidencia de balanza fuera de servicio registrada.' : 'Tara registrada.') + ' Ya puedes crear un nuevo viaje.', 'success');
        Shell.refreshCurrent();
      });
    });

    var btnNewTicket = $('#btn-new-ticket', root);
    if (btnNewTicket) btnNewTicket.addEventListener('click', openTicketForm);

    UI.on('.js-ticket-cargado', 'click', function () {
      var id = this.getAttribute('data-id');
      openWeighModal({ title: 'Pesaje cargado', subtitle: 'Ticket ' + id, kind: 'cargado', allowOutOfService: true, hideEstimatedValue: true }, function (res) {
        S.applyFueraServicio(res, 'cargado');
        res.ts = S.nowStr();
        var k = S.tickets.find(function (x) { return x.id === id; });
        k.pesajeCargado = res;
        var tara = k.tara || S.turno.tara;
        // Con balanza fuera de servicio el neto se calcula con el peso estimado (visible solo para el supervisor)
        k.neto = (res.value == null || !tara || tara.value == null) ? null : Math.max(0, res.value - tara.value);
        S.enqueueSync('Pesaje cargado', id);
        var actDet = res.outOfService ? ' · Balanza fuera de servicio (evidencia)' : (res.value != null ? ' · ' + res.value.toLocaleString('es-PE') + ' kg' : '');
        S.addActivity('Pesaje cargado', 'Ticket ' + id + actDet, 'ok');
        toast(res.outOfService ? 'Evidencia de balanza fuera de servicio registrada.' : 'Pesaje cargado registrado.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-ticket-descarga', 'click', function () {
      var id = this.getAttribute('data-id');
      confirmDialog({ title: 'Registrar descarga y cerrar ticket', subtitle: 'Ticket ' + id, body: '<p style="font-size:15.5px;color:var(--gray-600);">Se registrará la fecha y hora de descarga y el ticket pasará a estado Cerrado.</p>' }, function () {
        var k = S.tickets.find(function (x) { return x.id === id; });
        k.descarga = S.nowStr();
        // Balanza fuera de servicio (peso estimado): el ticket queda En mantenimiento para regularizar
        k.estado = ticketFueraServicio(k) ? 'En mantenimiento' : 'Cerrado';
        S.enqueueSync('Descarga', id);
        S.addActivity('Descarga y cierre', 'Ticket ' + id + (k.estado === 'Cerrado' ? ' cerrado' : ' en mantenimiento (balanza fuera de servicio)'), 'ok');
        toast(k.estado === 'Cerrado' ? 'Ticket cerrado correctamente.' : 'Descarga registrada. El ticket queda En mantenimiento por balanza fuera de servicio.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-ticket-view', 'click', function () {
      var id = this.getAttribute('data-id');
      openTicketDetail(S.tickets.find(function (x) { return x.id === id; }), { conductor: true });
    }, root);
  }

  function openTicketForm() {
    var c = S.catalogs;
    // Datos del turno: informativos y bloqueados (no editables por el conductor)
    var locked = function (label, id, value) {
      return '<div><label class="form-label" for="' + id + '">' + esc(label) + '</label>' +
        '<input class="plain is-locked" id="' + id + '" type="text" value="' + esc(value || '—') + '" readonly tabindex="-1" aria-readonly="true"></div>';
    };
    var html = '<div class="form-grid">' +
      locked('Camión', 'f-camion', S.turno.camion) +
      locked('Operador camión', 'f-opcamion', S.users.propio.name) +
      fieldSel('Tolva', 'f-tolva', optionList(c.tolvas)) +
      fieldSel('Labor', 'f-labor', optionList(c.labores)) +
      fieldSel('Nivel', 'f-nivel', optionList(c.niveles)) +
      fieldSel('Veta', 'f-veta', optionList(c.vetas)) +
      fieldSel('Zona', 'f-zona', optionList(c.zonas)) +
      fieldSel('Equipo Scoop', 'f-scoop', optionList(c.equiposScoop)) +
      fieldSel('Operador Scoop', 'f-opscoop', optionList(c.operadoresScoop)) +
      fieldSel('Tipo de material', 'f-material', optionList(c.tiposMaterial)) +
      fieldSel('Punto intermedio / bocamina', 'f-punto', optionList(c.puntosIntermedios)) +
      fieldSel('Destino', 'f-destino', optionList(c.destinos)) +
      '</div>';
    confirmDialog({ title: 'Nuevo viaje · Ticket de extracción', body: html, confirmLabel: 'Crear ticket' }, function () {
      var now = new Date();
      var k = {
        id: S.genTicketId($('#f-material').value),
        fecha: S.todayStr(),
        horaCarguio: String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0'),
        turno: S.turno.turnoNombre, camion: S.turno.camion, operadorCamion: S.users.propio.name, tara: S.turno.tara,
        veta: $('#f-veta').value, zona: $('#f-zona').value,
        tolva: $('#f-tolva').value, labor: $('#f-labor').value, nivel: $('#f-nivel').value,
        equipoScoop: $('#f-scoop').value, operadorScoop: $('#f-opscoop').value,
        tipoMaterial: $('#f-material').value, puntoIntermedio: $('#f-punto').value, destino: $('#f-destino').value,
        estado: 'Abierto', pesajeCargado: null, descarga: null, neto: null
      };
      S.tickets.unshift(k);
      S.enqueueSync('Ticket de extracción', k.id);
      S.addActivity('Ticket creado', k.id + ' · ' + k.tipoMaterial + ' → ' + k.destino, 'ok');
      toast('Ticket ' + k.id + ' creado en estado Abierto.', 'success');
      Shell.refreshCurrent();
    });
  }

  /* =======================================================================
     MÓDULO 3 · ADMINISTRACIÓN DE TABLETS
     ======================================================================= */
  var CLAS_LABEL = { fija: 'Camión propio', pool: 'Pool de terceros', repuesto: 'Repuesto' };
  var STATUS_BADGE = {
    sin_asociar: '<span class="badge badge-warning">Sin asociar</span>',
    ocupado: '<span class="badge badge-info">Ocupado</span>',
    ocupada: '<span class="badge badge-info">Ocupado</span>',
    danada: '<span class="badge badge-danger">En mantenimiento</span>',
    mantenimiento: '<span class="badge badge-danger">En mantenimiento</span>'
  };

  var tabletFilters = { estado: '', desde: '', hasta: '' };

  // dd/mm/yyyy -> yyyy-mm-dd (comparable con los inputs de fecha)
  function tabletDateIso(s) {
    var p = (s || '').split('/');
    return p.length === 3 ? p[2] + '-' + p[1] + '-' + p[0] : '';
  }

  /* -----------------------------------------------------------------------
     Barra de filtros compartida (estado + rango de fechas) y paginación.
     Se usa en Administración de Tablets, Garita e Historial de pesajes (este último sin fechas).
     ----------------------------------------------------------------------- */
  // Estado del calendario de rango (borrador hasta pulsar "Aplicar rango")
  var filterCal = { draftFrom: '', draftTo: '', month: new Date().getMonth(), year: new Date().getFullYear() };
  var MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  function isoLocal(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  // yyyy-mm-dd -> dd/mm/yyyy
  function isoToDisplay(s) {
    var p = (s || '').split('-');
    return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : '';
  }
  function isoInRange(d, f) {
    if (f.desde && d < f.desde) return false;
    if (f.hasta && d > f.hasta) return false;
    return true;
  }

  // opts: { title, subtitle, ctaId, ctaLabel, segments:[{id,label,dot,count}], filters, dateLabel, results }
  function renderFilterToolbar(opts) {
    var f = opts.filters;
    var segments = opts.segments.map(function (s) {
      var sel = s.id === f.estado;
      return '<button type="button" class="flt-segment' + (sel ? ' is-selected' : '') + '" data-estado="' + s.id + '" aria-pressed="' + sel + '">' +
        (s.dot ? '<span class="flt-dot flt-dot--' + s.dot + '"></span>' : '') +
        esc(s.label) + ' <span class="flt-count">' + s.count + '</span></button>';
    }).join('');
    var hasRange = !!(f.desde || f.hasta);
    var rangeLabel = hasRange ? (f.desde ? isoToDisplay(f.desde) : 'Inicio') + ' – ' + (f.hasta ? isoToDisplay(f.hasta) : 'Fin') : opts.dateLabel;

    return '<div class="filter-tools">' +
      '<div class="filter-toolhead">' +
      '<div><h3>' + esc(opts.title) + '</h3><p>' + esc(opts.subtitle) + '</p></div>' +
      (opts.ctaId
        ? '<button class="btn btn-primary enroll-cta" id="' + opts.ctaId + '"><span class="enroll-cta__plus" aria-hidden="true">' + (opts.ctaIcon || ICON.plus) + '</span> ' + esc(opts.ctaLabel) + '</button>'
        : (opts.headExtra || '')) +
      '</div>' +
      '<div class="filter-bar">' +
      '<div class="flt-segments" role="group" aria-label="Filtrar por estado">' + segments + '</div>' +
      '<div class="flt-dates">' +
      (opts.hideDates ? (opts.barExtra || '') : '<div class="flt-datepop">' +
      '<button type="button" class="btn btn-outline flt-date-trigger' + (hasRange ? ' is-active' : '') + '" id="flt-date-trigger" aria-expanded="false" aria-controls="flt-cal">' +
      '<span class="flt-date-trigger__label">' + ICON.calendar + '<span>' + esc(rangeLabel) + '</span></span>' + ICON.chevronDown + '</button>' +
      '<div class="flt-cal" id="flt-cal" hidden>' +
      '<div class="flt-cal__title">Seleccionar rango de fechas</div>' +
      '<div class="flt-cal__summary" id="flt-cal-summary"></div>' +
      '<div class="flt-cal__divider"></div>' +
      '<div class="flt-cal__month"><strong id="flt-cal-month"></strong><div class="flt-cal__nav">' +
      '<button type="button" id="flt-cal-prev" aria-label="Mes anterior">‹</button><button type="button" id="flt-cal-next" aria-label="Mes siguiente">›</button></div></div>' +
      '<div class="flt-cal__weekdays"><span>D</span><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span></div>' +
      '<div class="flt-cal__days" id="flt-cal-days"></div>' +
      '<div class="flt-cal__hint" id="flt-cal-hint"></div>' +
      '<div class="flt-cal__quick"><button type="button" data-period="today">Hoy</button><button type="button" data-period="week">Últimos 7 días</button><button type="button" data-period="month">Últimos 30 días</button></div>' +
      '<div class="flt-cal__actions"><button type="button" class="btn btn-outline btn-sm" id="flt-cal-reset">Quitar rango</button><button type="button" class="btn btn-primary btn-sm" id="flt-cal-apply">Aplicar rango</button></div>' +
      '</div></div>') +
      '<button type="button" class="btn btn-outline flt-clear" id="flt-clear">↺ Limpiar filtros</button>' +
      '</div></div>' +
      '<div class="filter-results">' + esc(opts.results) + '</div>' +
      '</div>';
  }

  // Ajusta pager.page al rango válido y devuelve la porción de la lista a mostrar
  function paginate(list, pager) {
    var pages = Math.max(1, Math.ceil(list.length / pager.size));
    pager.page = Math.min(Math.max(1, pager.page), pages);
    var start = (pager.page - 1) * pager.size;
    return list.slice(start, start + pager.size);
  }

  function renderPagination(total, pager, noun) {
    var size = pager.size;
    var pages = Math.max(1, Math.ceil(total / size));
    var page = pager.page;
    var start = (page - 1) * size;
    var info = total ? 'Mostrando <strong>' + (start + 1) + '–' + Math.min(start + size, total) + '</strong> de <strong>' + total + '</strong> ' + noun : 'Mostrando 0 de 0 ' + noun;
    var sizeOpts = [5, 10, 20].map(function (n) {
      return '<option value="' + n + '"' + (n === size ? ' selected' : '') + '>' + n + '</option>';
    }).join('');
    var btns = '<button type="button" class="pager" data-page="' + (page - 1) + '" aria-label="Página anterior"' + (page === 1 ? ' disabled' : '') + '>‹</button>';
    for (var i = 1; i <= pages; i++) {
      btns += '<button type="button" class="pager' + (i === page ? ' is-active' : '') + '" data-page="' + i + '"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
    }
    btns += '<button type="button" class="pager" data-page="' + (page + 1) + '" aria-label="Página siguiente"' + (page === pages ? ' disabled' : '') + '>›</button>';
    return '<div class="filter-pagination">' +
      '<label class="page-size" for="flt-page-size">Filas por página <select id="flt-page-size">' + sizeOpts + '</select></label>' +
      '<span class="pagination-info" aria-live="polite">' + info + '</span>' +
      '<nav class="page-controls" aria-label="Paginación">' + btns + '</nav>' +
      '</div>';
  }

  // Conecta segmentos, calendario, limpiar filtros y paginación. filters y pager se mutan en sitio.
  function attachFilterToolbar(root, filters, pager) {
    function refresh() { Shell.refreshCurrent(); }

    UI.on('.flt-segment', 'click', function () {
      filters.estado = this.getAttribute('data-estado');
      pager.page = 1;
      refresh();
    }, root);

    var trigger = $('#flt-date-trigger', root);
    var panel = $('#flt-cal', root);
    var cal = filterCal;
    if (trigger) attachDateRange();

    // Calendario de rango (se omite cuando la barra se renderiza con hideDates)
    function attachDateRange() {

    function renderCalendar() {
      $('#flt-cal-month', root).textContent = MONTHS_ES[cal.month] + ' ' + cal.year;
      $('#flt-cal-summary', root).textContent = cal.draftFrom && cal.draftTo
        ? isoToDisplay(cal.draftFrom) + ' – ' + isoToDisplay(cal.draftTo)
        : cal.draftFrom ? 'Desde ' + isoToDisplay(cal.draftFrom) + ' · Elige fin' : 'Selecciona una fecha de inicio';
      $('#flt-cal-hint', root).textContent = cal.draftFrom && !cal.draftTo
        ? 'Ahora selecciona el último día del rango.'
        : 'Selecciona el primer día y luego el último.';
      var first = new Date(cal.year, cal.month, 1).getDay();
      var days = new Date(cal.year, cal.month + 1, 0).getDate();
      var today = isoLocal(new Date());
      var html = new Array(first + 1).join('<span></span>');
      for (var i = 1; i <= days; i++) {
        var d = cal.year + '-' + String(cal.month + 1).padStart(2, '0') + '-' + String(i).padStart(2, '0');
        var cls = [];
        if (cal.draftFrom && cal.draftTo && d > cal.draftFrom && d < cal.draftTo) cls.push('in-range');
        if (d === cal.draftFrom) cls.push('range-start');
        if (d === cal.draftTo) cls.push('range-end');
        if (d === today) cls.push('today');
        html += '<button type="button" class="' + cls.join(' ') + '" data-day="' + d + '" aria-label="' + isoToDisplay(d) + '" aria-pressed="' + (d === cal.draftFrom || d === cal.draftTo) + '">' + i + '</button>';
      }
      $('#flt-cal-days', root).innerHTML = html;
    }
    function shiftMonth(n) {
      var d = new Date(cal.year, cal.month + n, 1);
      cal.year = d.getFullYear(); cal.month = d.getMonth();
      renderCalendar();
    }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
      trigger.setAttribute('aria-expanded', String(!panel.hidden));
      if (!panel.hidden) {
        cal.draftFrom = filters.desde;
        cal.draftTo = filters.hasta;
        var ref = filters.desde || isoLocal(new Date());
        cal.year = Number(ref.slice(0, 4)); cal.month = Number(ref.slice(5, 7)) - 1;
        renderCalendar();
      }
    });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var day = e.target.closest('[data-day]');
      if (!day) return;
      var d = day.getAttribute('data-day');
      if (!cal.draftFrom || cal.draftTo) { cal.draftFrom = d; cal.draftTo = ''; }
      else if (d < cal.draftFrom) { cal.draftTo = cal.draftFrom; cal.draftFrom = d; }
      else { cal.draftTo = d; }
      renderCalendar();
    });
    $('#flt-cal-prev', root).addEventListener('click', function () { shiftMonth(-1); });
    $('#flt-cal-next', root).addEventListener('click', function () { shiftMonth(1); });
    UI.on('[data-period]', 'click', function () {
      var end = new Date(), start = new Date(end);
      var p = this.getAttribute('data-period');
      if (p === 'week') start.setDate(start.getDate() - 6);
      if (p === 'month') start.setDate(start.getDate() - 29);
      cal.draftFrom = isoLocal(start); cal.draftTo = isoLocal(end);
      cal.year = end.getFullYear(); cal.month = end.getMonth();
      renderCalendar();
    }, panel);
    $('#flt-cal-apply', root).addEventListener('click', function () {
      if (cal.draftFrom && !cal.draftTo) cal.draftTo = cal.draftFrom;
      filters.desde = cal.draftFrom;
      filters.hasta = cal.draftTo;
      pager.page = 1;
      refresh();
    });
    $('#flt-cal-reset', root).addEventListener('click', function () {
      filters.desde = ''; filters.hasta = '';
      pager.page = 1;
      refresh();
    });
    }
    // Cierre al hacer clic fuera o con Escape (se registra una sola vez)
    if (!attachFilterToolbar.globalBound) {
      attachFilterToolbar.globalBound = true;
      var closeIfOpen = function () {
        var p = document.getElementById('flt-cal');
        if (p && !p.hidden) { p.hidden = true; document.getElementById('flt-date-trigger').setAttribute('aria-expanded', 'false'); }
      };
      document.addEventListener('click', closeIfOpen);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeIfOpen(); });
    }

    $('#flt-clear', root).addEventListener('click', function () {
      filters.estado = ''; filters.desde = ''; filters.hasta = '';
      if ('q' in filters) filters.q = '';
      pager.page = 1;
      refresh();
    });

    $('#flt-page-size', root).addEventListener('change', function () {
      pager.size = Number(this.value);
      pager.page = 1;
      refresh();
    });
    UI.on('.pager', 'click', function () {
      if (this.disabled) return;
      pager.page = Number(this.getAttribute('data-page'));
      refresh();
    }, root);
  }

  var tabletPager = { page: 1, size: 5 };
  var TABLET_SEGMENTS = [
    { id: '', label: 'Todos', dot: '' },
    { id: 'ocupado', label: 'Ocupado', dot: 'info' },
    { id: 'sin_asociar', label: 'Sin asociar', dot: 'warning' },
    { id: 'mantenimiento', label: 'En mantenimiento', dot: 'danger' }
  ];

  function tabletEstado(t) {
    return (t.status === 'ocupada') ? 'ocupado' : (t.status === 'danada') ? 'mantenimiento' : t.status;
  }

  function tabletMatchesDates(t) {
    return isoInRange(tabletDateIso(t.since), tabletFilters);
  }

  function tabletMatchesFilters(t) {
    if (tabletFilters.estado && tabletEstado(t) !== tabletFilters.estado) return false;
    return tabletMatchesDates(t);
  }

  function renderTablets(root) {
    // Los contadores respetan el rango de fechas aplicado
    var inRange = S.tablets.filter(tabletMatchesDates);
    var total = S.tablets.filter(tabletMatchesFilters).length;

    root.innerHTML =
      '<div class="card filter-card">' +
      renderFilterToolbar({
        title: 'Dispositivos registrados',
        subtitle: 'Filtra por estado y fecha de enrolamiento',
        ctaId: 'btn-enroll',
        ctaLabel: 'Enrolar tablet',
        filters: tabletFilters,
        dateLabel: 'Fecha de enrolamiento',
        results: total + ' de ' + S.tablets.length + ' dispositivos',
        segments: TABLET_SEGMENTS.map(function (s) {
          return { id: s.id, label: s.label, dot: s.dot, count: s.id ? inRange.filter(function (t) { return tabletEstado(t) === s.id; }).length : inRange.length };
        })
      }) +
      '<div class="card__body" id="tablets-table-body" style="padding:0;">' + renderTabletsTable() + '</div>' +
      renderPagination(total, tabletPager, 'tablets') +
      '</div>';

    attachTabletsHandlers(root);
  }

  function renderTabletsTable() {
    var list = S.tablets.filter(tabletMatchesFilters);
    if (!list.length) {
      tabletPager.page = 1;
      return '<div style="padding:28px 20px;text-align:center;color:var(--gray-500);font-size:15.5px;">No hay tablets que coincidan con los filtros seleccionados.</div>';
    }
    list = paginate(list, tabletPager);
    var rows = list.map(function (t) {
      var primaryAction = '';
      if (t.camion) {
        primaryAction = '<button class="btn btn-table-danger btn-sm js-deassoc" data-id="' + t.id + '">Desasociar</button>';
      } else if (t.clas === 'fija' && !t.camion) {
        primaryAction = '<button class="btn btn-outline btn-sm js-assoc" data-id="' + t.id + '">Asociar camión</button>';
      } else if (t.clas === 'repuesto' && !t.camion) {
        primaryAction = '<button class="btn btn-outline btn-sm js-repuesto" data-id="' + t.id + '">Asignar como repuesto</button>';
      }

      var primarySlot = primaryAction
        ? '<div class="row-action-slot">' + primaryAction + '</div>'
        : '<div class="row-action-slot row-action-slot--empty"><span class="action-dash" title="Sin acción operativa asignada">—</span></div>';

      var camionDisplay = t.camion;
      if (!camionDisplay && t.clas === 'pool') {
        var est = S.estadias.find(function (x) { return x.tabletId === t.id && x.estado === 'activa'; });
        if (est) {
          camionDisplay = est.placa;
          t.camion = est.placa;
        }
      }

      var canReclasificar = (t.status === 'sin_asociar' && !t.camion && !camionDisplay);
      var reclasTitle = 'Cambiar clasificación';
      var disabledAttr = '';
      if (!canReclasificar) {
        disabledAttr = ' disabled';
        if (t.status === 'mantenimiento' || t.status === 'danada') {
          reclasTitle = 'Debe reparar y desasociar la tablet antes de cambiar su clasificación';
        } else {
          reclasTitle = 'Debe desasociar la tablet antes de cambiar su clasificación';
        }
      }

      var editBtn = '<div class="row-action-slot"><button class="btn btn-subtle-clas js-edit-clas" data-id="' + t.id + '"' + disabledAttr + ' title="' + esc(reclasTitle) + '">' +
        ICON.edit + '<span>Editar</span></button></div>';

      return '<tr>' +
        '<td><strong>' + t.id + '</strong><br><span class="muted" style="color:var(--gray-500);font-size:14px;">' + esc(t.code || t.id) + '</span></td>' +
        '<td>' + esc(CLAS_LABEL[t.clas]) + '</td>' +
        '<td class="text-center">' + (camionDisplay ? esc(camionDisplay) : '<span class="muted" style="color:var(--gray-400)">—</span>') + '</td>' +
        '<td class="text-center">' + (STATUS_BADGE[t.status] || t.status) + '</td>' +
        '<td class="text-center muted" style="color:var(--gray-500);">' + esc(t.since) + '</td>' +
        '<td class="text-center"><div class="row-actions row-actions--tablets">' + primarySlot + editBtn + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Dispositivo</th><th>Clasificación</th><th class="text-center">Patente</th><th class="text-center">Estado</th><th class="text-center">Enrolada</th><th class="th-actions text-center">Acciones</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function openChangeClasModal(t) {
    var clasOptions = [
      { id: 'fija', label: 'Camión propio' },
      { id: 'pool', label: 'Pool de terceros' },
      { id: 'repuesto', label: 'Repuesto' }
    ];
    var optionsHtml = clasOptions.map(function (opt) {
      return '<option value="' + opt.id + '"' + (opt.id === t.clas ? ' selected' : '') + '>' + opt.label + (opt.id === t.clas ? ' (actual)' : '') + '</option>';
    }).join('');

    var infoBanner =
      '<div style="display:flex;align-items:center;justify-content:space-between;background:var(--gray-50);border:1px solid var(--gray-200);border-radius:var(--radius-sm);padding:11px 14px;margin-bottom:14px;">' +
      '<div>' +
      '<div style="font-size:13px;font-weight:700;letter-spacing:.04em;color:var(--gray-500);text-transform:uppercase;">Clasificación actual</div>' +
      '<div style="font-size:15.5px;font-weight:600;color:var(--navy-900);margin-top:2px;">' + esc(CLAS_LABEL[t.clas]) + '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<div style="font-size:13px;font-weight:700;letter-spacing:.04em;color:var(--gray-500);text-transform:uppercase;">Estado operativo</div>' +
      '<div style="margin-top:2px;">' + (STATUS_BADGE[t.status] || t.status) + '</div>' +
      '</div>' +
      '</div>';

    var truckNotice = '';
    if (t.camion) {
      truckNotice =
        '<div style="font-size:14.5px;color:var(--navy-800);background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius-sm);padding:9px 12px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">' +
        ICON.truck +
        '<span>Actualmente vinculada al camión propio <strong>' + esc(t.camion) + '</strong>.</span>' +
        '</div>';
    }

    var busyNotice = '';
    if (t.status === 'ocupada' || t.status === 'ocupado') {
      busyNotice =
        '<div class="pin-warning-box" style="margin-bottom:14px;">' +
        ICON.warn +
        '<div><strong>Dispositivo en uso</strong><p>Esta tablet se encuentra actualmente ocupada en una operación activa. Al cambiar su clasificación, se desvinculará de su asignación actual.</p></div>' +
        '</div>';
    }

    var html =
      infoBanner +
      truckNotice +
      busyNotice +
      '<div class="form-grid" style="grid-template-columns:1fr;">' +
      '<div>' +
      '<label class="form-label" for="f-new-clas">Nueva clasificación</label>' +
      '<select class="plain" id="f-new-clas">' + optionsHtml + '</select>' +
      '</div>' +
      '</div>' +
      '<div id="clas-feedback-box" style="margin-top:12px;padding:11px 13px;background:#f8fafc;border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14.5px;line-height:1.45;color:var(--gray-600);">' +
      '</div>';

    var overlay = confirmDialog({
      title: 'Cambiar clasificación de tablet',
      subtitle: t.id + ' · ' + (t.code || t.id),
      body: html,
      confirmLabel: 'Guardar cambios'
    }, function () {
      var selectEl = $('#f-new-clas', overlay);
      if (!selectEl) return;
      var newClas = selectEl.value;

      if (newClas === t.clas) {
        toast('La clasificación se mantiene como ' + CLAS_LABEL[t.clas] + '.', 'info');
        return;
      }

      var oldClas = t.clas;
      var prevCamion = t.camion;

      // Desvincular camión si lo tenía asignado
      if (t.camion) {
        t.camion = null;
      }

      // Si era tablet del pool asignada a una estadía activa de Garita, desvincularla de la estadía
      if (oldClas === 'pool') {
        var activeEst = S.estadias.find(function (e) { return e.tabletId === t.id && e.estado === 'activa'; });
        if (activeEst) activeEst.tabletId = null;
      }

      // Asignar nueva clasificación y estado correspondiente
      t.clas = newClas;
      t.status = 'sin_asociar';

      // Registro en historial de tablets y actividad
      var det = t.id + ' (' + (t.code || t.id) + ') reclasificada de ' + CLAS_LABEL[oldClas] + ' a ' + CLAS_LABEL[newClas];
      if (prevCamion) {
        det += ' · desasociada de ' + prevCamion;
      }
      if (S.tabletHistory) {
        S.tabletHistory.unshift({ ts: S.nowStr(), detalle: det, usuario: S.users.admin.name });
      }
      S.addActivity('Reclasificación tablet', det, 'ok');
      S.enqueueSync('Reclasificación tablet', t.id);

      toast('Tablet ' + t.id + ' reclasificada como ' + CLAS_LABEL[newClas] + '.', 'success');
      Shell.refreshCurrent();
    });

    var selectEl = $('#f-new-clas', overlay);
    var feedbackBox = $('#clas-feedback-box', overlay);
    if (selectEl && feedbackBox) {
      function updateFeedback() {
        var val = selectEl.value;
        if (val === t.clas) {
          feedbackBox.innerHTML = '<span style="color:var(--gray-500);">Sin cambios: se conserva la clasificación actual (<strong>' + esc(CLAS_LABEL[t.clas]) + '</strong>).</span>';
          return;
        }
        var msg = '';
        var disassocWarning = t.camion ? '<br><span style="color:#b45309;font-weight:600;">⚠ Se desasociará automáticamente del camión ' + esc(t.camion) + '.</span>' : '';
        if (val === 'fija') {
          msg = '<strong style="color:var(--navy-900);">Camión propio:</strong> El dispositivo quedará configurado para operar fijo en un volquete de la compañía. Su estado pasará a <em>Sin asociar</em> hasta vincularlo a una patente.' + disassocWarning;
        } else if (val === 'pool') {
          msg = '<strong style="color:var(--navy-900);">Pool de terceros:</strong> El dispositivo se integrará al pool de Garita para asignarse temporalmente a transportistas terceros durante su estadía.' + disassocWarning;
        } else if (val === 'repuesto') {
          msg = '<strong style="color:var(--navy-900);">Repuesto:</strong> El dispositivo pasará a reserva de contingencia para sustituir tablets que entren en mantenimiento o falla operativa.' + disassocWarning;
        }
        feedbackBox.innerHTML = msg;
      }
      selectEl.addEventListener('change', updateFeedback);
      updateFeedback();
    }
  }

  function attachTabletsHandlers(root) {
    $('#btn-enroll', root).addEventListener('click', function () {
      var nextDevId = S.genTabletId();
      var html = '<div class="form-grid">' +
        fieldTxt('Identificador único', 'f-devid', '', nextDevId) +
        fieldTxt('Código visible', 'f-code', 'Ej. TAB-31') +
        fieldSel('Clasificación', 'f-clas', '<option value="fija">Camión propio</option><option value="pool">Pool de terceros</option><option value="repuesto">Repuesto</option>') +
        '</div>';
      confirmDialog({ title: 'Enrolar tablet', body: html, confirmLabel: 'Enrolar' }, function () {
        var clas = $('#f-clas').value;
        var devId = ($('#f-devid').value || '').trim();
        if (!devId) {
          toast('El identificador único no puede estar vacío.', 'error');
          return;
        }
        if (S.tablets.some(function (t) { return t.id === devId; })) {
          toast('El identificador ' + devId + ' ya está registrado en el parque de tablets.', 'error');
          return;
        }
        var code = ($('#f-code').value || '').trim() || devId;
        var t = {
          id: devId,
          code: code,
          clas: clas,
          camion: null,
          status: 'sin_asociar',
          since: S.todayStr ? S.todayStr() : '23/09/2026'
        };
        S.tablets.push(t);
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: t.id + ' (' + t.code + ') enrolada como ' + CLAS_LABEL[clas], usuario: S.users.admin.name });
        toast('Tablet ' + t.id + ' enrolada correctamente.', 'success');
        Shell.refreshCurrent();
      });
    });

    UI.on('.js-assoc', 'click', function () {
      var id = this.getAttribute('data-id');
      var html = '<div class="form-grid">' + fieldTxt('Patente', 'f-camion', 'Ej. V-108') + '</div>';
      confirmDialog({ title: 'Asociar tablet a camión', subtitle: id, body: html, confirmLabel: 'Asociar' }, function () {
        var placa = ($('#f-camion').value || '').trim().toUpperCase();
        if (!placa) { toast('Ingresa la patente del camión.', 'error'); return; }
        if (S.tabletFor(placa)) { toast('La patente ' + placa + ' ya cuenta con una tablet fija asociada.', 'error'); return; }
        var t = S.tablets.find(function (x) { return x.id === id; });
        t.camion = placa;
        t.status = 'ocupado';
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: id + ' asociada de forma fija a ' + t.camion, usuario: S.users.admin.name });
        toast('Asociación creada correctamente.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-deassoc', 'click', function () {
      var id = this.getAttribute('data-id');
      var t = S.tablets.find(function (x) { return x.id === id; });
      if (!t) return;

      var isMantenimiento = (t.status === 'mantenimiento' || t.status === 'danada');
      var camion = t.camion || '';

      var modalTitle = isMantenimiento ? 'Desasociar tablet en mantenimiento' : 'Desasociar tablet';
      var modalSubtitle = id + (camion ? ' · ' + camion : '');

      var modalBody = isMantenimiento
        ? '<div style="display:flex;flex-direction:column;gap:12px;">' +
          '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius-sm);padding:12px 14px;font-size:15px;color:#1e40af;line-height:1.45;">' +
          'Al continuar, se confirmará que la tablet ya fue reparada y se encuentra operativa.' +
          '</div>' +
          '<p style="font-size:15.5px;color:var(--gray-700);margin:0;line-height:1.55;">' +
          (camion
            ? 'La tablet <strong>' + esc(id) + '</strong> se desvinculará del camión <strong>' + esc(camion) + '</strong> y cambiará automáticamente al estado <strong>Sin asociar</strong>, quedando disponible para ser asignada nuevamente a un camión.'
            : 'La tablet <strong>' + esc(id) + '</strong> cambiará automáticamente al estado <strong>Sin asociar</strong>, quedando disponible para ser asignada nuevamente a un camión.') +
          '</p>' +
          '</div>'
        : '<p style="font-size:15.5px;color:var(--gray-700);line-height:1.55;">' +
          'La tablet <strong>' + esc(id) + '</strong> se desvinculará del camión <strong>' + esc(camion) + '</strong> y cambiará automáticamente al estado <strong>Sin asociar</strong>, quedando disponible para ser asignada nuevamente a un camión.' +
          '</p>';

      confirmDialog({
        title: modalTitle,
        subtitle: modalSubtitle,
        body: modalBody,
        danger: true,
        confirmLabel: 'Desasociar'
      }, function () {
        var prevCamion = t.camion;
        t.camion = null;
        t.status = 'sin_asociar';

        if (t.clas === 'pool') {
          var est = S.estadias.find(function (e) { return e.tabletId === t.id && e.estado === 'activa'; });
          if (est) est.tabletId = null;
        }

        var detalle = isMantenimiento
          ? id + ' (' + (t.code || id) + ') reparada y desasociada de ' + prevCamion + ' · Estado: Sin asociar'
          : id + ' (' + (t.code || id) + ') desasociada de ' + prevCamion + ' · Estado: Sin asociar';

        if (S.tabletHistory) {
          S.tabletHistory.unshift({ ts: S.nowStr(), detalle: detalle, usuario: S.users.admin.name });
        }
        S.addActivity('Tablet desasociada', detalle, 'ok');
        S.enqueueSync('Desasociación tablet', id);

        var toastMsg = isMantenimiento
          ? 'Tablet ' + id + ' reparada y desasociada. Queda en estado Sin asociar.'
          : 'Tablet ' + id + ' desasociada correctamente.';
        toast(toastMsg, 'info');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-repuesto', 'click', function () {
      var id = this.getAttribute('data-id');
      var afectables = S.camionesPropios.filter(function (c) {
        return S.tablets.some(function (t) {
          return t.camion === c && (t.status === 'ocupado' || t.status === 'ocupada');
        });
      });
      if (afectables.length === 0) {
        toast('No hay camiones propios con tablet activa para aplicar contingencia.', 'error');
        return;
      }
      var html = '<div class="form-grid">' + fieldSel('Camión propio afectado', 'f-camion-rep', optionList(afectables)) + '</div>' +
        '<div id="repuesto-info-box" style="margin-top:10px;padding:11px 13px;background:#f8fafc;border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:14.5px;line-height:1.45;color:var(--gray-600);"></div>';

      var overlay = confirmDialog({ title: 'Asignar tablet de repuesto', subtitle: id, body: html, confirmLabel: 'Asignar' }, function () {
        var camion = $('#f-camion-rep', overlay).value;

        // La tablet que actualmente está activa y operando para ese camión pasa a mantenimiento
        var tabletActiva = S.tablets.find(function (x) {
          return x.camion === camion && (x.status === 'ocupado' || x.status === 'ocupada');
        });
        if (tabletActiva) {
          tabletActiva.status = 'mantenimiento';
        }

        var rep = S.tablets.find(function (x) { return x.id === id; });
        rep.status = 'ocupado';
        rep.camion = camion;

        var det = id + ' asignada como repuesto a ' + camion + ' (contingencia)';
        if (tabletActiva) {
          det += ' · ' + tabletActiva.id + ' pasó a En mantenimiento';
        }
        if (S.tabletHistory) {
          S.tabletHistory.unshift({ ts: S.nowStr(), detalle: det, usuario: S.users.admin.name });
        }
        S.addActivity('Repuesto asignado', det, 'ok');
        S.enqueueSync('Asignación repuesto', id);

        toast('Tablet de repuesto ' + id + ' asignada a ' + camion + '.', 'success');
        Shell.refreshCurrent();
      });

      var sel = $('#f-camion-rep', overlay);
      var infoBox = $('#repuesto-info-box', overlay);
      if (sel && infoBox) {
        function updateRepInfo() {
          var c = sel.value;
          var act = S.tablets.find(function (x) { return x.camion === c && (x.status === 'ocupado' || x.status === 'ocupada'); });
          var enMant = S.tablets.filter(function (x) { return x.camion === c && (x.status === 'mantenimiento' || x.status === 'danada'); });
          var txt = '';
          if (act) {
            txt += '<span style="color:var(--navy-900);font-weight:600;">Tablet activa a sustituir:</span> ' + act.id + ' (' + (act.code || act.id) + ') · Pasará a <strong>En mantenimiento</strong>.';
          }
          if (enMant.length > 0) {
            var ids = enMant.map(function (m) { return m.id; }).join(', ');
            txt += '<br><span style="color:var(--gray-500);font-size:14px;">Historial del camión: ' + ids + ' ya en mantenimiento (se conservan para trazabilidad).</span>';
          }
          infoBox.innerHTML = txt;
        }
        sel.addEventListener('change', updateRepInfo);
        updateRepInfo();
      }
    }, root);

    UI.on('.js-edit-clas', 'click', function () {
      if (this.disabled) return;
      var id = this.getAttribute('data-id');
      var t = S.tablets.find(function (x) { return x.id === id; });
      if (!t) return;
      if (t.status !== 'sin_asociar' || t.camion) {
        toast('Solo se puede editar una tablet cuando está en estado Sin asociar.', 'error');
        return;
      }
      openEditTabletModal(t);
    }, root);

    attachFilterToolbar(root, tabletFilters, tabletPager);
  }

  function openEditTabletModal(t) {
    var clasOpts = ['fija', 'pool', 'repuesto'].map(function (c) {
      return '<option value="' + c + '"' + (c === t.clas ? ' selected' : '') + '>' + CLAS_LABEL[c] + '</option>';
    }).join('');
    var html = '<div class="form-grid">' +
      fieldTxt('Identificador único', 'f-devid', '', t.id) +
      fieldTxt('Código visible', 'f-code', 'Ej. TAB-31', t.code) +
      fieldSel('Clasificación', 'f-clas', clasOpts) +
      '</div>';
    var overlay = confirmDialog({ title: 'Editar tablet', subtitle: t.id + ' · ' + (t.code || t.id), body: html, confirmLabel: 'Guardar cambios' }, function () {
      var devId = ($('#f-devid', overlay).value || '').trim();
      var code = ($('#f-code', overlay).value || '').trim() || devId;
      var clas = $('#f-clas', overlay).value;
      if (!devId) {
        toast('El identificador único no puede estar vacío.', 'error');
        return;
      }
      if (devId !== t.id && S.tablets.some(function (x) { return x.id === devId; })) {
        toast('El identificador ' + devId + ' ya está registrado en el parque de tablets.', 'error');
        return;
      }
      if (devId === t.id && code === t.code && clas === t.clas) {
        toast('No se realizaron cambios.', 'info');
        return;
      }
      var cambios = [];
      if (devId !== t.id) cambios.push('ID ' + t.id + ' → ' + devId);
      if (code !== t.code) cambios.push('código ' + (t.code || '—') + ' → ' + code);
      if (clas !== t.clas) cambios.push('clasificación ' + CLAS_LABEL[t.clas] + ' → ' + CLAS_LABEL[clas]);
      var oldId = t.id;
      t.id = devId;
      t.code = code;
      t.clas = clas;
      var det = oldId + ' editada: ' + cambios.join(' · ');
      if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: det, usuario: S.users.admin.name });
      S.addActivity('Edición tablet', det, 'ok');
      S.enqueueSync('Edición tablet', t.id);
      toast('Tablet ' + t.id + ' actualizada correctamente.', 'success');
      Shell.refreshCurrent();
    });
  }

  /* =======================================================================
     MÓDULO 4 · GARITA
     ======================================================================= */
  var garitaFilters = { estado: '', desde: '', hasta: '' };
  var garitaPager = { page: 1, size: 5 };
  var GARITA_SEGMENTS = [
    { id: '', label: 'Todas', dot: '' },
    { id: 'activa', label: 'Activa', dot: 'info' },
    { id: 'mantenimiento', label: 'En mantenimiento', dot: 'danger' },
    { id: 'cerrada', label: 'Cerrada', dot: 'success' }
  ];
  var ESTADIA_ESTADO = {
    activa: { label: 'Activa', badge: 'badge-info' },
    mantenimiento: { label: 'En mantenimiento', badge: 'badge-danger' },
    cerrada: { label: 'Cerrada', badge: 'badge-success' }
  };
  function estadiaBadge(e) {
    var st = ESTADIA_ESTADO[e.estado] || ESTADIA_ESTADO.activa;
    return '<span class="badge ' + st.badge + '">' + st.label + '</span>';
  }

  // Fecha de ingreso en yyyy-mm-dd (ingresoEn solo guarda dd/mm hh:mm)
  function estadiaDateIso(e) {
    if (e.ingresoIso) return e.ingresoIso;
    var m = String(e.ingresoEn || '').match(/^(\d{2})\/(\d{2})/);
    return m ? new Date().getFullYear() + '-' + m[2] + '-' + m[1] : '';
  }
  function estadiaMatchesDates(e) {
    return isoInRange(estadiaDateIso(e), garitaFilters);
  }
  function estadiaMatchesFilters(e) {
    if (garitaFilters.estado && e.estado !== garitaFilters.estado) return false;
    return estadiaMatchesDates(e);
  }

  function renderGarita(root, opts) {
    // Desde el menú se vuelve siempre a la grilla; los refrescos internos conservan la estadía abierta
    if (!(opts && opts.refresh)) garitaDetailId = null;
    if (garitaDetailId) {
      var abierto = S.estadias.find(function (x) { return x.id === garitaDetailId; });
      if (abierto) { renderGaritaTicket(root, abierto); return; }
      garitaDetailId = null;
    }
    var inRange = S.estadias.filter(estadiaMatchesDates);
    var total = S.estadias.filter(estadiaMatchesFilters).length;

    root.innerHTML =
      '<div class="card filter-card">' +
      renderFilterToolbar({
        title: 'Estadías de terceros',
        subtitle: 'Filtra por estado y fecha de ingreso',
        ctaId: 'btn-new-entry',
        ctaLabel: 'Registrar ingreso',
        filters: garitaFilters,
        dateLabel: 'Fecha de ingreso',
        results: total + ' de ' + S.estadias.length + ' estadías',
        segments: GARITA_SEGMENTS.map(function (s) {
          return { id: s.id, label: s.label, dot: s.dot, count: s.id ? inRange.filter(function (e) { return e.estado === s.id; }).length : inRange.length };
        })
      }) +
      '<div class="card__body" style="padding:0;">' + renderEstadiasTable() + '</div>' +
      renderPagination(total, garitaPager, 'estadías') +
      '</div>';
    attachGaritaHandlers(root);
  }

  function renderEstadiasTable() {
    if (S.estadias.length === 0) {
      garitaPager.page = 1;
      return '<div class="empty-state">' + ICON.empty + '<p>No hay vehículos de terceros registrados todavía.</p></div>';
    }
    var lista = S.estadias.filter(estadiaMatchesFilters);
    if (lista.length === 0) {
      garitaPager.page = 1;
      return '<div style="padding:28px 20px;text-align:center;color:var(--gray-500);font-size:15.5px;">No hay estadías que coincidan con los filtros seleccionados.</div>';
    }
    var rows = paginate(lista, garitaPager).map(function (e) {
      var tablet = e.tabletId ? S.tablets.find(function (t) { return t.id === e.tabletId; }) : null;
      var tabletCell = tablet ? '<span class="badge badge-neutral">' + esc(tablet.code || tablet.id) + '</span>' : (e.estado === 'cerrada' ? '<span class="tablet-empty">Sin tablet</span>' : '<button class="btn btn-outline btn-sm js-assign-tablet" data-id="' + e.id + '">Asignar tablet</button>');
      var cerrada = e.estado === 'cerrada';

      // Acción primaria según el estado de la estadía
      var primary;
      if (e.estado === 'activa') {
        primary = '<button class="btn btn-outline btn-sm row-primary js-exit" data-id="' + e.id + '"' +
          (!tablet ? ' disabled title="Asigna una tablet primero (columna Tablet)"' : '') + '>Registrar salida</button>';
      } else if (e.estado === 'mantenimiento') {
        primary = '<button class="btn btn-outline btn-sm row-primary js-reactivar" data-id="' + e.id + '">Reactivar</button>';
      } else {
        primary = '<span class="row-primary row-primary--empty" title="Estadía cerrada · sin acciones pendientes">—</span>';
      }

      // Acciones secundarias en menú ⋮
      var menuItems = '<button type="button" role="menuitem" class="row-menu__item js-show-pin" data-id="' + e.id + '">' + ICON.lock + '<span>Mostrar PIN</span></button>' +
        '<button type="button" role="menuitem" class="row-menu__item js-estadia-edit" data-id="' + e.id + '"' +
        (cerrada ? ' disabled title="La estadía está cerrada y ya no se puede editar"' : '') + '>' + ICON.edit + '<span>Editar</span></button>';
      if (e.estado === 'mantenimiento') {
        menuItems += '<button type="button" role="menuitem" class="row-menu__item js-exit" data-id="' + e.id + '"' +
          (!tablet ? ' disabled title="Asigna una tablet primero"' : '') + '>' + ICON.logout + '<span>Registrar salida</span></button>';
      }
      var overflow = '<div class="row-menu">' +
        '<button type="button" class="row-menu__toggle js-row-menu" aria-haspopup="menu" aria-expanded="false" aria-label="Más acciones" title="Más acciones">' + ICON.dots + '</button>' +
        '<div class="row-menu__panel" role="menu" hidden>' + menuItems + '</div>' +
        '</div>';
      return '<tr>' +
        '<td style="white-space:nowrap;"><span class="cell-main"><strong>' + esc(e.id) + '</strong></span><span class="cell-sub">' + esc(e.placa) + '</span></td>' +
        '<td><span class="cell-main">' + esc(e.empresa) + '</span><span class="cell-sub">' + esc(e.conductor) + '</span></td>' +
        '<td class="text-center">' + tabletCell + '</td>' +
        '<td class="text-center">' + e.viajes.length + '</td>' +
        '<td class="text-center">' + estadiaBadge(e) + '</td>' +
        '<td class="text-center"><div class="row-actions row-actions--garita">' +
        '<button class="icon-btn js-estadia-view" data-id="' + e.id + '" title="Ver detalle de la estadía" aria-label="Ver detalle de la estadía ' + esc(e.id) + '">' + ICON.eye + '</button>' +
        primary + overflow + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Estadía / Patente</th><th>Empresa / Conductor</th><th class="text-center">Tablet</th><th class="text-center">Tickets</th><th class="text-center">Estado</th><th class="th-actions th-actions--garita text-center">Acciones</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }


  /* -----------------------------------------------------------------------
     Garita · Vista de detalle de la estadía de tercero (pantalla completa)
     Una estadía puede tener varios tickets: se listan en tarjetas y cada ticket
     abre su detalle (hoja inferior en móvil) con las fotos de sus pesajes.
     ----------------------------------------------------------------------- */
  var garitaDetailId = null; // id de la estadía abierta (null = grilla)

  function viajeEstadoBadge(v) {
    return v.estado === 'Cerrado' ? '<span class="badge badge-success">Cerrado</span>' : '<span class="badge badge-info">En curso</span>';
  }
  function viajePesajes(v) {
    var entradaEst = v.sentido || null;
    var salidaEst = entradaEst ? estadoSalida(entradaEst) : null;
    return { entradaEst: entradaEst, salidaEst: salidaEst, entrada: entradaEst ? v[entradaEst] : null, salida: salidaEst ? v[salidaEst] : null };
  }
  function pesoCorto(w) {
    if (!w) return '<em>—</em>';
    if (w.outOfService) return '<span class="badge badge-warning">Fuera de servicio</span>';
    if (w.value == null) return '<em>—</em>';
    return esc(kgTxt(w.value));
  }
  function horaDe(w) { return w && w.ts ? String(w.ts).slice(-5) : ''; }
  /* -----------------------------------------------------------------------
     Tarjeta de pesaje estandarizada (Garita · detalle de viaje y
     Supervisor / Mis Viajes · detalle de ticket): título, foto ampliable,
     lectura OCR vs. valor del conductor y datos propios del pesaje.
     ----------------------------------------------------------------------- */
  // Foto del pesaje: la imagen real subida por el conductor o el display simulado de la balanza.
  // ref = { id, camion, fecha (dd/mm/aaaa) } para el sello de la foto; kind = 'tara' | 'cargado'
  function fotoPesaje(w, ref, kind) {
    if (!w) return '';
    if (w.photoUrl) return '<img class="tkd-photo__img" src="' + esc(w.photoUrl) + '" alt="Foto del pesaje">';
    var pseudo = { id: ref.id, camion: ref.camion, fecha: ref.fecha || '', horaCarguio: '', tara: w, pesajeCargado: w };
    return balanzaPhotoSvg(pseudo, kind);
  }
  // o = { title, w, photo (html), key (para ampliar), empty (texto sin pesaje), extra: [[etiqueta, valor], ...] }
  function pesajeCard(o) {
    if (!o.w) {
      return '<section class="pc"><h4>' + esc(o.title) + '</h4>' +
        '<div class="tkd-photo tkd-photo--empty">' + ICON.camera + '<p>' + esc(o.empty || 'Sin pesaje registrado.') + '</p></div></section>';
    }
    var rows = [['Fecha y hora', o.w.ts || '—']].concat(o.extra || []);
    return '<section class="pc"><h4>' + esc(o.title) + '</h4>' +
      '<button type="button" class="tkd-photo__main js-pc-zoom" data-key="' + esc(o.key) + '" title="Ampliar foto">' + o.photo +
      '<span class="tkd-photo__zoom">' + ICON.eye + (o.w.outOfService ? ' Ver evidencia' : ' Ampliar') + '</span></button>' +
      lecturaHtml(o.w, rows, o.ocultarEstimado) + '</section>';
  }
  // estimado: el neto se calculó con un peso estimado (balanza fuera de servicio)
  function pesajeNeto(neto, sinNeto, estimado) {
    return '<div class="tkd-weight tkd-weight--net pc-net"><span>Peso neto' + (estimado && neto != null ? ' <span class="badge badge-warning" style="margin-left:4px;">Estimado</span>' : '') + '</span><strong>' +
      (neto != null ? esc(kgTxt(neto)) : esc(sinNeto || '—')) + '</strong>' +
      '</div>';
  }
  // zooms: { key: { photo: html, caption: texto } }
  function bindPesajeZoom(overlay, zooms) {
    UI.on('.js-pc-zoom', 'click', function () {
      var z = zooms[this.getAttribute('data-key')];
      if (z) openPhotoLightbox(z.photo, z.caption);
    }, overlay);
  }

  function renderGaritaTicket(root, e) {
    var tablet = e.tabletId ? S.tablets.find(function (t) { return t.id === e.tabletId; }) : null;

    $('#topbar-title').textContent = 'Estadía ' + e.id;
    $('#topbar-subtitle').textContent = 'Garita · detalle de la estadía y sus tickets';

    var fields = [
      ['Empresa', e.empresa], ['Tipo de carga / material', e.tipoCarga || '—'],
      ['Patente', e.placa], ['Patente secundaria', e.placaSecundaria || '—'],
      ['Conductor', e.conductor], ['Documento', e.documento || '—'],
      ['Destino / sector', e.destino || '—'], ['Tablet asignada', tablet ? (tablet.code || tablet.id) : '—'],
      ['Ingreso', e.ingresoEn || '—'], ['Salida', e.salidaEn || '—']
    ];
    var total = e.viajes.length;
    var trips = total ? e.viajes.map(function (v, i) {
      var p = viajePesajes(v);
      var netoTxt = v.neto != null ? esc(kgTxt(v.neto)) : '<em>—</em>';
      return '<button type="button" class="gtk-trip js-gtk-trip" data-id="' + esc(v.id) + '" aria-label="Ver detalle del ticket ' + esc(v.id) + '">' +
        '<span class="gtk-trip__head"><strong>Ticket ' + esc(v.id) + '</strong>' + viajeEstadoBadge(v) + '</span>' +
        '<span class="gtk-trip__w"><small>Entrada' + (p.entradaEst ? ' · ' + ESTADO_PESAJE[p.entradaEst] : '') + (horaDe(p.entrada) ? ' · ' + esc(horaDe(p.entrada)) : '') + '</small><b>' + pesoCorto(p.entrada) + '</b></span>' +
        '<span class="gtk-trip__w"><small>Salida' + (p.salidaEst ? ' · ' + ESTADO_PESAJE[p.salidaEst] : '') + (horaDe(p.salida) ? ' · ' + esc(horaDe(p.salida)) : '') + '</small><b>' + pesoCorto(p.salida) + '</b></span>' +
        '<span class="gtk-trip__net"><small>Neto</small><strong>' + netoTxt + '</strong></span>' +
        '<span class="gtk-trip__chev" aria-hidden="true">›</span>' +
        '</button>';
    }).join('') : '<div class="empty-state">' + ICON.empty + '<p>Aún no se han registrado tickets en esta estadía.</p></div>';

    root.innerHTML =
      '<div class="gtk">' +
      '<button type="button" class="gtk-back js-gtk-back">‹ Volver a Garita</button>' +
      '<section class="card gtk-head">' +
      '<div class="gtk-head__top"><div>' +
      '<span class="gtk-eyebrow">Estadía de tercero</span><h2>' + esc(e.id) + '</h2></div>' + estadiaBadge(e) + '</div>' +
      '<div class="gtk-data__grid">' + fields.map(function (f) {
        return '<div class="tkd-field"><span>' + esc(f[0]) + '</span><strong>' + esc(f[1]) + '</strong></div>';
      }).join('') + '</div>' +
      '</section>' +
      '<div class="gtk-section-head"><h3>Tickets</h3><span>' + total + ' ticket' + (total === 1 ? '' : 's') + ' · del más reciente al más antiguo</span></div>' +
      '<div class="gtk-trips">' + trips + '</div>' +
      '</div>';

    $('.js-gtk-back', root).addEventListener('click', function () {
      garitaDetailId = null;
      Shell.refreshCurrent();
      scrollContentTop();
    });
    UI.on('.js-gtk-trip', 'click', function () {
      var id = this.getAttribute('data-id');
      openViajeDetail(e, e.viajes.find(function (v) { return v.id === id; }));
    }, root);
  }

  function scrollContentTop() {
    var c = $('#content');
    if (c) c.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function openViajeDetail(e, v) {
    if (!v) return;
    var p = viajePesajes(v);
    var ref = { id: e.id, camion: e.placa, fecha: '01/01/' + ((e.ingresoIso || '').slice(0, 4) || new Date().getFullYear()) };
    var oosEntrada = p.entrada && p.entrada.outOfService;
    var zooms = {};
    function card(lado, w, est, empty, extra) {
      var titulo = 'Pesaje de ' + lado + (est ? ' · ' + ESTADO_PESAJE[est] : '');
      var photo = fotoPesaje(w, ref, est === 'vacio' ? 'tara' : 'cargado');
      if (w) zooms[lado] = { photo: photo, caption: 'Estadía ' + e.id + ' · Ticket ' + v.id + ' · ' + titulo + ' · ' + (w.ts || '') + ' · ' + lecturaTxt(w) };
      return pesajeCard({ title: titulo, w: w, photo: photo, key: lado, empty: empty, extra: extra });
    }
    var html =
      '<div class="modal__head"><div><h3>Ticket ' + esc(v.id) + '</h3>' +
      '<p>Estadía ' + esc(e.id) + ' · ' + esc(e.placa) + '</p></div>' +
      '<div class="tkd-head-badges">' + viajeEstadoBadge(v) + syncBadge(syncStatusFor(v.id)) + '</div></div>' +
      '<div class="modal__body"><div class="pc-wrap">' +
      '<div class="pc-grid">' +
      card('entrada', p.entrada, p.entradaEst, 'Sin pesaje de entrada.') +
      card('salida', p.salida, p.salidaEst, oosEntrada ? 'Sin pesaje de salida: la balanza estaba fuera de servicio.' : 'Sin pesaje de salida.') +
      '</div>' +
      pesajeNeto(v.neto) +
      '</div></div>' +
      '<div class="modal__foot"><button class="btn btn-outline js-modal-cancel">Cerrar</button></div>';

    var overlay = openModal(html);
    $('.modal', overlay).classList.add('modal-viaje');
    bindPesajeZoom(overlay, zooms);
  }

  function attachGaritaHandlers(root) {
    $('#btn-new-entry', root).addEventListener('click', function () {
      var c = S.catalogs;
      var html = '<div class="form-grid">' +
        fieldSel('Empresa', 'f-empresa', optionList(c.empresasTerceros)) +
        fieldSel('Tipo de carga / material', 'f-carga', optionList(c.tiposCargaTerceros)) +
        fieldTxt('Patente', 'f-placa', 'Ej. ABC-123') +
        fieldTxt('Patente secundaria', 'f-placa-sec', 'Ej. XYZ-456') +
        fieldTxt('Conductor', 'f-conductor', 'Nombre del conductor') +
        fieldTxt('Documento', 'f-documento', 'DNI o N° de documento') +
        fieldSel('Destino / sector', 'f-destino', optionList(c.destinosSector)) +
        '</div>';
      confirmDialog({ title: 'Registrar ingreso de vehículo de tercero', body: html, confirmLabel: 'Crear estadía' }, function () {
        var placa = ($('#f-placa').value || 'S/PATENTE').toUpperCase();
        var pin = String(Math.floor(1000 + Math.random() * 9000));
        var e = {
          id: S.genEstadiaId(), empresa: $('#f-empresa').value, tipoCarga: $('#f-carga').value,
          placa: placa, placaSecundaria: ($('#f-placa-sec').value || '').trim().toUpperCase(),
          conductor: $('#f-conductor').value || 'Sin registrar',
          documento: $('#f-documento').value || '—',
          pin: pin,
          destino: $('#f-destino').value,
          tabletId: null, viajes: [], estado: 'activa', ingresoEn: S.nowStr(), ingresoIso: isoLocal(new Date())
        };
        S.estadias.unshift(e);
        S.enqueueSync('Ingreso de tercero', e.id + ' · ' + placa);
        S.addActivity('Ingreso registrado', e.id + ' · ' + placa + ' · ' + e.empresa, 'ok');
        toast('Estadía ' + e.id + ' registrada para ' + placa + '. PIN de acceso: ' + pin + '.', 'success');
        Shell.refreshCurrent();
      });
    });

    UI.on('.js-assign-tablet', 'click', function () {
      var id = this.getAttribute('data-id');
      var e = S.estadias.find(function (x) { return x.id === id; });
      var libres = S.poolAvailable();
      if (libres.length === 0) { toast('No hay tablets sin asociar en el pool de terceros.', 'error'); return; }
      var html = '<div class="form-grid">' + fieldSel('Tablet del pool', 'f-tablet', optionList(libres.map(function (t) { return t.code || t.id; }))) + '</div>' +
        '<p class="form-hint" style="margin-top:8px;">Solo se listan tablets clasificadas como pool de terceros y en estado Sin asociar.</p>';
      confirmDialog({ title: 'Asignar tablet temporal', subtitle: e ? e.placa : '', body: html, confirmLabel: 'Asignar' }, function () {
        var code = $('#f-tablet').value;
        var tablet = S.tablets.find(function (t) { return t.code === code || t.id === code; });
        tablet.status = 'ocupado';
        tablet.camion = e.placa;
        e.tabletId = tablet.id;
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: (tablet.code || tablet.id) + ' asignada temporalmente a patente ' + e.placa + ' (' + e.id + ')', usuario: S.users.garita.name });
        S.addActivity('Tablet asignada', (tablet.code || tablet.id) + ' → ' + e.placa, 'ok');
        toast('Tablet ' + (tablet.code || tablet.id) + ' asignada. El conductor ya puede operar el módulo de Terceros.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-exit', 'click', function () {
      var id = this.getAttribute('data-id');
      var e = S.estadias.find(function (x) { return x.id === id; });
      var incompleto = e.viajes.find(function (v) { return v.estado !== 'Cerrado'; });
      if (incompleto) {
        toast('No se puede cerrar: el ticket ' + incompleto.id + ' está incompleto.', 'error');
        return;
      }
      confirmDialog({ title: 'Registrar salida', subtitle: e.placa, body: '<p style="font-size:15.5px;color:var(--gray-600);">Se cerrará la estadía y la tablet asignada pasará automáticamente al estado Sin asociar en el pool.</p>' }, function () {
        e.estado = 'cerrada'; e.salidaEn = S.nowStr();
        var tablet = S.tablets.find(function (t) { return t.id === e.tabletId; });
        if (tablet) {
          tablet.status = 'sin_asociar';
          tablet.camion = null;
        }
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: (tablet ? tablet.id : '') + ' desasociada automáticamente al cerrar ' + e.id, usuario: 'Sistema' });
        S.enqueueSync('Salida de tercero', e.placa);
        S.addActivity('Salida registrada', e.id + ' · ' + e.placa + ' · estadía cerrada', 'ok');
        toast('Salida registrada. Tablet desasociada y devuelta al pool.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-estadia-view', 'click', function () {
      garitaDetailId = this.getAttribute('data-id');
      Shell.refreshCurrent();
      scrollContentTop();
    }, root);

    UI.on('.js-show-pin', 'click', function () {
      var id = this.getAttribute('data-id');
      var e = S.estadias.find(function (x) { return x.id === id; });
      if (!e) return;
      if (!e.pin) e.pin = String(Math.floor(1000 + Math.random() * 9000));

      var body =
        '<div style="display:flex;flex-direction:column;gap:12px;">' +
        '<div class="info-row"><span class="label">Conductor</span><span class="value">' + esc(e.conductor) + '</span></div>' +
        '<div class="info-row"><span class="label">Documento / Usuario</span><span class="value"><strong>' + esc(e.documento || e.placa) + '</strong></span></div>' +
        '<div class="info-row"><span class="label">Patente</span><span class="value">' + esc(e.placa) + '</span></div>' +
        '<div class="info-row"><span class="label">Empresa</span><span class="value">' + esc(e.empresa) + '</span></div>' +

        '<div class="pin-display-box">' +
        '<span class="pin-display-label">PIN / Contraseña temporal</span>' +
        '<span class="pin-display-number">' + e.pin + '</span>' +
        '<span class="pin-display-hint">Clave de acceso para iniciar sesión en el módulo de Terceros</span>' +
        '</div>' +

        '<div class="pin-warning-box">' +
        ICON.warn +
        '<div>' +
        '<strong>Cambio obligatorio de contraseña</strong>' +
        '<p>El conductor debe cambiar esta contraseña temporal inmediatamente después de haber ingresado con ella.</p>' +
        '</div>' +
        '</div>' +
        '</div>';

      confirmDialog({
        title: 'PIN de acceso para terceros',
        subtitle: 'Patente ' + e.placa + ' · ' + e.conductor,
        body: body,
        cancelLabel: 'Cerrar',
        confirmLabel: 'Copiar PIN'
      }, function () {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(e.pin);
        }
        toast('PIN ' + e.pin + ' copiado al portapapeles.', 'success');
      });
    }, root);

    UI.on('.js-estadia-edit', 'click', function () {
      if (this.disabled) return;
      var id = this.getAttribute('data-id');
      var e = S.estadias.find(function (x) { return x.id === id; });
      if (!e || e.estado === 'cerrada') return;
      var c = S.catalogs;
      var html = '<div class="form-grid">' +
        fieldSel('Empresa', 'f-empresa', optionList(c.empresasTerceros, e.empresa)) +
        fieldSel('Tipo de carga / material', 'f-carga', optionList(c.tiposCargaTerceros, e.tipoCarga)) +
        fieldTxt('Patente', 'f-placa', 'Ej. ABC-123', e.placa) +
        fieldTxt('Patente secundaria', 'f-placa-sec', 'Ej. XYZ-456', e.placaSecundaria) +
        fieldTxt('Conductor', 'f-conductor', 'Nombre del conductor', e.conductor) +
        fieldTxt('Documento', 'f-documento', 'DNI o N° de documento', e.documento === '—' ? '' : e.documento) +
        fieldSel('Destino / sector', 'f-destino', optionList(c.destinosSector, e.destino)) +
        '</div>';
      confirmDialog({ title: 'Editar estadía', subtitle: e.id + ' · ' + e.placa, body: html, confirmLabel: 'Guardar cambios' }, function () {
        var placa = ($('#f-placa').value || '').trim().toUpperCase();
        if (!placa) { toast('La patente no puede estar vacía.', 'error'); return; }
        e.empresa = $('#f-empresa').value;
        e.tipoCarga = $('#f-carga').value;
        e.placa = placa;
        e.placaSecundaria = ($('#f-placa-sec').value || '').trim().toUpperCase();
        e.conductor = ($('#f-conductor').value || '').trim() || 'Sin registrar';
        e.documento = ($('#f-documento').value || '').trim() || '—';
        e.destino = $('#f-destino').value;
        // Mantiene la patente visible en la tablet asignada
        var tablet = e.tabletId ? S.tablets.find(function (t) { return t.id === e.tabletId; }) : null;
        if (tablet) tablet.camion = placa;
        var det = e.id + ' · ' + placa + ' editado';
        S.enqueueSync('Edición de estadía', e.id + ' · ' + placa);
        S.addActivity('Estadía editada', det, 'ok');
        toast('Estadía ' + e.id + ' de ' + placa + ' actualizada.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-reactivar', 'click', function () {
      var id = this.getAttribute('data-id');
      var e = S.estadias.find(function (x) { return x.id === id; });
      if (!e) return;
      confirmDialog({ title: 'Reactivar estadía', subtitle: e.placa, body: '<p style="font-size:15.5px;color:var(--gray-600);">El vehículo dejará el estado En mantenimiento y la estadía volverá a quedar Activa para continuar operando.</p>', confirmLabel: 'Reactivar' }, function () {
        e.estado = 'activa';
        S.enqueueSync('Reactivación de estadía', e.id + ' · ' + e.placa);
        S.addActivity('Estadía reactivada', e.id + ' · ' + e.placa, 'ok');
        toast('Estadía ' + e.id + ' de ' + e.placa + ' reactivada.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    // Menú ⋮ de acciones secundarias. Al abrirse, el panel se mueve a <body> con
    // position:fixed para no quedar recortado por la tabla ni por contenedores animados.
    UI.on('.js-row-menu', 'click', function (ev) {
      ev.stopPropagation();
      var toggle = this;
      var panel = toggle._panel || (toggle._panel = toggle.nextElementSibling);
      var wasOpen = !panel.hidden;
      closeRowMenus();
      if (wasOpen) return;
      panel._toggle = toggle;
      document.body.appendChild(panel);
      var r = toggle.getBoundingClientRect();
      panel.hidden = false;
      var h = panel.offsetHeight, w = panel.offsetWidth;
      var top = (r.bottom + 6 + h > window.innerHeight) ? r.top - h - 6 : r.bottom + 6;
      panel.style.top = Math.max(8, top) + 'px';
      panel.style.left = Math.max(8, r.right - w) + 'px';
      this.setAttribute('aria-expanded', 'true');
      this.classList.add('is-open');
    }, root);
    UI.on('.row-menu__item', 'click', function () { closeRowMenus(); }, root);
    if (!attachGaritaHandlers.menuBound) {
      attachGaritaHandlers.menuBound = true;
      document.addEventListener('click', closeRowMenus);
      document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeRowMenus(); });
      window.addEventListener('resize', closeRowMenus);
      document.addEventListener('scroll', closeRowMenus, true);
    }

    attachFilterToolbar(root, garitaFilters, garitaPager);
  }

  function closeRowMenus() {
    // Solo los paneles abiertos viven en <body>; se devuelven a su fila o se descartan
    $all('body > .row-menu__panel').forEach(function (p) {
      p.hidden = true;
      var t = p._toggle;
      if (t && t.isConnected) {
        t.setAttribute('aria-expanded', 'false');
        t.classList.remove('is-open');
        t.parentNode.appendChild(p);
      } else {
        p.remove();
      }
    });
  }

  /* =======================================================================
     MÓDULO 5 · OPERACIÓN DE VOLQUETES DE TERCEROS
     ======================================================================= */
  function renderTerceros(root) {
    // Las estadías más recientes se insertan al inicio (unshift), así que la
    // primera coincidencia es la última asignación hecha por Garita.
    var estadia = S.estadias.filter(function (e) { return e.estado === 'activa' && e.tabletId; })[0];

    if (!estadia) {
      root.innerHTML = '<div class="card"><div class="card__body">' +
        '<div class="empty-state">' + ICON.empty +
        '<p>Aún no se te ha asignado una tablet desde Garita. Registra el ingreso del vehículo y asigna una tablet del pool para comenzar.</p></div>' +
        '</div></div>';
      return;
    }
    var tablet = S.tablets.find(function (t) { return t.id === estadia.tabletId; });
    var viajeActivo = estadia.viajes.find(function (v) { return v.estado !== 'Cerrado'; });

    root.innerHTML =
      '<div class="grid-2">' +
      '<div class="card"><div class="card__head"><div><h3>Detalles del conductor</h3></div></div>' +
      '<div class="card__body">' +
      '<div class="info-row"><span class="label">Estadía</span><span class="value"><strong>' + esc(estadia.id) + '</strong></span></div>' +
      '<div class="info-row"><span class="label">Empresa</span><span class="value">' + esc(estadia.empresa) + '</span></div>' +
      '<div class="info-row"><span class="label">Patente</span><span class="value">' + esc(estadia.placa) + '</span></div>' +
      '<div class="info-row"><span class="label">Conductor</span><span class="value">' + esc(estadia.conductor) + '</span></div>' +
      '<div class="info-row"><span class="label">Documento</span><span class="value">' + esc(estadia.documento || '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Tablet asignada</span><span class="value">' + esc(tablet ? (tablet.code || tablet.id) : '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Destino / sector</span><span class="value">' + esc(estadia.destino) + '</span></div>' +
      '</div></div>' +

      '<div class="card"><div class="card__head"><div><h3>Ticket en curso</h3><p>Pesaje de entrada → descarga / carga → pesaje de salida</p></div></div>' +
      '<div class="card__body">' + renderViajeActivo(estadia, viajeActivo) + '</div></div>' +
      '</div>' +

      '<div class="card"><div class="card__head"><div><h3>Tickets de la estadía ' + esc(estadia.id) + '</h3></div></div>' +
      '<div class="card__body" style="padding:0;">' + renderViajesTercerosTable(estadia) + '</div></div>';

    attachTercerosHandlers(root, estadia);
  }

  // Sentido del viaje: v.sentido indica cómo ingresa el vehículo ('cargado' | 'vacio').
  // El pesaje de salida siempre es el estado contrario al de entrada.
  var ESTADO_PESAJE = { cargado: 'Cargado', vacio: 'Vacío' };
  function estadoSalida(sentido) { return sentido === 'cargado' ? 'vacio' : 'cargado'; }
  function pesajeConEstado(w, estado) {
    if (!w || !estado) return weighSummary(w);
    return weighSummary(w) + ' <span class="badge ' + (estado === 'cargado' ? 'badge-gold' : 'badge-neutral') + '" style="margin-left:4px;">' + ESTADO_PESAJE[estado] + '</span>';
  }

  function renderViajeActivo(estadia, v) {
    if (!v && estadia.balanzaFueraServicio) {
      // Entrada registrada con balanza fuera de servicio: no se registran más pesos, el conductor devuelve la tablet.
      return '<div style="background:#FEF3C7;color:#92400E;border-radius:8px;padding:12px 14px;margin-bottom:14px;font-size:15px;">' +
        '<strong>Balanza fuera de servicio.</strong> El ticket se cerró con evidencia fotográfica. Devuelve la tablet en Garita para finalizar la estadía.</div>' +
        '<button class="btn btn-primary btn-block" disabled title="Balanza fuera de servicio · devuelve la tablet en Garita">Nuevo ticket</button>';
    }
    if (!v) {
      return '<p style="font-size:15px;color:var(--gray-600);margin-bottom:14px;">No hay un ticket en curso dentro de esta estadía.</p>' +
        '<button class="btn btn-primary btn-block" id="btn-start-trip">Nuevo ticket</button>';
    }
    var entradaEst = v.sentido || null;
    var salidaEst = entradaEst ? estadoSalida(entradaEst) : null;
    var entrada = entradaEst ? v[entradaEst] : null;
    var salida = salidaEst ? v[salidaEst] : null;
    var intermedioLabel = entradaEst === 'vacio' ? 'Carga' : 'Descarga';
    var step = !entrada ? 'entrada' : !salida ? 'salida' : 'listo';
    var rows =
      '<div class="info-row"><span class="label">Ticket</span><span class="value">' + v.id + '</span></div>' +
      '<div class="info-row"><span class="label">Pesaje de entrada</span><span class="value">' + pesajeConEstado(entrada, entradaEst) + '</span></div>' +
      '<div class="info-row"><span class="label">' + (entradaEst ? intermedioLabel : 'Descarga / Carga') + '</span><span class="value">' + (v.intermedio ? esc(v.intermedio) : '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Pesaje de salida</span><span class="value">' + pesajeConEstado(salida, salidaEst) + '</span></div>';
    var btn = '';
    if (step === 'entrada') {
      btn = '<p style="font-size:15px;color:var(--gray-600);margin-bottom:10px;">¿Cómo ingresa el vehículo a la balanza?</p>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
        '<button class="btn btn-gold btn-block js-trip-entrada" data-estado="cargado">Entrada cargado</button>' +
        '<button class="btn btn-outline btn-block js-trip-entrada" data-estado="vacio">Entrada vacío (tara)</button>' +
        '</div>';
    }
    else if (step === 'salida') btn = '<button class="btn btn-gold btn-block" id="btn-trip-salida">Registrar pesaje de salida (' + ESTADO_PESAJE[salidaEst].toLowerCase() + ')</button>';
    else btn = '<div class="info-row"><span class="label">Peso neto</span><span class="value" style="color:var(--success-fg);font-size:17px;">' + (v.neto != null ? v.neto.toLocaleString('es-PE') + ' kg' : '<span class="badge badge-warning">Sin peso neto · Evidencia</span>') + '</span></div>';
    return rows + '<div style="margin-top:12px;">' + btn + '</div>';
  }

  function renderViajesTercerosTable(estadia) {
    if (estadia.viajes.length === 0) {
      return '<div class="empty-state">' + ICON.empty + '<p>Aún no se han registrado tickets en esta estadía.</p></div>';
    }
    var rows = estadia.viajes.map(function (v) {
      var entradaEst = v.sentido || null;
      var salidaEst = entradaEst ? estadoSalida(entradaEst) : null;
      return '<tr><td><strong>' + v.id + '</strong></td>' +
        '<td>' + pesajeConEstado(entradaEst ? v[entradaEst] : null, entradaEst) + '</td>' +
        '<td>' + pesajeConEstado(salidaEst ? v[salidaEst] : null, salidaEst) + '</td>' +
        '<td class="num">' + (v.neto != null ? v.neto.toLocaleString('es-PE') + ' kg' : '<span class="muted" style="color:var(--gray-400)">—</span>') + '</td>' +
        '<td>' + (v.estado === 'Cerrado' ? '<span class="badge badge-success">Cerrado</span>' : '<span class="badge badge-info">En curso</span>') + '</td>' +
        '<td>' + syncBadge(syncStatusFor(v.id)) + '</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Ticket</th><th>Entrada</th><th>Salida</th><th>Neto</th><th>Estado</th><th>Sync</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function attachTercerosHandlers(root, estadia) {
    function viajeEnCurso() { return estadia.viajes.find(function (x) { return x.estado !== 'Cerrado'; }); }

    var btnStart = $('#btn-start-trip', root);
    if (btnStart) btnStart.addEventListener('click', function () {
      var v = { id: S.genViajeId(estadia.tipoCarga), estado: 'en_curso', sentido: null, cargado: null, intermedio: null, vacio: null, neto: null };
      estadia.viajes.unshift(v);
      S.addActivity('Ticket creado', v.id + ' · ' + estadia.placa, 'ok');
      toast('Ticket ' + v.id + ' creado dentro de la estadía ' + estadia.id + '.', 'success');
      Shell.refreshCurrent();
    });

    UI.on('.js-trip-entrada', 'click', function () {
      var estado = this.getAttribute('data-estado');
      var v = viajeEnCurso();
      openWeighModal({ title: 'Pesaje de entrada · ' + ESTADO_PESAJE[estado], subtitle: 'Ticket ' + v.id + ' · ' + estadia.placa, kind: estado, allowOutOfService: true, hideEstimatedValue: false }, function (res) {
        res.ts = S.nowStr();
        v.sentido = estado;
        v[estado] = res;
        S.enqueueSync('Pesaje de entrada tercero', v.id);
        if (res.outOfService) {
          // Sin balanza no se registra la salida: se cierra el viaje y el conductor devuelve la tablet.
          v.neto = null;
          v.estado = 'Cerrado';
          estadia.balanzaFueraServicio = true;
          S.addActivity('Ticket cerrado', v.id + ' · balanza fuera de servicio en la entrada (evidencia)', 'ok');
          toast('Evidencia registrada. Ticket cerrado: devuelve la tablet en Garita.', 'success');
          Shell.refreshCurrent();
          return;
        }
        toast('Pesaje de entrada (' + ESTADO_PESAJE[estado].toLowerCase() + ') registrado.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    var btnSalida = $('#btn-trip-salida', root);
    if (btnSalida) btnSalida.addEventListener('click', function () {
      var v = viajeEnCurso();
      var salidaEst = estadoSalida(v.sentido);
      openWeighModal({ title: 'Pesaje de salida · ' + ESTADO_PESAJE[salidaEst], subtitle: 'Ticket ' + v.id + ' · ' + estadia.placa, kind: salidaEst, allowOutOfService: false, hideEstimatedValue: false }, function (res) {
        res.ts = S.nowStr();
        v[salidaEst] = res;
        v.intermedio = res.ts; // descarga / carga se registra automáticamente con el pesaje de salida
        var inconsistente = false;
        if ((v.cargado && v.cargado.outOfService) || (v.vacio && v.vacio.outOfService)) {
          v.neto = null;
        } else {
          var bruto = v.cargado ? v.cargado.value || 0 : 0;
          var tara = v.vacio ? v.vacio.value || 0 : 0;
          inconsistente = bruto <= tara;
          v.neto = Math.max(0, bruto - tara);
        }
        v.estado = 'Cerrado';
        S.enqueueSync('Ticket tercero', v.id);
        var actDet = v.neto != null ? ' · peso neto ' + v.neto.toLocaleString('es-PE') + ' kg' : ' · balanza fuera de servicio (evidencia)';
        S.addActivity('Ticket cerrado', v.id + actDet, 'ok');
        toast('Ticket cerrado.' + (v.neto != null ? ' Peso neto: ' + v.neto.toLocaleString('es-PE') + ' kg.' : ' Registrado con evidencia de balanza fuera de servicio.'), 'success');
        if (inconsistente) toast('Atención: el peso cargado es menor o igual al peso vacío. Verifica los pesajes.', 'error');
        Shell.refreshCurrent();
      });
    });
  }

  /* =======================================================================
     MÓDULO 6 · HISTORIAL DE PESAJES (Supervisor · app móvil)
     Consulta de los tickets de extracción registrados por los conductores propios.
     Solo lectura: grilla paginada + detalle del ticket con foto de la balanza.
     ======================================================================= */
  var histFilters = { estado: '', q: '' };
  var histPager = { page: 1, size: 10 };
  var HIST_SEGMENTS = [
    { id: '', label: 'Todos', dot: '' },
    { id: 'Abierto', label: 'Abierto', dot: 'info' },
    { id: 'En mantenimiento', label: 'En mantenimiento', dot: 'danger' },
    { id: 'Cerrado', label: 'Cerrado', dot: 'success' }
  ];

  function regIso(k) { return tabletDateIso(k.fecha); }
  function regKey(k) { return regIso(k) + ' ' + (k.horaCarguio || ''); }
  // Estados del ticket propio: Abierto · En mantenimiento · Cerrado
  function ticketEstadoBadge(k) {
    return k.estado === 'Abierto' ? '<span class="badge badge-info">Abierto</span>'
      : k.estado === 'En mantenimiento' ? '<span class="badge badge-danger">En mantenimiento</span>'
      : '<span class="badge badge-success">Cerrado</span>';
  }
  // Tickets de todos los conductores propios (turno en curso + histórico), del más reciente al más antiguo
  function histRegistros() {
    return S.tickets.filter(function (k) { return k.fecha; })
      .concat(S.registrosHist)
      .sort(function (a, b) { return regKey(b).localeCompare(regKey(a)) || b.id.localeCompare(a.id); });
  }
  // Texto normalizado para búsqueda: minúsculas y sin tildes
  function histNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  // Búsqueda por número de ticket o nombre del conductor
  function histMatchesBase(k) {
    var q = histNorm(histFilters.q).trim();
    if (q && histNorm(k.id).indexOf(q) === -1 && histNorm(k.operadorCamion).indexOf(q) === -1) return false;
    return true;
  }
  function histMatchesEstado(k) {
    return !histFilters.estado || k.estado === histFilters.estado;
  }
  function kgTxt(v) { return v == null ? '—' : v.toLocaleString('es-PE') + ' kg'; }

  function renderHistorial(root) {
    var all = histRegistros();
    var base = all.filter(histMatchesBase);
    var list = base.filter(histMatchesEstado);

    var search =
      '<label class="hist-search" for="hist-search">' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="M16 16l4.5 4.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>' +
      '<input type="search" id="hist-search" placeholder="Buscar ticket o conductor" autocomplete="off" value="' + esc(histFilters.q) + '" aria-label="Buscar por ticket o nombre del conductor">' +
      '</label>';

    root.innerHTML =
      '<div class="card filter-card">' +
      renderFilterToolbar({
        title: 'Pesajes registrados',
        subtitle: 'Filtra por estado o busca por ticket o conductor',
        hideDates: true,
        barExtra: search,
        filters: histFilters,
        results: list.length + ' de ' + all.length + ' tickets',
        segments: HIST_SEGMENTS.map(function (s) {
          var count = !s.id ? base.length : base.filter(function (k) { return k.estado === s.id; }).length;
          return { id: s.id, label: s.label, dot: s.dot, count: count };
        })
      }) +
      '<div class="card__body" style="padding:0;">' + renderHistorialTable(list) + '</div>' +
      renderPagination(list.length, histPager, 'tickets') +
      '</div>';

    attachFilterToolbar(root, histFilters, histPager);
    // Búsqueda en vivo: se re-renderiza y se devuelve el foco al buscador
    $('#hist-search', root).addEventListener('input', function () {
      histFilters.q = this.value;
      histPager.page = 1;
      Shell.refreshCurrent();
      var input = $('#hist-search');
      if (input) { input.focus(); input.setSelectionRange(input.value.length, input.value.length); }
    });
    UI.on('.js-hist-view', 'click', function () {
      var id = this.getAttribute('data-id');
      openTicketDetail(all.find(function (x) { return x.id === id; }));
    }, root);
  }

  // Peso compacto para la grilla: valor en kg y una marca corta si fue estimado o sin lectura
  function ticketFueraServicio(k) {
    return !!((k.tara && k.tara.outOfService) || (k.pesajeCargado && k.pesajeCargado.outOfService));
  }
  // Peso compacto para la grilla del supervisor: con balanza fuera de servicio se muestra el peso estimado
  function histWeight(w) {
    if (!w || w.value == null) return '<span style="color:var(--gray-400)">—</span>';
    var flag = w.outOfService
      ? '<br><span class="badge badge-warning hist-flag" title="Balanza fuera de servicio · peso estimado por el sistema · foto de evidencia">Estimado</span>'
      : w.estimated ? '<br><span class="badge badge-warning hist-flag">Estimado</span>' : '';
    return esc(kgTxt(w.value)) + flag;
  }

  function renderHistorialTable(list) {
    if (!list.length) {
      histPager.page = 1;
      return '<div class="empty-state">' + ICON.empty + '<p>No hay pesajes registrados con los filtros seleccionados.</p></div>';
    }
    var rows = paginate(list, histPager).map(function (k) {
      return '<tr>' +
        '<td class="hist-nowrap"><strong>' + esc(k.id) + '</strong></td>' +
        '<td class="hist-nowrap">' + esc(k.fecha) + '</td>' +
        '<td>' + (k.tipoMaterial === 'Mineral' ? '<span class="badge badge-gold">Mineral</span>' : '<span class="badge badge-neutral">Desmonte</span>') +
        '</td>' +
        '<td class="num hist-nowrap">' + histWeight(k.tara) + '</td>' +
        '<td class="num hist-nowrap">' + histWeight(k.pesajeCargado) + '</td>' +
        '<td class="num hist-nowrap"><strong>' + (k.neto != null ? esc(kgTxt(k.neto)) + (ticketFueraServicio(k) ? '<br><span class="badge badge-warning hist-flag">Estimado</span>' : '') : '<span style="color:var(--gray-400)">' + (k.estado !== 'Abierto' ? 'Por regularizar' : 'Pendiente') + '</span>') + '</strong></td>' +
        '<td class="text-center">' + ticketEstadoBadge(k) + '</td>' +
        '<td class="text-center"><button type="button" class="icon-btn js-hist-view" data-id="' + esc(k.id) + '" title="Ver detalle del ticket" aria-label="Ver detalle del ticket ' + esc(k.id) + '">' + ICON.eye + '</button></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table hist-table"><thead><tr>' +
      '<th>Ticket</th><th>Fecha</th><th>Material</th>' +
      '<th>Tara</th><th>Pesaje cargado</th><th>Peso neto</th><th class="text-center">Estado</th><th class="text-center">Ver</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  /* -----------------------------------------------------------------------
     Detalle del ticket (Mis Viajes del conductor e Historial de pesajes del supervisor)
     ----------------------------------------------------------------------- */
  function photoStamp(k, kind) {
    var w = kind === 'tara' ? k.tara : k.pesajeCargado;
    if (w && w.ts) return w.ts.length > 11 ? w.ts : w.ts.replace(/^(\d{2}\/\d{2})/, '$1/' + (k.fecha || '').slice(6));
    return (k.fecha || '') + ' ' + (k.horaCarguio || '');
  }

  // Fotografía simulada del display de la balanza (SVG) con grano, viñeta y sello de cámara
  function balanzaPhotoSvg(k, kind) {
    var w = kind === 'tara' ? k.tara : k.pesajeCargado;
    if (!w) return '';
    var uid = (k.id + kind).replace(/[^a-zA-Z0-9]/g, '');
    var oos = !!w.outOfService;
    var lect = ocrDe(w) != null ? ocrDe(w) : w.value;
    var digits = oos || lect == null ? '' : String(lect).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    var tilt = kind === 'tara' ? 1.6 : -2.2;
    return '<svg class="tkd-photo__img" viewBox="0 0 640 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Foto del display de la balanza · ' + (kind === 'tara' ? 'Tara' : 'Pesaje cargado') + '">' +
      '<defs>' +
      '<linearGradient id="wall' + uid + '" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#5a5f63"/><stop offset=".55" stop-color="#3a3e42"/><stop offset="1" stop-color="#232628"/></linearGradient>' +
      '<linearGradient id="box' + uid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e7e3d9"/><stop offset="1" stop-color="#b9b4a8"/></linearGradient>' +
      '<radialGradient id="vig' + uid + '" cx=".5" cy=".48" r=".75"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".62"/></radialGradient>' +
      '<radialGradient id="flash' + uid + '" cx=".38" cy=".3" r=".5"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<pattern id="hz' + uid + '" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="14" height="28" fill="#e2b43a"/><rect x="14" width="14" height="28" fill="#1d1d1d"/></pattern>' +
      '<filter id="grain' + uid + '"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="' + (k.id.length * 7 + (kind === 'tara' ? 3 : 11)) + '"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .22 0"/></filter>' +
      '<filter id="glow' + uid + '" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
      '<filter id="shadow' + uid + '" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="6" dy="12" stdDeviation="9" flood-opacity=".55"/></filter>' +
      '</defs>' +
      '<rect width="640" height="420" fill="url(#wall' + uid + ')"/>' +
      '<g stroke="#2a2d30" stroke-width="2" opacity=".55"><path d="M0 70H640M0 330H640"/><path d="M90 0V70M300 0V70M520 0V70M60 330V420M380 330V420"/></g>' +
      '<g fill="#6b7075" opacity=".7"><circle cx="40" cy="40" r="4"/><circle cx="600" cy="40" r="4"/><circle cx="40" cy="300" r="4"/><circle cx="600" cy="300" r="4"/></g>' +
      '<rect x="-20" y="372" width="700" height="60" fill="url(#hz' + uid + ')" opacity=".85"/>' +
      '<g transform="rotate(' + tilt + ' 320 210)" filter="url(#shadow' + uid + ')">' +
      '<rect x="108" y="86" width="424" height="236" rx="16" fill="url(#box' + uid + ')" stroke="#8d887d" stroke-width="2"/>' +
      '<text x="132" y="118" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#2f3337" letter-spacing="1.5">BALANZA CAMIONERA · SJ-01</text>' +
      '<text x="508" y="260" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#5d6166">Máx 80 000 kg · e = 20 kg</text>' +
      '<rect x="132" y="132" width="376" height="104" rx="8" fill="#0b120e" stroke="#4b4f4a" stroke-width="3"/>' +
      (oos
        ? '<text x="320" y="200" text-anchor="middle" font-family="Consolas, monospace" font-size="54" fill="#1f3a26" letter-spacing="6">- - - - -</text>'
        : '<text x="462" y="208" text-anchor="end" font-family="Consolas, \'Courier New\', monospace" font-size="58" font-weight="700" fill="#8dff7a" letter-spacing="4" filter="url(#glow' + uid + ')">' + digits + '</text>' +
          '<text x="470" y="208" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#8dff7a" opacity=".85">kg</text>') +
      '<g font-family="Arial, sans-serif" font-size="11" fill="#3b3f43" font-weight="700">' +
      '<circle cx="146" cy="256" r="5" fill="' + (oos ? '#55302e' : '#5dff4a') + '"/><text x="157" y="260">ESTABLE</text>' +
      '<circle cx="230" cy="256" r="5" fill="#2f3b2f"/><text x="241" y="260">CERO</text>' +
      '<circle cx="300" cy="256" r="5" fill="' + (oos ? '#2f3b2f' : '#5dff4a') + '"/><text x="311" y="260">' + (kind === 'tara' ? 'TARA' : 'BRUTO') + '</text>' +
      '</g>' +
      '<g fill="#4b4f54"><rect x="146" y="276" width="62" height="26" rx="6"/><rect x="220" y="276" width="62" height="26" rx="6"/><rect x="294" y="276" width="62" height="26" rx="6"/><rect x="368" y="276" width="62" height="26" rx="6"/></g>' +
      '<g font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#e9e6df" text-anchor="middle"><text x="177" y="293">CERO</text><text x="251" y="293">TARA</text><text x="325" y="293">IMPR</text><text x="399" y="293">MENÚ</text></g>' +
      '<circle cx="486" cy="289" r="14" fill="#b3261e" stroke="#7a1712" stroke-width="2"/>' +
      '</g>' +
      (oos
        ? '<g transform="rotate(-7 330 170)"><rect x="196" y="128" width="268" height="92" fill="#fbfaf4" stroke="#d8d4c6"/>' +
          '<rect x="300" y="118" width="60" height="18" fill="#d9c98f" opacity=".85"/>' +
          '<text x="330" y="168" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="24" font-weight="900" fill="#c62828">FUERA DE</text>' +
          '<text x="330" y="200" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="24" font-weight="900" fill="#c62828">SERVICIO</text></g>'
        : '') +
      '<rect width="640" height="420" fill="url(#flash' + uid + ')"/>' +
      '<rect width="640" height="420" filter="url(#grain' + uid + ')"/>' +
      '<rect width="640" height="420" fill="url(#vig' + uid + ')"/>' +
      '<g font-family="Consolas, \'Courier New\', monospace" font-size="17" font-weight="700" fill="#ffb347" stroke="#000" stroke-width=".6" paint-order="stroke">' +
      '<text x="620" y="400" text-anchor="end">' + esc(photoStamp(k, kind)) + '</text>' +
      '<text x="20" y="400">' + esc(k.camion || '') + ' · ' + esc(k.id) + '</text>' +
      '</g>' +
      '</svg>';
  }

  function openPhotoLightbox(svg, caption) {
    var lb = document.createElement('div');
    lb.className = 'tkd-lightbox';
    lb.innerHTML = '<figure>' + svg + '<figcaption>' + esc(caption) + ' · clic o Esc para cerrar</figcaption></figure>';
    function close() { lb.remove(); document.removeEventListener('keydown', onKey, true); }
    function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
    lb.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(lb);
  }

  // opts.conductor: vista del conductor (Mis Viajes), sin el peso estimado ante balanza fuera de servicio
  function openTicketDetail(k, opts) {
    if (!k) return;
    var ocultar = !!(opts && opts.conductor);
    function field(label, value) {
      return '<div class="tkd-field"><span>' + esc(label) + '</span><strong>' + (value == null || value === '' ? '<em>—</em>' : esc(value)) + '</strong></div>';
    }
    var ref = { id: k.id, camion: k.camion, fecha: k.fecha };
    var zooms = {};
    function card(kind, titulo, w, empty) {
      var photo = fotoPesaje(w, ref, kind);
      if (w) zooms[kind] = { photo: photo, caption: 'Ticket ' + k.id + ' · ' + titulo + ' · ' + photoStamp(k, kind) + ' · ' + lecturaTxt(w, ocultar) };
      return pesajeCard({ title: titulo, w: w, photo: photo, key: kind, empty: empty, ocultarEstimado: ocultar });
    }
    var fs = ticketFueraServicio(k);
    var netoTxt = ocultar && fs ? null : k.neto;

    var html =
      '<div class="modal__head"><div><h3>Detalle del ticket ' + esc(k.id) + '</h3>' +
      '<p>' + esc((k.camion || '') + (k.operadorCamion ? ' · ' + k.operadorCamion : '')) + '</p></div>' +
      '<div class="tkd-head-badges">' + ticketEstadoBadge(k) + syncBadge(syncStatusFor(k.id)) + '</div></div>' +
      '<div class="modal__body"><div class="pc-wrap">' +
      '<div class="tkd-flat">' +
      field('Tolva', k.tolva) + field('Fecha', k.fecha) + field('Hora carguío', k.horaCarguio) + field('Turno', k.turno) +
      field('Nivel', k.nivel) + field('Veta', k.veta) + field('Zona', k.zona) + field('Labor', k.labor) +
      field('Equipo Scoop', k.equipoScoop) + field('Op. Scoop', k.operadorScoop) + field('Camión', k.camion) + field('Op. Camión', k.operadorCamion) +
      field('Tipo de material', k.tipoMaterial) + field('Punto intermedio', k.puntoIntermedio) + field('Destino', k.destino) +
      '</div>' +
      '<div class="pc-grid">' +
      card('tara', 'Pesaje · Tara', k.tara, 'Sin pesaje de tara.') +
      card('cargado', 'Pesaje · Cargado', k.pesajeCargado, 'Sin pesaje cargado.') +
      '</div>' +
      pesajeNeto(netoTxt, k.estado !== 'Abierto' ? 'Por regularizar' : '—', !ocultar && fs) +
      '</div></div>' +
      '<div class="modal__foot"><button class="btn btn-outline js-modal-cancel">Cerrar</button></div>';

    var overlay = openModal(html);
    $('.modal', overlay).classList.add('modal-ticket');
    bindPesajeZoom(overlay, zooms);
  }

  /* =======================================================================
     Registro de renderers en el shell
     ======================================================================= */
  document.addEventListener('DOMContentLoaded', function () {
    Shell.registerRenderer('dashboard', renderDashboard);
    Shell.registerRenderer('misviajes', renderMisViajes);
    Shell.registerRenderer('tablets', renderTablets);
    Shell.registerRenderer('historial', renderHistorial);
    Shell.registerRenderer('garita', renderGarita);
    Shell.registerRenderer('terceros', renderTerceros);
  });
})();
