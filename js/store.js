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

  var EVIDENCIA_FILE = 'evidencia_balanza_fueraservicio.jpg';

  // Pesaje con balanza fuera de servicio: no hay lectura OCR; el sistema genera un peso
  // estimado (oculto para el conductor) y la foto registrada es la evidencia.
  function pesajeFueraServicio(estimado, ts) {
    return { value: estimado, ocrValue: null, estimated: true, outOfService: true, hasPhoto: true, fileName: EVIDENCIA_FILE, ts: ts };
  }

  function buildRegistrosSeed() {
    var today = new Date();
    function fechaDe(back) {
      var d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
      return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
    }
    function addMin(hhmm, m) {
      var t = Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) + m;
      return pad2(Math.floor(t / 60) % 24) + ':' + pad2(t % 60);
    }
    // 10 tickets de ejemplo: [díasAtrás, camión (índice flota), hora carguío, material, destino, carga neta (kg), extra]
    // extra: ocr = lectura OCR distinta (el conductor corrigió el peso) · oos = 'tara' | 'cargado' · abierto
    var defs = [
      [2, 0, '07:25', 'Mineral', 'Cancha de Mineral', 31840],
      [2, 1, '07:50', 'Desmonte', 'Botadero Sur', 28760],
      [2, 2, '09:40', 'Mineral', 'Chancadora Primaria', 34120, { ocr: 33780 }],
      [2, 3, '10:15', 'Mineral', 'Cancha de Mineral', 30960, { oos: 'cargado' }],
      [1, 0, '07:35', 'Mineral', 'Chancadora Primaria', 32990],
      [1, 1, '08:05', 'Mineral', 'Cancha de Mineral', 30450, { ocr: 30910 }],
      [1, 2, '08:20', 'Desmonte', 'Botadero Sur', 27310, { oos: 'tara' }],
      [1, 3, '11:10', 'Desmonte', 'Botadero Sur', 27980],
      [0, 0, '07:30', 'Mineral', 'Cancha de Mineral', 33410],
      [0, 1, '08:15', 'Mineral', 'Chancadora Primaria', null, { abierto: true }]
    ];
    var list = defs.map(function (d, i) {
      var f = FLOTA_PROPIA[d[1]], fecha = fechaDe(d[0]), hora = d[2], x = d[6] || {};
      var taraVal = f.taraBase + ((i * 37) % 120) - 60;
      var taraTs = fecha + ' 06:5' + (i % 10);
      var tara = x.oos === 'tara' ? pesajeFueraServicio(taraVal, taraTs)
        : { value: taraVal, ocrValue: taraVal, hasPhoto: true, ts: taraTs };
      var cargado = null;
      if (!x.abierto) {
        var bruto = taraVal + d[5];
        var cTs = fecha + ' ' + addMin(hora, 12); // 12 minutos después del carguío
        cargado = x.oos === 'cargado' ? pesajeFueraServicio(bruto, cTs)
          : { value: bruto, ocrValue: x.ocr != null ? taraVal + x.ocr : bruto, manual: x.ocr != null, hasPhoto: true, ts: cTs };
      }
      return {
        tolva: CAT.tolvas[i % 4], fecha: fecha, horaCarguio: hora, turno: turnoFor(Number(hora.slice(0, 2))),
        nivel: CAT.niveles[i % 3], veta: CAT.vetas[i % 4], zona: CAT.zonas[i % 3], labor: CAT.labores[(i + 1) % 4],
        equipoScoop: CAT.equiposScoop[i % 3], operadorScoop: CAT.operadoresScoop[i % 3],
        destino: d[4], camion: f.camion, operadorCamion: f.operador,
        tipoMaterial: d[3], puntoIntermedio: CAT.puntosIntermedios[i % 3],
        tara: tara,
        pesajeCargado: cargado,
        neto: cargado ? cargado.value - tara.value : null,
        // Balanza fuera de servicio (peso estimado): el ticket queda En mantenimiento
        estado: x.abierto ? 'Abierto' : x.oos ? 'En mantenimiento' : 'Cerrado',
        descarga: x.abierto ? null : fecha + ' ' + addMin(hora, 60)
      };
    });
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
    // Completa un pesaje registrado con balanza fuera de servicio: sin OCR, peso estimado por el sistema
    applyFueraServicio: function (res, kind) {
      if (!res || !res.outOfService) return res;
      res.value = this.estimateWeight(kind);
      res.ocrValue = null;
      res.estimated = true;
      res.fileName = res.fileName || EVIDENCIA_FILE;
      return res;
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
