'use strict';

const API = (() => {
	const SUPABASE_URL = 'https://dqkxcahgwalpzgrdqbmc.supabase.co';
	const SUPABASE_KEY = 'sb_publishable__kwdZPx4sNO98utCarQ0fQ_gxGVFChd';

	function getToken() {
		try {
			const s = JSON.parse(localStorage.getItem('pc_session'));
			return s?.access_token || SUPABASE_KEY;
		} catch {
			return SUPABASE_KEY;
		}
	}

	function sbHeaders(extra = {}) {
		return {
			'apikey':        SUPABASE_KEY,
			'Authorization': `Bearer ${getToken()}`,
			'Content-Type':  'application/json',
			...extra,
		};
	}

	// Wrapper around fetch for Supabase endpoints.
	// On a 401 it tries to refresh the session once, then retries.
	// If the refresh also fails, the user is redirected to login.
	async function sbFetch(url, options = {}) {
		const makeOpts = () => ({ ...options, headers: { ...sbHeaders(), ...(options.extraHeaders || {}) } });

		let res = await fetch(url, makeOpts());

		if (res.status === 401) {
			// AUTH is available at call-time even though it's defined after API
			const newSession = await AUTH.refreshSession?.();
			if (!newSession) throw new Error('Session expired');
			res = await fetch(url, makeOpts());
		}

		return res;
	}

	async function signIn(email, password) {
		const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
			method:  'POST',
			headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
			body:    JSON.stringify({ email, password }),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error_description || data.msg || 'Login failed');
		return data;
	}

	async function refreshToken(refresh_token) {
		const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
			method:  'POST',
			headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
			body:    JSON.stringify({ refresh_token }),
		});
		const data = await res.json();
		if (!res.ok) throw new Error(data.error_description || data.msg || 'Refresh failed');
		return data;
	}

	async function signOut(accessToken) {
		await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
			method:  'POST',
			headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${accessToken}` },
		}).catch(() => {});
	}

	async function getDownloads() {
		const res = await fetch('https://api.projektcity.com/api/download');
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}

	async function getTasks() {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/tasks?order=created_at.desc`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}

	async function createTask(task) {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/tasks`, {
			method:       'POST',
			extraHeaders: { 'Prefer': 'return=representation' },
			body:         JSON.stringify(task),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}

	async function updateTask(id, fields) {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`, {
			method:       'PATCH',
			extraHeaders: { 'Prefer': 'return=minimal' },
			body:         JSON.stringify(fields),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return true;
	}

	async function deleteTask(id) {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/tasks?id=eq.${id}`, {
			method: 'DELETE',
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return true;
	}

	async function getChangelog() {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/changelog?id=eq.1`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const rows = await res.json();
		return rows[0] ?? { id: 1, content: '', updated_at: null };
	}

	async function saveChangelog(content) {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/changelog?id=eq.1`, {
			method:       'PATCH',
			extraHeaders: { 'Prefer': 'return=minimal' },
			body:         JSON.stringify({ content, updated_at: new Date().toISOString() }),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return true;
	}

	async function getForms() {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/form_submissions?order=created_at.desc`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return res.json();
	}

	async function markFormDone(id) {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/form_submissions?id=eq.${id}`, {
			method:       'PATCH',
			extraHeaders: { 'Prefer': 'return=minimal' },
			body:         JSON.stringify({ done: true }),
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return true;
	}

	async function deleteForm(id) {
		const res = await sbFetch(`${SUPABASE_URL}/rest/v1/form_submissions?id=eq.${id}`, {
			method: 'DELETE',
		});
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return true;
	}

	return {
		signIn, signOut, refreshToken,
		getDownloads,
		getTasks, createTask, updateTask, deleteTask,
		getChangelog, saveChangelog,
		getForms, markFormDone, deleteForm,
	};
})();