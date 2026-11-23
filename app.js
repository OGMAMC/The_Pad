// The menu and prices are repeated in apps-script/Code.gs, which re-checks every order.
// Change both files together.
const PRICES = { 2: 22.95, 3: 25.95 };

const COURSES = [
  {
    id: "starter",
    title: "Starter",
    skip: "No starter",
    dishes: [
      "Soup of the Day",
      "Haggis & Black Pudding Bon Bons",
      "Salt & Chilli Chicken",
      "Garlic Chilli King Prawns with Garlic Bread Bruschetta",
    ],
  },
  {
    id: "main",
    title: "Main Course",
    dishes: [
      "Beer Battered Haddock with Homemade Chips & Peas",
      "Haggis, Neeps, Tatties with Pepper Cream Sauce",
      "Chicken Enchiladas",
      "Chefs Lasagne served with Fries & Salad",
      "Pad Burger with Smoked Bacon & Cheese",
      "Cajun Chicken Pasta",
    ],
  },
  {
    id: "dessert",
    title: "Dessert",
    skip: "No dessert",
    dishes: [
      "Sticky Toffee Pudding with Custard",
      "Bailey’s Affogato",
      "Strawberry Pavlova",
      "Chocolate Fudge Cake",
      "Mixed Ice Cream Sundae",
      "Pear & Toffee Crumble",
    ],
  },
];

const gbp = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const $ = (id) => document.getElementById(id);
const endpoint = (window.ORDER_ENDPOINT || "").trim();

const form = $("form");
const submitBtn = $("submit");
let sending = false;
let dirty = false;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  node.append(...children);
  return node;
}

function renderCourses() {
  for (const course of COURSES) {
    const options = course.skip ? [...course.dishes, ""] : course.dishes;
    const fieldset = el(
      "fieldset",
      { class: "card", id: `${course.id}-group`, "aria-describedby": `${course.id}-error` },
      el("legend", { text: course.title })
    );
    for (const dish of options) {
      const input = el("input", { type: "radio", name: course.id, value: dish });
      const label = el(
        "label",
        { class: dish ? "option" : "option none" },
        input,
        el("span", { text: dish || course.skip })
      );
      fieldset.append(label);
    }
    fieldset.append(el("p", { class: "error", id: `${course.id}-error`, hidden: "" }));
    $("courses").append(fieldset);
  }
}

function readOrder() {
  const data = new FormData(form);
  const order = {
    name: (data.get("name") || "").trim(),
    starter: data.get("starter") || "",
    main: data.get("main") || "",
    dessert: data.get("dessert") || "",
    notes: (data.get("notes") || "").trim(),
  };
  order.courses = [order.starter, order.main, order.dessert].filter(Boolean).length;
  order.cost = PRICES[order.courses] ?? null;
  return order;
}

function updateTotal() {
  const order = readOrder();
  let label;
  if (!order.main) label = "Pick a main course";
  else if (order.courses < 2) label = "Add a starter or a dessert";
  else label = `${order.courses} courses`;
  $("total-label").textContent = label;
  $("total-price").textContent = order.main && order.cost ? gbp.format(order.cost) : "";
}

function setError(id, message) {
  const node = $(`${id}-error`);
  node.textContent = message || "";
  node.hidden = !message;
  if (id === "name") $("name").setAttribute("aria-invalid", message ? "true" : "false");
}

function validate(order) {
  const errors = {};
  if (!order.name) errors.name = "Enter your name so the organiser knows whose order this is.";
  if (!order.main) {
    errors.main = "Choose a main course.";
  } else if (order.courses < 2) {
    errors.dessert = "The set menu is 2 or 3 courses. Add a starter or a dessert.";
  }
  for (const id of ["name", "starter", "main", "dessert"]) setError(id, errors[id]);

  const first = ["name", "main", "dessert"].find((id) => errors[id]);
  if (first) {
    const target = first === "name" ? $("name") : form.querySelector(`input[name="${first}"]`);
    target.focus();
    target.closest(".card").scrollIntoView({ block: "center" });
  }
  return !first;
}

function showFormError(message) {
  $("form-error").textContent = message || "";
  $("form-error").hidden = !message;
}

async function send(order) {
  // text/plain keeps this a "simple" request: Apps Script web apps cannot answer a CORS preflight.
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(order),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || "The order was rejected.");
  return result;
}

function showDone(order) {
  $("done-intro").textContent = `Thanks, ${order.name}. The organiser has your order:`;
  const rows = [
    ["Starter", order.starter || "None"],
    ["Main course", order.main],
    ["Dessert", order.dessert || "None"],
    ["Allergies or dietary needs", order.notes || "None given"],
    ["Cost", `${gbp.format(order.cost)} (${order.courses} courses)`],
  ];
  $("done-summary").replaceChildren(
    ...rows.map(([term, value]) => el("div", {}, el("dt", { text: term }), el("dd", { text: value })))
  );
  form.hidden = true;
  $("done").hidden = false;
  $("done").focus();
  $("done").scrollIntoView({ block: "start" });
}

form.addEventListener("input", () => {
  dirty = true;
  updateTotal();
  const order = readOrder();
  if (order.name) setError("name", "");
  if (order.main) setError("main", "");
  if (order.courses >= 2) setError("dessert", "");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending) return;
  showFormError("");
  const order = readOrder();
  if (!validate(order)) return;
  if (!endpoint) {
    showFormError("Ordering isn’t open yet. Ask the organiser when you can send your order.");
    return;
  }

  sending = true;
  submitBtn.disabled = true;
  submitBtn.textContent = "Sending…";
  try {
    await send(order);
    dirty = false;
    showDone(order);
  } catch (error) {
    console.error(error);
    showFormError(
      "Your order didn’t go through. Check your connection and press Send My Order again. If it keeps failing, message the organiser your choices."
    );
  } finally {
    sending = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Send My Order";
  }
});

$("another").addEventListener("click", () => {
  form.reset();
  updateTotal();
  $("done").hidden = true;
  form.hidden = false;
  $("name").focus();
  window.scrollTo({ top: 0 });
});

window.addEventListener("beforeunload", (event) => {
  if (dirty) event.preventDefault();
});

renderCourses();
$("price-2").textContent = gbp.format(PRICES[2]);
$("price-3").textContent = gbp.format(PRICES[3]);
$("closed").hidden = Boolean(endpoint);
updateTotal();
