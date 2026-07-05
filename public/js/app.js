// ---------- Guardia de sesión ----------
if (!Api.getToken()) {
  window.location.href = 'login.html';
}

const usuario = Api.getUser();
if (usuario) {
  document.getElementById('user-name').textContent = usuario.nombre || 'Usuario';
  document.getElementById('user-email').textContent = usuario.email || '';
}

document.getElementById('btn-logout').addEventListener('click', () => Api.logout());

// ---------- Utilidades ----------
function money(n) {
  return Number(n || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fecha(d) {
  if (!d) return '—';
  const [y, m, day] = d.slice(0, 10).split('-');
  return `${day}/${m}/${y}`;
}
function hoyISO() { return new Date().toISOString().slice(0, 10); }

const ESTADO_LABEL = {
  pendiente: 'Pendiente', pagado: 'Pagado', anulado: 'Anulado',
  pendiente_entrega: 'Pend. entregar', entregado: 'Entregado',
};
function tagEstado(estado) {
  return `<span class="tag tag-${estado}">${ESTADO_LABEL[estado] || estado}</span>`;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

let toastTimer;
function toast(msg, isError = false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function openModal(html) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `<div class="modal-overlay" id="modal-overlay"><div class="modal">${html}</div></div>`;
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'modal-overlay') closeModal();
  });
}
function closeModal() { document.getElementById('modal-root').innerHTML = ''; }

// ---------- Navegación ----------
const secciones = ['dashboard', 'operarios', 'pagos', 'cobros'];
document.getElementById('nav').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-section]');
  if (!btn) return;
  irASeccion(btn.dataset.section);
});

function irASeccion(nombre) {
  secciones.forEach((s) => {
    document.getElementById(`section-${s}`).hidden = s !== nombre;
  });
  document.querySelectorAll('#nav button').forEach((b) => {
    b.classList.toggle('active', b.dataset.section === nombre);
  });
  if (nombre === 'dashboard') cargarDashboard();
  if (nombre === 'operarios') cargarOperarios();
  if (nombre === 'pagos') cargarPagos();
  if (nombre === 'cobros') cargarCobros();
}

// ---------- Caché ligera de operarios (para selects) ----------
let operariosCache = [];
async function refrescarOperariosCache() {
  operariosCache = await Api.get('/api/operarios?activo=1');
  return operariosCache;
}
function nombreOperario(o) { return `${o.nombre} ${o.apellidos}`; }
function llenarSelectOperarios(select, placeholder) {
  const actual = select.value;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    operariosCache.map((o) => `<option value="${o.id}">${escapeHtml(o.codigo)} · ${escapeHtml(nombreOperario(o))}</option>`).join('');
  if (actual) select.value = actual;
}

