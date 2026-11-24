// Prototype data — mirrors the Figma frame "iPhone 14 & 15 Pro - 1"
const items = [
  { name: "Redbull 0,25l",     by: "Added by Nicole. H", img: "can.png",      variant: "can" },
  { name: "Banana",            by: "Added by Nicole. H", img: "banana.png" },
  { name: "Egg Sandwich",      by: "Made by Nicole. H",  img: "sandwich.png", warm: true, veg: true },
  { name: "Celcius 0,25l",     by: "Added by Nicole. H", img: "can.png",      variant: "can" },
  { name: "Banana (browning)", by: "Added by Nicole. H", img: "banana.png" },
  { name: "Eggs",              by: "Added by Nicole. H", img: "eggs.png" },
  { name: "Sandwich",          by: "Made by Nicole. H",  img: "sandwich.png", warm: true },
  { name: "Yogurt",            by: "Added by Nicole. H", img: "yogurt.png",   variant: "contain" },
  { name: "Redbull 0,25l",     by: "Added by Nicole. H", img: "can.png",      variant: "can" },
  { name: "Banana",            by: "Added by Nicole. H", img: "banana.png" },
  { name: "Egg Sandwich",      by: "Made by Nicole. H",  img: "sandwich.png", warm: true, veg: true },
  { name: "Celcius 0,25l",     by: "Added by Nicole. H", img: "can.png",      variant: "can" },
];

// ---------- Shared state ----------
const counts = items.map(() => 0);
const steppers = items.map(() => new Set()); // every stepper showing item i

const $ = (id) => document.getElementById(id);
const app = document.querySelector(".app");
const total = () => counts.reduce((a, b) => a + b, 0);

function setCount(i, n) {
  counts[i] = Math.max(0, n);
  steppers[i].forEach((el) => renderStepper(el, counts[i]));
  if (reservedUntil && view() === "list") renderReserved();
  updateChrome();
}

function renderStepper(el, n) {
  el.dataset.count = n;
  el.querySelector(".stepper__count").textContent = n;
}

function makeStepper(i, tertiary = false) {
  const el = $("stepper-tpl").content.firstElementChild.cloneNode(true);
  if (tertiary) {
    el.classList.add("stepper--tertiary");
    el.querySelector(".stepper__minus img").src = "assets/remove-tertiary.svg";
    el.querySelector(".stepper__plus img").src = "assets/add-tertiary.svg";
  }
  const name = items[i].name;
  const minus = el.querySelector(".stepper__minus");
  const plus = el.querySelector(".stepper__plus");
  minus.setAttribute("aria-label", `Remove one ${name}`);
  plus.setAttribute("aria-label", `Add one ${name}`);
  minus.addEventListener("click", () => setCount(i, counts[i] - 1));
  plus.addEventListener("click", () => setCount(i, counts[i] + 1));
  renderStepper(el, counts[i]);
  steppers[i].add(el);
  return el;
}

function fillImage(img, item) {
  img.src = `assets/${item.img}`;
  if (item.variant) img.classList.add(`card__img--${item.variant}`);
}

// ---------- Card / row builders ----------
function makeCard(item, i, tertiary = false) {
  const card = $("card-tpl").content.firstElementChild.cloneNode(true);
  const media = card.querySelector(".card__media");
  fillImage(card.querySelector(".card__img"), item);
  if (item.warm) media.classList.add("card__media--warm");
  card.querySelector(".card__title").textContent = item.name;
  card.querySelector(".card__meta").textContent = item.by;

  if (item.veg) {
    const leaf = document.createElement("img");
    leaf.src = "assets/leaf.svg";
    leaf.width = 16;
    leaf.height = 16;
    leaf.alt = "Vegetarian";
    leaf.className = "card__badge";
    card.querySelector(".card__title-row").append(leaf);
  }

  media.append(makeStepper(i, tertiary));
  return card;
}

