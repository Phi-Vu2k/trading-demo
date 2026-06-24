export function normalizeTicker(t = {}) {
  return {
    symbol: t.symbol || t.s,
    lastPrice: t.lastPrice || t.c,
    price24hPcnt: String((parseFloat(t.priceChangePercent ?? t.P ?? 0) || 0) / 100),
    highPrice24h: t.highPrice || t.h,
    lowPrice24h: t.lowPrice || t.l,
    volume24h: t.volume || t.v,
    turnover24h: t.quoteVolume || t.q,
  };
}

export function normalizeSide(side) {
  return side === 'BUY' ? 'Buy' : side === 'SELL' ? 'Sell' : side;
}

export function normalizeType(type) {
  if (!type) return type;
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
    .replace(/_(.)/g, (_, c) => c.toUpperCase());
}

export function normalizeStatus(status) {
  const map = {
    NEW: 'New',
    PARTIALLY_FILLED: 'PartiallyFilled',
    FILLED: 'Filled',
    CANCELED: 'Cancelled',
    CANCELLED: 'Cancelled',
    REJECTED: 'Rejected',
    EXPIRED: 'Cancelled',
  };
  return map[status] || status;
}

export function normalizeRestOrder(o = {}) {
  return {
    symbol: o.symbol,
    orderId: String(o.orderId),
    side: normalizeSide(o.side),
    orderType: normalizeType(o.type),
    price: o.price,
    qty: o.origQty,
    cumExecQty: o.executedQty,
    avgPrice: o.avgPrice,
    orderStatus: normalizeStatus(o.status),
    createdTime: String(o.time || o.updateTime || Date.now()),
    takeProfit: '',
    stopLoss: '',
  };
}

export function normalizeWsOrder(data = {}) {
  return {
    symbol: data.s,
    orderId: String(data.i),
    side: normalizeSide(data.S),
    orderType: normalizeType(data.o) || '',
    price: data.p,
    qty: data.q,
    cumExecQty: data.z,
    avgPrice: data.L && data.L !== '0' ? data.L : data.p,
    orderStatus: normalizeStatus(data.X),
    createdTime: String(data.O || data.E || Date.now()),
    takeProfit: '',
    stopLoss: '',
  };
}

export function normalizeExecution(data = {}) {
  return {
    symbol: data.s,
    side: normalizeSide(data.S),
    execQty: data.l,
    execPrice: data.L,
    orderId: String(data.i),
    qty: data.q,
    cumExecQty: data.z,
    orderStatus: normalizeStatus(data.X),
  };
}

export function normalizeSpotBalances(B) {
  return (B || [])
    .map(b => {
      const free = parseFloat(b.f || 0);
      const locked = parseFloat(b.l || 0);
      const total = free + locked;
      return {
        coin: b.a,
        equity: String(total),
        walletBalance: String(total),
        availableToWithdraw: String(free),
        unrealisedPnl: '0',
      };
    })
    .filter(c => parseFloat(c.equity) > 0);
}

export function normalizeFuturesUpdate(a) {
  const balances = (a?.B || []).map(b => ({
    coin: b.a,
    walletBalance: b.wb || '0',
    availableToWithdraw: b.cw || b.wb || '0',
    unrealisedPnl: '0',
  }));
  const positions = (a?.P || []).map(p => {
    const amount = parseFloat(p.pa || 0);
    return {
      symbol: p.s,
      side: amount >= 0 ? 'Buy' : 'Sell',
      size: String(Math.abs(amount)),
      avgPrice: p.ep,
      markPrice: p.mp,
      liqPrice: '',
      unrealisedPnl: p.up,
      curRealisedPnl: p.cr || '0',
      takeProfit: '',
      stopLoss: '',
    };
  });
  return { balances, positions };
}
