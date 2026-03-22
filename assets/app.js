'use strict';

function escHtml(s) {
	if (s == null) return '';
	return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function uid() { return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2,7); }
function sortVersions(arr) {
	return arr.sort((a, b) => {
		const p = v => { const m = String(v).match(/(\d+)\.(\d+)/); return m ? [+m[1],+m[2]] : [0,0]; };
		const [am,an] = p(a), [bm,bn] = p(b);
		return bm - am || bn - an;
	});
}

function initLogin() {
	if (AUTH.getSession()) { window.location.href = '/'; return; }

	const form  = document.getElementById('login-form');
	const errEl = document.getElementById('login-error');
	const btnEl = document.getElementById('login-btn');

	form?.addEventListener('submit', async e => {
		e.preventDefault();
		const email    = document.getElementById('login-email').value.trim();
		const password = document.getElementById('login-password').value;

		btnEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Signing in…';
		btnEl.disabled  = true;
		errEl.classList.remove('show');

		try {
			await AUTH.login(email, password);
			window.location.href = '/';
		} catch (err) {
			errEl.textContent = err.message || 'Invalid email or password.';
			errEl.classList.add('show');
			btnEl.innerHTML = 'Sign In';
			btnEl.disabled  = false;
		}
	});
}

async function initDashboard() {
	const session = AUTH.requireAuth();
	if (!session) return;

	const dlEl = document.getElementById('stat-downloads');
	if (dlEl) {
		try {
			const data = await API.getDownloads();
			animateCount(dlEl, data.total ?? 0);
		} catch { dlEl.textContent = '-'; }
	}

	try {
		const tasks = await API.getTasks();
		animateCount(document.getElementById('stat-total'), tasks.length);
		animateCount(document.getElementById('stat-open'),  tasks.filter(t => t.status !== 'done').length);
		animateCount(document.getElementById('stat-done'),  tasks.filter(t => t.status === 'done').length);

		const rtEl = document.getElementById('recent-tasks');
		if (rtEl) {
			const recent = tasks.slice(0, 5);
			rtEl.innerHTML = recent.length
				? recent.map(t => `
					<div class="activity-item">
						<div class="activity-info">
							<span class="activity-title">${escHtml(t.title)}</span>
							<span class="activity-meta">${escHtml(t.version)} &middot; ${UI.priorityBadge(t.priority)}</span>
						</div>
						${UI.statusBadge(t.status)}
					</div>`).join('')
				: '<p class="empty-state">No tasks yet</p>';
		}
	} catch {
		['stat-total','stat-open','stat-done'].forEach(id => {
			const el = document.getElementById(id);
			if (el) el.textContent = '-';
		});
	}

	const rfEl = document.getElementById('recent-forms');
	if (rfEl) {
		rfEl.innerHTML = '<div class="loading-pulse">Loading…</div>';
		try {
			const forms = await API.getForms();
			rfEl.innerHTML = forms.slice(0,5).length
				? forms.slice(0,5).map(f => {
					const fields  = parseFields(f.fields);
					const preview = fields.title || fields.name || f.type || 'Submission';
					return `
						<div class="activity-item">
							<div class="activity-info">
								<span class="activity-title">${escHtml(preview)}</span>
								<span class="activity-meta">${escHtml(f.type||'form')} &middot; ${UI.formatDate(f.created_at)}</span>
							</div>
							<span class="badge ${f.done?'badge-success':'badge-warning'}">${f.done?'Done':'Open'}</span>
						</div>`;
				}).join('')
				: '<p class="empty-state">No submissions yet</p>';
		} catch {
			rfEl.innerHTML = '<p class="empty-state muted">Could not load submissions</p>';
		}
	}
}

function animateCount(el, target) {
	if (!el) return;
	const step = Math.max(1, Math.ceil(target / 40));
	let cur = 0;
	const t = setInterval(() => {
		cur = Math.min(cur + step, target);
		el.textContent = cur.toLocaleString();
		if (cur >= target) clearInterval(t);
	}, 20);
}

let currentVersion = 'all';
let draggedId      = null;
let allTasks       = [];

function initTasks() {
	const session = AUTH.requireAuth();
	if (!session) return;
	loadTasks();
	document.getElementById('create-task-btn')?.addEventListener('click', () => openTaskModal(null));
}

