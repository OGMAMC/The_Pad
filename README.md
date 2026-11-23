# Carol's 60th birthday menu

A one-page site where each guest picks a starter, main course and dessert from The Pad's Early Evening Menu, sees what their meal costs (2 courses £22.95, 3 courses £25.95), and sends the order. Each order becomes a row in a Google Sheet. To set it up, connect the site to the sheet, then publish it on GitHub Pages.

- Site: `index.html`, `styles.css`, `app.js`, `config.js`, `confetti.svg`
- Sheet: [The Pad – 60th Birthday Food Orders](https://docs.google.com/spreadsheets/d/1QuBaW-t_nJAvMvjpURMTGV398dBgD_oD7e9ogk9o1cs/edit)
- Sheet script: `apps-script/Code.gs`

## Connect the site to the sheet

A GitHub Pages site can't write to a Google Sheet by itself, so the sheet runs a small script that receives the orders. The setup takes about five minutes and you do it once.

1. Open the sheet, then **Extensions → Apps Script**.
2. Delete the sample code, paste in the full contents of `apps-script/Code.gs`, and save.
3. Click **Deploy → New deployment**. Choose the type **Web app**, set **Execute as** to **Me** and **Who has access** to **Anyone**, then click **Deploy**.
4. Google asks you to authorise the script to edit your spreadsheets. If it warns that "Google hasn't verified this app", click **Advanced**, then **Go to … (unsafe)**, then **Allow**. The warning appears because the script is your own and unpublished.
5. Copy the **Web app URL** (it ends in `/exec`). To check it, open the URL in a browser: it should say "The order endpoint is running."
6. On GitHub, open `config.js` for editing, paste the URL between the quotes and commit the change:

   ```js
   window.ORDER_ENDPOINT = "https://script.google.com/macros/s/…/exec";
   ```

Until step 6 is done the page shows the menu with an "Ordering isn't open yet" notice and refuses to send.

If you edit `Code.gs` later, paste the new code into Apps Script, then use **Deploy → Manage deployments → Edit → New version** so the URL stays the same.

## Publish on GitHub Pages

In the repository on GitHub, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, pick the branch holding these files and the `/ (root)` folder, then save. The site appears at `https://ogmamc.github.io/The_Pad/` a minute or so later.

GitHub Pages on a private repository needs a paid GitHub plan. On a free account the repository has to be public, which makes this README and its sheet link visible to anyone. Keep the sheet's sharing set to **Restricted**; orders still arrive because the script runs as you.

## What lands in the sheet

The first tab gets one row per order: time submitted, name, starter, main course, dessert, number of courses, cost, and allergies or notes. The script checks every order against the menu and works out the cost itself, so the figures don't depend on the guest's browser.

The first order also creates a **Totals** tab with a count for each dish, the number of people and the total cost, followed by a list of everyone who entered allergies or notes. The Totals tab is the pre-order to give the restaurant.

A guest who changes their mind sends a second order, which adds a second row. Delete the row you don't want.

## Change the menu or prices

The dishes and prices are listed in both `app.js` and `apps-script/Code.gs`. Change both, paste the updated `Code.gs` into Apps Script, then redeploy the script as a new version. If the dish list changes, delete the Totals tab and it is rebuilt on the next order.
