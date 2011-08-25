
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
        errors          = 0,
        requests_total  = 0,
        requests_done   = 0,
        current_request = null,
        delay           = 50,
        retry_delay     = 1000,
        info_box        = null;

    // Set up all libraries and initialize the script
    function init() {
        chrome.extension.sendRequest({action : "signin"}, function( response ) {
            if ( response.success ) {
                settings = response.settings;
                info_box = new Box();
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
            callback : pushData
        });
    }

    // Parse the txt file and issue push requests for each row individually
    function pushData( transaction_data ) {
        if ( !transaction_data ) {
            throw new Error("Was not able to retrieve txt file.");
        }

        var tries = 0;
        
        // remove irrelevant lines
        transaction_data = transaction_data.split("\n").slice(2, -1);

        // store and remove column names
        columns = transaction_data.splice(0, 2)[0].replace(/[^\w\t]/g, '').toLowerCase().split("\t");

        requests_total = transaction_data.length / 2;
        
        !function loop( request ) {
        
            global.setTimeout(function() {
                if ( current_request = request ) {
                    googlePOST( createEntry( current_request.split("\t") ), function( response, data ) {
                        switch ( data.target.statusText ) {
                            case "Created":
                                tries = 0;
                                info_box.updateStatus( ++requests_done +'/' + requests_total );
                                loop( transaction_data.splice(0,2)[0] );
                                break;

                            case "Forbidden":
                            case "Bad Request":
                                if ( ++tries < 4 ) {
                                    global.setTimeout(function() {
                                        loop( current_request );
                                    }, retry_delay );

                                } else {
                                    info_box.updateStatus( ++requests_done +'/' + requests_total );
                                    info_box.addError( current_request );
                                    
                                    global.console.log('Error pushing data %o with %o',
                                        data,
                                        createEntry( current_request.split("\t"))
                                    );

                                    errors++;
                                    tries = 0;
                                    
                                    loop( transaction_data.splice(0,2)[0] );
                                }
                                break;
                        }
                    });
                } else {
                    info_box.updateStatus('Nordea.fi transaction export done! ' + ( requests_total - errors ) + '/' + requests_total + ' successful.');
                }
            }, delay );

        }( transaction_data.splice(0,2)[0] ); // remove every other line as it's empty
    }

    // Make the POST request to push into Google Spreadsheets
    function googlePOST( body, callback ) {
        ajax({
            method :    "POST",
            url :       settings.url,
            send :      body,
            request_headers : [
                [ 'GData-Version',  '3.0' ],
                [ 'Content-Type',   'application/atom+xml' ],
                [ 'Authorization',  settings.auth_header ]
            ],
            callback : callback
        });
    }
    
    // Return a xml string formated according to Google Spreadsheets scheme
    function createEntry( values ) {
        var cells = "", col;

        values.forEach(function( value, idx ) {
            if ( col = columns[ idx ] ) {
                cells += "<gsx:" + col + ">"
                        + ( htmlEntities(value) || "" ).trim()
                        + "</gsx:" + col + ">";
            }
        });

        return '<entry xmlns="http://www.w3.org/2005/Atom"'
                + ' xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">'
                + cells
                + '</entry>';
    }

    // Sanitize text
    function htmlEntities( str ) {
        return String( str ).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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

    var Box = function() {
        var box = document.createElement('div'),
            status = box.cloneNode( false ),
            errors = document.createElement('pre');

        box.setAttribute('style', 'position:fixed;top:50px;right:0;padding:1em;display:inline-block;background:#fff;border:solid 1px #ccc; max-height:500px;max-width:500px;overflow:auto;');
        box.id = "nordea-info-box";
        status.id = "nordea-info-status";
        errors.id = "nordea-info-errors";
        box.appendChild( document.createTextNode("Nordea Transaction History") );
        this.status = box.appendChild( status );
        this.errors = box.appendChild( errors );
        
        document.body.appendChild( box );
    }
    
    Box.prototype.updateStatus = function ( string ) {
        this.status.innerHTML = string;
    };
    Box.prototype.addError = function ( string ) {
        this.errors.innerHTML += string + "\n";
    };

    // Initialize the script
    document.getElementById("downloadLink") && init();
}( window, document );