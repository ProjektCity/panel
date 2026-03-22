document.addEventListener('DOMContentLoaded', function() {
    const year = new Date().getFullYear();
    const branding = 'Projekt City Ltd.';
    const footer = document.querySelector('footer');
    if (!footer) return;

    footer.innerHTML = `
        <p class="small">This is an internal site of Projekt City. Unauthorized access is prohibited and may result in legal action.</p>
        <div>
            <p>&copy; ${year} ${branding} | <span>All rights reserved!</span></p>
            <p class="f-colored"><span>Made with ❤️ in</span>&nbsp;<a style="color:#000000;">GE</a><a style="color:#DD0000;">RMA</a><a style="color:#FFCE00;">NY</a></p>
        </div>
    `;
});
