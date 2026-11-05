/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   store.js — estado y datos simulados del prototipo (sin backend real)
   ========================================================================= */
(function () {
  "use strict";

  var seq = { viaje: 1, estadia: 1, tablet: 1, sync: 1 };

  /* ---------------------------------------------------------------------
     Nomenclatura de tickets (camiones propios y terceros):
       AAAA-1NNNNN Mineral · AAAA-2NNNNN Concentrado · AAAA-3NNNNN Otros materiales
     Un correlativo por categoría y año, compartido entre propios y terceros.
     --------------------------------------------------------------------- */
  var ticketSeq = { 1: 0, 2: 0, 3: 0 };
  function ticketCategoria(material) {
    return material === 'Mineral' ? 1 : material === 'Concentrado' ? 2 : 3;
  }
  function nextTicketId(material, year) {
    var cat = ticketCategoria(material);
    ticketSeq[cat] += 1;
    return (year || new Date().getFullYear()) + '-' + cat + String(ticketSeq[cat]).padStart(5, '0');
  }
  function nextId(prefix, key) {
    var n = seq[key]++;
    return prefix + '-' + String(n).padStart(4, '0');
  }
  function nowStr() {
    var d = new Date();
    return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' }) + ' ' +
      d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }
  function todayStr() {
    var d = new Date();
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  }
  function rand(min, max) { return Math.round(min + Math.random() * (max - min)); }

  var INITIAL_TABLETS = [
    { id: 'TB-0001', code: 'TAB-11', clas: 'fija', camion: 'V-101', status: 'ocupado', since: '02/03/2026' },
    { id: 'TB-0002', code: 'TAB-12', clas: 'fija', camion: 'V-104', status: 'ocupado', since: '02/03/2026' },
    { id: 'TB-0003', code: 'TAB-13', clas: 'fija', camion: null, status: 'sin_asociar', since: '18/08/2026' },
    { id: 'TB-0004', code: 'TAB-21', clas: 'pool', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0005', code: 'TAB-22', clas: 'pool', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0006', code: 'TAB-23', clas: 'pool', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0007', code: 'TAB-30', clas: 'repuesto', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0009', code: 'TAB-31', clas: 'repuesto', camion: null, status: 'sin_asociar', since: '10/05/2026' }
  ];
  var INITIAL_TABLET_HISTORY = [
    { ts: '02/03/2026 08:14', detalle: 'TAB-11 asociada de forma fija a V-101', usuario: 'Marco Reyes' },
    { ts: '02/03/2026 08:20', detalle: 'TAB-12 asociada de forma fija a V-104', usuario: 'Marco Reyes' },
    { ts: '10/05/2026 09:02', detalle: 'TAB-21, TAB-22, TAB-23 configuradas en pool de terceros', usuario: 'Marco Reyes' }
  ];
  function cloneSeed(arr) { return JSON.parse(JSON.stringify(arr)); }

  /* ---------------------------------------------------------------------
     Histórico simulado de tickets de extracción (volquetes propios) para la
     Historial de pesajes del supervisor. Determinístico: misma data en cada carga.
     --------------------------------------------------------------------- */
  var FLOTA_PROPIA = [
    { camion: 'V-101', operador: 'Luis Quispe', taraBase: 10120 },
    { camion: 'V-104', operador: 'Carlos Huanca', taraBase: 9860 },
    { camion: 'V-108', operador: 'Wilber Choque', taraBase: 10480 },
    { camion: 'V-112', operador: 'Edwin Ccama', taraBase: 9730 }
  ];
  var CAT = {
    tolvas: ['Tolva 1', 'Tolva 2', 'Tolva 3', 'Tolva 4'],
    labores: ['Rampa 785', 'Rampa 812', 'Tajo Norte', 'Tajo Sur'],
    niveles: ['Nv. 1680', 'Nv. 1720', 'Nv. 1750'],
    vetas: ['Veta Saavedra', 'Veta Ramal Sur', 'Veta Kospi', 'Veta Frontera'],
    zonas: ['Zona Norte', 'Zona Centro', 'Zona Sur'],
    equiposScoop: ['Scoop-04', 'Scoop-07', 'Scoop-09'],
    operadoresScoop: ['J. Ttito', 'R. Apaza', 'F. Condori'],
    tiposMaterial: ['Mineral', 'Desmonte'],
    puntosIntermedios: ['Bocamina San José', 'Bocamina Norte', 'Cancha Ripio'],
    destinos: ['Cancha de Mineral', 'Botadero Sur', 'Chancadora Primaria']
  };
  function turnoFor(h) {
    return (h >= 7 && h < 15) ? 'Turno Mañana' : (h >= 15 && h < 23) ? 'Turno Tarde' : 'Turno Noche';
  }
  function pad2(n) { return String(n).padStart(2, '0'); }

  function buildRegistrosSeed() {
    // PRNG con semilla fija (mulberry32)
    var a = 20261104;
    function rnd() {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    function between(min, max) { return Math.round(min + rnd() * (max - min)); }

    var list = [];
    var today = new Date();
    for (var back = 6; back >= 0; back--) {
      var day = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      var fecha = pad2(day.getDate()) + '/' + pad2(day.getMonth() + 1) + '/' + day.getFullYear();
      FLOTA_PROPIA.forEach(function (f) {
        var tara = { value: f.taraBase + between(-140, 140), ts: fecha + ' 06:5' + between(0, 9) };
        tara.ocrValue = tara.value;
        if (back === 2 && f.camion === 'V-108') { tara.ocrValue = tara.value - 60; tara.manual = true; }
        var viajes = between(1, 3);
        var hora = between(7, 9);
        for (var v = 0; v < viajes; v++) {
          var min = between(0, 59);
          var material = rnd() < 0.68 ? 'Mineral' : 'Desmonte';
          var destino = material === 'Mineral' ? pick(['Cancha de Mineral', 'Chancadora Primaria']) : 'Botadero Sur';
          var r = rnd();
          var cargado;
          if (r < 0.06) cargado = { value: null, outOfService: true };
          else if (r < 0.14) cargado = { value: tara.value + between(25500, 33000), estimated: true };
          else cargado = { value: tara.value + between(25500, 34500) };
          // Hora del pesaje cargado: 12 minutos después del carguío
          var tm = hora * 60 + min + 12;
          cargado.ts = fecha + ' ' + pad2(Math.floor(tm / 60)) + ':' + pad2(tm % 60);
          if (cargado.value != null && !cargado.estimated) {
            cargado.ocrValue = cargado.value;
            if (min % 7 === 0) { cargado.ocrValue = cargado.value - (min % 2 ? 1 : -1) * (200 + min * 10); cargado.manual = true; }
          }
          var abierto = back === 0 && v === viajes - 1 && rnd() < 0.5;
          list.push({
            tolva: pick(CAT.tolvas), fecha: fecha, horaCarguio: pad2(hora) + ':' + pad2(min), turno: turnoFor(hora),
            nivel: pick(CAT.niveles), veta: pick(CAT.vetas), zona: pick(CAT.zonas), labor: pick(CAT.labores),
            equipoScoop: pick(CAT.equiposScoop), operadorScoop: pick(CAT.operadoresScoop),
            destino: destino, camion: f.camion, operadorCamion: f.operador,
            tipoMaterial: material, puntoIntermedio: pick(CAT.puntosIntermedios),
            tara: tara,
            pesajeCargado: abierto ? null : cargado,
            neto: (abierto || cargado.value == null) ? null : cargado.value - tara.value,
            // Balanza fuera de servicio o peso estimado: el ticket queda En mantenimiento
            estado: abierto ? 'Abierto' : (cargado.outOfService || cargado.estimated) ? 'En mantenimiento' : 'Cerrado',
            descarga: abierto ? null : fecha + ' ' + pad2(hora + 1) + ':' + pad2(min)
          });
          hora += between(2, 3);
        }
      });
    }
    // IDs correlativos por orden cronológico
    list.sort(function (x, y) { return (x.fecha.split('/').reverse().join('') + x.horaCarguio).localeCompare(y.fecha.split('/').reverse().join('') + y.horaCarguio); });
    list.forEach(function (k) { k.id = nextTicketId(k.tipoMaterial, k.fecha.slice(6)); });
    return list;
  }

  /* ---------------------------------------------------------------------
     Tickets de terceros ya cerrados (días anteriores) con varios viajes, para
     demostrar el detalle del ticket en Garita. No ocupan tablets del pool.
     --------------------------------------------------------------------- */
  function buildEstadiasSeed() {
    function dayInfo(back) {
      var d = new Date(); d.setDate(d.getDate() - back);
      return { dm: pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1), iso: d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()), year: d.getFullYear() };
    }
    function w(value, ts, extra, ocr) {
      var o = { value: value, ocrValue: value, ts: ts, hasPhoto: true };
      for (var k in extra || {}) o[k] = extra[k];
      if (ocr != null && ocr !== value) { o.ocrValue = ocr; o.manual = true; } // el conductor editó la lectura
      return o;
    }
    // sentido: cómo ingresa a la balanza; [hEntrada, hIntermedio, hSalida, pesoEntrada, pesoSalida, extra]
    var defs = [
      { back: 2, empresa: 'Transportes Andina S.A.C.', tipoCarga: 'Insumos', placa: 'AF-482-KD', placaSecundaria: 'AE-115-RT',
        conductor: 'Pedro Rojas', documento: '30.458.912', destino: 'Almacén Central', ingreso: '07:12', salida: '15:48', sentido: 'cargado',
        viajes: [['07:40', '08:35', '09:02', 38760, 12940], ['10:15', '11:05', '11:31', 37420, 12880, null, [37060, null]], ['13:20', '14:12', '14:40', 39110, 12910]] },
      { back: 1, empresa: 'Transportes Sur Perú', tipoCarga: 'Concentrado', placa: 'AC-907-LM', placaSecundaria: '',
        conductor: 'Mario Vega', documento: '28.115.604', destino: 'Taller Mina', ingreso: '06:55', salida: '13:20', sentido: 'vacio',
        viajes: [['07:20', '08:10', '08:41', 13050, 41870, null, [null, 41630]], ['10:05', null, null, null, null, { outOfService: true }]] },
      { back: 1, empresa: 'Logística Tacna E.I.R.L.', tipoCarga: 'Combustible', placa: 'AD-233-PQ', placaSecundaria: '',
        conductor: 'Raúl Díaz', documento: '33.902.177', destino: 'Campamento', ingreso: '09:30', salida: '12:05', sentido: 'cargado',
        viajes: [['09:52', '10:40', '11:08', 31240, 14320]] }
    ];
    var list = defs.map(function (d) {
      var day = dayInfo(d.back);
      var viajes = d.viajes.map(function (t) {
        var salidaEst = d.sentido === 'cargado' ? 'vacio' : 'cargado';
        var v = { id: nextId('VJ', 'viaje'), estado: 'Cerrado', sentido: d.sentido, cargado: null, vacio: null, intermedio: null, neto: null };
        if (t[5] && t[5].outOfService) {
          v[d.sentido] = w(null, day.dm + ' ' + t[0], { outOfService: true, fileName: 'evidencia_balanza_fueraservicio.jpg' });
        } else {
          var ocr = t[6] || [];
          v[d.sentido] = w(t[3], day.dm + ' ' + t[0], null, ocr[0]);
          v[salidaEst] = w(t[4], day.dm + ' ' + t[2], null, ocr[1]);
          v.intermedio = day.dm + ' ' + t[1];
          v.neto = Math.abs(t[3] - t[4]);
        }
        return v;
      }).reverse(); // el viaje más reciente primero, como en la operación real
      return {
        id: nextId('EST', 'estadia'), ticket: nextTicketId(d.tipoCarga, day.year),
        empresa: d.empresa, tipoCarga: d.tipoCarga, placa: d.placa, placaSecundaria: d.placaSecundaria,
        conductor: d.conductor, documento: d.documento, pin: String(4100 + d.viajes.length * 37), destino: d.destino,
        tabletId: null, viajes: viajes, estado: 'cerrada',
        ingresoEn: day.dm + ' ' + d.ingreso, ingresoIso: day.iso, salidaEn: day.dm + ' ' + d.salida,
        balanzaFueraServicio: viajes.some(function (v) { return v[v.sentido] && v[v.sentido].outOfService; })
      };
    });
    return list.reverse(); // el ingreso más reciente primero
  }

  var Store = {
    role: 'admin', // admin | garita | propio | tercero | supervisor
    online: true,

    users: {
      admin: { name: 'Marco Reyes', role: 'Administrador', initials: 'MR' },
      garita: { name: 'Rosa Huamán', role: 'Garita', initials: 'RH' },
      propio: { name: 'Luis Quispe', role: 'Conductor · Propio', initials: 'LQ' },
      tercero: { name: 'Jorge Mamani', role: 'Conductor · Tercero', initials: 'JM' },
      supervisor: { name: 'Ana Torres', role: 'Supervisor', initials: 'AT' }
    },

    catalogs: {
      tolvas: ['Tolva 1', 'Tolva 2', 'Tolva 3', 'Tolva 4'],
      labores: ['Rampa 785', 'Rampa 812', 'Tajo Norte', 'Tajo Sur'],
      niveles: ['Nv. 1680', 'Nv. 1720', 'Nv. 1750'],
      vetas: CAT.vetas,
      zonas: CAT.zonas,
      equiposScoop: ['Scoop-04', 'Scoop-07', 'Scoop-09'],
      operadoresScoop: ['J. Ttito', 'R. Apaza', 'F. Condori'],
      tiposMaterial: ['Mineral', 'Desmonte'],
      puntosIntermedios: ['Bocamina San José', 'Bocamina Norte', 'Cancha Ripio'],
      destinos: ['Cancha de Mineral', 'Botadero Sur', 'Chancadora Primaria'],
      empresasTerceros: ['Transportes Andina S.A.C.', 'Transportes Sur Perú', 'Logística Tacna E.I.R.L.'],
      tiposCargaTerceros: ['Concentrado', 'Insumos', 'Repuestos', 'Combustible', 'Material de construcción'],
      destinosSector: ['Almacén Central', 'Taller Mina', 'Campamento', 'Polvorín']
    },

    camionesPropios: ['V-101', 'V-104', 'V-108', 'V-112'],

    tablets: [],

    turno: { activo: false, camion: null, turnoNombre: null, tara: null, iniciadoEn: null },

    tickets: [],     // Módulo 2 · Mis Viajes (turno del conductor en sesión)
    registrosHist: [], // Histórico de tickets de la flota propia (consulta del supervisor en Historial de pesajes)
    flotaPropia: FLOTA_PROPIA,
    turnoFor: turnoFor,
    estadias: [],    // Módulo 4/5 · Garita y Terceros
    tabletHistory: cloneSeed(INITIAL_TABLET_HISTORY),
    syncQueue: [],   // {id, tipo, referencia, status, ts}
    activity: [],    // feed de actividad reciente

    // ---- helpers de dominio ----
    // material: tipo de material (propios) o tipo de carga (terceros)
    genTicketId: function (material) { return nextTicketId(material); },
    ticketCategoria: ticketCategoria,
    genViajeId: function () { return nextId('VJ', 'viaje'); },
    genEstadiaId: function () { return nextId('EST', 'estadia'); },
    genTabletId: function () {
      var max = 0;
      (this.tablets || []).forEach(function (t) {
        var m = String(t.id).match(/TB-(\d+)/);
        if (m) {
          var num = parseInt(m[1], 10);
          if (num > max) max = num;
        }
      });
      return 'TB-' + String(max + 1).padStart(4, '0');
    },

    nowStr: nowStr,
    todayStr: todayStr,

    tabletFor: function (camion) {
      return this.tablets.find(function (t) { return t.clas === 'fija' && t.camion === camion; });
    },
    poolAvailable: function () {
      return this.tablets.filter(function (t) { return t.clas === 'pool' && t.status === 'sin_asociar'; });
    },

    addActivity: function (tipo, detalle, estado) {
      this.activity.unshift({ ts: nowStr(), tipo: tipo, detalle: detalle, estado: estado || 'ok' });
      if (this.activity.length > 30) this.activity.pop();
    },

    enqueueSync: function (tipo, referencia) {
      var item = {
        id: nextId('SYN', 'sync'),
        tipo: tipo,
        referencia: referencia,
        status: this.online ? 'sincronizado' : 'pendiente',
        ts: nowStr()
      };
      this.syncQueue.unshift(item);
      return item;
    },

    pendingCount: function () {
      return this.syncQueue.filter(function (i) { return i.status === 'pendiente' || i.status === 'sincronizando'; }).length;
    },

    // Genera un valor de peso plausible para simular la lectura del display (kg)
    simulateWeight: function (kind) {
      if (kind === 'tara') return rand(8200, 11800);
      if (kind === 'vacio') return rand(8300, 11900);
      return rand(34000, 45500); // cargado
    },
    // Valor estimado por "promedio histórico" simulado ante balanza fuera de servicio
    estimateWeight: function (kind) {
      return this.simulateWeight(kind === 'cargado' ? 'cargado' : (kind === 'vacio' ? 'vacio' : 'tara'));
    },

    // Reinicia el estado transaccional para volver a ejecutar la demo desde cero.
    reset: function () {
      this.turno = { activo: false, camion: null, turnoNombre: null, tara: null, iniciadoEn: null };
      this.tickets = [];
      ticketSeq = { 1: 0, 2: 0, 3: 0 };
      this.registrosHist = buildRegistrosSeed();
      seq.viaje = 1; seq.estadia = 1;
      this.estadias = buildEstadiasSeed();
      this.syncQueue = [];
      this.activity = [];
      this.tablets = cloneSeed(INITIAL_TABLETS);
      this.tabletHistory = cloneSeed(INITIAL_TABLET_HISTORY);
      seq.tablet = 1; seq.sync = 1;
    }
  };

  Store.tablets = cloneSeed(INITIAL_TABLETS);
  Store.registrosHist = buildRegistrosSeed();
  Store.estadias = buildEstadiasSeed();

  window.Store = Store;
})();
