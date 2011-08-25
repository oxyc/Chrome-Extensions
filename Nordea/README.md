# Transaction History

### Update, now works with op.fi as well. Docs coming

Exports transaction data from your Nordea.fi account to a designated Google
Spreadsheet document.

## Setting up

1.  Download the extension [here][crx] and open it in Chrome to install.
2.  Upload the [ODS file][] to Google docs and convert it to a Google Spreadsheet.
    You also need to select rows 3-20 and delete them.
3.  Take note of the *key* parameter in the URL field of the document,
    eg. 0AoZjYmMuEKWrdENWb2U5dkFVcWVtQmc1UHd1X3ZGQUE
4.  Register your app with Google in the [API Console][].
    Choose Installed application and take note of the *Client ID* and *Client secret*.
5.  Go the the options page of the extension and fill in all required information.
6.  Sign in to Nordea.fi with Swedish as your language (unless you change the
    spreadsheet template).
7.  Navigate

    > Konton » Kontotransaktioner och kontouppgifter » Transaktionsförteckning

    and select your bank account.
8.  If this is your *first time* using the extension, select a time range
    beginning at the first date of searchable data.

    If you've *already made your first commit* all you need to do is select the first
    option, *"Allt sedan senaste överföringen"*
9.  Wait for the notification that the transfer was complete before closing the page.
10. In the spreadsheet you can enable filtering but have to do so every time new data has been added
    
    > Select A1 » Tools » Filter

    To calculate a total sum you just select the prices in question and look in the bottom
    right corner of the page.

[ODS file]: https://github.com/oxyc/Chrome-Extensions/raw/master/Nordea/Template.ods
[crx]: https://github.com/oxyc/Chrome-Extensions/raw/master/Nordea/Nordea.crx
[Google Spreadsheet]: https://docs.google.com/spreadsheet/ccc?key=0AoZjYmMuEKWrdENWb2U5dkFVcWVtQmc1UHd1X3ZGQUE&hl=en_US#gid=0
[API Console]: https://code.google.com/apis/console/

## Inner workings walkthrough

1.  Content script is loaded when a user retrieves the latest transaction
    history from the Nordea.fi site.
2.  OAuth libraries are loaded in background.html and authenticates the user
3.  XHR GET request retrieves the txt document by sniffing the DOM
4.  The file is parsed into an array continually creating XML data and pushing
    it to Googles REST service.

## Known limitations
-   There is very little error handling
-   Can't use batch processing because of listRows
-   Because we don't wont to spam googles service there is a delay timer for each
    request.
-   If something goes wrong you'll have to manually add the missing rows.
