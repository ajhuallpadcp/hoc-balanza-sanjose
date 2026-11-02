/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   store.js — estado y datos simulados del prototipo (sin backend real)
   ========================================================================= */
(function () {
  "use strict";

  var seq = { ticket: 1, viaje: 1, estadia: 1, tablet: 1, sync: 1 };
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

  var Store = {
    role: 'admin', // admin | garita | propio | tercero
    online: true,

    users: {
      admin: { name: 'Marco Reyes', role: 'Administrador', initials: 'MR' },
      garita: { name: 'Rosa Huamán', role: 'Garita', initials: 'RH' },
      propio: { name: 'Luis Quispe', role: 'Conductor · Propio', initials: 'LQ' },
      tercero: { name: 'Jorge Mamani', role: 'Conductor · Tercero', initials: 'JM' }
    },

    catalogs: {
      tolvas: ['Tolva 1', 'Tolva 2', 'Tolva 3', 'Tolva 4'],
      labores: ['Rampa 785', 'Rampa 812', 'Tajo Norte', 'Tajo Sur'],
      niveles: ['Nv. 1680', 'Nv. 1720', 'Nv. 1750'],
      equiposScoop: ['Scoop-04', 'Scoop-07', 'Scoop-09'],
      operadoresScoop: ['J. Ttito', 'R. Apaza', 'F. Condori'],
      tiposMaterial: ['Mineral', 'Desmonte'],
      puntosIntermedios: ['Bocamina San José', 'Bocamina Norte', 'Cancha Ripio'],
      destinos: ['Cancha de Mineral', 'Botadero Sur', 'Chancadora Primaria'],
      empresasTerceros: ['Transportes Andina S.A.C.', 'Transportes Sur Perú', 'Logística Tacna E.I.R.L.'],
      tiposCargaTerceros: ['Insumos', 'Repuestos', 'Combustible', 'Material de construcción'],
      destinosSector: ['Almacén Central', 'Taller Mina', 'Campamento', 'Polvorín']
    },

    camionesPropios: ['V-101', 'V-104', 'V-108', 'V-112'],

    tablets: [],

    turno: { activo: false, camion: null, turnoNombre: null, tara: null, iniciadoEn: null },

    tickets: [],     // Módulo 2 · Mis Viajes
    estadias: [],    // Módulo 4/5 · Garita y Terceros
    tabletHistory: cloneSeed(INITIAL_TABLET_HISTORY),
    syncQueue: [],   // {id, tipo, referencia, status, ts}
    activity: [],    // feed de actividad reciente

    // ---- helpers de dominio ----
    genTicketId: function () { return nextId('TCK', 'ticket'); },
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
      this.estadias = [];
      this.syncQueue = [];
      this.activity = [];
      this.tablets = cloneSeed(INITIAL_TABLETS);
      this.tabletHistory = cloneSeed(INITIAL_TABLET_HISTORY);
      seq.ticket = 1; seq.viaje = 1; seq.estadia = 1; seq.tablet = 1; seq.sync = 1;
    }
  };

  Store.tablets = cloneSeed(INITIAL_TABLETS);

  window.Store = Store;
})();
