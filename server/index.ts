import "dotenv/config";
import cors from "cors";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";

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
type UserDoc = { _id?: ObjectId; name: string; color: string; points: number };
type HouseholdDoc = {
  _id?: ObjectId;
  name: string;
  joinCode: string;
  userIds: ObjectId[];
  createdAt: Date;
};
type TaskDoc = Omit<Task, "id"> & { _id?: ObjectId; householdId: ObjectId };
type ItemDoc = Omit<Item, "id"> & { _id?: ObjectId; householdId: ObjectId };
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required");
const client = new MongoClient(uri);
const app = express();
app.use(cors());
app.use(express.json());
const colors = ["#5b7c63", "#d88962", "#5686a3", "#9275a5"];
const validId = (value: string) =>
  ObjectId.isValid(value) ? new ObjectId(value) : null;
const memberName = (members: Member[], id: string | null) =>
  members.find((member) => member.id === id)?.name ?? "the house";
const normalize = (value: string) =>
  value.trim().toLowerCase().replace(/s$/, "");
async function data(householdId: ObjectId) {
  const db = client.db("roommate_helper");
  const household = await db
    .collection<HouseholdDoc>("households")
    .findOne({ _id: householdId });
  if (!household) return null;
  const userIds = (household.userIds as ObjectId[]) || [];
  const users = await db
    .collection<UserDoc>("users")
    .find({ _id: { $in: userIds } })
    .toArray();
  const [taskDocs, itemDocs, events] = await Promise.all([
    db
      .collection<TaskDoc>("tasks")
      .find({ householdId })
      .sort({ _id: -1 })
      .toArray(),
    db
      .collection<ItemDoc>("inventory")
      .find({ householdId })
      .sort({ _id: -1 })
      .toArray(),
    db
      .collection<{ text: string }>("activity")
      .find({ householdId })
      .sort({ _id: -1 })
      .limit(8)
      .toArray(),
  ]);
  const members = users.map((user) => ({
    id: user._id!.toHexString(),
    name: user.name,
    color: user.color,
    points: user.points,
  }));
  const tasks = taskDocs.map(({ _id, householdId: _householdId, ...task }) => ({
    id: _id!.toHexString(),
    ...task,
  }));
  const inventory = itemDocs.map(
    ({ _id, householdId: _householdId, ...item }) => ({
      id: _id!.toHexString(),
      ...item,
    }),
  );
  return {
    name: household.name,
    joinCode: household.joinCode,
    members,
    tasks,
    inventory,
    activity: events.map((event) => event.text),
  };
}
async function activity(householdId: ObjectId, text: string) {
  await client
    .db("roommate_helper")
    .collection("activity")
    .insertOne({ householdId, text, createdAt: new Date() });
}
async function start() {
  await client.connect();
  const db = client.db("roommate_helper");
  await Promise.all([
    db
      .collection<HouseholdDoc>("households")
      .createIndex({ joinCode: 1 }, { unique: true }),
    db.collection("tasks").createIndex({ householdId: 1 }),
    db.collection("inventory").createIndex({ householdId: 1 }),
  ]);
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.post("/api/households", async (req, res) => {
    try {
      const name = String(req.body.name || "").trim();
      const userName = String(req.body.userName || "").trim();
      if (!name || !userName)
        return res
          .status(400)
          .json({ error: "Household and user names are required." });
      const user = await db
        .collection<UserDoc>("users")
        .insertOne({ name: userName, points: 0, color: colors[0] });
      const joinCode = Math.random().toString(36).slice(2, 8).toUpperCase();
      const household = await db
        .collection<HouseholdDoc>("households")
        .insertOne({
          name,
          joinCode,
          userIds: [user.insertedId],
          createdAt: new Date(),
        });
      res
        .status(201)
        .json({
          householdId: household.insertedId.toHexString(),
          userId: user.insertedId.toHexString(),
          household: await data(household.insertedId),
        });
    } catch (error) {
      res.status(500).json({ error: "Could not create household." });
    }
  });
  app.post("/api/households/join", async (req, res) => {
    try {
      const joinCode = String(req.body.joinCode || "")
        .trim()
        .toUpperCase();
      const userName = String(req.body.userName || "").trim();
      const household = await db
        .collection<HouseholdDoc>("households")
        .findOne({ joinCode });
      if (!household || !userName)
        return res
          .status(404)
          .json({ error: "That invite code or user name is invalid." });
      const user = await db
        .collection<UserDoc>("users")
        .insertOne({
          name: userName,
          points: 0,
          color: colors[(household.userIds?.length || 0) % colors.length],
        });
      await db
        .collection<HouseholdDoc>("households")
        .updateOne(
          { _id: household._id },
          { $push: { userIds: user.insertedId } },
        );
      res.json({
        householdId: household._id!.toHexString(),
        userId: user.insertedId.toHexString(),
        household: await data(household._id!),
      });
    } catch (error) {
      res.status(500).json({ error: "Could not join household." });
    }
  });
  app.get("/api/households/:id", async (req, res) => {
    const id = validId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid household id." });
    const result = await data(id);
    return result
      ? res.json(result)
      : res.status(404).json({ error: "Household not found." });
  });
  app.post("/api/households/:id/tasks", async (req, res) => {
    const householdId = validId(req.params.id);
    const title = String(req.body.title || "").trim();
    if (!householdId || !title)
      return res.status(400).json({ error: "A task name is required." });
    const task: TaskDoc = {
      householdId,
      title,
      kind: req.body.kind === "shopping" ? "shopping" : "chore",
      due: req.body.due || "Today",
      points: Number(req.body.points) || 5,
      status: "open",
      assignedTo: null,
      note: String(req.body.note || "").trim(),
    };
    const result = await db.collection<TaskDoc>("tasks").insertOne(task);
    await activity(householdId, `${title} was added to the house · just now`);
    res.status(201).json({ id: result.insertedId.toHexString(), ...task });
  });
  app.post(
    "/api/households/:householdId/tasks/:taskId/:action",
    async (req, res) => {
      const householdId = validId(req.params.householdId);
      const taskId = validId(req.params.taskId);
      if (!householdId || !taskId)
        return res.status(400).json({ error: "Invalid task or household id." });
      const tasks = db.collection<TaskDoc>("tasks");
      const task = await tasks.findOne({ _id: taskId, householdId });
      if (!task) return res.status(404).json({ error: "Task not found." });
      const members = (await data(householdId))!.members;
      const memberId = String(req.body.memberId || "");
      if (
        req.params.action === "claim" &&
        task.status === "open" &&
        !task.pendingTrade
      ) {
        await tasks.updateOne(
          { _id: taskId },
          { $set: { status: "claimed", assignedTo: memberId } },
        );
        await activity(
          householdId,
          `${memberName(members, memberId)} picked up ${task.title} · just now`,
        );
      } else if (
        req.params.action === "complete" &&
        task.status === "claimed"
      ) {
        await tasks.updateOne({ _id: taskId }, { $set: { status: "done" } });
        await db
          .collection<UserDoc>("users")
          .updateOne(
            { _id: validId(task.assignedTo || "")! },
            { $inc: { points: task.points } },
          );
        await activity(
          householdId,
          `${memberName(members, task.assignedTo)} handled ${task.title} · just now`,
        );
      } else if (
        req.params.action === "trade" &&
        task.status === "open" &&
        req.body.to
      ) {
        await tasks.updateOne(
          { _id: taskId },
          {
            $set: { pendingTrade: { from: memberId, to: String(req.body.to) } },
          },
        );
        await activity(
          householdId,
          `${memberName(members, memberId)} offered ${task.title} to ${memberName(members, String(req.body.to))} · just now`,
        );
      } else if (
        (req.params.action === "accept" || req.params.action === "reject") &&
        task.pendingTrade?.to === memberId
      ) {
        await tasks.updateOne(
          { _id: taskId },
          {
            $unset: { pendingTrade: "" },
            ...(req.params.action === "accept"
              ? { $set: { status: "claimed", assignedTo: memberId } }
              : {}),
          },
        );
        await activity(
          householdId,
          `${memberName(members, memberId)} ${req.params.action === "accept" ? "accepted" : "passed on"} ${task.title} · just now`,
        );
      } else
        return res
          .status(409)
          .json({ error: "That task cannot be changed in its current state." });
      res.json({ ok: true });
    },
  );
  app.post("/api/households/:id/inventory", async (req, res) => {
    const householdId = validId(req.params.id);
    const name = String(req.body.name || "").trim();
    if (!householdId || !name)
      return res.status(400).json({ error: "An item name is required." });
    const collection = db.collection<ItemDoc>("inventory");
    const existing = await collection.findOne({
      householdId,
      name: {
        $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
      status: { $ne: "needed" },
    });
    if (existing)
      return res
        .status(409)
        .json({
          error: `Possible duplicate: ${existing.name} is already ${existing.status}.`,
        });
    const item: ItemDoc = {
      householdId,
      name,
      quantity: Number(req.body.quantity) || 1,
      status: "needed",
      purchasedAt: null,
    };
    const result = await collection.insertOne(item);
    res.status(201).json({ id: result.insertedId.toHexString(), ...item });
  });
  app.post(
    "/api/households/:householdId/inventory/:itemId/purchase",
    async (req, res) => {
      const householdId = validId(req.params.householdId);
      const itemId = validId(req.params.itemId);
      if (!householdId || !itemId)
        return res.status(400).json({ error: "Invalid item or household id." });
      const result = await db
        .collection<ItemDoc>("inventory")
        .updateOne(
          { _id: itemId, householdId },
          {
            $set: { status: "recently purchased", purchasedAt: "Just now" },
            $max: { quantity: 1 },
          },
        );
      if (!result.matchedCount)
        return res.status(404).json({ error: "Item not found." });
      await activity(householdId, "A shared purchase was recorded · just now");
      res.json({ ok: true });
    },
  );
  app.listen(3001, () => console.log("API running at http://localhost:3001"));
}
void start().catch((error) => {
  console.error(
    "MongoDB startup failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  process.exit(1);
});