async function loadTasks() {
	try {
		allTasks = await API.getTasks();
	} catch (err) {
		UI.showToast('Could not load tasks: ' + err.message, 'error');
		allTasks = [];
	}
	renderVersionTabs();
	renderKanban();
}

function getVersionList() {
	const vs = [...new Set(allTasks.map(t => t.version).filter(Boolean))];
	return sortVersions(vs);
}

function renderVersionTabs() {
	const el = document.getElementById('version-tabs');
	if (!el) return;
	const versions = getVersionList();
	el.innerHTML = `
		<button class="tab-btn${currentVersion==='all'?' active':''}" data-v="all">All</button>
		${versions.map(v=>`<button class="tab-btn${currentVersion===v?' active':''}" data-v="${v}">${v}</button>`).join('')}
	`;
	el.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
		currentVersion = btn.dataset.v;
		el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		renderKanban();
	}));
}

function renderKanban() {
	const tasks = allTasks.filter(t => currentVersion === 'all' || t.version === currentVersion);
	const cols  = { todo: [], doing: [], done: [] };
	tasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });

	['todo','doing','done'].forEach(status => {
		const col = document.getElementById(`col-${status}`);
		if (!col) return;
		const list    = col.querySelector('.task-list');
		const countEl = col.querySelector('.col-count');
		if (countEl) countEl.textContent = cols[status].length;
		if (!list) return;

		list.innerHTML = cols[status].length
			? cols[status].map(renderTaskCard).join('')
			: `<div class="empty-col">No tasks</div>`;

		list.querySelectorAll('.task-card').forEach(card => {
			card.addEventListener('dragstart', e => {
				draggedId = card.dataset.id;
				card.classList.add('dragging');
				e.dataTransfer.effectAllowed = 'move';
			});
			card.addEventListener('dragend', () => {
				card.classList.remove('dragging');
				document.querySelectorAll('.kanban-col').forEach(c => c.classList.remove('drag-over'));
			});
			card.querySelector('.edit-btn')?.addEventListener('click',   e => { e.stopPropagation(); openTaskModal(card.dataset.id); });
			card.querySelector('.delete-btn')?.addEventListener('click', e => { e.stopPropagation(); confirmDeleteTask(card.dataset.id); });
		});
	});

	document.querySelectorAll('.kanban-col').forEach(col => {
		col.ondragover  = e => { e.preventDefault(); col.classList.add('drag-over'); };
		col.ondragleave = () => col.classList.remove('drag-over');
		col.ondrop      = async e => {
			e.preventDefault();
			col.classList.remove('drag-over');
			if (!draggedId) return;
			const newStatus = col.dataset.status;
			const task = allTasks.find(t => t.id === draggedId);
			if (task && task.status !== newStatus) {
				task.status = newStatus;
				renderKanban();
				try {
					await API.updateTask(task.id, { status: newStatus });
					const labels = { todo: 'To Do', doing: 'In Progress', done: 'Done' };
					UI.showToast(`Moved to "${labels[newStatus] || newStatus}"`, 'success');
				} catch (err) {
					UI.showToast('Failed to update: ' + err.message, 'error');
					loadTasks();
				}
			}
			draggedId = null;
		};
	});
}

function renderTaskCard(task) {
	return `
		<div class="task-card" data-id="${task.id}" draggable="true">
			<div class="task-card-top">
				<span class="task-version">${escHtml(task.version)}</span>
				${UI.priorityBadge(task.priority)}
			</div>
			<div class="task-title">${escHtml(task.title)}</div>
			${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
			<div class="task-card-bottom">
				<span class="task-date">${UI.formatDate(task.created_at)}</span>
				<div class="task-actions">
					<button class="icon-btn edit-btn"   title="Edit"><i class="fa-solid fa-pen"></i></button>
					<button class="icon-btn delete-btn" title="Delete"><i class="fa-solid fa-trash"></i></button>
				</div>
			</div>
		</div>`;
}

