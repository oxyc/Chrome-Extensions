
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
    var delay           = 50,
        retry_delay     = 1000,
        info_box, parser, google;

    // Set up all libraries and initialize the script
    function init() {
        var type, url;
        switch ( true ) {
            case !!( url = document.getElementById("downloadLink") ):
                type = 'nordea';
                url = url.href;
                break;
            case global.location.href === "https://www.op.fi/op?id=12402"
                    && !!( url = document.querySelector("#PaaSisaltoPalsta ul.LinkkiListaus a.alleviivattu[tabindex='4']") ):
                type = 'op';
                url = url.href 
                break;
            default:
                type = null;
                url = null;
                return;
        }

        chrome.extension.sendRequest({action : "signin"}, function( response ) {
            if ( response.success ) {
                var settings = response.settings;

                settings.auth_header = settings.auth_header[ type ];
                settings.url = settings.scope
                    + settings.key
                    + '/' + settings[ type + '_worksheet_id']
                    + settings.url_suffix;
                
                info_box = new Box();
                parser = new Parser( type );
                google = new Google( settings );
                
                parser.setURL( url )
                      .fetch( pushData );


            } else {
                global.console.log('Authentication failed');
            }
        });
    }
    

    var pushData = function() {
        parser.parse();

        google.setHeader( parser.getColumns() );

        !function loop( row ) {

            global.setTimeout(function() {
                if ( !row ) {
                    info_box.updateStatus('Transaction export done! ' 
                        + ( google.requests - google.errors ) + '/' + parser.row_count + ' successful.');
                    return;
                }
                
                google.translate( row ).post(function( response, data ) {
                    switch ( data.target.statusText ) {
                        case "Created":
                            info_box.updateStatus( google.requests +'/' + parser.row_count );
                            loop( parser.readRow() );
                            break;

                        case "Forbidden":
                        case "Bad Request":
                                info_box.updateStatus( google.requests +'/' + parser.row_count );
                                info_box.addError( row );

                                global.console.log('Error pushing data %o with %o',
                                    data,
                                    row
                                );
                                loop( parser.readRow() );
                            break;
                    }
                });
            }, delay );

        }( parser.readRow() );
    };

    var Google = function( settings ) {
        this.url        = settings.url;
        this.auth       = settings.auth_header;
        this.xml        = null;
        this.tries      = 0;
        this.requests   = 0;
        this.errors     = 0;
        this.header    = null;
    }
    
    Google.prototype = {

        // Pushes data to Googles REST service
        post : function( callback ) {
            var that = this;
            
            ajax({
                method :    "POST",
                url :       this.url,
                send :      this.xml,
                request_headers : [
                    [ 'GData-Version',  '3.0' ],
                    [ 'Content-Type',   'application/atom+xml' ],
                    [ 'Authorization',  this.auth ]
                ],
                callback : function( response, data ) {
                    switch( data.target.statusText ) {
                        case "Created":
                            that.tries = 0;
                            that.requests++;
                            callback.apply( that, toArray( arguments ) );

                            break;
                        case "Forbidden":
                        case "Bad Request":
                            
                            if ( ++that.tries < 3 ) {
                                global.setTimeout(function() {
                                    that.post( that.xml, callback );
                                }, retry_delay );
                            } else {
                                that.errors++;
                                that.requests++;
                                callback.apply( that, toArray( arguments ) );
                            }
                            break;
                    }
                }
            });
        },

        // Sets the header to be used when identifying column names
        setHeader : function( header ) {
            this.header = header;
        },
        
        // Translated the row into Googles specified XML scheme
        translate : function( values ) {
            var cells = "", 
                that = this,
                col;

            values.forEach(function( value, idx ) {
                if ( col = that.header[ idx ] ) {
                    cells += "<gsx:" + col + ">"
                            + ( htmlEntities(value) || "" ).trim()
                            + "</gsx:" + col + ">";
                }
            });

            this.xml = '<entry xmlns="http://www.w3.org/2005/Atom"'
                    + ' xmlns:gsx="http://schemas.google.com/spreadsheets/2006/extended">'
                    + cells
                    + '</entry>';
            return this;
        }
    }
    
    var Parser = function( type ) {
        this.url        = null;
        this.type       = null;
        this.columns    = null;
        this.rows       = null;
        this.file       = null;
        this.current    = null;
        this.row_count  = 0;
        this.cursor     = 0;

        switch ( type ) {
            case 'nordea':
            case 'op':
                this.type = type;
                break;
            default:
                info_box.updateStatus("Unknown bank.");
                break;
        }
    }

    Parser.prototype = {

        // Sends the GET request to fetch the data file and runs the callback
        fetch : function( callback ) {
            var that = this;

            ajax({
                method : "GET",
                url : this.url,
                callback : function( file ) {
                    if ( !( that.file = file ) ) {
                        info_box.updateStatus("Can't retrieve file.");
                    } else {
                        callback();
                    }
                }
            });
        },

        setURL : function( url ) {
            this.url = url;
            return this;
        },
       
        // Parses the already read data file and does some basic cleanup
        parse : function() {
            this[ this.type ].clean.call( this );
            this.setColumns();

            this.row_count = this.rows.length;
            return this;
        },

        // Returns the next row to be used
        readRow : function() {
            var row = this.rows.shift();
            return row ? ( this.current = row.split( this[ this.type ].delimiter ) ) : null;
        },

        getColumns : function() {
            return this.columns;
        },
        
        setColumns : function() {
            this.columns = this.columns.replace(/[^\w\t;]/g, '')
                                       .toLowerCase()
                                       .split( this[ this.type ].delimiter );
        }
    }

    // Extend the Parser with Bank specific parsing functions
    Parser.prototype.nordea = {
        delimiter : '\t',

        clean : function() {
            var file = this.file.replace(/ +(?= )/g,'').split('\n').slice(2, -1),
                i = 0;

            this.columns = file.splice(0, 2)[0];

            while ( file.splice( ++i, 1 ).length );
            this.rows = file;
        }
    }
    Parser.prototype.op = {
        delimiter : ';',
        clean : function() {
            var file = this.file.replace(/ +(?= )/g,'')
                                .replace(/&amp;/g, '&').split('\n');
                
            this.columns = file.splice(0, 1)[0];
            
            this.rows = file.filter(
                function(val) { return val.length > 1 ? true : false; }
            );
            
        }
    }

    function toArray( args ) {
        return Array.prototype.slice.call( args );
    }
    
    // Sanitize text
    function htmlEntities( str ) {
        return String( str ).replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;');
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
        Array.isArray( options.request_headers ) 
            && options.request_headers.forEach(function( header ) {

            if ( Array.isArray( header ) && header.length === 2 ) {
                xhr.setRequestHeader( header[0], header[1] );
            }
        });
        xhr.send( options.send );
    }

    // Information box to update the user
    var Box = function() {
        var box = document.createElement('div'),
            status = box.cloneNode( false ),
            errors = document.createElement('pre');

        box.setAttribute('style', 'position:fixed;top:50px;right:0;padding:1em;display:inline-block;'
                +'background:#fff;border:solid 1px #ccc; max-height:500px;max-width:500px;overflow:auto;');
        box.id = "nordea-info-box";
        status.id = "nordea-info-status";
        errors.id = "nordea-info-errors";
        box.appendChild( document.createTextNode("Transaction History") );
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
    init();
}( window, document );
