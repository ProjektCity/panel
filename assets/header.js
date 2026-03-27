document.addEventListener('DOMContentLoaded', function() {
    const header = document.querySelector('header');

    header.innerHTML = `
        <div class="header-inner">
            <div class="header-box customwidth" data-linkout="/"><div class="flex-container"><div class="header-logo"></div><div class="panel-name"><span>Projekt City</span> Panel</div></div></div>
            <div class="header-box hideonmobile" style="display: flex; justify-content: center; width: 50%;"><div class="header-menu"><div class="header-item"><a href="/">Dashboard</a></div><div class="header-item"><a href="/tasks.html">Tasks</a></div><div class="header-item"><a href="/changelog.html">Changelog</a></div><div class="header-item"><a href="/inbox.html">Inbox</a></div></div></div>
            <div class="header-box flex-container justify-content--end">
                <button id="logout-btn" class="btn btn-ghost"><i class="fa-solid fa-right-from-bracket"></i></button>
                <div class="header-nav-menu menu-toggle" id="mobile-menu"><div class="menu-icon"><div class="line line-1"></div><div class="line line-2"></div><div class="line line-3"></div></div></div>
            </div>
        </div>
    `;

    const menuToggle = document.getElementById('mobile-menu');
    const menu = document.querySelector('.header-menu');
    const menuIcon = document.querySelector('.menu-icon');
    let overlay = document.querySelector('.menu-overlay');
    
    function closeMenu() {
        menu.classList.remove('open');
        menuIcon.classList.remove('active');
        overlay.classList.remove('open');
        document.documentElement.classList.remove('no-scroll');
    }

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.classList.add('menu-overlay');
        document.body.appendChild(overlay);
    }

    if (menuToggle && menu && menuIcon) {
        menuToggle.addEventListener('click', function() {
            const isOpen = menu.classList.toggle('open');
            menuIcon.classList.toggle('active');
            overlay.classList.toggle('open', isOpen);
            document.documentElement.classList.toggle('no-scroll', isOpen);
        });

        overlay.addEventListener('click', closeMenu);
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeMenu();
        });
    }

    if (typeof AUTH !== 'undefined') AUTH.initTopBar?.();
});

window.addEventListener('scroll', function () {
    const header = document.querySelector('header');
    if (!header) return;
    header.classList.toggle('scrolling', window.scrollY > 10);
});