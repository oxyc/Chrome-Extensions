# Nordea Transaction History

Exports transaction data from your Nordea.fi account to a designated Google
Spreadsheet document.

## Setting up

1.  Install the extension [here][google] and sign in to Google.
2.  Make a copy of this template [Google Spreadsheet][]
    and store it in your document list privately.
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
9.  Wait for the alert notifying you that the transfer was complete before leaving the page.
10. You can enable filtering but have to do so every time new data has been added
    
    > Select A1 » Tools » Filter

    To calculate a total sum you just select the prices in question and look in the bottom
    right corner of the page.

[google]: http://www.google.com
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
-   There is next to no error handling
-   Can't use batch processing because of listRows
-   If something goes wrong it's impossible to push data a second time without
    first clearing the entire Spreadsheet table. This is because of the script
    is leveraging Nordeas option to download all transactions since last
    retrieval.