function makeRow(item, i, tertiary = false) {
  const row = $("row-tpl").content.firstElementChild.cloneNode(true);
  const thumb = row.querySelector(".row__thumb");
  fillImage(row.querySelector(".card__img"), item);
  if (item.warm) thumb.classList.add("row__thumb--warm");
  row.querySelector(".card__title").textContent = item.name;
  row.querySelector(".card__meta").textContent = item.by;
  row.querySelector(".row__main").append(makeStepper(i, tertiary));
  return row;
}

// Forget steppers inside a container before it's rebuilt.
function clearSteppers(container) {
  container.querySelectorAll(".stepper").forEach((el) =>
    steppers.forEach((set) => set.delete(el))
  );
  container.replaceChildren();
}

// ---------- List screen ----------
items.forEach((item, i) => $("grid").append(makeCard(item, i)));
$("item-count").textContent = items.length;

// ---------- Selection screen ----------
// Rows are built when the screen opens. A row whose quantity drops to 0
// stays (showing "+") until the user leaves, so a mis-tap is easy to undo.
function buildSelection() {
  const rows = $("rows");
  clearSteppers(rows);
  items.forEach((item, i) => {
    if (counts[i] > 0) rows.append(makeRow(item, i, !!reservedUntil));
  });
}

// ---------- Reserved mode ----------
// After "Reserve items" the home page shows the reserved items on top
// (still adjustable) and everything else below as "Add to reservation".
// Tapping + on a card moves it up; lowering a row to 0 moves it back down.
let reservedUntil = null; // Date, or null when nothing is reserved
let reservedTickId = null;

function renderReserved() {
  const rows = $("reserved-rows");
  const grid = $("reserved-grid");
  clearSteppers(rows);
  clearSteppers(grid);
  let available = 0;
  items.forEach((item, i) => {
    if (counts[i] > 0) rows.append(makeRow(item, i, true));
    else { grid.append(makeCard(item, i, true)); available++; }
  });
  $("add-count").textContent = available;
}

// Time left on the reservation, e.g. "1h 15m" or "45m".
function reservedLeft() {
  const minsLeft = Math.max(0, Math.ceil((reservedUntil - Date.now()) / 60000));
  const h = Math.floor(minsLeft / 60);
  const m = minsLeft % 60;
  return h ? `${h}h ${m}m` : `${m}m`;
}
const reservedLeftText = () => `${reservedLeft()} left`;

function checkReservation() {
  if (reservedUntil && Date.now() >= reservedUntil) releaseReservation();
  else updateChrome();
}

// Reservation time is over: items go back to the fridge.
function releaseReservation() {
  clearInterval(reservedTickId);
  reservedUntil = null;
  counts.forEach((_, i) => setCount(i, 0));
  goToList();
}

// ---------- Retrieve timer ----------
// Add ?timer=10 to the URL to test with a 10-second timer.
const TIMER_SECONDS = Number(new URLSearchParams(location.search).get("timer")) || 5 * 60;
let timerEnd = 0;
let timerId = null;

