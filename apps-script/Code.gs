// Receives orders from the website and adds each one as a row in this spreadsheet.
// Setup steps are in README.md. The menu and prices are repeated in app.js: change both together.

var PRICES = { 2: 22.95, 3: 25.95 };

var MENU = {
  starter: [
    'Soup of the Day',
    'Haggis & Black Pudding Bon Bons',
    'Salt & Chilli Chicken',
    'Garlic Chilli King Prawns with Garlic Bread Bruschetta'
  ],
  main: [
    'Beer Battered Haddock with Homemade Chips & Peas',
    'Haggis, Neeps, Tatties with Pepper Cream Sauce',
    'Chicken Enchiladas',
    'Chefs Lasagne served with Fries & Salad',
    'Pad Burger with Smoked Bacon & Cheese',
    'Cajun Chicken Pasta'
  ],
  dessert: [
    'Sticky Toffee Pudding with Custard',
    "Bailey’s Affogato",
    'Strawberry Pavlova',
    'Chocolate Fudge Cake',
    'Mixed Ice Cream Sundae',
    'Pear & Toffee Crumble'
  ]
};

var HEADERS = ['Submitted', 'Name', 'Starter', 'Main Course', 'Dessert', 'Courses', 'Cost (£)', 'Allergies / Notes'];
var TOTALS_SHEET = 'Totals';

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    var order = parseOrder_(JSON.parse(e.postData.contents));
    lock.waitLock(20000);
    var book = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = book.getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
    sheet.appendRow([
      new Date(), order.name, order.starter, order.main, order.dessert,
      order.courses, order.cost, order.notes
    ]);
    ensureTotals_(book, sheet);
    return json_({ ok: true, courses: order.courses, cost: order.cost });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, message: 'The order endpoint is running.' });
}

function parseOrder_(data) {
  var name = clean_(data.name, 80);
  if (!name) throw new Error('A name is required.');

  var starter = dish_('starter', data.starter, true);
  var main = dish_('main', data.main, false);
  var dessert = dish_('dessert', data.dessert, true);
  var courses = [starter, main, dessert].filter(String).length;
  if (courses < 2) throw new Error('Choose a main course with a starter, a dessert or both.');

  return {
    name: name, starter: starter, main: main, dessert: dessert,
    courses: courses, cost: PRICES[courses], notes: clean_(data.notes, 500)
  };
}

function dish_(course, value, optional) {
  value = String(value || '');
  if (!value && optional) return '';
  if (MENU[course].indexOf(value) === -1) throw new Error('Unknown ' + course + ' choice.');
  return value;
}

// Trims free text and stops it being read as a spreadsheet formula.
function clean_(value, max) {
  var text = String(value || '').trim().slice(0, max);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

// Adds a Totals tab for the restaurant (count per dish, then who has allergies or notes), if it is not there yet.
function ensureTotals_(book, orders) {
  if (book.getSheetByName(TOTALS_SHEET)) return;
  var totals = book.insertSheet(TOTALS_SHEET);
  var source = "'" + orders.getName().replace(/'/g, "''") + "'!";
  var rows = [['Dish', 'Orders']];
  var columns = { starter: 'C', main: 'D', dessert: 'E' };
  var titles = { starter: 'STARTERS', main: 'MAIN COURSES', dessert: 'DESSERTS' };
  ['starter', 'main', 'dessert'].forEach(function (course) {
    rows.push([titles[course], '']);
    MENU[course].forEach(function (dish) {
      var range = source + columns[course] + '2:' + columns[course];
      rows.push([dish, '=COUNTIF(' + range + ',"' + dish.replace(/"/g, '""') + '")']);
    });
    rows.push(['', '']);
  });
  rows.push(['People ordered', '=COUNTA(' + source + 'B2:B)']);
  rows.push(['2 courses', '=COUNTIF(' + source + 'F2:F,2)']);
  rows.push(['3 courses', '=COUNTIF(' + source + 'F2:F,3)']);
  rows.push(['Total cost (£)', '=SUM(' + source + 'G2:G)']);
  rows.push(['', '']);
  rows.push(['ALLERGIES / NOTES', '']);
  var hasNote = source + 'H2:H<>""';
  rows.push([
    '=IFERROR(FILTER(' + source + 'B2:B,' + hasNote + '),"None")',
    '=IFERROR(FILTER(' + source + 'H2:H,' + hasNote + '),"")'
  ]);
  totals.getRange(1, 1, rows.length, 2).setValues(rows);
  totals.getRange(1, 1, 1, 2).setFontWeight('bold');
  totals.setColumnWidth(1, 420);
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
