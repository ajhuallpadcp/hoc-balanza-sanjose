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
  function weighSummary(w) {
    if (!w) return '<span class="muted" style="color:var(--gray-400)">—</span>';
    if (w.outOfService) {
      return '<span class="badge badge-warning" title="Balanza fuera de servicio · Evidencia en auditoría">Fuera de servicio (Evidencia)</span>';
    }
    if (w.value == null) return '<span class="muted" style="color:var(--gray-400)">—</span>';
    var bits = [w.value.toLocaleString('es-PE') + ' kg'];
    return w.value.toLocaleString('es-PE') + ' kg' +
      (w.estimated ? ' <span class="badge badge-warning" style="margin-left:4px;">Estimado</span>' : '') +
      (w.manual ? ' <span class="badge badge-neutral" style="margin-left:4px;">Corregido</span>' : '');
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
      (sub ? '<div class="kpi-card__sub" style="font-size:12px;color:var(--gray-500);margin-top:-2px;">' + esc(sub) + '</div>' : '') +
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
          '<p style="font-size:13px;color:var(--gray-600);margin-bottom:14px;">Aún no se ha registrado la tara del turno vigente.</p>' +
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
      '<button class="btn btn-primary btn-sm" id="btn-new-ticket"' + (!t.tara || hasOpenTicket ? ' disabled title="' + (!t.tara ? 'Registra la tara primero' : 'Ya existe un ticket abierto') + '"' : '') + '>' + ICON.plus + ' Nuevo viaje</button>' +
      '</div>' +
      '<div class="card__body" style="padding:0;">' +
      renderTicketsTable() +
      '</div></div>';

    attachMisViajesHandlers(root);
  }

  function renderTicketsTable() {
    if (S.tickets.length === 0) {
      return '<div class="empty-state">' + ICON.empty + '<p>No se han creado viajes en este turno todavía.</p></div>';
    }
    var rows = S.tickets.map(function (k) {
      var action;
      if (!k.pesajeCargado) {
        action = '<button class="btn btn-outline btn-sm js-ticket-cargado" data-id="' + k.id + '">Pesaje cargado</button>';
      } else if (!k.descarga) {
        action = '<button class="btn btn-outline btn-sm js-ticket-descarga" data-id="' + k.id + '">Descarga y cierre</button>';
      } else {
        action = '<button class="icon-btn js-ticket-view" data-id="' + k.id + '" title="Ver detalle">' + ICON.eye + '</button>';
      }
      return '<tr>' +
        '<td><strong>' + k.id + '</strong></td>' +
        '<td>' + esc(k.tolva) + '</td>' +
        '<td>' + esc(k.tipoMaterial) + '</td>' +
        '<td>' + esc(k.destino) + '</td>' +
        '<td class="num">' + weighSummary(k.pesajeCargado) + '</td>' +
        '<td>' + (k.descarga ? esc(k.descarga) : '<span class="muted" style="color:var(--gray-400)">—</span>') + '</td>' +
        '<td class="text-center">' + (k.estado === 'Abierto' ? '<span class="badge badge-info">Abierto</span>' : '<span class="badge badge-success">Cerrado</span>') + '</td>' +
        '<td class="text-center">' + syncBadge(syncStatusFor(k.id)) + '</td>' +
        '<td class="text-center"><div class="row-actions">' + action + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Ticket</th><th>Tolva</th><th>Material</th><th>Destino</th><th>Pesaje cargado</th><th>Descarga</th><th class="text-center">Estado</th><th class="text-center">Sync</th><th class="th-actions text-center">Acciones</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
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
      confirmDialog({ title: 'Cerrar turno', body: '<p style="font-size:13.5px;color:var(--gray-600);">Se cerrará la operación del conductor para el turno vigente.</p>' }, function () {
        S.turno = { activo: false, camion: null, turnoNombre: null, tara: null, iniciadoEn: null };
        S.addActivity('Cierre de turno', 'Turno finalizado sin viajes pendientes', 'ok');
        toast('Turno cerrado.', 'success');
        Shell.refreshCurrent();
      });
    });

    var btnTara = $('#btn-register-tara', root);
    if (btnTara) btnTara.addEventListener('click', function () {
      openWeighModal({ title: 'Registrar tara', subtitle: 'Camión ' + S.turno.camion, kind: 'tara', allowOutOfService: false }, function (res) {
        res.ts = S.nowStr();
        S.turno.tara = res;
        S.enqueueSync('Tara', 'Tara ' + S.turno.camion);
        S.addActivity('Tara registrada', 'Camión ' + S.turno.camion + ' · ' + res.value.toLocaleString('es-PE') + ' kg', 'ok');
        toast('Tara registrada. Ya puedes crear un nuevo viaje.', 'success');
        Shell.refreshCurrent();
      });
    });

    var btnNewTicket = $('#btn-new-ticket', root);
    if (btnNewTicket) btnNewTicket.addEventListener('click', openTicketForm);

    UI.on('.js-ticket-cargado', 'click', function () {
      var id = this.getAttribute('data-id');
      openWeighModal({ title: 'Pesaje cargado', subtitle: 'Ticket ' + id, kind: 'cargado', allowOutOfService: true, hideEstimatedValue: true }, function (res) {
        res.ts = S.nowStr();
        var k = S.tickets.find(function (x) { return x.id === id; });
        k.pesajeCargado = res;
        S.enqueueSync('Pesaje cargado', id);
        var actDet = res.outOfService ? ' · Balanza fuera de servicio (evidencia)' : (res.value != null ? ' · ' + res.value.toLocaleString('es-PE') + ' kg' : '');
        S.addActivity('Pesaje cargado', 'Ticket ' + id + actDet, 'ok');
        toast(res.outOfService ? 'Evidencia de balanza fuera de servicio registrada.' : 'Pesaje cargado registrado.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-ticket-descarga', 'click', function () {
      var id = this.getAttribute('data-id');
      confirmDialog({ title: 'Registrar descarga y cerrar ticket', subtitle: 'Ticket ' + id, body: '<p style="font-size:13.5px;color:var(--gray-600);">Se registrará la fecha y hora de descarga y el ticket pasará a estado Cerrado.</p>' }, function () {
        var k = S.tickets.find(function (x) { return x.id === id; });
        k.descarga = S.nowStr();
        k.estado = 'Cerrado';
        S.enqueueSync('Descarga', id);
        S.addActivity('Descarga y cierre', 'Ticket ' + id + ' cerrado', 'ok');
        toast('Ticket cerrado correctamente.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-ticket-view', 'click', function () {
      var id = this.getAttribute('data-id');
      var k = S.tickets.find(function (x) { return x.id === id; });
      var fields = [['Tolva', 'tolva'], ['Labor', 'labor'], ['Nivel', 'nivel'], ['Equipo Scoop', 'equipoScoop'],
      ['Operador Scoop', 'operadorScoop'], ['Tipo de material', 'tipoMaterial'],
      ['Punto intermedio', 'puntoIntermedio'], ['Destino', 'destino']];
      var body = fields.map(function (f) {
        return '<div class="info-row"><span class="label">' + f[0] + '</span><span class="value">' + esc(k[f[1]] || '—') + '</span></div>';
      }).join('') +
        '<div class="info-row"><span class="label">Pesaje cargado</span><span class="value">' + weighSummary(k.pesajeCargado) + '</span></div>' +
        '<div class="info-row"><span class="label">Descarga</span><span class="value">' + esc(k.descarga || '—') + '</span></div>';
      confirmDialog({ title: 'Detalle del ticket ' + id, body: body, confirmLabel: 'Cerrar' }, function () { });
      $('.js-modal-cancel').style.display = 'none';
    }, root);
  }

  function openTicketForm() {
    var c = S.catalogs;
    var html = '<div class="form-grid">' +
      fieldSel('Tolva', 'f-tolva', optionList(c.tolvas)) +
      fieldSel('Labor', 'f-labor', optionList(c.labores)) +
      fieldSel('Nivel', 'f-nivel', optionList(c.niveles)) +
      fieldSel('Equipo Scoop', 'f-scoop', optionList(c.equiposScoop)) +
      fieldSel('Operador Scoop', 'f-opscoop', optionList(c.operadoresScoop)) +
      fieldSel('Tipo de material', 'f-material', optionList(c.tiposMaterial)) +
      fieldSel('Punto intermedio / bocamina', 'f-punto', optionList(c.puntosIntermedios)) +
      fieldSel('Destino', 'f-destino', optionList(c.destinos)) +
      '</div>';
    confirmDialog({ title: 'Nuevo viaje · Ticket de extracción', subtitle: 'Camión ' + S.turno.camion, body: html, confirmLabel: 'Crear ticket' }, function () {
      var k = {
        id: S.genTicketId(),
        tolva: $('#f-tolva').value, labor: $('#f-labor').value, nivel: $('#f-nivel').value,
        equipoScoop: $('#f-scoop').value, operadorScoop: $('#f-opscoop').value,
        tipoMaterial: $('#f-material').value, puntoIntermedio: $('#f-punto').value, destino: $('#f-destino').value,
        estado: 'Abierto', pesajeCargado: null, descarga: null
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

  function renderTablets(root) {
    root.innerHTML =
      '<div class="card"><div class="card__head">' +
      '<div><h3>Parque de dispositivos</h3></div>' +
      '<button class="btn btn-primary btn-sm" id="btn-enroll">' + ICON.plus + ' Enrolar tablet</button>' +
      '</div><div class="card__body" style="padding:0;">' + renderTabletsTable() + '</div></div>';

    attachTabletsHandlers(root);
  }

  function renderTabletsTable() {
    var rows = S.tablets.map(function (t) {
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
        ICON.edit + '<span>Reclasificar</span></button></div>';

      return '<tr>' +
        '<td><strong>' + t.id + '</strong><br><span class="muted" style="color:var(--gray-500);font-size:12px;">' + esc(t.code || t.id) + '</span></td>' +
        '<td>' + esc(CLAS_LABEL[t.clas]) + '</td>' +
        '<td class="text-center">' + (camionDisplay ? esc(camionDisplay) : '<span class="muted" style="color:var(--gray-400)">—</span>') + '</td>' +
        '<td class="text-center">' + (STATUS_BADGE[t.status] || t.status) + '</td>' +
        '<td class="text-center muted" style="color:var(--gray-500);">' + esc(t.since) + '</td>' +
        '<td class="text-center"><div class="row-actions row-actions--tablets">' + primarySlot + editBtn + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Dispositivo</th><th>Clasificación</th><th class="text-center">Camión</th><th class="text-center">Estado</th><th class="text-center">Enrolada</th><th class="th-actions text-center">Acciones</th>' +
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
      '<div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--gray-500);text-transform:uppercase;">Clasificación actual</div>' +
      '<div style="font-size:13.5px;font-weight:600;color:var(--navy-900);margin-top:2px;">' + esc(CLAS_LABEL[t.clas]) + '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
      '<div style="font-size:11px;font-weight:700;letter-spacing:.04em;color:var(--gray-500);text-transform:uppercase;">Estado operativo</div>' +
      '<div style="margin-top:2px;">' + (STATUS_BADGE[t.status] || t.status) + '</div>' +
      '</div>' +
      '</div>';

    var truckNotice = '';
    if (t.camion) {
      truckNotice =
        '<div style="font-size:12.5px;color:var(--navy-800);background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius-sm);padding:9px 12px;margin-bottom:14px;display:flex;align-items:center;gap:8px;">' +
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
      '<div id="clas-feedback-box" style="margin-top:12px;padding:11px 13px;background:#f8fafc;border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:12.5px;line-height:1.45;color:var(--gray-600);">' +
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
      var libres = S.camionesPropios.filter(function (c) { return !S.tabletFor(c); });
      if (libres.length === 0) { toast('Todos los camiones propios ya cuentan con una tablet fija asociada.', 'error'); return; }
      var html = '<div class="form-grid">' + fieldSel('Patente', 'f-camion', optionList(libres)) + '</div>';
      confirmDialog({ title: 'Asociar tablet a camión', subtitle: id, body: html, confirmLabel: 'Asociar' }, function () {
        var t = S.tablets.find(function (x) { return x.id === id; });
        t.camion = $('#f-camion').value;
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
          '<div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:var(--radius-sm);padding:12px 14px;font-size:13px;color:#1e40af;line-height:1.45;">' +
          'Al continuar, se confirmará que la tablet ya fue reparada y se encuentra operativa.' +
          '</div>' +
          '<p style="font-size:13.5px;color:var(--gray-700);margin:0;line-height:1.55;">' +
          (camion
            ? 'La tablet <strong>' + esc(id) + '</strong> se desvinculará del camión <strong>' + esc(camion) + '</strong> y cambiará automáticamente al estado <strong>Sin asociar</strong>, quedando disponible para ser asignada nuevamente a un camión.'
            : 'La tablet <strong>' + esc(id) + '</strong> cambiará automáticamente al estado <strong>Sin asociar</strong>, quedando disponible para ser asignada nuevamente a un camión.') +
          '</p>' +
          '</div>'
        : '<p style="font-size:13.5px;color:var(--gray-700);line-height:1.55;">' +
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
        '<div id="repuesto-info-box" style="margin-top:10px;padding:11px 13px;background:#f8fafc;border:1px solid var(--gray-200);border-radius:var(--radius-sm);font-size:12.5px;line-height:1.45;color:var(--gray-600);"></div>';

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
            txt += '<br><span style="color:var(--gray-500);font-size:12px;">Historial del camión: ' + ids + ' ya en mantenimiento (se conservan para trazabilidad).</span>';
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
        toast('Solo se puede reclasificar una tablet cuando está en estado Sin asociar.', 'error');
        return;
      }
      openChangeClasModal(t);
    }, root);
  }

  /* =======================================================================
     MÓDULO 4 · GARITA
     ======================================================================= */
  function renderGarita(root) {
    root.innerHTML =
      '<div class="card"><div class="card__head">' +
      '<div><h3>Estadías activas</h3></div>' +
      '<button class="btn btn-primary btn-sm" id="btn-new-entry">' + ICON.plus + ' Registrar ingreso</button>' +
      '</div><div class="card__body" style="padding:0;">' + renderEstadiasTable() + '</div></div>';
    attachGaritaHandlers(root);
  }

  function renderEstadiasTable() {
    var activas = S.estadias;
    if (activas.length === 0) {
      return '<div class="empty-state">' + ICON.empty + '<p>No hay vehículos de terceros registrados todavía.</p></div>';
    }
    var rows = activas.map(function (e) {
      var cerrados = e.viajes.filter(function (v) { return v.estado === 'Cerrado'; }).length;
      var tablet = e.tabletId ? S.tablets.find(function (t) { return t.id === e.tabletId; }) : null;
      var tabletCell = tablet ? '<span class="badge badge-neutral">' + esc(tablet.code || tablet.id) + '</span>' : '<button class="btn btn-outline btn-sm js-assign-tablet" data-id="' + e.id + '">Asignar tablet</button>';
      var salidaBtn = e.estado === 'activa'
        ? '<button class="btn btn-outline btn-sm js-exit" data-id="' + e.id + '"' + (!tablet ? ' disabled title="Asigna una tablet primero"' : '') + '>Registrar salida</button>'
        : '<span class="badge badge-neutral">Cerrada</span>';
      var pinBtn = '<button class="btn btn-outline btn-sm js-show-pin" data-id="' + e.id + '">Mostrar PIN</button>';
      return '<tr>' +
        '<td><strong>' + esc(e.placa) + '</strong></td>' +
        '<td>' + esc(e.empresa) + '</td>' +
        '<td>' + esc(e.conductor) + '</td>' +
        '<td>' + esc(e.documento || '—') + '</td>' +
        '<td class="text-center">' + tabletCell + '</td>' +
        '<td class="text-center">' + e.viajes.length + ' (' + cerrados + ' cerrados)</td>' +
        '<td class="text-center">' + (e.estado === 'activa' ? '<span class="badge badge-info">Activa</span>' : '<span class="badge badge-success">Cerrada</span>') + '</td>' +
        '<td class="text-center muted" style="color:var(--gray-500);">' + esc(e.ingresoEn) + '</td>' +
        '<td class="text-center"><div class="row-actions">' + pinBtn + salidaBtn + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Patente</th><th>Empresa</th><th>Conductor</th><th>Documento</th><th class="text-center">Tablet</th><th class="text-center">Viajes</th><th class="text-center">Estado</th><th class="text-center">Ingreso</th><th class="th-actions text-center">Acciones</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function attachGaritaHandlers(root) {
    $('#btn-new-entry', root).addEventListener('click', function () {
      var c = S.catalogs;
      var html = '<div class="form-grid">' +
        fieldSel('Empresa', 'f-empresa', optionList(c.empresasTerceros)) +
        fieldSel('Tipo de carga / material', 'f-carga', optionList(c.tiposCargaTerceros)) +
        fieldTxt('Patente', 'f-placa', 'Ej. ABC-123') +
        fieldTxt('Conductor', 'f-conductor', 'Nombre del conductor') +
        fieldTxt('Documento', 'f-documento', 'DNI o N° de documento') +
        fieldSel('Destino / sector', 'f-destino', optionList(c.destinosSector)) +
        '</div>';
      confirmDialog({ title: 'Registrar ingreso de vehículo de tercero', body: html, confirmLabel: 'Crear estadía' }, function () {
        var placa = ($('#f-placa').value || 'S/PATENTE').toUpperCase();
        var pin = String(Math.floor(1000 + Math.random() * 9000));
        var e = {
          id: S.genEstadiaId(), empresa: $('#f-empresa').value, tipoCarga: $('#f-carga').value,
          placa: placa, conductor: $('#f-conductor').value || 'Sin registrar',
          documento: $('#f-documento').value || '—',
          pin: pin,
          destino: $('#f-destino').value,
          tabletId: null, viajes: [], estado: 'activa', ingresoEn: S.nowStr()
        };
        S.estadias.unshift(e);
        S.enqueueSync('Ingreso de tercero', placa);
        S.addActivity('Ingreso registrado', placa + ' · ' + e.empresa, 'ok');
        toast('Estadía registrada para ' + placa + '. PIN de acceso: ' + pin + '.', 'success');
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
        toast('No se puede cerrar: el viaje ' + incompleto.id + ' está incompleto.', 'error');
        return;
      }
      confirmDialog({ title: 'Registrar salida', subtitle: e.placa, body: '<p style="font-size:13.5px;color:var(--gray-600);">Se cerrará la estadía y la tablet asignada pasará automáticamente al estado Sin asociar en el pool.</p>' }, function () {
        e.estado = 'cerrada'; e.salidaEn = S.nowStr();
        var tablet = S.tablets.find(function (t) { return t.id === e.tabletId; });
        if (tablet) {
          tablet.status = 'sin_asociar';
          tablet.camion = null;
        }
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: (tablet ? tablet.id : '') + ' desasociada automáticamente al cerrar ' + e.id, usuario: 'Sistema' });
        S.enqueueSync('Salida de tercero', e.placa);
        S.addActivity('Salida registrada', e.placa + ' · estadía cerrada', 'ok');
        toast('Salida registrada. Tablet desasociada y devuelta al pool.', 'success');
        Shell.refreshCurrent();
      });
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
      '<div class="card"><div class="card__head"><div><h3>Detalles del conductor</h3><p>Resuelto automáticamente desde la tablet</p></div></div>' +
      '<div class="card__body">' +
      '<div class="info-row"><span class="label">Empresa</span><span class="value">' + esc(estadia.empresa) + '</span></div>' +
      '<div class="info-row"><span class="label">Patente</span><span class="value">' + esc(estadia.placa) + '</span></div>' +
      '<div class="info-row"><span class="label">Conductor</span><span class="value">' + esc(estadia.conductor) + '</span></div>' +
      '<div class="info-row"><span class="label">Documento</span><span class="value">' + esc(estadia.documento || '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Tablet asignada</span><span class="value">' + esc(tablet ? (tablet.code || tablet.id) : '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Destino / sector</span><span class="value">' + esc(estadia.destino) + '</span></div>' +
      '</div></div>' +

      '<div class="card"><div class="card__head"><div><h3>Viaje en curso</h3><p>Pesaje cargado → descarga → pesaje vacío</p></div></div>' +
      '<div class="card__body">' + renderViajeActivo(estadia, viajeActivo) + '</div></div>' +
      '</div>' +

      '<div class="card"><div class="card__head"><div><h3>Viajes de la estadía</h3><p>Peso neto = cargado − vacío</p></div></div>' +
      '<div class="card__body" style="padding:0;">' + renderViajesTercerosTable(estadia) + '</div></div>';

    attachTercerosHandlers(root, estadia);
  }

  function renderViajeActivo(estadia, v) {
    if (!v) {
      return '<p style="font-size:13px;color:var(--gray-600);margin-bottom:14px;">No hay un viaje en curso dentro de esta estadía.</p>' +
        '<button class="btn btn-primary btn-block" id="btn-start-trip">Iniciar viaje</button>';
    }
    var step = !v.cargado ? 'cargado' : !v.descarga ? 'descarga' : !v.vacio ? 'vacio' : 'listo';
    var rows =
      '<div class="info-row"><span class="label">Viaje</span><span class="value">' + v.id + '</span></div>' +
      '<div class="info-row"><span class="label">Pesaje cargado</span><span class="value">' + weighSummary(v.cargado) + '</span></div>' +
      '<div class="info-row"><span class="label">Descarga</span><span class="value">' + (v.descarga ? esc(v.descarga) : '—') + '</span></div>' +
      '<div class="info-row"><span class="label">Pesaje vacío</span><span class="value">' + weighSummary(v.vacio) + '</span></div>';
    var btn = '';
    if (step === 'cargado') btn = '<button class="btn btn-gold btn-block" id="btn-trip-cargado">Registrar pesaje cargado</button>';
    else if (step === 'descarga') btn = '<button class="btn btn-outline btn-block" id="btn-trip-descarga">Registrar descarga</button>';
    else if (step === 'vacio') btn = '<button class="btn btn-gold btn-block" id="btn-trip-vacio">Registrar pesaje vacío</button>';
    else btn = '<div class="info-row"><span class="label">Peso neto</span><span class="value" style="color:var(--success-fg);font-size:15px;">' + (v.neto != null ? v.neto.toLocaleString('es-PE') + ' kg' : '<span class="badge badge-warning">Sin peso neto · Evidencia</span>') + '</span></div>';
    return rows + '<div style="margin-top:12px;">' + btn + '</div>';
  }

  function renderViajesTercerosTable(estadia) {
    if (estadia.viajes.length === 0) {
      return '<div class="empty-state">' + ICON.empty + '<p>Aún no se han registrado viajes en esta estadía.</p></div>';
    }
    var rows = estadia.viajes.map(function (v) {
      return '<tr><td><strong>' + v.id + '</strong></td>' +
        '<td>' + weighSummary(v.cargado) + '</td>' +
        '<td>' + weighSummary(v.vacio) + '</td>' +
        '<td class="num">' + (v.neto != null ? v.neto.toLocaleString('es-PE') + ' kg' : '<span class="muted" style="color:var(--gray-400)">—</span>') + '</td>' +
        '<td>' + (v.estado === 'Cerrado' ? '<span class="badge badge-success">Cerrado</span>' : '<span class="badge badge-info">En curso</span>') + '</td>' +
        '<td>' + syncBadge(syncStatusFor(v.id)) + '</td></tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr><th>Viaje</th><th>Cargado</th><th>Vacío</th><th>Neto</th><th>Estado</th><th>Sync</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function attachTercerosHandlers(root, estadia) {
    var btnStart = $('#btn-start-trip', root);
    if (btnStart) btnStart.addEventListener('click', function () {
      var v = { id: S.genViajeId(), estado: 'en_curso', cargado: null, descarga: null, vacio: null, neto: null };
      estadia.viajes.unshift(v);
      S.addActivity('Viaje iniciado', v.id + ' · ' + estadia.placa, 'ok');
      toast('Viaje ' + v.id + ' iniciado dentro de la estadía.', 'success');
      Shell.refreshCurrent();
    });
    var btnCargado = $('#btn-trip-cargado', root);
    if (btnCargado) btnCargado.addEventListener('click', function () {
      var v = estadia.viajes.find(function (x) { return x.estado !== 'Cerrado'; });
      openWeighModal({ title: 'Pesaje cargado', subtitle: 'Viaje ' + v.id + ' · ' + estadia.placa, kind: 'cargado', allowOutOfService: true, hideEstimatedValue: false }, function (res) {
        res.ts = S.nowStr();
        v.cargado = res;
        S.enqueueSync('Pesaje cargado tercero', v.id);
        toast(res.outOfService ? 'Evidencia de balanza fuera de servicio registrada.' : 'Pesaje cargado registrado.', 'success');
        Shell.refreshCurrent();
      });
    });
    var btnDescarga = $('#btn-trip-descarga', root);
    if (btnDescarga) btnDescarga.addEventListener('click', function () {
      var v = estadia.viajes.find(function (x) { return x.estado !== 'Cerrado'; });
      confirmDialog({ title: 'Registrar descarga', subtitle: 'Viaje ' + v.id, body: '<p style="font-size:13.5px;color:var(--gray-600);">Se habilitará el registro del pesaje vacío.</p>' }, function () {
        v.descarga = S.nowStr();
        toast('Descarga registrada.', 'success');
        Shell.refreshCurrent();
      });
    });
    var btnVacio = $('#btn-trip-vacio', root);
    if (btnVacio) btnVacio.addEventListener('click', function () {
      var v = estadia.viajes.find(function (x) { return x.estado !== 'Cerrado'; });
      openWeighModal({ title: 'Pesaje vacío', subtitle: 'Viaje ' + v.id + ' · ' + estadia.placa, kind: 'vacio', allowOutOfService: true, hideEstimatedValue: false }, function (res) {
        res.ts = S.nowStr();
        v.vacio = res;
        if ((v.cargado && v.cargado.outOfService) || res.outOfService) {
          v.neto = null;
        } else {
          v.neto = Math.max(0, (v.cargado ? v.cargado.value || 0 : 0) - (v.vacio.value || 0));
        }
        v.estado = 'Cerrado';
        S.enqueueSync('Viaje tercero', v.id);
        var actDet = v.neto != null ? ' · peso neto ' + v.neto.toLocaleString('es-PE') + ' kg' : ' · balanza fuera de servicio (evidencia)';
        S.addActivity('Viaje cerrado', v.id + actDet, 'ok');
        toast('Viaje cerrado.' + (v.neto != null ? ' Peso neto: ' + v.neto.toLocaleString('es-PE') + ' kg.' : ' Registrado con evidencia de balanza fuera de servicio.'), 'success');
        Shell.refreshCurrent();
      });
    });
  }

  /* =======================================================================
     Registro de renderers en el shell
     ======================================================================= */
  document.addEventListener('DOMContentLoaded', function () {
    Shell.registerRenderer('dashboard', renderDashboard);
    Shell.registerRenderer('misviajes', renderMisViajes);
    Shell.registerRenderer('tablets', renderTablets);
    Shell.registerRenderer('garita', renderGarita);
    Shell.registerRenderer('terceros', renderTerceros);
  });
})();
