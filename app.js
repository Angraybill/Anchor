const STORAGE_KEY = "roommate-helper-demo-v1";
const seed = {
  currentMember: "sam",
  members: [
    { id: "sam", name: "Sam", points: 18, color: "#5b7c63" },
    { id: "maya", name: "Maya", points: 24, color: "#d88962" },
    { id: "jordan", name: "Jordan", points: 12, color: "#5686a3" },
    { id: "alex", name: "Alex", points: 20, color: "#9275a5" }
  ],
  tasks: [
    { id: "t1", title: "Take recycling out", kind: "chore", due: "Today", points: 5, status: "open", assignedTo: null, createdBy: "sam", note: "Kitchen bin is full" },
    { id: "t2", title: "Clean the kitchen", kind: "chore", due: "This week", points: 15, status: "claimed", assignedTo: "maya", createdBy: "jordan", note: "Wipe counters and load dishwasher" },
    { id: "t3", title: "Buy dish soap", kind: "shopping", due: "Before tonight", points: 8, status: "open", assignedTo: null, createdBy: "alex", note: "Any unscented brand" }
  ],
  inventory: [
    { id: "i1", name: "Paper towels", quantity: 2, status: "running low", purchasedAt: "Yesterday" },
    { id: "i2", name: "Dish soap", quantity: 0, status: "needed", purchasedAt: null },
    { id: "i3", name: "Toilet paper", quantity: 12, status: "available", purchasedAt: "Monday" }
  ],
  activity: ["Maya picked up Clean the kitchen · 14m ago", "Alex added dish soap to the shared list · 32m ago", "Jordan handled the last trash run · Yesterday"]
};
let state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || structuredClone(seed);
const $ = (selector) => document.querySelector(selector);
const memberName = (id) => state.members.find((member) => member.id === id)?.name || "the house";
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
const showAlert = (message) => { const alert = $("#alert"); alert.textContent = message; alert.hidden = false; clearTimeout(showAlert.timer); showAlert.timer = setTimeout(() => { alert.hidden = true; }, 4000); };

function render() {
  const openTasks = state.tasks.filter((task) => task.status !== "done");
  $("#open-count").textContent = openTasks.length;
  $("#shopping-count").textContent = state.inventory.filter((item) => item.status === "needed" || item.status === "running low").length;
  $("#points-count").textContent = state.members.reduce((total, member) => total + member.points, 0);
  const picker = $("#current-member"); picker.innerHTML = state.members.map((member) => `<option value="${member.id}">${member.name}</option>`).join(""); picker.value = state.currentMember;
  renderTasks(openTasks); renderInventory(); renderMembers(); renderActivity();
  const due = openTasks.filter((task) => task.due === "Today" || task.due === "Before tonight");
  $("#reminder-text").textContent = due.length ? `${due.length} task${due.length === 1 ? " is" : "s are"} due today. A five-minute nudge can make tonight easier.` : "You’re all clear for tonight. Nice work, house.";
}

function renderTasks(tasks) {
  const list = $("#tasks-list");
  if (!tasks.length) { list.innerHTML = $("#empty-template").innerHTML; return; }
  list.innerHTML = tasks.map((task) => {
    const claimed = task.status === "claimed";
    const assigned = claimed ? `${memberName(task.assignedTo)} has this` : "Needs a hand";
    return `<article class="task-card"><div><span class="tag ${claimed ? "claimed" : ""}">${task.due}</span><span class="tag">${task.kind === "shopping" ? "shopping" : "chore"}</span><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta">${assigned} · ${task.points} points</div>${task.note ? `<div class="task-note">${escapeHtml(task.note)}</div>` : ""}</div><div class="task-actions">${claimed ? `<button class="small-button primary-small" data-action="complete" data-id="${task.id}">Handled</button>` : `<button class="small-button primary-small" data-action="claim" data-id="${task.id}">I’ll take it</button>`}<button class="small-button" data-action="trade" data-id="${task.id}" ${claimed ? "disabled" : ""}>Trade</button></div></article>`;
  }).join("");
}

