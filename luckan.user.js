
// ==UserScript==
// @name            Luckan
// @author          Oskar Schöldström
// @version         1.0
// @description     Enables autocomplete for login to myarcada.
// @match           https://luckan.arcada.fi/
// ==/UserScript==

(function run(){
    if ( document.readyState === "complete" ) {
        for ( var i = 0, j = 0, form, el; form = document.getElementsByTagName("form")[i]; i++) {
            form.removeAttribute('autocomplete');
            while ( el = form.getElementsByTagName('input')[j++] ) {
                el.removeAttribute('autocomplete');
            }
        }
    } else window.addEventListener('DOMContentLoaded', run, false);
})();