function openTaskModal(taskId) {
	const task    = taskId ? allTasks.find(t => t.id === taskId) : null;
	const allVers = [...new Set(['v1.0','v2.0','v3.0',...getVersionList()])];

	UI.showModal({
		title:       task ? 'Edit Task' : 'Create Task',
		confirmText: task
			? '<i class="fa-solid fa-floppy-disk"></i> Save Changes'
			: '<i class="fa-solid fa-plus"></i> Create Task',
		body: `
			<div class="form-group">
				<label class="form-label">Title <span class="req">*</span></label>
				<input type="text" id="tf-title" class="form-input" placeholder="Task title…" value="${escHtml(task?.title||'')}" autofocus>
			</div>
			<div class="form-group">
				<label class="form-label">Description</label>
				<textarea id="tf-desc" class="form-input form-textarea" placeholder="What needs to be done?">${escHtml(task?.description||'')}</textarea>
			</div>
			<div class="form-row">
				<div class="form-group">
					<label class="form-label">Status</label>
					<select id="tf-status" class="form-input form-select">
						<option value="todo"  ${task?.status==='todo' ?'selected':''}>To Do</option>
						<option value="doing" ${task?.status==='doing'?'selected':''}>In Progress</option>
						<option value="done"  ${task?.status==='done' ?'selected':''}>Done</option>
					</select>
				</div>
				<div class="form-group">
					<label class="form-label">Priority</label>
					<select id="tf-priority" class="form-input form-select">
						<option value="low"    ${task?.priority==='low'   ?'selected':''}>Low</option>
						<option value="medium" ${task?.priority==='medium'?'selected':''}>Medium</option>
						<option value="high"   ${task?.priority==='high'  ?'selected':''}>High</option>
					</select>
				</div>
			</div>
			<div class="form-group">
				<label class="form-label">Version</label>
				<select id="tf-version" class="form-input form-select">
					${allVers.map(v=>`<option value="${v}" ${task?.version===v?'selected':''}>${v}</option>`).join('')}
				</select>
			</div>`,
		onConfirm: async () => {
			const title = document.getElementById('tf-title')?.value.trim();
			if (!title) { UI.showToast('Title is required', 'error'); return; }
			const payload = {
				title,
				description: document.getElementById('tf-desc')?.value.trim() || '',
				status:      document.getElementById('tf-status')?.value   || 'todo',
				priority:    document.getElementById('tf-priority')?.value || 'medium',
				version:     document.getElementById('tf-version')?.value  || 'v1.0',
			};
			try {
				if (task) {
					await API.updateTask(task.id, payload);
					UI.showToast('Task updated', 'success');
				} else {
					await API.createTask({ id: uid(), ...payload });
					UI.showToast('Task created', 'success');
				}
				loadTasks();
			} catch (err) {
				UI.showToast('Error: ' + err.message, 'error');
			}
		},
	});
}

function confirmDeleteTask(taskId) {
	UI.showModal({
		title:       'Delete Task',
		body:        '<p>Are you sure? This cannot be undone.</p>',
		confirmText: '<i class="fa-solid fa-trash"></i> Delete',
		confirmClass:'btn-danger',
		onConfirm:   async () => {
			try {
				await API.deleteTask(taskId);
				allTasks = allTasks.filter(t => t.id !== taskId);
				renderVersionTabs();
				renderKanban();
				UI.showToast('Task deleted', 'success');
			} catch (err) {
				UI.showToast('Error: ' + err.message, 'error');
			}
		},
	});
}

let inboxData = [];

function initInbox() {
	const session = AUTH.requireAuth();
	if (!session) return;
	loadInbox();
	document.getElementById('refresh-btn')?.addEventListener('click', loadInbox);
	document.getElementById('filter-done')?.addEventListener('change', renderInbox);
}

async function loadInbox() {
	const el = document.getElementById('inbox-list');
	if (!el) return;
	el.innerHTML = '<div class="loading-pulse">Fetching submissions…</div>';
	try {
		inboxData = await API.getForms();
		renderInbox();
	} catch (err) {
		el.innerHTML = `
			<div class="error-state">
				<div class="error-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
				<p>Could not load submissions.</p>
				<p class="muted">${escHtml(err.message)}</p>
			</div>`;
	}
}

