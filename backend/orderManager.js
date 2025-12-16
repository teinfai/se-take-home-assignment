import EventEmitter from "node:events";

const STATUS = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  COMPLETE: "COMPLETE",
};

const BOT_STATUS = {
  IDLE: "IDLE",
  BUSY: "BUSY",
};

export default class OrderManager extends EventEmitter {
  constructor({ processDurationMs = 10000 } = {}) {
    super();
    this.processDurationMs = processDurationMs;
    this.orders = [];
    this.completed = [];
    this.bots = [];
    this.nextOrderId = 1;
    this.nextBotId = 1;
    this.timers = new Map();
  }

  addBot() {
    const bot = {
      id: this.nextBotId++,
      status: BOT_STATUS.IDLE,
      currentOrderId: null,
    };
    this.bots = [...this.bots, bot];
    this.emit("botAdded", bot);
    this.assignOrders();
    return bot;
  }

  removeBot() {
    if (this.bots.length === 0) {
      return null;
    }

    const bot = this.bots[this.bots.length - 1];
    this._cancelTimer(bot.id);

    if (bot.status === BOT_STATUS.BUSY && bot.currentOrderId !== null) {
      const removedOrder = this._detachOrder(bot.currentOrderId);
      if (removedOrder) {
        const requeuedOrder = {
          ...removedOrder,
          status: STATUS.PENDING,
        };
        this.orders = this._reorderQueue(
          this._insertOrder(this.orders, requeuedOrder)
        );
        this.emit("orderRequeued", requeuedOrder);
      }
    }

    this.bots = this.bots.slice(0, -1);
    this.emit("botRemoved", bot);
    this.assignOrders();
    return bot;
  }

  addOrder(type = "NORMAL") {
    const normalizedType = type === "VIP" ? "VIP" : "NORMAL";
    const order = {
      id: this.nextOrderId++,
      type: normalizedType,
      status: STATUS.PENDING,
      createdAt: Date.now(),
    };
    this.orders = this._insertOrder(this.orders, order);
    this.emit("orderAdded", order);
    this.assignOrders();
    return order;
  }

  assignOrders() {
    while (true) {
      const idleBotIndex = this.bots.findIndex(
        (bot) => bot.status === BOT_STATUS.IDLE
      );
      const pendingOrderIndex = this.orders.findIndex(
        (order) => order.status === STATUS.PENDING
      );

      if (idleBotIndex === -1 || pendingOrderIndex === -1) {
        break;
      }

      const bot = this.bots[idleBotIndex];
      const order = this.orders[pendingOrderIndex];

      this.bots = this.bots.map((item) =>
        item.id === bot.id
          ? { ...item, status: BOT_STATUS.BUSY, currentOrderId: order.id }
          : item
      );

      this.orders = this.orders.map((item) =>
        item.id === order.id
          ? { ...item, status: STATUS.PROCESSING }
          : item
      );

      this._startProcessing(order.id, bot.id);
    }
  }

  getState() {
    return {
      pending: this.orders.slice(),
      completed: this.completed.slice(),
      bots: this.bots.slice(),
    };
  }

  async waitUntilSettled(timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timed out waiting for all orders to settle"));
      }, timeoutMs);

      const check = () => {
        const hasPending =
          this.orders.some((order) => order.status !== STATUS.COMPLETE) ||
          this.bots.some((bot) => bot.status === BOT_STATUS.BUSY);
        if (!hasPending) {
          cleanup();
          resolve();
        }
      };

      const cleanup = () => {
        clearTimeout(timeout);
        this.off("orderCompleted", check);
        this.off("orderRequeued", check);
        this.off("botRemoved", check);
        this.off("botAdded", check);
      };

      this.on("orderCompleted", check);
      this.on("orderRequeued", check);
      this.on("botRemoved", check);
      this.on("botAdded", check);
      check();
    });
  }

  _startProcessing(orderId, botId) {
    const timer = setTimeout(() => {
      this.timers.delete(botId);

      const [order, remainingOrders] = this._removeOrderById(orderId);
      if (!order) {
        return;
      }

      this.orders = remainingOrders;
      const completedOrder = { ...order, status: STATUS.COMPLETE };
      this.completed = [...this.completed, completedOrder];
      this.bots = this.bots.map((bot) =>
        bot.id === botId
          ? { ...bot, status: BOT_STATUS.IDLE, currentOrderId: null }
          : bot
      );

      this.emit("orderCompleted", completedOrder);
      this.assignOrders();
    }, this.processDurationMs);

    this.timers.set(botId, timer);
  }

  _cancelTimer(botId) {
    const timer = this.timers.get(botId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(botId);
    }
  }

  _insertOrder(queue, order) {
    if (order.type !== "VIP") {
      return [...queue, order];
    }

    const firstNormalIndex = queue.findIndex(
      (existing) => existing.type === "NORMAL" && existing.status === STATUS.PENDING
    );
    if (firstNormalIndex === -1) {
      return [...queue, order];
    }

    return [
      ...queue.slice(0, firstNormalIndex),
      order,
      ...queue.slice(firstNormalIndex),
    ];
  }

  _reorderQueue(queue) {
    const notPending = [];
    const pendingVip = [];
    const pendingNormal = [];

    for (const order of queue) {
      if (order.status !== STATUS.PENDING) {
        notPending.push(order);
        continue;
      }

      if (order.type === "VIP") pendingVip.push(order);
      else pendingNormal.push(order);
    }

    return [...notPending, ...pendingVip, ...pendingNormal];
  }

  _detachOrder(orderId) {
    const [order, remaining] = this._removeOrderById(orderId);
    this.orders = remaining;
    return order;
  }

  _removeOrderById(orderId) {
    const index = this.orders.findIndex((order) => order.id === orderId);
    if (index === -1) {
      return [null, this.orders];
    }
    const clone = this.orders.slice();
    const [order] = clone.splice(index, 1);
    return [order, clone];
  }
}

export { STATUS, BOT_STATUS };
