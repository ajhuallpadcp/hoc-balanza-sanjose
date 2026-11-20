/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   store.js — estado y datos simulados del prototipo (sin backend real)
   ========================================================================= */
(function () {
  "use strict";

  var seq = { viaje: 1, estadia: 1, tablet: 1, sync: 1 };

  /* ---------------------------------------------------------------------
     Nomenclatura de tickets (camiones propios y terceros):
       AAAA-NNNNNNNN (ej. 2026-00000006): un único correlativo por año,
     compartido entre propios y terceros, sin dígito de categoría.
     --------------------------------------------------------------------- */
  var ticketSeq = 0;
  function ticketCategoria(material) {
    return material === 'Mineral' ? 1 : material === 'Concentrado' ? 2 : 3;
  }
  function nextTicketId(material, year) {
    ticketSeq += 1;
    return (year || new Date().getFullYear()) + '-' + String(ticketSeq).padStart(8, '0');
  }
  function nextId(prefix, key) {
    var n = seq[key]++;
    // Estadia: EST-AAAA-NNNNNN (correlativo por anio); el resto, PREFIJO-NNNN
    if (prefix === 'EST') return prefix + '-' + new Date().getFullYear() + '-' + String(n).padStart(6, '0');
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
    { id: 'TB-0001', code: 'TAB-11', clas: 'fija', camion: 'AD101VC', status: 'ocupado', since: '02/03/2026' },
    { id: 'TB-0002', code: 'TAB-12', clas: 'fija', camion: 'AD104VC', status: 'ocupado', since: '02/03/2026' },
    { id: 'TB-0003', code: 'TAB-13', clas: 'fija', camion: null, status: 'sin_asociar', since: '18/08/2026' },
    { id: 'TB-0004', code: 'TAB-21', clas: 'pool', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0005', code: 'TAB-22', clas: 'pool', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0006', code: 'TAB-23', clas: 'pool', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0007', code: 'TAB-30', clas: 'repuesto', camion: null, status: 'sin_asociar', since: '10/05/2026' },
    { id: 'TB-0009', code: 'TAB-31', clas: 'repuesto', camion: null, status: 'sin_asociar', since: '10/05/2026' }
  ];
  var INITIAL_TABLET_HISTORY = [
    { ts: '02/03/2026 08:14', detalle: 'TAB-11 asociada de forma fija a AD101VC', usuario: 'Marco Reyes' },
    { ts: '02/03/2026 08:20', detalle: 'TAB-12 asociada de forma fija a AD104VC', usuario: 'Marco Reyes' },
    { ts: '10/05/2026 09:02', detalle: 'TAB-21, TAB-22, TAB-23 configuradas en pool de terceros', usuario: 'Marco Reyes' }
  ];
  function cloneSeed(arr) { return JSON.parse(JSON.stringify(arr)); }

  /* ---------------------------------------------------------------------
     Histórico simulado de tickets de extracción (volquetes propios) para la
     Historial de pesajes del supervisor. Determinístico: misma data en cada carga.
     --------------------------------------------------------------------- */
  var FLOTA_PROPIA = [
    { camion: 'AD101VC', operador: 'Luis Quispe', taraBase: 10120 },
    { camion: 'AD104VC', operador: 'Carlos Huanca', taraBase: 9860 },
    { camion: 'AD108VC', operador: 'Wilber Choque', taraBase: 10480 },
    { camion: 'AD112VC', operador: 'Edwin Ccama', taraBase: 9730 }
  ];
  var CAT = {
    tolvas: ['Tolva 1', 'Tolva 2', 'Tolva 3', 'Tolva 4'],
    // Labores del programa (ejemplos reales de HOC): codigo (tipo + numero + orientacion) - veta - nivel
    labores: ['TJ1231N - FREA - NV 0300', 'SN1834NW - RAMAL KOSPI - NV 0450', 'TJ0630N - RAMAL_HVNA - NV 0450'],
    niveles: ['NV 0300', 'NV 0450'],
    vetas: ['FREA', 'RAMAL KOSPI', 'RAMAL_HVNA'],
    zonas: ['FREA', 'KOSPI', 'HUEVOS VERDES'],
    equiposScoop: ['Scoop-04', 'Scoop-07', 'Scoop-09'],
    operadoresScoop: ['J. Ttito', 'R. Apaza', 'F. Condori'],
    tiposMaterial: ['Mineral', 'Observado'],
    // Estructura de la labor (como en SIO): al elegir la labor se completan su nivel, veta y zona
    laborInfo: {
      'TJ1231N - FREA - NV 0300': { nivel: 'NV 0300', veta: 'FREA', zona: 'FREA' },
      'SN1834NW - RAMAL KOSPI - NV 0450': { nivel: 'NV 0450', veta: 'RAMAL KOSPI', zona: 'KOSPI' },
      'TJ0630N - RAMAL_HVNA - NV 0450': { nivel: 'NV 0450', veta: 'RAMAL_HVNA', zona: 'HUEVOS VERDES' }
    },
    // Datos de ruta (como en SIO): el origen, el intermedio y el destino dependen de la ruta elegida
    rutas: {
      'Superficie': {
        origenes: ['Cancha Mineral 01 (A B C)', 'Cancha Mineral 02', 'Cancha Ripio'],
        intermedios: ['[Sin punto]', 'Cancha Ripio'],
        destinos: ['Cancha Tolva Chancado', 'Chancadora Primaria', 'Botadero Sur']
      },
      'Interior mina': {
        origenes: ['Bocamina San José', 'Bocamina Norte'],
        intermedios: ['[Sin punto]', 'Cancha Intermedia Nv. 1720'],
        destinos: ['Cancha de Mineral', 'Botadero Sur', 'Chancadora Primaria']
      }
    }
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
      [2, 1, '07:50', 'Observado', 'Botadero Sur', 28760],
      [2, 2, '09:40', 'Mineral', 'Chancadora Primaria', 34120, { ocr: 33780 }],
      [2, 3, '10:15', 'Mineral', 'Cancha de Mineral', 30960, { oos: 'cargado' }],
      [1, 0, '07:35', 'Mineral', 'Chancadora Primaria', 32990],
      [1, 1, '08:05', 'Mineral', 'Cancha de Mineral', 30450, { ocr: 30910 }],
      [1, 2, '08:20', 'Observado', 'Botadero Sur', 27310, { oos: 'tara' }],
      [1, 3, '11:10', 'Observado', 'Botadero Sur', 27980],
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
        labor: CAT.labores[(i + 1) % 3], nivel: CAT.laborInfo[CAT.labores[(i + 1) % 3]].nivel,
        veta: CAT.laborInfo[CAT.labores[(i + 1) % 3]].veta, zona: CAT.laborInfo[CAT.labores[(i + 1) % 3]].zona,
        equipoScoop: CAT.equiposScoop[i % 3], operadorScoop: CAT.operadoresScoop[i % 3],
        destino: d[4], camion: f.camion, operadorCamion: f.operador,
        tipoMaterial: d[3], ruta: 'Interior mina', origen: CAT.rutas['Interior mina'].origenes[i % 2],
        puntoIntermedio: CAT.rutas['Interior mina'].intermedios[i % 2],
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
     Estadías de terceros ya cerradas (días anteriores) con varios tickets, para
     demostrar el detalle de la estadía en Garita. No ocupan tablets del pool.
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
      { back: 2, empresa: 'Transportes Andina S.A.C.', tipoCarga: 'Otros materiales', placa: 'AF482KD', placaSecundaria: 'AE115RT',
        conductor: 'Pedro Rojas', documento: '30.458.912', ruta: 'Superficie', origen: 'Cancha Mineral 01 (A B C)', puntoIntermedio: '[Sin punto]', destino: 'Cancha Tolva Chancado', ingreso: '07:12', salida: '15:48', sentido: 'cargado',
        viajes: [['07:40', '08:35', '09:02', 38760, 12940], ['10:15', '11:05', '11:31', 37420, 12880, null, [37060, null]], ['13:20', '14:12', '14:40', 39110, 12910]] },
      { back: 1, empresa: 'Transportes Sur Perú', tipoCarga: 'Concentrado', placa: 'AC907LM', placaSecundaria: '',
        conductor: 'Mario Vega', documento: '28.115.604', ruta: 'Superficie', origen: 'Cancha Mineral 02', puntoIntermedio: 'Cancha Ripio', destino: 'Chancadora Primaria', ingreso: '06:55', salida: '13:20', sentido: 'vacio',
        viajes: [['07:20', '08:10', '08:41', 13050, 41870, null, [null, 41630]], ['10:05', null, null, null, null, { outOfService: true }]] },
      { back: 1, empresa: 'Logística Tacna E.I.R.L.', tipoCarga: 'Otros materiales', placa: 'AD233PQ', placaSecundaria: '',
        conductor: 'Raúl Díaz', documento: '33.902.177', ruta: 'Interior mina', origen: 'Bocamina San José', puntoIntermedio: '[Sin punto]', destino: 'Botadero Sur', ingreso: '09:30', salida: '12:05', sentido: 'cargado',
        viajes: [['09:52', '10:40', '11:08', 31240, 14320]] }
    ];
    var list = defs.map(function (d) {
      var day = dayInfo(d.back);
      var viajes = d.viajes.map(function (t) {
        var salidaEst = d.sentido === 'cargado' ? 'vacio' : 'cargado';
        var v = { id: nextTicketId(d.tipoCarga, day.year), estado: 'Cerrado', sentido: d.sentido, cargado: null, vacio: null, intermedio: null, neto: null };
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
        id: nextId('EST', 'estadia'),
        empresa: d.empresa, tipoCarga: d.tipoCarga, placa: d.placa, placaSecundaria: d.placaSecundaria,
        conductor: d.conductor, documento: d.documento, pin: String(4100 + d.viajes.length * 37),
        ruta: d.ruta, origen: d.origen, puntoIntermedio: d.puntoIntermedio, destino: d.destino,
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
      labores: CAT.labores,
      niveles: CAT.niveles,
      vetas: CAT.vetas,
      zonas: CAT.zonas,
      equiposScoop: ['Scoop-04', 'Scoop-07', 'Scoop-09'],
      operadoresScoop: ['J. Ttito', 'R. Apaza', 'F. Condori'],
      tiposMaterial: ['Mineral', 'Observado'],
      laborInfo: CAT.laborInfo,
      rutas: CAT.rutas,
      empresasTerceros: ['Transportes Andina S.A.C.', 'Transportes Sur Perú', 'Logística Tacna E.I.R.L.'],
      tiposCargaTerceros: ['Concentrado', 'Otros materiales'],
      destinosSector: ['Almacén Central', 'Taller Mina', 'Campamento', 'Polvorín']
    },

    // Codigos de ejemplo de los catalogos de HOC: lo que se envia es el codigo; la pantalla muestra "codigo · nombre"
    codigos: {
      'Tolva 1': 'TV-01', 'Tolva 2': 'TV-02', 'Tolva 3': 'TV-03', 'Tolva 4': 'TV-04',
      'Scoop-04': 'EQ-0104', 'Scoop-07': 'EQ-0107', 'Scoop-09': 'EQ-0109',
      'J. Ttito': 'T00451', 'R. Apaza': 'T00502', 'F. Condori': 'T00618',
      'Mineral': 'MIN', 'Observado': 'OBS', 'Concentrado': 'CON', 'Otros materiales': 'OTR',
      'Superficie': 'SUP', 'Interior mina': 'INT',
      'Cancha Mineral 01 (A B C)': 'CM01', 'Cancha Mineral 02': 'CM02', 'Cancha Ripio': 'CRP',
      'Bocamina San José': 'BSJ', 'Bocamina Norte': 'BNO', 'Cancha Intermedia Nv. 1720': 'CI1720',
      'Cancha Tolva Chancado': 'CTC', 'Chancadora Primaria': 'CHP', 'Botadero Sur': 'BTS', 'Cancha de Mineral': 'CMN',
      'Transportes Andina S.A.C.': 'EMP-01', 'Transportes Sur Perú': 'EMP-02', 'Logística Tacna E.I.R.L.': 'EMP-03',
      'Almacén Central': 'ALC', 'Taller Mina': 'TLM', 'Campamento': 'CMP', 'Polvorín': 'POL'
    },

    camionesPropios: ['AD101VC', 'AD104VC', 'AD108VC', 'AD112VC'],

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
    // Cada viaje de un tercero dentro de la estadía es un ticket (misma nomenclatura que los propios)
    genViajeId: function (material) { return nextTicketId(material); },
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

    // Genera un valor de peso plausible para simular la lectura del display (kg; se muestra en toneladas)
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
      ticketSeq = 0;
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