// ======================================================
// DASHBOARD
// ======================================================
async function cargarDashboard() {
  try {
    const r = await Api.get('/api/dashboard/resumen');
    const cards = document.querySelectorAll('#dashboard-cards .card');
    cards[0].querySelector('.value').textContent = r.operariosActivos;
    cards[1].querySelector('.value').textContent = money(r.pagos.pendiente_pago);
    cards[1].querySelector('.hint')?.remove();
    cards[1].insertAdjacentHTML('beforeend', `<div class="hint">${r.pagos.num_pendientes} pago(s) pendientes</div>`);
    cards[2].querySelector('.value').textContent = money(r.pagos.pagado_este_mes);
    cards[3].querySelector('.value').textContent = money(r.cobros.pendiente_entregar);
    cards[3].querySelector('.hint')?.remove();
    cards[3].insertAdjacentHTML('beforeend', `<div class="hint">${r.cobros.num_pendientes} cobro(s) sin entregar</div>`);

    const tbody = document.getElementById('dashboard-proximos-pagos');
    if (!r.proximosPagos.length) {
      tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No hay pagos pendientes. Todo al día.</td></tr>`;
    } else {
      tbody.innerHTML = r.proximosPagos.map((p) => `
        <tr>
          <td><span class="code-chip">${escapeHtml(p.codigo)}</span> ${escapeHtml(p.nombre)} ${escapeHtml(p.apellidos)}</td>
          <td>${escapeHtml(p.concepto)}</td>
          <td>${escapeHtml(p.periodo || '—')}</td>
          <td>${fecha(p.fecha_prevista)}</td>
          <td class="text-right money">${money(p.importe)}</td>
        </tr>`).join('');
    }
  } catch (err) { toast(err.message, true); }
}

// ======================================================
// OPERARIOS
// ======================================================
async function cargarOperarios() {
  const q = document.getElementById('op-buscar').value.trim();
  const activo = document.getElementById('op-filtro-activo').value;
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (activo !== '') params.set('activo', activo);

  const tbody = document.getElementById('tabla-operarios');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Cargando…</td></tr>`;
  try {
    const lista = await Api.get(`/api/operarios?${params.toString()}`);
    operariosCache = lista.filter((o) => o.activo);
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No se han encontrado operarios con estos filtros.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((o) => `
      <tr>
        <td><span class="code-chip">${escapeHtml(o.codigo)}</span></td>
        <td>${escapeHtml(nombreOperario(o))}</td>
        <td>${escapeHtml(o.puesto || '—')}</td>
        <td>${escapeHtml(o.tipo_pago)}</td>
        <td class="text-right money">${money(o.tarifa)}</td>
        <td><span class="tag tag-${o.activo ? 'activo' : 'inactivo'}">${o.activo ? 'Activo' : 'De baja'}</span></td>
        <td class="row-actions">
          <button class="btn btn-secondary btn-sm" data-editar-operario="${o.id}">Editar</button>
          ${o.activo ? `<button class="btn btn-danger btn-sm" data-baja-operario="${o.id}">Dar de baja</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Error al cargar operarios.</td></tr>`;
    toast(err.message, true);
  }
}

document.getElementById('op-buscar').addEventListener('input', debounce(cargarOperarios, 300));
document.getElementById('op-filtro-activo').addEventListener('change', cargarOperarios);
document.getElementById('btn-nuevo-operario').addEventListener('click', () => abrirFormOperario());

document.getElementById('tabla-operarios').addEventListener('click', async (e) => {
  const editBtn = e.target.closest('[data-editar-operario]');
  const bajaBtn = e.target.closest('[data-baja-operario]');
  if (editBtn) {
    const o = await Api.get(`/api/operarios/${editBtn.dataset.editarOperario}`);
    abrirFormOperario(o);
  }
  if (bajaBtn) {
    if (!confirm('¿Dar de baja a este operario? Su histórico de pagos se conservará.')) return;
    try {
      await Api.del(`/api/operarios/${bajaBtn.dataset.bajaOperario}`);
      toast('Operario dado de baja.');
      cargarOperarios();
    } catch (err) { toast(err.message, true); }
  }
});

function abrirFormOperario(o) {
  const editando = Boolean(o);
  openModal(`
    <div class="modal-header">
      <h3>${editando ? 'Editar operario' : 'Nuevo operario'}</h3>
      <button class="close-x" id="modal-cerrar">✕</button>
    </div>
    <form id="form-operario">
      <div class="modal-body">
        <div class="form-row">
          <label class="field"><span>Nombre *</span><input required name="nombre" value="${escapeHtml(o?.nombre || '')}"></label>
          <label class="field"><span>Apellidos *</span><input required name="apellidos" value="${escapeHtml(o?.apellidos || '')}"></label>
        </div>
        <div class="form-row">
          <label class="field"><span>DNI / NIE</span><input name="dni" value="${escapeHtml(o?.dni || '')}"></label>
          <label class="field"><span>Teléfono</span><input name="telefono" value="${escapeHtml(o?.telefono || '')}"></label>
        </div>
        <label class="field"><span>Email</span><input type="email" name="email" value="${escapeHtml(o?.email || '')}"></label>
        <label class="field"><span>Puesto</span><input name="puesto" value="${escapeHtml(o?.puesto || '')}"></label>
        <div class="form-row">
          <label class="field"><span>Tipo de pago</span>
            <select name="tipo_pago">
              ${['mensual','quincenal','semanal','por_hora','por_dia'].map((t) => `<option value="${t}" ${o?.tipo_pago === t ? 'selected' : ''}>${t.replace('_', ' ')}</option>`).join('')}
            </select>
          </label>
          <label class="field"><span>Tarifa (€)</span><input type="number" step="0.01" name="tarifa" value="${o?.tarifa ?? 0}"></label>
        </div>
        <label class="field"><span>IBAN</span><input name="iban" value="${escapeHtml(o?.iban || '')}"></label>
        <label class="field"><span>Fecha de alta</span><input type="date" name="fecha_alta" value="${o?.fecha_alta ? o.fecha_alta.slice(0,10) : hoyISO()}"></label>
        <label class="field"><span>Notas</span><textarea name="notas" rows="2">${escapeHtml(o?.notas || '')}</textarea></label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="modal-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">${editando ? 'Guardar cambios' : 'Crear operario'}</button>
      </div>
    </form>
  `);
  document.getElementById('modal-cerrar').addEventListener('click', closeModal);
  document.getElementById('modal-cancelar').addEventListener('click', closeModal);
  document.getElementById('form-operario').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target).entries());
    try {
      if (editando) {
        await Api.put(`/api/operarios/${o.id}`, datos);
        toast('Operario actualizado.');
      } else {
        await Api.post('/api/operarios', datos);
        toast('Operario creado.');
      }
      closeModal();
      cargarOperarios();
    } catch (err) { toast(err.message, true); }
  });
}

// ======================================================
// PAGOS
// ======================================================
async function cargarPagos() {
  await refrescarOperariosCache();
  llenarSelectOperarios(document.getElementById('pago-filtro-operario'), 'Todos los operarios');

  const params = new URLSearchParams();
  const operario_id = document.getElementById('pago-filtro-operario').value;
  const estado = document.getElementById('pago-filtro-estado').value;
  const concepto = document.getElementById('pago-filtro-concepto').value;
  if (operario_id) params.set('operario_id', operario_id);
  if (estado) params.set('estado', estado);
  if (concepto) params.set('concepto', concepto);

  const tbody = document.getElementById('tabla-pagos');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Cargando…</td></tr>`;
  try {
    const lista = await Api.get(`/api/pagos?${params.toString()}`);
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No hay pagos con estos filtros.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((p) => `
      <tr>
        <td><span class="code-chip">${escapeHtml(p.codigo)}</span> ${escapeHtml(p.nombre)} ${escapeHtml(p.apellidos)}</td>
        <td>${escapeHtml(p.concepto)}</td>
        <td>${escapeHtml(p.periodo || '—')}</td>
        <td>${fecha(p.fecha_prevista)}</td>
        <td class="text-right money">${money(p.importe)}</td>
        <td>${tagEstado(p.estado)}</td>
        <td class="row-actions">
          ${p.estado === 'pendiente' ? `<button class="btn btn-primary btn-sm" data-pagar="${p.id}">Marcar pagado</button>
          <button class="btn btn-danger btn-sm" data-anular="${p.id}">Anular</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Error al cargar pagos.</td></tr>`;
    toast(err.message, true);
  }
}

['pago-filtro-operario', 'pago-filtro-estado', 'pago-filtro-concepto'].forEach((id) =>
  document.getElementById(id).addEventListener('change', cargarPagos)
);
document.getElementById('btn-nuevo-pago').addEventListener('click', () => abrirFormPago());

document.getElementById('tabla-pagos').addEventListener('click', async (e) => {
  const pagarBtn = e.target.closest('[data-pagar]');
  const anularBtn = e.target.closest('[data-anular]');
  try {
    if (pagarBtn) {
      await Api.patch(`/api/pagos/${pagarBtn.dataset.pagar}/pagar`);
      toast('Pago marcado como pagado.');
      cargarPagos();
    }
    if (anularBtn) {
      if (!confirm('¿Anular este pago?')) return;
      await Api.patch(`/api/pagos/${anularBtn.dataset.anular}/anular`);
      toast('Pago anulado.');
      cargarPagos();
    }
  } catch (err) { toast(err.message, true); }
});

async function abrirFormPago() {
  await refrescarOperariosCache();
  openModal(`
    <div class="modal-header"><h3>Registrar pago</h3><button class="close-x" id="modal-cerrar">✕</button></div>
    <form id="form-pago">
      <div class="modal-body">
        <label class="field"><span>Operario *</span>
          <select name="operario_id" required id="pago-form-operario"><option value="">Selecciona…</option></select>
        </label>
        <div class="form-row">
          <label class="field"><span>Concepto *</span>
            <select name="concepto" required>
              <option value="nomina">Nómina</option>
              <option value="adelanto">Adelanto</option>
              <option value="extra">Extra</option>
              <option value="otro">Otro</option>
            </select>
          </label>
          <label class="field"><span>Periodo</span><input name="periodo" placeholder="2026-07"></label>
        </div>
        <div class="form-row">
          <label class="field"><span>Importe (€) *</span><input type="number" step="0.01" name="importe" required></label>
          <label class="field"><span>Método</span>
            <select name="metodo"><option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option></select>
          </label>
        </div>
        <label class="field"><span>Fecha prevista</span><input type="date" name="fecha_prevista" value="${hoyISO()}"></label>
        <label class="field"><span>Observaciones</span><textarea name="observaciones" rows="2"></textarea></label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="modal-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar pago</button>
      </div>
    </form>
  `);
  llenarSelectOperarios(document.getElementById('pago-form-operario'), 'Selecciona…');
  document.getElementById('modal-cerrar').addEventListener('click', closeModal);
  document.getElementById('modal-cancelar').addEventListener('click', closeModal);
  document.getElementById('form-pago').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target).entries());
    try {
      await Api.post('/api/pagos', datos);
      toast('Pago registrado.');
      closeModal();
      cargarPagos();
    } catch (err) { toast(err.message, true); }
  });
}

// ======================================================
// COBROS DE CONTADO
// ======================================================
async function cargarCobros() {
  await refrescarOperariosCache();
  llenarSelectOperarios(document.getElementById('cobro-filtro-operario'), 'Todos los operarios');

  const params = new URLSearchParams();
  const operario_id = document.getElementById('cobro-filtro-operario').value;
  const estado = document.getElementById('cobro-filtro-estado').value;
  if (operario_id) params.set('operario_id', operario_id);
  if (estado) params.set('estado', estado);

  const tbody = document.getElementById('tabla-cobros');
  tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Cargando…</td></tr>`;
  try {
    const lista = await Api.get(`/api/cobros?${params.toString()}`);
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No hay cobros con estos filtros.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map((c) => `
      <tr>
        <td><span class="code-chip">${escapeHtml(c.codigo)}</span> ${escapeHtml(c.nombre)} ${escapeHtml(c.apellidos)}</td>
        <td>${escapeHtml(c.cliente || '—')}</td>
        <td>${escapeHtml(c.concepto || '—')}</td>
        <td>${fecha(c.fecha_cobro)}</td>
        <td class="text-right money">${money(c.importe)}</td>
        <td>${tagEstado(c.estado)}</td>
        <td class="row-actions">
          ${c.estado === 'pendiente_entrega' ? `<button class="btn btn-primary btn-sm" data-entregar="${c.id}">Marcar entregado</button>` : ''}
        </td>
      </tr>`).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty-state">Error al cargar cobros.</td></tr>`;
    toast(err.message, true);
  }
}

['cobro-filtro-operario', 'cobro-filtro-estado'].forEach((id) =>
  document.getElementById(id).addEventListener('change', cargarCobros)
);
document.getElementById('btn-nuevo-cobro').addEventListener('click', () => abrirFormCobro());

document.getElementById('tabla-cobros').addEventListener('click', async (e) => {
  const entregarBtn = e.target.closest('[data-entregar]');
  if (entregarBtn) {
    try {
      await Api.patch(`/api/cobros/${entregarBtn.dataset.entregar}/entregar`);
      toast('Cobro marcado como entregado.');
      cargarCobros();
    } catch (err) { toast(err.message, true); }
  }
});

async function abrirFormCobro() {
  await refrescarOperariosCache();
  openModal(`
    <div class="modal-header"><h3>Registrar cobro de contado</h3><button class="close-x" id="modal-cerrar">✕</button></div>
    <form id="form-cobro">
      <div class="modal-body">
        <label class="field"><span>Operario *</span>
          <select name="operario_id" required id="cobro-form-operario"><option value="">Selecciona…</option></select>
        </label>
        <label class="field"><span>Cliente</span><input name="cliente"></label>
        <label class="field"><span>Concepto</span><input name="concepto" placeholder="Ej. Reparación, material…"></label>
        <div class="form-row">
          <label class="field"><span>Importe (€) *</span><input type="number" step="0.01" name="importe" required></label>
          <label class="field"><span>Fecha del cobro *</span><input type="date" name="fecha_cobro" required value="${hoyISO()}"></label>
        </div>
        <label class="field"><span>Observaciones</span><textarea name="observaciones" rows="2"></textarea></label>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" id="modal-cancelar">Cancelar</button>
        <button type="submit" class="btn btn-primary">Registrar cobro</button>
      </div>
    </form>
  `);
  llenarSelectOperarios(document.getElementById('cobro-form-operario'), 'Selecciona…');
  document.getElementById('modal-cerrar').addEventListener('click', closeModal);
  document.getElementById('modal-cancelar').addEventListener('click', closeModal);
  document.getElementById('form-cobro').addEventListener('submit', async (e) => {
    e.preventDefault();
    const datos = Object.fromEntries(new FormData(e.target).entries());
    try {
      await Api.post('/api/cobros', datos);
      toast('Cobro registrado.');
      closeModal();
      cargarCobros();
    } catch (err) { toast(err.message, true); }
  });
}

// ---------- Helpers varios ----------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------- Arranque ----------
cargarDashboard();
