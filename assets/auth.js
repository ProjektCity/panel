'use strict';

const AUTH = (() => {
    const SESSION_KEY = 'pc_session';

    async function login(email, password) {
        const data = await API.signIn(email, password);
        const session = {
            id:            data.user.id,
            email:         data.user.email,
            name:          data.user.user_metadata?.name || data.user.email.split('@')[0],
            access_token:  data.access_token,
            refresh_token: data.refresh_token,
            expires_at:    Date.now() + (data.expires_in ?? 3600) * 1000,
            loginAt:       Date.now(),
        };
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        return session;
    }

    async function logout() {
        const session = getSession();
        if (session?.access_token) await API.signOut(session.access_token).catch(() => {});
        localStorage.removeItem(SESSION_KEY);
        window.location.href = 'login.html';
    }

    function getSession() {
        try {
            return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
        } catch {
            return null;
        }
    }

    async function refreshSession() {
        const session = getSession();
        if (!session?.refresh_token) {
            await logout();
            return null;
        }
        try {
            const data = await API.refreshToken(session.refresh_token);
            const updated = {
                ...session,
                access_token:  data.access_token,
                refresh_token: data.refresh_token || session.refresh_token,
                expires_at:    Date.now() + (data.expires_in ?? 3600) * 1000,
            };
            localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
            return updated;
        } catch {
            await logout();
            return null;
        }
    }

    function requireAuth() {
        const session = getSession();
        if (!session) {
            window.location.href = 'login.html';
            return null;
        }
        return session;
    }

    function initTopBar() {
        const session = requireAuth();
        if (!session) return null;

        const userEl = document.getElementById('user-email');
        if (userEl) userEl.textContent = session.email;

        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) logoutBtn.addEventListener('click', logout);

        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') === currentPage) link.classList.add('active');
        });

        return session;
    }

    return { login, logout, getSession, refreshSession, requireAuth, initTopBar };
})();