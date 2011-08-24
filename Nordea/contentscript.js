
/*
 * Nordea.fi Transaction History
 * Exports transaction data from your Nordea.fi account to a designated Google
 * Spreadsheet document.
 *
 * Walkthrough
 * - Content script is loaded when a user retrieves the latest transaction
 *   history from the Nordea.fi site.
 * - OAuth libraries are loaded in background.html and authenticates the user
 * - XHR GET request retrieves the txt document by sniffing the DOM
 * - The file is parsed into an array continually creating XML data and pushing
 *   it to Googles REST service.
 *
 * Known limitations
 * - There is next to no error handling
 * - Can't use batch processing because of listRows
 * - If something goes wrong it's impossible to push data a second time without
 *   first clearing the entire Spreadsheet table. This is because of the script
 *   is leveraging Nordeas option to download all transactions since last
 *   retrieval.
 */

!function( global, document ) {
    var settings,       // settings variable stored in background.html
        columns,        // column titles for table
        errors = 0,
        requests = 0,
        current_request = 0;

    // Set up all libraries and initialize the script
    function init() {
        chrome.extension.sendRequest({ action : "signin" }, function( response ) {
            if ( response.success ) {
                settings = response.settings;

                fetchTxt();
            } else {
                global.console.log('Authentication failed');
            }
        });
    }

    // Sniff and fetch the downloadable txt file from the page
    function fetchTxt() {
        var link = document.getElementById("downloadLink");
        
        ajax({
            method : "GET",
            url : link.href,
            callback : parseTxt
        });
    }

    // Parse the txt file and issue push requests for each row individually
    function parseTxt( response ) {
        if ( !response ) {
            throw new Error("Was not able to retrieve txt file.");
        }
        
        // remove irrelevant lines
        response = response.split("\n").slice(2, -1);

        // store and remove column names
        columns = response.splice(0, 2)[0].replace(/[^\w\t]/g, '').toLowerCase().split("\t");

        requests = response.length / 2;

        // every other line is empty so skip them
        for ( var i = 0; i < response.length; i = i + 2 ) {
            !function( i ) {
                global.setTimeout(function() {
                    pushData( createEntry( response[ i ].split("\t") ) );
                }, 100);
            }( i );
        }
    }

    // Make the POST request to push into Google Spreadsheets
    function pushData( body, tries ) {
        tries = arguments.length > 1 ? tries : 0;
        ajax({
            method :    "POST",
            url :       settings.url,
            send :      body,
            request_headers : [
                [ 'GData-Version',  '3.0' ],
                [ 'Content-Type',   'application/atom+xml' ],
                [ 'Authorization',  settings.auth_header ]
            ],
            callback : function( response, data ) {
                if ( data.target.status !== 200 ) {

                    if ( tries < 3 ) {
                        global.setTimeout(function() {
                            pushData( body, tries++ );
                        }, 1000);
                        
                    } else {
                        alert("An error occurred, check the options page for a list of content not pushed to the document.");
                        global.console.log('Error pushing data %o', data );
                        global.localStorage['nordea.errors'] = body + "~"+ ( global.localStorage['nordea.errors'] || "" );
                        current_request++;
                    }
                } else {
                    current_request++;
                }
                
                if ( current_request >= requests ) {
                    global.alert('Nordea.fi transaction export done!');
                }
            }
        });
    }

    // Return a xml string formated according to Google Spreadsheets scheme
    function createEntry( values ) {
        var cells = "";

        values.forEach(function( value, idx ) {
            cells += "<gsx:" + columns[ idx ] + ">"
                    + ( value || "" ).trim()
                    + "</gsx:" + columns[ idx ] + ">";
        });

        return '<entry xmlns="http://www.w3.org/2005/Atom"'
                + ' xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">'
                + cells
                + '</entry>';
    }

    // Generic AJAX function
    function ajax(options) {
        var xhr = new XMLHttpRequest();

        xhr.onreadystatechange = function( data ) {
            if ( xhr.readyState === 4 && options.callback) {
                if ( xhr.status === 200 || xhr.status === 201 ) {
                    options.callback( data.target.responseText, data );
                } else {
                    options.callback( null, data );
                }
            }
        }
        
        xhr.open( options.method, options.url, true);
        Array.isArray( options.request_headers ) && options.request_headers.forEach(function( header ) {
            if ( Array.isArray( header ) && header.length === 2 ) {
                xhr.setRequestHeader( header[0], header[1] );
            }
        });
        xhr.send( options.send );
    }

    // Initialize the script
    document.getElementById("downloadLink") && init();
}( window, document );