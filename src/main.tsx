import { FormEvent, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Member = { id: string; name: string; points: number; color: string };
type Task = {
  id: string;
  title: string;
  kind: "chore" | "shopping";
  due: string;
  points: number;
  status: "open" | "claimed" | "done";
  assignedTo: string | null;
  note: string;
  pendingTrade?: { from: string; to: string };
};
type Item = {
  id: string;
  name: string;
  quantity: number;
  status: string;
  purchasedAt: string | null;
};
type House = {
  name: string;
  joinCode: string;
  members: Member[];
  tasks: Task[];
  inventory: Item[];
  activity: string[];
};
type Session = { householdId: string; userId: string };
const api = async <T,>(path: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
};
const saved = () => {
  try {
    return JSON.parse(
      localStorage.getItem("household-session") || "null",
    ) as Session | null;
  } catch {
    return null;
  }
};

function App() {
  const [session, setSession] = useState<Session | null>(saved);
  const [house, setHouse] = useState<House | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<"task" | "item" | null>(null);
  const load = () =>
    session
      ? api<House>(`/households/${session.householdId}`)
          .then(setHouse)
          .catch((e: Error) => setError(e.message))
      : Promise.resolve();
  useEffect(() => {
    void load();
  }, [session]);
  const enter = (next: Session) => {
    localStorage.setItem("household-session", JSON.stringify(next));
    setSession(next);
  };
  if (!session || !house) return <Landing onEnter={enter} error={error} />;
  const current = house.members.find((member) => member.id === session.userId);
  const open = house.tasks.filter((task) => task.status !== "done");
  const needs = house.inventory.filter(
    (item) => item.status === "needed" || item.status === "running low",
  );
  const due = open.filter(
    (task) => task.due === "Today" || task.due === "Before tonight",
  );
  const act = async (path: string, options: RequestInit, message: string) => {
    try {
      await api(path, options);
      await load();
      setError(message);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Shared home</p>
          <h1>Good afternoon, {house.name}.</h1>
          <p className="subtitle">
            A calmer home starts with one small handoff.
          </p>
        </div>
        <div className="member-picker">
          <label>
            Viewing as
            <select
              value={session.userId}
              onChange={(e) => {
                const next = { ...session, userId: e.target.value };
                localStorage.setItem("household-session", JSON.stringify(next));
                setSession(next);
              }}
            >
              {house.members.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <small>
            Invite code: <b>{house.joinCode}</b>
          </small>
        </div>
      </header>
      <main>
        <section className="stat-grid">
          <Stat
            label="Open tasks"
            value={open.length}
            note="waiting for a hand"
          />
          <Stat
            label="Shopping needs"
            value={needs.length}
            note="check before buying"
          />
          <Stat
            label="Your points"
            value={current?.points || 0}
            note="earned this week"
          />
        </section>
        {error && (
          <div className="alert" role="status">
            {error}
            <button onClick={() => setError("")} aria-label="Dismiss">
              ×
            </button>
          </div>
        )}
        <div className="content-grid">
          <section className="panel">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Today at home</p>
                <h2>Needs a hand</h2>
              </div>
              <button
                className="button primary"
                onClick={() => setForm("task")}
              >
                + Add task
              </button>
            </div>
            <div className="stack">
              {open.length ? (
                open.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    house={house}
                    session={session}
                    act={act}
                  />
                ))
              ) : (
                <Empty />
              )}
            </div>
          </section>
          <aside className="side-column">
            <section className="panel">
              <div className="section-heading compact">
                <div>
                  <p className="eyebrow">Shared supplies</p>
                  <h2>Shopping list</h2>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setForm("item")}
                  aria-label="Add item"
                >
                  +
                </button>
              </div>
              <div className="stack">
                {house.inventory.map((item) => (
                  <article className="inventory-item" key={item.id}>
                    <div>
                      <div className="inventory-name">{item.name}</div>
                      <div className="inventory-meta">
                        {item.quantity} {item.quantity === 1 ? "unit" : "units"}
                        {item.purchasedAt && ` · bought ${item.purchasedAt}`}
                      </div>
                      {item.status === "needed" && (
                        <div className="duplicate-warning">
                          Check before buying.
                        </div>
                      )}
                    </div>
                    <div>
                      <div
                        className={`inventory-status ${item.status !== "available" ? "warning" : ""}`}
                      >
                        {item.status}
                      </div>
                      {item.status === "needed" && (
                        <button
                          className="text-button"
                          onClick={() =>
                            void act(
                              `/households/${session.householdId}/inventory/${item.id}/purchase`,
                              {
                                method: "POST",
                                body: JSON.stringify({
                                  memberId: session.userId,
                                }),
                              },
                              "Purchase recorded.",
                            )
                          }
                        >
                          Record purchase
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
            <section className="panel">
              <p className="eyebrow">House pulse</p>
              <h2>Everyone pitches in.</h2>
              <p className="muted">
                Points coordinate effort without turning the house into a
                leaderboard.
              </p>
              <div className="members-list">
                {house.members.map((member) => (
                  <div className="member-row" key={member.id}>
                    <span
                      className="avatar"
                      style={{ background: member.color }}
                    >
                      {member.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="member-name">{member.name}</div>
                      <div className="progress">
                        <span
                          style={{
                            width: `${Math.min(member.points * 3, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="member-points">{member.points} pts</span>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel reminder-panel">
              <p className="eyebrow">Before bed</p>
              <h2>Tonight’s nudge</h2>
              <p className="muted">
                {due.length
                  ? `${due.length} task${due.length === 1 ? " is" : "s are"} due today.`
                  : "You’re all clear for tonight."}
              </p>
              <button
                className="button secondary"
                onClick={() =>
                  setError(
                    due.length
                      ? "Remember to check the tasks due today."
                      : "You’re all clear for tonight.",
                  )
                }
              >
                Show reminder
              </button>
            </section>
          </aside>
        </div>
        <section className="panel activity-panel">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">Recent wins</p>
              <h2>House activity</h2>
            </div>
          </div>
          <div className="activity-list">
            {house.activity.map((entry) => (
              <div className="activity" key={entry}>
                <span className="activity-dot" />
                {entry}
              </div>
            ))}
          </div>
        </section>
      </main>
      {form === "task" && (
        <TaskForm session={session} close={() => setForm(null)} act={act} />
      )}
      {form === "item" && (
        <ItemForm session={session} close={() => setForm(null)} act={act} />
      )}
    </div>
  );
}
function Landing({
  onEnter,
  error,
}: {
  onEnter: (session: Session) => void;
  error: string;
}) {
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [message, setMessage] = useState(error);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const result = await api<{ householdId: string; userId: string }>(
        mode === "create" ? "/households" : "/households/join",
        {
          method: "POST",
          body: JSON.stringify(
            mode === "create"
              ? { name, userName }
              : { joinCode: name, userName },
          ),
        },
      );
      onEnter(result);
    } catch (e) {
      setMessage((e as Error).message);
    }
  };
  return (
    <main className="landing">
      <div className="landing-copy">
        <p className="eyebrow">Shared home coordination</p>
        <h1>Make the little things at home feel lighter.</h1>
        <p className="subtitle">
          Create a household, invite your roommates, and keep chores and shared
          supplies in one calm place.
        </p>
        <div className="feature-list">
          <span>✓ Shared tasks</span>
          <span>✓ Grocery duplicate warnings</span>
          <span>✓ Fair points and handoffs</span>
        </div>
      </div>
      <form className="landing-card" onSubmit={submit}>
        <div className="tabs">
          <button
            type="button"
            className={mode === "create" ? "active" : ""}
            onClick={() => setMode("create")}
          >
            Create household
          </button>
          <button
            type="button"
            className={mode === "join" ? "active" : ""}
            onClick={() => setMode("join")}
          >
            Join household
          </button>
        </div>
        <h2>
          {mode === "create" ? "Start your household" : "Join your roommates"}
        </h2>
        <label>
          {mode === "create" ? "Household name" : "Invite code"}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={mode === "create" ? "Cedar House" : "ABC123"}
          />
        </label>
        <label>
          Your name
          <input
            required
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Sam"
          />
        </label>
        {message && <p className="form-error">{message}</p>}
        <button className="button primary full">
          {mode === "create" ? "Create household" : "Join household"}
        </button>
        <small className="form-help">
          No finalized product name yet. This is a weekend MVP.
        </small>
      </form>
    </main>
  );
}
function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: number;
  note: string;
}) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
function TaskCard({
  task,
  house,
  session,
  act,
}: {
  task: Task;
  house: House;
  session: Session;
  act: (path: string, options: RequestInit, message: string) => Promise<void>;
}) {
  const recipient = house.members.find(
    (member) => member.id !== session.userId,
  );
  const pendingForCurrent = task.pendingTrade?.to === session.userId;
  const route = `/households/${session.householdId}/tasks/${task.id}`;
  return (
    <article className="task-card">
      <div>
        <span className={`tag ${task.status === "claimed" ? "claimed" : ""}`}>
          {task.due}
        </span>
        <span className="tag">{task.kind}</span>
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {task.status === "claimed"
            ? `${house.members.find((member) => member.id === task.assignedTo)?.name} has this`
            : "Needs a hand"}{" "}
          · {task.points} points
        </div>
        {task.note && <div className="task-note">{task.note}</div>}
        {task.pendingTrade && (
          <div className="task-note">
            {pendingForCurrent
              ? `Offer from ${house.members.find((member) => member.id === task.pendingTrade?.from)?.name}`
              : `Offer sent to ${house.members.find((member) => member.id === task.pendingTrade?.to)?.name}`}
          </div>
        )}
      </div>
      <div className="task-actions">
        {task.status === "claimed" ? (
          <button
            className="small-button primary-small"
            onClick={() =>
              void act(
                `${route}/complete`,
                {
                  method: "POST",
                  body: JSON.stringify({ memberId: session.userId }),
                },
                "Nice one. Task handled.",
              )
            }
          >
            Handled
          </button>
        ) : pendingForCurrent ? (
          <>
            <button
              className="small-button primary-small"
              onClick={() =>
                void act(
                  `${route}/accept`,
                  {
                    method: "POST",
                    body: JSON.stringify({ memberId: session.userId }),
                  },
                  "Trade accepted.",
                )
              }
            >
              Accept
            </button>
            <button
              className="small-button"
              onClick={() =>
                void act(
                  `${route}/reject`,
                  {
                    method: "POST",
                    body: JSON.stringify({ memberId: session.userId }),
                  },
                  "Trade declined.",
                )
              }
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <button
              className="small-button primary-small"
              disabled={Boolean(task.pendingTrade)}
              onClick={() =>
                void act(
                  `${route}/claim`,
                  {
                    method: "POST",
                    body: JSON.stringify({ memberId: session.userId }),
                  },
                  "Task is now yours.",
                )
              }
            >
              {task.pendingTrade ? "Offer pending" : "I’ll take it"}
            </button>
            {recipient && (
              <button
                className="small-button"
                disabled={Boolean(task.pendingTrade)}
                onClick={() =>
                  void act(
                    `${route}/trade`,
                    {
                      method: "POST",
                      body: JSON.stringify({
                        from: session.userId,
                        to: recipient.id,
                      }),
                    },
                    `Offer sent to ${recipient.name}.`,
                  )
                }
              >
                Trade
              </button>
            )}
          </>
        )}
      </div>
    </article>
  );
}
function TaskForm({
  session,
  close,
  act,
}: {
  session: Session;
  close: () => void;
  act: (path: string, options: RequestInit, message: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("chore");
  const [due, setDue] = useState("Today");
  const [points, setPoints] = useState(5);
  const [note, setNote] = useState("");
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          void act(
            `/households/${session.householdId}/tasks`,
            {
              method: "POST",
              body: JSON.stringify({ title, kind, due, points, note }),
            },
            "Task sent to the house.",
          ).then(close);
        }}
      >
        <button type="button" className="close-button" onClick={close}>
          ×
        </button>
        <p className="eyebrow">Start a task</p>
        <h2>What needs doing?</h2>
        <label>
          Task name
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Take recycling out"
          />
        </label>
        <label>
          Type
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="chore">House chore</option>
            <option value="shopping">Communal shopping</option>
          </select>
        </label>
        <div className="form-row">
          <label>
            When
            <select value={due} onChange={(e) => setDue(e.target.value)}>
              <option>Today</option>
              <option>This week</option>
              <option>Flexible</option>
            </select>
          </label>
          <label>
            Points
            <input
              type="number"
              min="1"
              max="50"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
            />
          </label>
        </div>
        <label>
          Helpful detail
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </label>
        <button className="button primary full">Send to the house</button>
      </form>
    </div>
  );
}
function ItemForm({
  session,
  close,
  act,
}: {
  session: Session;
  close: () => void;
  act: (path: string, options: RequestInit, message: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);
  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        onSubmit={(event) => {
          event.preventDefault();
          void act(
            `/households/${session.householdId}/inventory`,
            { method: "POST", body: JSON.stringify({ name, quantity }) },
            "Added to the shared list.",
          ).then(close);
        }}
      >
        <button type="button" className="close-button" onClick={close}>
          ×
        </button>
        <p className="eyebrow">Shared supplies</p>
        <h2>Add to the list</h2>
        <label>
          Item name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Paper towels"
          />
        </label>
        <label>
          Quantity
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </label>
        <button className="button primary full">Add item</button>
      </form>
    </div>
  );
}
function Empty() {
  return (
    <div className="empty-state">
      <span className="empty-icon">✓</span>
      <p>Nothing needs a hand right now.</p>
      <small>Enjoy the calm or add a task for the house.</small>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
