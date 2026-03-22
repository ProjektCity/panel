'use strict';

const UI = (() => {
    function showToast(message, type = 'info') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const icons = {
            success: '<i class="fa-solid fa-circle-check"></i>',
            error: '<i class="fa-solid fa-circle-xmark"></i>',
            warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
            info: '<i class="fa-solid fa-circle-info"></i>',
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, 3500);
    }

    function showModal({ title, body, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-primary', showCancel = true }) {
        const overlay = document.getElementById('modal-overlay');
        document.documentElement.classList.add('no-scroll');
        if (!overlay) return;
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = body;

        const confirmBtn = document.getElementById('modal-confirm');
        confirmBtn.innerHTML = confirmText;
        confirmBtn.className = `btn ${confirmClass}`;
        confirmBtn.onclick = () => {
            closeModal();
            if (onConfirm) onConfirm();
        };

        const cancelBtn = document.getElementById('modal-cancel');
        if (cancelBtn) cancelBtn.style.display = showCancel ? '' : 'none';

        overlay.classList.add('active');
    }

    function closeModal() {
        document.documentElement.classList.remove('no-scroll');
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    function formatDate(d) {
        if (!d) return '-';
        return new Date(d).toLocaleDateString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        });
    }

    function formatDateTime(d) {
        if (!d) return '-';
        return new Date(d).toLocaleString('de-DE', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    function renderFields(fields) {
        if (!fields || typeof fields !== 'object' || !Object.keys(fields).length)
            return '<span class="field-empty">No fields</span>';
        return Object.entries(fields).map(([k, v]) => {
            const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
            return `<div class="field-row">
                <span class="field-key">${label}</span>
                <span class="field-val">${v ?? '-'}</span>
            </div>`;
        }).join('');
    }

    function priorityBadge(p) {
        const icons = { high: 'fa-circle-up', medium: 'fa-circle-right', low: 'fa-circle-down' };
        const map = { high: 'badge-danger', medium: 'badge-warning', low: 'badge-muted' };
        const icon = icons[p] || 'fa-circle-down';
        return `<span class="badge ${map[p] || 'badge-muted'}"><i class="fa-solid ${icon}"></i> ${p || 'low'}</span>`;
    }

    function statusBadge(s) {
        const icons = { todo: 'fa-circle', doing: 'fa-circle-half-stroke', done: 'fa-circle-check' };
        const map = { todo: 'badge-muted', doing: 'badge-info', done: 'badge-success' };
        const labels = { todo: 'To Do', doing: 'In Progress', done: 'Done' };
        const icon = icons[s] || 'fa-circle';
        return `<span class="badge ${map[s] || 'badge-muted'}"><i class="fa-solid ${icon}"></i> ${labels[s] || s}</span>`;
    }

    function setLoading(el, loading) {
        if (!el) return;
        if (loading) {
            el.setAttribute('data-loading', '');
            el.disabled = true;
        } else {
            el.removeAttribute('data-loading');
            el.disabled = false;
        }
    }

    return { showToast, showModal, closeModal, formatDate, formatDateTime, renderFields, priorityBadge, statusBadge, setLoading };
})();
