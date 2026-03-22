(function() {
	if (typeof AUTH !== 'undefined') AUTH.initTopBar?.();

	const editor = document.getElementById('cl-editor');
	const preview = document.getElementById('cl-preview');
	const saveBtn = document.getElementById('cl-save-btn');
	const exportBtn = document.getElementById('cl-export-btn');
	const statusEl = document.getElementById('cl-status');
	let autoSaveCount = 0;

	let statusTimer;

	function setStatus(msg, duration = 2500) {
		if (!statusEl) return;
		statusEl.textContent = msg;
		clearTimeout(statusTimer);
		if (duration) statusTimer = setTimeout(() => {
			statusEl.textContent = '';
		}, duration);
	}

	function updatePreview() {
		const raw = editor.value;
		preview.classList.remove('loading');
		if (!raw.trim()) {
			preview.innerHTML = '';
			preview.classList.add('is-empty');
		} else {
			preview.classList.remove('is-empty');
			preview.innerHTML = raw;
		}
	}
	editor.addEventListener('input', updatePreview);

	(async function loadChangelog() {
		setStatus('Loading…', 0);
		try {
			const row = await API.getChangelog();
			editor.value = row.content || '';
			updatePreview();
			setStatus('');
		} catch (err) {
			setStatus('⚠ Could not load');
			preview.classList.remove('loading');
			preview.classList.add('is-empty');
		}
	})();

	async function autoSave() {
		if (!editor.value.trim()) return;
		try {
			await API.saveChangelog(editor.value);
			autoSaveCount++;
			if (autoSaveCount === 5) {
				setStatus('✓ Auto-saved');
				autoSaveCount = 0;
			}
		} catch (err) {
			setStatus('⚠ Auto-save failed');
		}
	}

	setInterval(autoSave, 5000);

	saveBtn?.addEventListener('click', async () => {
		saveBtn.disabled = true;
		setStatus('Saving…', 0);
		try {
			await API.saveChangelog(editor.value);
			setStatus('✓ Saved');
		} catch (err) {
			setStatus('⚠ Save failed');
			if (typeof UI !== 'undefined') UI.showToast('Save failed: ' + err.message, 'error');
		} finally {
			saveBtn.disabled = false;
		}
	});

	exportBtn?.addEventListener('click', () => {
		const raw = editor.value.trim();
		if (!raw) {
			setStatus('⚠ Nothing to export');
			return;
		}
		const tmp = document.createElement('div');
		tmp.innerHTML = raw;
		const text = tmp.innerText || tmp.textContent || raw;
		const blob = new Blob([text], {
			type: 'text/plain;charset=utf-8'
		});
		const url = URL.createObjectURL(blob);
		const a = Object.assign(document.createElement('a'), {
			href: url,
			download: 'changelog.txt'
		});
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		setStatus('✓ Exported');
	});

	function wrap(open, close) {
		const s = editor.selectionStart;
		const e = editor.selectionEnd;
		const sel = editor.value.substring(s, e);
		editor.setRangeText(open + sel + close, s, e, 'select');
		if (s === e) editor.setSelectionRange(s + open.length, s + open.length);
		editor.focus();
		updatePreview();
	}

	function insert(text) {
		const s = editor.selectionStart;
		editor.setRangeText(text, s, editor.selectionEnd, 'end');
		editor.focus();
		updatePreview();
	}

	function insertLink() {
		const url = prompt('Enter URL:', 'https://');
		if (url === null) return;
		wrap(`<a href="${url}">`, '</a>');
	}

	const tbActions = {
		'tb-strong': () => wrap('<strong>', '</strong>'),
		'tb-em': () => wrap('<em>', '</em>'),
		'tb-u': () => wrap('<u>', '</u>'),
		'tb-h1': () => wrap('<h1>', '</h1>'),
		'tb-h2': () => wrap('<h2>', '</h2>'),
		'tb-h3': () => wrap('<h3>', '</h3>'),
		'tb-p': () => wrap('<p>', '</p>'),
		'tb-ul': () => insert('<ul>\n  <li></li>\n</ul>\n'),
		'tb-ol': () => insert('<ol>\n  <li></li>\n</ol>\n'),
		'tb-li': () => wrap('<li>', '</li>'),
		'tb-code': () => wrap('<code>', '</code>'),
		'tb-pre': () => wrap('<pre><code>', '</code></pre>'),
		'tb-a': insertLink,
		'tb-hr': () => insert('\n<hr>\n'),
		'tb-br': () => insert('<br>\n'),
		'tb-span': () => wrap('<span>', '</span>'),
		'tb-div': () => wrap('<div>', '</div>'),
	};

	Object.entries(tbActions).forEach(([id, fn]) => {
		const el = document.getElementById(id);
		if (!el) return;
		const fresh = el.cloneNode(true);
		el.replaceWith(fresh);
		fresh.addEventListener('click', fn);
	});

})();
