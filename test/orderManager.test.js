import assert from "node:assert/strict";
import test from "node:test";
import OrderManager, { BOT_STATUS, STATUS } from "../backend/orderManager.js";

const shortDuration = 30;

function createManager() {
  return new OrderManager({ processDurationMs: shortDuration });
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("VIP orders are inserted ahead of normal pending orders", () => {
  const manager = createManager();
  manager.addOrder("NORMAL"); // id 1
  manager.addOrder("VIP"); // id 2
  manager.addOrder("NORMAL"); // id 3

  const pending = manager.getState().pending;
  assert.deepEqual(
    pending.map((order) => order.id),
    [2, 1, 3]
  );
  assert.ok(pending.every((order) => order.status === STATUS.PENDING));
});

test("bots process orders and mark them complete", async () => {
  const manager = createManager();
  manager.addBot();
  manager.addOrder("NORMAL");

  await manager.waitUntilSettled(1000);

  const { pending, completed, bots } = manager.getState();
  assert.equal(pending.length, 0);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].status, STATUS.COMPLETE);
  assert.equal(bots[0].status, BOT_STATUS.IDLE);
});

test("removing a busy bot re-queues its order for another bot", async () => {
  const manager = createManager();
  manager.addBot();
  const order = manager.addOrder("VIP");

  // bot is busy now; remove it so the order goes back to pending
  manager.removeBot();
  const pendingAfterRemoval = manager.getState().pending;
  assert.equal(pendingAfterRemoval[0].id, order.id);
  assert.equal(pendingAfterRemoval[0].status, STATUS.PENDING);

  // add a new bot to process the re-queued order
  manager.addBot();
  await manager.waitUntilSettled(1000);

  const { pending, completed, bots } = manager.getState();
  assert.equal(pending.length, 0);
  assert.equal(completed.length, 1);
  assert.equal(completed[0].id, order.id);
  assert.equal(bots[0].status, BOT_STATUS.IDLE);
});

test("re-queued orders keep processing first and VIP pending ahead of normal pending", () => {
  const manager = createManager();
  manager.addBot();

  const normal1 = manager.addOrder("NORMAL"); // will be PROCESSING
  manager.addOrder("NORMAL"); // pending
  manager.addOrder("VIP"); // pending VIP inserted ahead of normal pending

  // remove the busy bot (working on normal1), so it becomes PENDING again
  manager.removeBot();

  const pending = manager.getState().pending;
  assert.deepEqual(
    pending.map((order) => [order.id, order.type, order.status]),
    [
      [3, "VIP", STATUS.PENDING],
      [2, "NORMAL", STATUS.PENDING],
      [normal1.id, "NORMAL", STATUS.PENDING],
    ]
  );
});

test("order ids are unique and increasing", () => {
  const manager = createManager();
  const a = manager.addOrder("NORMAL");
  const b = manager.addOrder("VIP");
  const c = manager.addOrder("NORMAL");

  assert.equal(a.id, 1);
  assert.equal(b.id, 2);
  assert.equal(c.id, 3);
});
