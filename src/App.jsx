import { useRef, useState } from 'react'

export default function App() {
  const [pendingOrders, setPendingOrders] = useState([])
  const [completedOrders, setCompletedOrders] = useState([])
  const [bots, setBots] = useState([])

  const orderId = useRef(1)
  const botId = useRef(1)

  function addOrder(type) {
    const order = { id: orderId.current++, type, status: 'PENDING' }

    setPendingOrders(prev => {
      if (type === 'VIP') {
        const vip = prev.filter(o => o.type === 'VIP')
        const normal = prev.filter(o => o.type === 'NORMAL')
        return [...vip, order, ...normal]
      }
      return [...prev, order]
    })
  }

  function tryAssign(bot) {
    setPendingOrders(prev => {
      if (bot.busy || prev.length === 0) return prev

      const [order, ...rest] = prev
      bot.busy = true
      bot.currentOrder = order

      bot.timer = setTimeout(() => {
        setCompletedOrders(c => [...c, { ...order, status: 'COMPLETE' }])
        bot.busy = false
        bot.currentOrder = null
        bot.timer = null
        tryAssign(bot)
      }, 10000)

      return rest
    })
  }

  function addBot() {
    const bot = { id: botId.current++, busy: false, currentOrder: null, timer: null }
    setBots(prev => {
      const updated = [...prev, bot]
      setTimeout(() => tryAssign(bot), 0)
      return updated
    })
  }

  function removeBot() {
    setBots(prev => {
      if (prev.length === 0) return prev
      const bot = prev[prev.length - 1]
      if (bot.busy && bot.timer) {
        clearTimeout(bot.timer)
        setPendingOrders(p => [bot.currentOrder, ...p])
      }
      return prev.slice(0, -1)
    })
  }

  return (
    <div style={{ padding: 20, fontFamily: 'Arial' }}>
      <h1>McDonald Order Controller</h1>

      <div>
        <button onClick={() => addOrder('NORMAL')}>New Normal Order</button>
        <button onClick={() => addOrder('VIP')}>New VIP Order</button>
        <button onClick={addBot}>+ Bot</button>
        <button onClick={removeBot}>- Bot</button>
      </div>

      <h2>Pending Orders</h2>
      <ul>
        {pendingOrders.map(o => (
          <li key={o.id}>#{o.id} - {o.type}</li>
        ))}
      </ul>

      <h2>Bots</h2>
      <ul>
        {bots.map(b => (
          <li key={b.id}>
            Bot {b.id}: {b.busy ? `BUSY (#${b.currentOrder?.id})` : 'IDLE'}
          </li>
        ))}
      </ul>

      <h2>Completed Orders</h2>
      <ul>
        {completedOrders.map(o => (
          <li key={o.id}>#{o.id} - {o.type}</li>
        ))}
      </ul>
    </div>
  )
}