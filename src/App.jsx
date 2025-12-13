import { useEffect, useRef, useState } from "react";

export default function App() {
  // Keep every order that has not finished
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  // const [pendingOrders, setPendingOrders] = useState([]);
  const [bots, setBots] = useState([]);
  const botId = useRef(1);
  const orderId = useRef(1);
  const timersRef = useRef(new Map());

  // console.log(bots);

  function addBot() {
    const bot = { id: botId.current++, status: "Idle", currentOrderId: null };
    setBots((prev) => [...prev, bot]);

    // console.log(bots);
  }

  function assignOrders(order, bots) {
    // console.log("bot", bot);
    // console.log("order", order);

    const botFree = bots.findIndex((o) => o.status == "Idle");
    const nextOrder = order.findIndex((o) => o.status == "Pending");

    if (botFree === -1) return false;
    if (nextOrder === -1) return false;

    setBots((bots) =>
      bots.map((bot, index) =>
        index === botFree
          ? { ...bot, status: "Busy", currentOrderId: order[nextOrder].id }
          : bot
      )
    );

    setOrders((order) =>
      order.map((orders, index) =>
        index === nextOrder
          ? {
              ...orders,
              status: "PROCESSING",
            }
          : orders
      )
    );

    startProcessing(bots[botFree].id, order[nextOrder].id);
  }

  function startProcessing(botId, orderId) {
    const timer = setTimeout(() => {
      timersRef.current.delete(botId);

      setOrders((prevOrders) => {
        const targetIndex = prevOrders.findIndex((o) => o.id === orderId);
        if (targetIndex === -1) return prevOrders;

        setCompletedOrders((prev) =>
          prev.some((order) => order.id == orderId)
            ? prev
            : [...prev, { ...prevOrders[targetIndex], status: "COMPLETED" }]
        );

        const updatedArray = [
          ...prevOrders.slice(0, targetIndex),
          ...prevOrders.slice(targetIndex + 1),
        ];

        return updatedArray;
      });

      setBots((prev) =>
        prev.map((bot) =>
          bot.id === botId
            ? { ...bot, status: "Idle", currentOrderId: null }
            : bot
        )
      );
    }, 10000);

    timersRef.current.set(botId, timer);
  }

  function removeBot() {
    setBots((prevBots) => {
      if (prevBots.length === 0) return prevBots;

      const lastBot = prevBots[prevBots.length - 1];

      if (lastBot.status == "Busy") {
        const workingBotTimer = timersRef.current.get(lastBot.id);

        if (workingBotTimer) {
          clearTimeout(workingBotTimer);
          timersRef.current.delete(lastBot.id);
        }

        setOrders((prev) =>
          prev.map((item) =>
            item.id === lastBot.currentOrderId
              ? { ...item, status: "Pending" }
              : item
          )
        );
      }

      return prevBots.slice(0, -1);
    });
  }

  function addOrder(type) {
    const order = {
      id: orderId.current++,
      status: "Pending",
      type,
    };

    setOrders((prev) => insertOrder(prev, order));
  }

  function insertOrder(queue, order) {
    if (order.type !== "VIP") return [...queue, order];

    const normalOrder = queue.findIndex(
      (o) => o.type == "NORMAL" && o.status == "Pending"
    );

    if (normalOrder === -1) return [...queue, order];
    return [...queue.slice(0, normalOrder), order, ...queue.slice(normalOrder)];
  }

  useEffect(() => {
    assignOrders(orders, bots);
  }, [orders, bots]);

  const pendingOrders = orders;

  return (
    <div style={{ padding: 20, fontFamily: "Arial" }}>
      <h1>McDonald Order Controller</h1>

      <div>
        <button onClick={() => addOrder("NORMAL")}>New Normal Order</button>
        <button onClick={() => addOrder("VIP")}>New VIP Order</button>
        <button onClick={addBot}>+ Bot</button>
        <button onClick={removeBot}>- Bot</button>
      </div>

      <h2>Pending Orders</h2>
      <ul>
        {pendingOrders.map((o) => (
          <li key={`order-${o.id}-${o.status}`}>
            #{o.id} - {o.type} ({o.status})
          </li>
        ))}
      </ul>

      <h2>Bots</h2>
      <ul>
        {bots
          ? bots.map((b) => (
              <li key={`bot-${b.id}`}>
                Bot {b.id}:{" "}
                {b.status === "Busy" ? `BUSY (#${b.currentOrderId})` : "IDLE"}
              </li>
            ))
          : ""}
      </ul>

      <h2>Completed Orders</h2>
      <ul>
        {completedOrders.map((o) => (
          <li key={`complete-${o.id}`}>
            #{o.id} - {o.type}
          </li>
        ))}
      </ul>
    </div>
  );
}
