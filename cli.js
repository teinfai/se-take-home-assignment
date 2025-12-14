import OrderManager from "./backend/orderManager.js";

const manager = new OrderManager();

function timestamp() {
  return new Date().toTimeString().slice(0, 8);
}

function log(message) {
  console.log(`[${timestamp()}] ${message}`);
}

log("Starting order controller CLI...");

manager.on("botAdded", (bot) => log(`Bot ${bot.id} added (IDLE)`));
manager.on("botRemoved", (bot) => log(`Bot ${bot.id} removed`));
manager.on("orderAdded", (order) =>
  log(`Order #${order.id} (${order.type}) added to PENDING`)
);
manager.on("orderCompleted", (order) =>
  log(`Order #${order.id} (${order.type}) completed`)
);
manager.on("orderRequeued", (order) =>
  log(`Order #${order.id} re-queued to PENDING after bot removal`)
);

manager.addBot();
manager.addBot();
manager.addBot();

manager.addOrder("NORMAL");
manager.addOrder("VIP");
manager.addOrder("NORMAL");

await manager.waitUntilSettled(45000);

const state = manager.getState();
log(
  `Final state => bots: ${JSON.stringify(
    state.bots
  )}, pending: ${JSON.stringify(state.pending)}, completed: ${JSON.stringify(
    state.completed
  )}`
);
