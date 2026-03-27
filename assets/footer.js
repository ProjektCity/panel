document.addEventListener('DOMContentLoaded', function() {
    const year = new Date().getFullYear();
    const branding = 'Projekt City Ltd.';
    const footer = document.querySelector('footer');
    if (!footer) return;

    footer.innerHTML = `
        <p class="small">This is an internal site of Projekt City. Unauthorized access is prohibited and may result in legal action.</p>
        <p>
            <a data-linkout="https://projektcity.com/legal/privacy" data-target="_blank" data-i18n="footer_privacy" style="font-size: 1.1rem;">Privacy</a> • 
            <a data-linkout="https://projektcity.com/legal/terms" data-target="_blank" data-i18n="footer_terms" style="font-size: 1.1rem;">Terms</a>
        </p>
        <div>
            <p>&copy; ${year} ${branding} | <span>All rights reserved!</span></p>
            <p class="f-colored"><span>Made with ❤️ in</span>&nbsp;<a style="color:#000000;">GE</a><a style="color:#DD0000;">RMA</a><a style="color:#FFCE00;">NY</a></p>
        </div>
    `;
});
