/* =========================================================================
   HOCHSCHILD · CONTROL BALANZA SAN JOSÉ
   shell.js — sidebar, topbar, ruteo de pantallas, rol demo, conectividad
   ========================================================================= */
(function(){
  "use strict";
  var S = window.Store;
  var $ = UI.$, $all = UI.$all, esc = UI.esc, ICON = UI.ICON, toast = UI.toast;

  var NAV = {
    admin:   [ {id:'dashboard', label:'Panel principal', icon:'home'},
               {id:'tablets',   label:'Administración de Tablets', icon:'tablet'} ],
    garita:  [ {id:'dashboard', label:'Panel principal', icon:'home'},
               {id:'garita',    label:'Garita', icon:'gate'} ],
    propio:  [ {id:'dashboard', label:'Panel principal', icon:'home'},
               {id:'misviajes', label:'Mis Viajes', icon:'truck'} ],
    tercero: [ {id:'dashboard', label:'Panel principal', icon:'home'},
               {id:'terceros',  label:'Operación de Terceros', icon:'users'} ]
  };

  var TITLES = {
    dashboard: ['Panel principal', 'Resumen operativo del turno en curso'],
    misviajes: ['Mis Viajes', 'Volquetes propios · mineral y desmonte'],
    tablets:   ['Administración de Tablets', 'Enrolamiento, clasificación y asociación de dispositivos'],
    garita:    ['Garita', 'Ingreso, estadía y asignación de tablets a terceros'],
    terceros:  ['Operación de Volquetes de Terceros', 'Viajes dentro de la estadía asignada']
  };

  var RENDERERS = {}; // registrado por cada módulo: RENDERERS.dashboard = function(){...}
  var current = 'dashboard';

  function renderSidebar(){
    var items = NAV[S.role];
    var html = items.map(function(item){
      return '<li class="sidebar__link' + (item.id === current ? ' is-active' : '') + '" data-nav="' + item.id + '">' +
        ICON[item.icon] + '<span>' + esc(item.label) + '</span></li>';
    }).join('');
    $('#sidebar-nav').innerHTML = html;
    UI.on('[data-nav]', 'click', function(){ navigateTo(this.getAttribute('data-nav')); }, $('#sidebar-nav'));
  }

  function renderTopbar(){
    var u = S.users[S.role];
    $('#user-chip-avatar').textContent = u.initials;
    $('#user-chip-name').textContent = u.name;
    $('#user-chip-role').textContent = u.role;
    $('#role-select').value = S.role;
    updateConnPill();
    updateSyncBadge();
  }

  function updateConnPill(){
    var pill = $('#conn-toggle');
    pill.classList.toggle('is-offline', !S.online);
    $('#conn-toggle-label').textContent = S.online ? 'En línea' : 'Sin conexión';
  }

  function updateSyncBadge(){
    var n = S.pendingCount();
    var badge = $('#sync-badge');
    if(n > 0){ badge.style.display = 'flex'; badge.textContent = n; }
    else { badge.style.display = 'none'; }
  }

  function renderSyncPanel(){
    var panel = $('#sync-panel');
    if(S.syncQueue.length === 0){
      panel.innerHTML = '<div class="sync-panel__head">Sincronización</div><div class="sync-panel__empty">Sin operaciones registradas todavía.</div>';
      return;
    }
    var rows = S.syncQueue.slice(0, 12).map(function(i){
      var badge = i.status === 'pendiente' ? '<span class="badge badge-warning">Pendiente</span>' :
                  i.status === 'sincronizando' ? '<span class="badge badge-info">Sincronizando</span>' :
                  i.status === 'error' ? '<span class="badge badge-danger">Error</span>' :
                  '<span class="badge badge-success">Sincronizado</span>';
      return '<div class="sync-panel__item"><div><strong style="font-weight:600;">' + esc(i.tipo) + '</strong><br><span class="muted" style="color:var(--gray-500);">' + esc(i.referencia) + ' · ' + esc(i.ts) + '</span></div>' + badge + '</div>';
    }).join('');
    panel.innerHTML = '<div class="sync-panel__head">Cola de sincronización (RF048-RF051)</div>' + rows;
  }

  function navigateTo(screenId){
    current = screenId;
    var t = TITLES[screenId];
    $('#topbar-title').textContent = t[0];
    $('#topbar-subtitle').textContent = t[1];
    renderSidebar();
    var fn = RENDERERS[screenId];
    $('#content').innerHTML = '';
    if(fn) fn($('#content'));
  }

  function refreshCurrent(){ navigateTo(current); }

  function switchRole(role, screen){
    S.role = role;
    toast('Ahora estás viendo el sistema como ' + S.users[role].role + '.', 'info');
    renderTopbar();
    navigateTo(screen || 'dashboard');
  }

  function setOnline(isOnline){
    var was = S.online;
    S.online = isOnline;
    updateConnPill();
    if(isOnline && !was && S.syncQueue.some(function(i){ return i.status === 'pendiente'; })){
      var pending = S.syncQueue.filter(function(i){ return i.status === 'pendiente'; });
      pending.forEach(function(i){ i.status = 'sincronizando'; });
      updateSyncBadge(); renderSyncPanel();
      setTimeout(function(){
        pending.forEach(function(i){ i.status = 'sincronizado'; });
        updateSyncBadge(); renderSyncPanel();
        toast(pending.length + ' operación(es) sincronizada(s) automáticamente al recuperar conexión.', 'success');
        refreshCurrent();
      }, 1100);
    } else {
      updateSyncBadge();
    }
  }

  var booted = false;
  function boot(){
    if(booted) { renderTopbar(); renderSidebar(); navigateTo(current); return; }
    booted = true;
    // Conectividad
    $('#conn-toggle').addEventListener('click', function(){ setOnline(!S.online); });
    // Panel de sincronización
    $('#sync-btn').addEventListener('click', function(e){
      e.stopPropagation();
      renderSyncPanel();
      $('#sync-panel').classList.toggle('is-open');
    });
    document.addEventListener('click', function(e){
      var panel = $('#sync-panel');
      if(panel.classList.contains('is-open') && !panel.contains(e.target) && e.target.id !== 'sync-btn'){
        panel.classList.remove('is-open');
      }
    });
    // Selector de rol (demo)
    $('#role-select').addEventListener('change', function(){ switchRole(this.value); });
    // Logout
    $('#logout-btn').addEventListener('click', function(){
      UI.confirmDialog({
        title: 'Cerrar sesión',
        body: '<p style="font-size:13.5px;color:var(--gray-600);">¿Deseas cerrar la sesión actual y reiniciar la demostración?</p>',
        confirmLabel: 'Cerrar sesión'
      }, function(){
        S.reset();
        S.online = true;
        window.sessionStorage.removeItem('hoc_session');
        window.location.replace('index.html');
      });
    });

    renderTopbar();
    renderSidebar();
    navigateTo('dashboard');
  }

  window.Shell = {
    NAV: NAV, navigateTo: navigateTo, refreshCurrent: refreshCurrent, switchRole: switchRole,
    registerRenderer: function(id, fn){ RENDERERS[id] = fn; },
    boot: boot
  };
})();
