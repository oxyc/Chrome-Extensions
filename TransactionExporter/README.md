# Transaction Exporter

### Update, now works with op.fi as well. Docs coming

Exports transaction data from your bank account to a designated Google
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

## Usage
1.  Sign in to your bank (Nordea and OP currently supported) with Swedish as
    your language. If you prefer a different language you need to change the column
    names in the spreadsheet template.
2.  Navigate to your transaction history
    -   Nordea
        
        > Konton » Kontotransaktioner och kontouppgifter » Transaktionsförteckning

    -   OP

        > ...

3.  In the current version the extension does not keep track of what you have exported
    earlier, because of this you need to know this yourself.

    In Nordeas case this is quite easy, with your *first time* usage you select a time
    range beginning at the first date of searchable data. On *continuous* usage you just 
    select the first option, *"Everything since your latest transfer"*

    If you're using OP then you always need to keep track of what you've transfere, I
    suggest transfering monthly.

4.  Once you've selected an option the transfer will begin and you'll need to wait for
    the transfer to complete before closing the page.

5.  In the spreadsheet you can enable filtering but have to do so every time new data has
    been added.

    > Select A1 » Tools » Filter

    To calculate a total sum you just select the prices in quesiton and look in the bottom
    right corner of the page.

[ODS file]: https://github.com/oxyc/Chrome-Extensions/raw/master/TransactionExporter/Template.ods
[crx]: https://github.com/oxyc/Chrome-Extensions/raw/master/TransactionExporter/TransactionExporter.crx
[Google Spreadsheet]: https://docs.google.com/spreadsheet/ccc?key=0AoZjYmMuEKWrdENWb2U5dkFVcWVtQmc1UHd1X3ZGQUE&hl=en_US#gid=0
[API Console]: https://code.google.com/apis/console/

## Inner workings walkthrough

1.  Content script is loaded when a user retrieves the latest transaction
    history from the bank site.
2.  OAuth libraries are loaded in background.html and authenticates the user
3.  XHR GET request retrieves the txt document by sniffing the DOM
4.  The file is parsed and pushed into a continous loop with a 50ms delay for each row
    of data being pushed to Googles REST service.

## Known limitations
-   There is very limited error handling
-   Can't use batch processing because of listRows
-   Because we don't want to spam googles service there is a delay timer for each
    request.
-   If something goes wrong you'll have to manually check what's missing.
