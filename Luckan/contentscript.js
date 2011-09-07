
window.addEventListener('DOMContentLoaded', function () {
    for ( var i = 0, j = 0, form, el; form = document.getElementsByTagName("form")[i]; i++) {
        form.removeAttribute('autocomplete');
        while ( el = form.getElementsByTagName('input')[j++] ) {
            el.removeAttribute('autocomplete');
        }
    }
}, false);