function renderInbox() {
	const el = document.getElementById('inbox-list');
	if (!el) return;

	const showDone = document.getElementById('filter-done')?.checked;
	const data     = showDone ? inboxData : inboxData.filter(f => !f.done);

	const safe = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
	safe('inbox-total', inboxData.length);
	safe('inbox-open',  inboxData.filter(f=>!f.done).length);
	safe('inbox-done',  inboxData.filter(f=> f.done).length);

	if (!data.length) { el.innerHTML = '<p class="empty-state">No submissions to show</p>'; return; }

	el.innerHTML = data.map(f => {
		const fields = parseFields(f.fields);
		return `
			<div class="inbox-card${f.done?' is-done':''}" data-id="${f.id}">
				<div class="inbox-card-header">
					<span class="inbox-type">${escHtml(f.type||'form')}</span>
					<span class="inbox-ts">${UI.formatDateTime(f.created_at)}</span>
					<span class="badge ${f.done?'badge-success':'badge-warning'}">${f.done?'Done':'Open'}</span>
				</div>
				<div class="inbox-fields">${UI.renderFields(fields)}</div>
				<div class="inbox-actions">
					${!f.done?`<button class="btn btn-sm btn-success mark-done-btn" data-id="${f.id}">
						<i class="fa-solid fa-check"></i> Done
					</button>`:''}
					<button class="btn btn-sm btn-outline convert-btn"
						data-id="${f.id}"
						data-title="${escHtml(fields.title||f.type||'')}"
						data-desc="${escHtml(fields.description||'')}">
						<i class="fa-solid fa-arrow-up-right-from-square"></i> To Task
					</button>
					<button class="btn btn-sm btn-danger delete-form-btn" data-id="${f.id}">
						<i class="fa-solid fa-trash"></i> Delete
					</button>
				</div>
			</div>`;
	}).join('');

	el.querySelectorAll('.mark-done-btn').forEach(btn => btn.addEventListener('click',   () => markDone(btn.dataset.id)));
	el.querySelectorAll('.delete-form-btn').forEach(btn => btn.addEventListener('click', () => confirmDeleteForm(btn.dataset.id)));
	el.querySelectorAll('.convert-btn').forEach(btn => btn.addEventListener('click',     () => convertToTask(btn.dataset.id, btn.dataset.title, btn.dataset.desc)));
}

async function markDone(id) {
	const btn = document.querySelector(`.mark-done-btn[data-id="${id}"]`);
	UI.setLoading(btn, true);
	try {
		await API.markFormDone(id);
		const entry = inboxData.find(f => String(f.id) === String(id));
		if (entry) entry.done = true;
		renderInbox();
		UI.showToast('Marked as done', 'success');
	} catch (err) {
		UI.showToast('Failed: ' + err.message, 'error');
		UI.setLoading(btn, false);
	}
}

function confirmDeleteForm(id) {
	UI.showModal({
		title:       'Delete Submission',
		body:        '<p>Permanently delete this form submission?</p>',
		confirmText: '<i class="fa-solid fa-trash"></i> Delete',
		confirmClass:'btn-danger',
		onConfirm:   async () => {
			try {
				await API.deleteForm(id);
				inboxData = inboxData.filter(f => String(f.id) !== String(id));
				renderInbox();
				UI.showToast('Submission deleted', 'success');
			} catch (err) {
				UI.showToast('Failed: ' + err.message, 'error');
			}
		},
	});
}

async function convertToTask(formId, title, desc) {
	try {
		await API.createTask({
			id:          uid(),
			title:       title || `Submission #${formId}`,
			description: desc || '',
			status:      'todo',
			version:     'v1.0',
			priority:    'medium',
		});
		UI.showToast('Converted to task', 'success');
	} catch (err) {
		UI.showToast('Failed: ' + err.message, 'error');
	}
}

function parseFields(raw) {
	if (!raw) return {};
	if (typeof raw === 'object') return raw;
	try { return JSON.parse(raw); } catch { return {}; }
}

document.addEventListener('DOMContentLoaded', () => {
	const overlay = document.getElementById('modal-overlay');
	overlay?.addEventListener('click', e => { if (e.target === overlay) UI.closeModal(); });
	document.getElementById('modal-cancel')?.addEventListener('click', UI.closeModal);

	const page = window.location.pathname.split('/').pop() || 'index.html';
	if      (page === 'login.html')  initLogin();
	else if (page === 'index.html' || page === '') initDashboard();
	else if (page === 'tasks.html')  initTasks();
	else if (page === 'inbox.html')  initInbox();
});