function fmt(sec) {
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

function tick() {
  const msLeft = Math.max(0, timerEnd - Date.now());
  const secLeft = Math.ceil(msLeft / 1000);
  $("timer-text").textContent = fmt(secLeft);
  // Ring drains in step with the clock; the 1s CSS transition smooths it.
  $("ring-progress").style.strokeDashoffset = 1 - secLeft / TIMER_SECONDS;
  if (msLeft === 0) timeUp();
}

function startTimer() {
  stopTimer();
  timerEnd = Date.now() + TIMER_SECONDS * 1000;
  const ring = $("ring-progress");
  ring.style.transition = "none";
  tick();
  ring.getBoundingClientRect(); // apply the full ring before re-enabling the transition
  ring.style.transition = "";
  timerId = setInterval(tick, 250);
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
}

// Time's up: the selection resets and the user goes back to the landing page.
// For reserved items the reservation is kept; the user just goes back home.
// Adding items (timerMode "add"): back to "Items to add" with the list kept.
function timeUp() {
  stopTimer();
  if (timerMode === "add") {
    history.replaceState(null, "", location.pathname + location.search + "#pending");
    return route();
  }
  if (!reservedUntil) counts.forEach((_, i) => setCount(i, 0));
  goToList();
}

// The timer screen serves two flows: "take" (taking food out) and
// "add" (putting store-bought items in, after "Add to fridge").
let timerMode = "take";
function setTimerMode(mode) {
  timerMode = mode;
  $("timer-hint").textContent = mode === "add"
    ? "Add your items from the fridge before the timer goes off"
    : "Take your items from the fridge before the timer goes off";
  app.classList.toggle("timer-add", mode === "add");
  $("timer-title").textContent = mode === "add" ? "Add items" : "Retrieve items";
}

function goToList() {
  history.replaceState(null, "", location.pathname + location.search);
  route();
}

// ---------- Reserve time picker (24-hour, 09:00 – 17:00 only) ----------
const OPEN_HOUR = 9;
const CLOSE_HOUR = 17;  // last allowed time is exactly 17:00
const MINUTES = [0, 15, 30, 45];
const pad = (n) => String(n).padStart(2, "0");

const hourSel = $("res-hour");
const minSel = $("res-min");

const hours = [];
for (let h = OPEN_HOUR; h <= CLOSE_HOUR; h++) hours.push(h);
hourSel.replaceChildren(...hours.map((h) => new Option(pad(h), h)));
hourSel.value = "15"; // default from the design: 15:00

// 17 only allows :00 so nothing after closing time can be picked.
function refreshMinutes() {
  const keep = minSel.value;
  const mins = Number(hourSel.value) === CLOSE_HOUR ? [0] : MINUTES;
  minSel.replaceChildren(...mins.map((m) => new Option(pad(m), m)));
  minSel.value = keep !== "" && mins.includes(Number(keep)) ? keep : mins[0];
}
hourSel.addEventListener("change", refreshMinutes);
refreshMinutes();

// ---------- Screen switching (hash-based so browser Back works) ----------
const view = () => location.hash.slice(1) || "list";

function updateChrome() {
  const t = total();
  const v = view();
  $("cta-count").textContent = t;
  $("selection-count").textContent = t;
  $("take-count").textContent = t;
  const reserved = !!reservedUntil;
  $("reserved-count").textContent = t;
  $("res-banner").hidden = !reserved || v !== "list";
  $("res-banner-time").textContent = reserved ? reservedLeft() : "";
  $("selection-left").textContent = reserved ? ` • ${reservedLeftText()}` : "";
  $("selection-title").textContent = reserved ? "Your Reserved Items" : "Your Selection";
  $("take-label").textContent = reserved ? "Take reserved items" : "Take from fridge";
  app.classList.toggle("is-reserved", reserved || (v === "done" && doneWasReserved));
  $("cta").hidden = v !== "list" || reserved || t === 0;
  $("cta-reserved").hidden = v !== "list" || !reserved;
  $("items-section").hidden = reserved;
  $("reserved-section").hidden = !reserved;
  $("cta-take").hidden = v !== "selection";
  $("cta-confirm").hidden = v !== "timer";
  $("cta-done").hidden = v !== "done";
  $("cta-reserve").hidden = v !== "reserve";
  $("cta-details").hidden = v !== "details";
  $("cta-pending").hidden = v !== "pending";
  $("pending-count").textContent = pendingTotal();
  $("add-to-fridge-count").textContent = pendingTotal();
  $("add-to-fridge-btn").disabled = pendingTotal() === 0;
  $("take-btn").disabled = t === 0;
  app.classList.toggle("has-cta", (v !== "list" && v !== "scan") || (v === "list" && (reserved || t > 0)));
  app.classList.toggle("on-scan", v === "scan");
}

// ---------- Slide transitions ----------
// Buttons marked data-nav="forward" (the FABs, "Reserve instead") slide the next
// screen in from the right. Everything else that changes screen — back arrows,
// "Return to main page", the phone's Back button — slides in from the left.
let navDir = null;
let lastView = null;
document.addEventListener("click", (e) => {
  if (e.target.closest('[data-nav="forward"]')) navDir = "forward";
}, true); // capture: runs before the button's own handler navigates

function slideIn(v) {
  const dir = navDir || "back";
  navDir = null;
  const first = lastView === null;
  const changed = v !== lastView;
  lastView = v;
  if (first || !changed) return;
  const els = [$(`view-${v}`), ...document.querySelectorAll(".cta:not([hidden])")];
  els.forEach((el) => {
    el.classList.remove("slide-forward", "slide-back");
    void el.offsetWidth; // restart the animation if it's already running
    el.classList.add(`slide-${dir}`);
    el.addEventListener("animationend", () => el.classList.remove(`slide-${dir}`), { once: true });
  });
}

function route() {
  let v = view();
  // Nothing selected (e.g. Back after the timer reset): fall back to the list.
  // Also: once items are reserved, the checkout screens can't be reopened via Back.
  const timerEmpty = timerMode === "add" ? pendingTotal() === 0 : total() === 0;
  if (((v === "selection" || v === "reserve") && total() === 0) || (v === "timer" && timerEmpty) ||
      (v === "reserve" && reservedUntil)) {
    history.replaceState(null, "", location.pathname + location.search);
    v = "list";
  }
  if (v === "selection") buildSelection();
  if (v === "list" && reservedUntil) renderReserved();
  if (v === "timer") startTimer(); else stopTimer();
  $("view-list").hidden = v !== "list";
  $("view-selection").hidden = v !== "selection";
  $("view-timer").hidden = v !== "timer";
  $("view-done").hidden = v !== "done";
  // data-done lists the confirmation modes an element belongs to, e.g. "take add".
  document.querySelectorAll("[data-done]").forEach((el) => {
    el.hidden = !el.dataset.done.split(" ").includes(doneMode);
  });
  $("view-done").dataset.mode = doneMode;
  $("view-reserve").hidden = v !== "reserve";
  $("view-scan").hidden = v !== "scan";
  $("view-details").hidden = v !== "details";
  $("view-pending").hidden = v !== "pending";
  if (v === "pending") renderPending();
  if (v === "details" && lastView !== "details") openDetails();
  if (v === "scan") startScanner(); else stopScanner();
  updateChrome();
  window.scrollTo(0, 0);
  slideIn(v);
}

let cameFromList = false;
$("continue-btn").addEventListener("click", () => {
  cameFromList = true;
  location.hash = "selection";
});
$("back-btn").addEventListener("click", () => {
  if (cameFromList) history.back();
  else location.hash = "";
});
$("take-btn").addEventListener("click", () => {
  setTimerMode("take");
  location.hash = "timer";
});
$("timer-back-btn").addEventListener("click", () => history.back());

// Confirm: items taken. Clear the selection and show the confirmation.
// replaceState so the phone's Back button can't reopen the running timer.
let doneWasReserved = false; // confirmation page uses the purple theme after a reservation
$("confirm-btn").addEventListener("click", () => {
  doneMode = timerMode;
  if (timerMode === "add") {
    // Items are in the fridge: clear the list and show the contribution message.
    stopTimer();
    pendingItems.length = 0;
    editIndex = null;
    doneWasReserved = false;
    history.replaceState(null, "", location.pathname + location.search + "#done");
    return route();
  }
  stopTimer();
  doneWasReserved = !!reservedUntil;
  clearInterval(reservedTickId);
  reservedUntil = null;
  counts.forEach((_, i) => setCount(i, 0));
  history.replaceState(null, "", location.pathname + location.search + "#done");
  route();
});
$("home-btn").addEventListener("click", goToList);

document.querySelectorAll('[data-go="reserve"]').forEach((btn) =>
  btn.addEventListener("click", () => { location.hash = "reserve"; })
);
$("reserve-back-btn").addEventListener("click", () => history.back());

// Reserve items: hold the selection until the chosen time and show the
// "Reservation complete" page. "Return to main page" then opens the home
// page in reserved mode. replaceState so Back can't reopen the time picker.
let doneMode = "take"; // which confirmation to show: "take", "add" or "reserved"
$("reserve-btn").addEventListener("click", () => {
  const until = new Date();
  until.setHours(Number(hourSel.value), Number(minSel.value), 0, 0);
  // Already past that time today (e.g. testing in the evening): hold until tomorrow.
  if (until <= Date.now()) until.setDate(until.getDate() + 1);
  reservedUntil = until;
  clearInterval(reservedTickId);
  reservedTickId = setInterval(checkReservation, 15000);
  doneMode = "reserved";
  navDir = "forward";
  history.replaceState(null, "", location.pathname + location.search + "#done");
  route();
});
// Reserved (N) → review reserved items, then the same timer + confirmation flow.
$("reserved-btn").addEventListener("click", () => {
  cameFromList = true;
  location.hash = "selection";
});
document.querySelectorAll("[data-cancel]").forEach((btn) =>
  btn.addEventListener("click", releaseReservation)
);
// ---------- Scanner (Store-bought) ----------
// Demo rules:
//   EXPECTED_PRODUCT is the only store-bought item the demo adds.
//   SCAN_ACCEPT_ANY = true  → anything in front of the camera counts as a scan
//                             (no Red Bull on hand). After ~2.5s of live camera,
//                             or a tap on the viewfinder, it "recognises" the product.
//   SCAN_ACCEPT_ANY = false → only the Red Bull 250ml barcode is accepted
//                             (needs BarcodeDetector: Chrome on Android).
const SCAN_ACCEPT_ANY = true;
const EXPECTED_PRODUCT = "Redbull 0,25l";
const EXPECTED_BARCODES = ["9002490100070"]; // Red Bull Energy Drink 250ml (EAN-13)
const AUTO_SCAN_MS = 2500;

const scanner = $("scanner");
const scanVideo = $("scanner-video");
const scanStatus = $("scanner-status");
let scanStream = null;
let scanTimer = null;
let scanLoopId = null;
let scanDone = false;

function setScanState(state, text) {
  scanner.dataset.state = state;
  if (text !== undefined) scanStatus.textContent = text;
}

async function startScanner() {
  stopScanner();
  scanDone = false;
  $("scanner-result").hidden = true;
  $("scanner-simulate").hidden = true;
  setScanState("idle", "Starting camera…");

  if (!navigator.mediaDevices?.getUserMedia) {
    // Phones only allow the camera on https:// (or localhost).
    setScanState("error", "Camera not available on this connection. Open the https:// link, or simulate a scan.");
    $("scanner-simulate").hidden = false;
    return;
  }
  try {
    scanStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    if (view() !== "scan") return stopScanner(); // user left while the prompt was open
    scanVideo.srcObject = scanStream;
    await scanVideo.play();
    setScanState("scanning", `Point the camera at the ${EXPECTED_PRODUCT}`);
    if (SCAN_ACCEPT_ANY) scanTimer = setTimeout(() => onScanned(EXPECTED_PRODUCT), AUTO_SCAN_MS);
    else startBarcodeLoop();
  } catch (err) {
    setScanState("error", "Camera access was blocked. Allow camera access, or simulate a scan.");
    $("scanner-simulate").hidden = false;
  }
}

async function startBarcodeLoop() {
  if (!("BarcodeDetector" in window)) {
    setScanState("scanning", "Barcode scanning isn't supported here. Tap to simulate.");
    return;
  }
  const detector = new BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
  const loop = async () => {
    if (scanDone || !scanStream) return;
    try {
      const codes = await detector.detect(scanVideo);
      const hit = codes.find((c) => EXPECTED_BARCODES.includes(c.rawValue));
      if (hit) return onScanned(EXPECTED_PRODUCT);
      if (codes.length) setScanState("scanning", `That's not a ${EXPECTED_PRODUCT}. Try again.`);
    } catch { /* frame not ready yet */ }
    scanLoopId = setTimeout(loop, 300);
  };
  loop();
}

function stopScanner() {
  clearTimeout(scanTimer);
  clearTimeout(scanLoopId);
  if (scanStream) scanStream.getTracks().forEach((t) => t.stop());
  scanStream = null;
  scanVideo.srcObject = null;
}

// Product confirmed: show it briefly, then continue to the next screen.
function onScanned(product) {
  if (scanDone) return;
  scanDone = true;
  stopScanner();
  setScanState("done");
  $("scanner-product").textContent = product;
  $("scanner-result").hidden = false;
  if (navigator.vibrate) navigator.vibrate(60);
  setTimeout(() => goToAfterScan(product), 1200);
}

function goToAfterScan(product) {
  if (view() !== "scan") return; // user already left the scanner
  scannedProduct = product;
  editIndex = null; // a new scan always creates a new entry
  navDir = "forward";
  location.hash = "details";
}

// ---------- Product details (after a store-bought scan) ----------
// Name is prefilled from the scan; one expiration date per item.
const MAX_QTY = 10;
const DEFAULT_QTY = 1;
let scannedProduct = EXPECTED_PRODUCT;
const nameInput = $("details-name");
const nameClear = $("details-name-clear");
const qtySel = $("details-qty");
qtySel.replaceChildren(...Array.from({ length: MAX_QTY }, (_, i) => new Option(i + 1, i + 1)));

// Today's date in the phone's local time zone, as yyyy-mm-dd.
function todayISO() {
  const t = new Date();
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
}

function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function renderDateFields() {
  const box = $("details-dates");
  const n = Number(qtySel.value);
  // Keep dates already picked when the quantity changes.
  const kept = [...box.querySelectorAll(".tf__date")].map((i) => i.value);
  box.replaceChildren();
  for (let k = 0; k < n; k++) {
    const field = $("date-field-tpl").content.firstElementChild.cloneNode(true);
    const id = `details-date-${k + 1}`;
    const input = field.querySelector(".tf__date");
    const display = field.querySelector(".tf__display");
    field.querySelector(".tf__label").textContent = `Expiration date: Product ${k + 1}`;
    field.querySelector(".tf__label").htmlFor = id;
    input.id = id;
    // Past dates stay pickable so the user sees what they chose plus the error.
    const error = field.querySelector(".tf__error");
    const show = () => {
      const expired = !!input.value && input.value < todayISO();
      error.hidden = !expired;
      field.dataset.expired = expired;
      display.textContent = input.value ? fmtDate(input.value) : "dd.mm.yyyy";
      display.classList.toggle("is-empty", !input.value);
      updateDetailsNext();
    };
    input.addEventListener("change", show);
    input.addEventListener("input", show);
    // Desktop Chrome needs showPicker(); phones open the picker on tap anyway.
    input.addEventListener("click", () => { try { input.showPicker?.(); } catch {} });
    if (kept[k]) input.value = kept[k];
    show();
    box.append(field);
  }
}

// Next is disabled while any expiration date is in the past.
function updateDetailsNext() {
  $("details-next-btn").disabled =
    !nameInput.value.trim() || !!document.querySelector('#details-dates [data-expired="true"]');
}

function openDetails() {
  const entry = editIndex !== null ? pendingItems[editIndex] : null;
  // Editing an entry from "Items to add" → "Complete editing"; a new scan → "Next".
  $("details-next-btn").textContent = entry ? "Complete editing" : "Next";
  nameInput.value = entry ? entry.name : scannedProduct.replace(",", "."); // design shows "Redbull 0.25l"
  nameClear.hidden = !nameInput.value;
  qtySel.value = String(entry ? entry.qty : DEFAULT_QTY);
  $("details-dates").replaceChildren();
  renderDateFields();
  if (entry) {
    entry.dates.forEach((v, k) => {
      const input = $(`details-date-${k + 1}`);
      if (input && v) { input.value = v; input.dispatchEvent(new Event("change")); }
    });
  }
  updateDetailsNext();
}

nameInput.addEventListener("input", () => { nameClear.hidden = !nameInput.value; updateDetailsNext(); });
nameClear.addEventListener("click", () => {
  nameInput.value = "";
  nameClear.hidden = true;
  updateDetailsNext();
  nameInput.focus();
});
qtySel.addEventListener("change", () => { renderDateFields(); updateDetailsNext(); });
$("details-back-btn").addEventListener("click", () => history.back());
// Next: save the entry (new, or the one being edited) and show "Items to add".
$("details-next-btn").addEventListener("click", () => {
  const entry = {
    name: nameInput.value.trim(),
    qty: Number(qtySel.value),
    dates: [...document.querySelectorAll("#details-dates .tf__date")].map((i) => i.value),
    img: "can.png",
    variant: "can",
  };
  if (editIndex !== null) pendingItems[editIndex] = entry;
  else pendingItems.push(entry);
  // Back from the list returns to this entry's details, in edit mode.
  editIndex = editIndex ?? pendingItems.length - 1;
  location.hash = "pending";
});

// ---------- Items to add ----------
// Store-bought items waiting to go into the fridge.
const pendingItems = [];
let editIndex = null; // index in pendingItems being edited on Product details

function renderPending() {
  const rows = $("pending-rows");
  rows.replaceChildren();
  pendingItems.forEach((entry, idx) => {
    const row = $("pending-row-tpl").content.firstElementChild.cloneNode(true);
    fillImage(row.querySelector(".card__img"), entry);
    row.querySelector(".card__title").textContent = entry.name;
    row.querySelector(".row__badge").textContent = entry.qty;
    row.querySelector('[data-action="edit"]').setAttribute("aria-label", `Edit ${entry.name}`);
    row.querySelector('[data-action="delete"]').setAttribute("aria-label", `Remove ${entry.name}`);
    row.dataset.index = idx;
    rows.append(row);
  });
  if (!pendingItems.length) {
    const empty = document.createElement("li");
    empty.className = "pending-empty";
    empty.textContent = "No items yet. Tap Add food to scan a product.";
    rows.append(empty);
  }
  updateChrome();
}

const pendingTotal = () => pendingItems.reduce((a, e) => a + e.qty, 0);

$("pending-rows").addEventListener("click", (e) => {
  const btn = e.target.closest(".row__icon-btn");
  if (!btn) return;
  const idx = Number(btn.closest(".row").dataset.index);
  if (btn.dataset.action === "edit") {
    editIndex = idx;
    location.hash = "details";
  } else {
    pendingItems.splice(idx, 1);
    editIndex = null;
    renderPending();
  }
});
$("pending-back-btn").addEventListener("click", () => history.back());
// Add food (Items to add): scan another store-bought product via the dropdown.
// "Add food" here opens the same Home made / Store-bought dropdown as on the home page (see below).
// Add to fridge → the same 5-minute timer, in "add" mode.
$("add-to-fridge-btn").addEventListener("click", () => {
  setTimerMode("add");
  location.hash = "timer";
});

// Tapping the viewfinder or "Simulate scan" counts as a scan (demo).
scanner.addEventListener("click", (e) => {
  if (scanDone) return;
  if (e.target.closest("#scanner-simulate") || (SCAN_ACCEPT_ANY && scanner.dataset.state === "scanning")) {
    onScanned(EXPECTED_PRODUCT);
  }
});
$("scan-back-btn").addEventListener("click", () => history.back());

// ---------- Add food dropdowns ----------
// Used by "Add food" on the home page and on Items to add: same options.
// Opens under its button; closes on picking an option, tapping elsewhere,
// pressing Escape, or changing screen. Store-bought → scanner; Home made → not wired yet.
const menus = [...document.querySelectorAll(".menu-wrap")].map((wrap) => ({
  btn: wrap.querySelector('[aria-haspopup="menu"]'),
  menu: wrap.querySelector(".menu"),
}));

function setMenu(m, open) {
  m.menu.hidden = !open;
  m.btn.setAttribute("aria-expanded", String(open));
}
const closeAllMenus = () => menus.forEach((m) => setMenu(m, false));

menus.forEach((m) => {
  m.btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = m.menu.hidden;
    closeAllMenus();
    setMenu(m, open);
  });
  m.menu.addEventListener("click", (e) => {
    const item = e.target.closest(".menu__item");
    if (!item) return;
    setMenu(m, false);
    if (item.dataset.foodType === "store-bought") location.hash = "scan";
  });
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".menu-wrap")) closeAllMenus();
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  const open = menus.find((m) => !m.menu.hidden);
  if (open) { setMenu(open, false); open.btn.focus(); }
});
window.addEventListener("hashchange", closeAllMenus);

window.addEventListener("hashchange", route);
route();
