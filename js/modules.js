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
    var bits = [w.value.toLocaleString('es-PE') + ' kg'];
    return w.value.toLocaleString('es-PE') + ' kg' +
      (w.estimated ? ' <span class="badge badge-warning" style="margin-left:4px;">Estimado</span>' : '') +
      (w.manual ? ' <span class="badge badge-neutral" style="margin-left:4px;">Corregido</span>' : '');
  }

  /* =======================================================================
     DASHBOARD
     ======================================================================= */
  function renderDashboard(root) {
    var camionesPropios = S.tablets.filter(function (t) { return t.clas === 'fija'; }).length;
    var poolTerceros = S.tablets.filter(function (t) { return t.clas === 'pool'; }).length;
    var repuestos = S.tablets.filter(function (t) { return t.clas === 'repuesto'; }).length;
    var enMantenimiento = S.tablets.filter(function (t) { return t.status === 'danada' || t.status === 'mantenimiento'; }).length;

    root.innerHTML =
      '<div class="kpi-grid">' +
      kpiCard('info', ICON.truck, camionesPropios, 'Camión propio') +
      kpiCard('warning', ICON.users, poolTerceros, 'Pool de terceros') +
      kpiCard('success', ICON.tablet, repuestos, 'De repuesto') +
      kpiCard('danger', ICON.warn, enMantenimiento, 'En mantenimiento') +
      '</div>';
  }

  function kpiCard(tone, icon, value, label) {
    var bg = tone === 'warning' ? 'var(--warning-bg)' : tone === 'info' ? 'var(--info-bg)' : tone === 'success' ? 'var(--success-bg)' : 'var(--danger-bg)';
    var fg = tone === 'warning' ? 'var(--warning-fg)' : tone === 'info' ? 'var(--info-fg)' : tone === 'success' ? 'var(--success-fg)' : 'var(--danger-fg)';
    return '<div class="kpi-card"><div class="kpi-card__top"><div class="kpi-card__icon" style="background:' + bg + ';color:' + fg + ';">' + icon + '</div></div>' +
      '<div class="kpi-card__value">' + value + '</div><div class="kpi-card__label">' + esc(label) + '</div></div>';
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
        S.addActivity('Pesaje cargado', 'Ticket ' + id + (res.estimated ? ' · valor estimado' : ' · ' + res.value.toLocaleString('es-PE') + ' kg'), 'ok');
        toast('Pesaje cargado registrado.', 'success');
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
    disponible: '<span class="badge badge-success">Disponible</span>',
    sin_asociar: '<span class="badge badge-warning">Sin asociar</span>',
    ocupada: '<span class="badge badge-info">Ocupada</span>',
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
      var actions = '';
      if (t.clas === 'fija' && !t.camion) {
        actions = '<button class="btn btn-outline btn-sm js-assoc" data-id="' + t.id + '">Asociar camión</button>';
      } else if (t.clas === 'fija' && t.camion) {
        actions = '<button class="btn btn-table-danger btn-sm js-deassoc" data-id="' + t.id + '">Desasociar</button>';
      } else if (t.clas === 'repuesto' && t.status === 'disponible') {
        actions = '<button class="btn btn-outline btn-sm js-repuesto" data-id="' + t.id + '">Asignar como repuesto</button>';
      } else if (t.clas === 'repuesto' && t.status === 'ocupada') {
        actions = '<button class="btn btn-table-warning btn-sm js-liberar-repuesto" data-id="' + t.id + '">Liberar</button>';
      }
      return '<tr>' +
        '<td><strong>' + t.id + '</strong></td>' +
        '<td>' + esc(CLAS_LABEL[t.clas]) + '</td>' +
        '<td class="text-center">' + (t.camion ? esc(t.camion) : '<span class="muted" style="color:var(--gray-400)">—</span>') + '</td>' +
        '<td class="text-center">' + (STATUS_BADGE[t.status] || t.status) + '</td>' +
        '<td class="text-center muted" style="color:var(--gray-500);">' + esc(t.since) + '</td>' +
        '<td class="text-center"><div class="row-actions">' + actions + '</div></td>' +
        '</tr>';
    }).join('');
    return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Dispositivo</th><th>Clasificación</th><th class="text-center">Camión</th><th class="text-center">Estado</th><th class="text-center">Enrolada</th><th class="th-actions text-center">Acciones</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function attachTabletsHandlers(root) {
    $('#btn-enroll', root).addEventListener('click', function () {
      var html = '<div class="form-grid">' +
        fieldTxt('Identificador único', 'f-devid', '', S.genTabletId()) +
        fieldSel('Clasificación', 'f-clas', '<option value="fija">Camión propio</option><option value="pool">Pool de terceros</option><option value="repuesto">Repuesto</option>') +
        '</div>';
      confirmDialog({ title: 'Enrolar tablet', body: html, confirmLabel: 'Enrolar' }, function () {
        var clas = $('#f-clas').value;
        var devId = $('#f-devid').value;
        var t = {
          id: devId, code: devId, clas: clas,
          camion: null, status: clas === 'fija' ? 'sin_asociar' : 'disponible', since: S.nowStr()
        };
        S.tablets.push(t);
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: t.id + ' enrolada como ' + CLAS_LABEL[clas], usuario: S.users.admin.name });
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
        t.camion = $('#f-camion').value; t.status = 'disponible';
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: id + ' asociada de forma fija a ' + t.camion, usuario: S.users.admin.name });
        toast('Asociación creada correctamente.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-deassoc', 'click', function () {
      var id = this.getAttribute('data-id');
      var t = S.tablets.find(function (x) { return x.id === id; });
      confirmDialog({ title: 'Desasociar tablet', subtitle: id + ' · ' + t.camion, body: '<p style="font-size:13.5px;color:var(--gray-600);">Se eliminará la asociación fija vigente con este camión.</p>', danger: true, confirmLabel: 'Desasociar' }, function () {
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: id + ' desasociada de ' + t.camion, usuario: S.users.admin.name });
        t.camion = null; t.status = 'sin_asociar';
        toast('Tablet desasociada.', 'info');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-repuesto', 'click', function () {
      var id = this.getAttribute('data-id');
      var afectables = S.tablets.filter(function (x) { return x.clas === 'fija' && x.camion; }).map(function (x) { return x.camion; });
      if (afectables.length === 0) { toast('No hay camiones con tablet fija para aplicar contingencia.', 'error'); return; }
      var html = '<div class="form-grid">' + fieldSel('Camión propio afectado', 'f-camion-rep', optionList(afectables)) + '</div>' +
        '<p class="form-hint" style="margin-top:8px;">La tablet fija de ese camión quedará marcada como dañada mientras dure la contingencia.</p>';
      confirmDialog({ title: 'Asignar tablet de repuesto', subtitle: id, body: html, confirmLabel: 'Asignar' }, function () {
        var camion = $('#f-camion-rep').value;
        var fija = S.tabletFor(camion);
        fija.status = 'danada';
        var rep = S.tablets.find(function (x) { return x.id === id; });
        rep.status = 'ocupada'; rep.camion = camion;
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: id + ' asignada como repuesto a ' + camion + ' (contingencia)', usuario: S.users.admin.name });
        toast('Tablet de repuesto asignada a ' + camion + '.', 'success');
        Shell.refreshCurrent();
      });
    }, root);

    UI.on('.js-liberar-repuesto', 'click', function () {
      var id = this.getAttribute('data-id');
      var rep = S.tablets.find(function (x) { return x.id === id; });
      var camion = rep.camion;
      confirmDialog({ title: 'Liberar tablet de repuesto', subtitle: id + ' · ' + camion, body: '<p style="font-size:13.5px;color:var(--gray-600);">Se restituirá la asociación operativa original del camión.</p>' }, function () {
        var fija = S.tablets.find(function (x) { return x.clas === 'fija' && x.camion === camion; });
        if (fija) fija.status = 'disponible';
        rep.status = 'disponible'; rep.camion = null;
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: 'Contingencia finalizada en ' + camion + ' · ' + id + ' liberada al pool de repuesto', usuario: S.users.admin.name });
        toast('Tablet de repuesto liberada.', 'success');
        Shell.refreshCurrent();
      });
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
      var tabletCell = tablet ? '<span class="badge badge-neutral">' + esc(tablet.id) + '</span>' : '<button class="btn btn-outline btn-sm js-assign-tablet" data-id="' + e.id + '">Asignar tablet</button>';
      var salidaBtn = e.estado === 'activa'
        ? '<button class="btn btn-outline btn-sm js-exit" data-id="' + e.id + '"' + (!tablet ? ' disabled title="Asigna una tablet primero"' : '') + '>Registrar salida</button>'
        : '<span class="badge badge-neutral">Cerrada</span>';
      return '<tr>' +
        '<td><strong>' + esc(e.placa) + '</strong></td>' +
        '<td>' + esc(e.empresa) + '</td>' +
        '<td>' + esc(e.conductor) + '</td>' +
        '<td>' + esc(e.documento || '—') + '</td>' +
        '<td class="text-center">' + tabletCell + '</td>' +
        '<td class="text-center">' + e.viajes.length + ' (' + cerrados + ' cerrados)</td>' +
        '<td class="text-center">' + (e.estado === 'activa' ? '<span class="badge badge-info">Activa</span>' : '<span class="badge badge-success">Cerrada</span>') + '</td>' +
        '<td class="text-center muted" style="color:var(--gray-500);">' + esc(e.ingresoEn) + '</td>' +
        '<td class="text-center"><div class="row-actions">' + salidaBtn + '</div></td>' +
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
        var e = {
          id: S.genEstadiaId(), empresa: $('#f-empresa').value, tipoCarga: $('#f-carga').value,
          placa: placa, conductor: $('#f-conductor').value || 'Sin registrar',
          documento: $('#f-documento').value || '—',
          destino: $('#f-destino').value,
          tabletId: null, viajes: [], estado: 'activa', ingresoEn: S.nowStr()
        };
        S.estadias.unshift(e);
        S.enqueueSync('Ingreso de tercero', placa);
        S.addActivity('Ingreso registrado', placa + ' · ' + e.empresa, 'ok');
        toast('Estadía registrada para ' + placa + '.', 'success');
        Shell.refreshCurrent();
      });
    });

    UI.on('.js-assign-tablet', 'click', function () {
      var id = this.getAttribute('data-id');
      var e = S.estadias.find(function (x) { return x.id === id; });
      var libres = S.poolAvailable();
      if (libres.length === 0) { toast('No hay tablets disponibles en el pool de terceros.', 'error'); return; }
      var html = '<div class="form-grid">' + fieldSel('Tablet disponible', 'f-tablet', optionList(libres.map(function (t) { return t.id; }))) + '</div>' +
        '<p class="form-hint" style="margin-top:8px;">Solo se listan tablets clasificadas como pool de terceros y disponibles.</p>';
      confirmDialog({ title: 'Asignar tablet temporal', subtitle: e ? e.placa : '', body: html, confirmLabel: 'Asignar' }, function () {
        var tid = $('#f-tablet').value;
        var tablet = S.tablets.find(function (t) { return t.id === tid; });
        tablet.status = 'ocupada';
        e.tabletId = tablet.id;
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: tablet.id + ' asignada temporalmente a patente ' + e.placa + ' (' + e.id + ')', usuario: S.users.garita.name });
        S.addActivity('Tablet asignada', tablet.id + ' → ' + e.placa, 'ok');
        toast('Tablet ' + tablet.id + ' asignada. El conductor ya puede operar el módulo de Terceros.', 'success');
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
      confirmDialog({ title: 'Registrar salida', subtitle: e.placa, body: '<p style="font-size:13.5px;color:var(--gray-600);">Se cerrará la estadía y la tablet asignada volverá automáticamente al pool.</p>' }, function () {
        e.estado = 'cerrada'; e.salidaEn = S.nowStr();
        var tablet = S.tablets.find(function (t) { return t.id === e.tabletId; });
        if (tablet) { tablet.status = 'disponible'; }
        if (S.tabletHistory) S.tabletHistory.unshift({ ts: S.nowStr(), detalle: (tablet ? tablet.id : '') + ' liberada automáticamente al cerrar ' + e.id, usuario: 'Sistema' });
        S.enqueueSync('Salida de tercero', e.placa);
        S.addActivity('Salida registrada', e.placa + ' · estadía cerrada', 'ok');
        toast('Salida registrada. Tablet liberada al pool.', 'success');
        Shell.refreshCurrent();
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
      '<div class="info-row"><span class="label">Tablet asignada</span><span class="value">' + esc(tablet.id) + '</span></div>' +
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
    else btn = '<div class="info-row"><span class="label">Peso neto</span><span class="value" style="color:var(--success-fg);font-size:15px;">' + v.neto.toLocaleString('es-PE') + ' kg</span></div>';
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
        toast('Pesaje cargado registrado.', 'success');
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
        v.neto = Math.max(0, v.cargado.value - v.vacio.value);
        v.estado = 'Cerrado';
        S.enqueueSync('Viaje tercero', v.id);
        S.addActivity('Viaje cerrado', v.id + ' · peso neto ' + v.neto.toLocaleString('es-PE') + ' kg', 'ok');
        toast('Viaje cerrado. Peso neto: ' + v.neto.toLocaleString('es-PE') + ' kg.', 'success');
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