function renderInventory() {
  const list = $("#inventory-list");
  list.innerHTML = state.inventory.map((item) => `<article class="inventory-item"><div><div class="inventory-name">${escapeHtml(item.name)}</div><div class="inventory-meta">${item.quantity} ${item.quantity === 1 ? "unit" : "units"}${item.purchasedAt ? ` · bought ${item.purchasedAt}` : ""}</div>${item.status === "needed" ? "<div class=\"duplicate-warning\">Check before buying — nobody has claimed this yet.</div>" : ""}</div><div class="inventory-status ${item.status !== "available" ? "warning" : ""}">${item.status}</div></article>`).join("");
}

function renderMembers() {
  const max = Math.max(...state.members.map((member) => member.points), 1);
  $("#members-list").innerHTML = state.members.map((member) => `<div class="member-row"><span class="avatar" style="background:${member.color}">${member.name.slice(0, 2).toUpperCase()}</span><div><div class="member-name">${member.name}</div><div class="progress"><span style="width:${Math.round(member.points / max * 100)}%"></span></div></div><span class="member-points">${member.points} pts</span></div>`).join("");
}

function renderActivity() { $("#activity-list").innerHTML = state.activity.slice(0, 5).map((entry) => `<div class="activity"><span class="activity-dot"></span><span>${escapeHtml(entry)}</span></div>`).join(""); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char])); }
function addActivity(text) { state.activity.unshift(text); }

document.addEventListener("click", (event) => {
  const opener = event.target.closest("[data-open-modal]"); if (opener) $("#" + opener.dataset.openModal).showModal();
  const action = event.target.closest("[data-action]"); if (!action || action.disabled) return;
  const task = state.tasks.find((item) => item.id === action.dataset.id); if (!task) return;
  const current = state.currentMember;
  if (action.dataset.action === "claim") { task.status = "claimed"; task.assignedTo = current; addActivity(`${memberName(current)} picked up ${task.title} · just now`); showAlert(`${task.title} is now yours. You’ve got this.`); }
  if (action.dataset.action === "complete") { task.status = "done"; const member = state.members.find((item) => item.id === task.assignedTo); if (member) member.points += task.points; addActivity(`${memberName(task.assignedTo)} handled ${task.title} · just now`); showAlert(`Nice one. ${task.title} is handled.`); }
  if (action.dataset.action === "trade") { const recipient = state.members.find((member) => member.id !== current); if (!recipient) return; const accepted = window.confirm(`Offer “${task.title}” to ${recipient.name}? They will receive the task and ${task.points} points.`); if (accepted) { task.status = "claimed"; task.assignedTo = recipient.id; addActivity(`${memberName(current)} handed ${task.title} to ${recipient.name} · just now`); showAlert(`Task handed off to ${recipient.name}.`); } }
  save(); render();
});
$("#current-member").addEventListener("change", (event) => { state.currentMember = event.target.value; save(); render(); });
$("#reminder-button").addEventListener("click", () => showAlert($("#reminder-text").textContent));
$("#reset-demo").addEventListener("click", () => { if (window.confirm("Reset the household demo?")) { state = structuredClone(seed); save(); render(); showAlert("Demo household reset."); } });
$("#task-form").addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const task = { id: `t-${Date.now()}`, title: data.get("title"), kind: data.get("kind"), due: data.get("due"), points: Number(data.get("points")), status: "open", assignedTo: null, createdBy: state.currentMember, note: data.get("note") }; state.tasks.unshift(task); addActivity(`${memberName(state.currentMember)} sent ${task.title} to the house · just now`); save(); render(); event.currentTarget.closest("dialog").close(); event.currentTarget.reset(); showAlert("Task sent to the house."); });
$("#item-form").addEventListener("submit", (event) => { event.preventDefault(); const data = new FormData(event.currentTarget); const normalized = String(data.get("name")).trim().toLowerCase(); const existing = state.inventory.find((item) => item.name.toLowerCase() === normalized || item.name.toLowerCase().replace(/s$/, "") === normalized.replace(/s$/, "")); if (existing && existing.status !== "needed") { showAlert(`Possible duplicate: ${existing.name} is already ${existing.status}.`); event.currentTarget.closest("dialog").close(); return; } const item = { id: `i-${Date.now()}`, name: String(data.get("name")).trim(), quantity: Number(data.get("quantity")), status: "needed", purchasedAt: null }; state.inventory.unshift(item); addActivity(`${memberName(state.currentMember)} added ${item.name} to the shared list · just now`); save(); render(); event.currentTarget.closest("dialog").close(); event.currentTarget.reset(); showAlert("Added to the shared shopping list."); });
render();
