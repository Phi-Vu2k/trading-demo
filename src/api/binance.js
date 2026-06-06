import axios from 'axios';
import CryptoJS from 'crypto-js';

export const API_KEY =
  process.env.REACT_APP_API_KEY ||
  process.env.API_KEY ||
  '';
export const API_SECRET =
  process.env.REACT_APP_SECRET_KEY ||
  process.env.REACT_APP_API_SECRET ||
  process.env.SECRET_KEY ||
  '';

export const SPOT_BASE_URL = 'https://demo-api.binance.com/api';
export const FUTURES_BASE_URL = 'https://demo-fapi.binance.com/fapi';

const spotClient = axios.create({ baseURL: SPOT_BASE_URL, timeout: 10000 });
const futuresClient = axios.create({ baseURL: FUTURES_BASE_URL, timeout: 10000 });
const RECV_WINDOW = 20000;

const WATCH_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'MATICUSDT', 'UNIUSDT', 'LTCUSDT', 'ATOMUSDT', 'NEARUSDT',
];

const intervalMap = {
  1: '1m',
  3: '3m',
  5: '5m',
  15: '15m',
  30: '30m',
  60: '1h',
  120: '2h',
  240: '4h',
  360: '6h',
  720: '12h',
  D: '1d',
  W: '1w',
  M: '1M',
};

function clientFor(category = 'spot') {
  return category === 'linear' ? futuresClient : spotClient;
}

function sign(queryString) {
  return CryptoJS.HmacSHA256(queryString, API_SECRET).toString();
}

function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null)
  );
}

async function signedRequest(category, method, path, params = {}) {
  const client = clientFor(category);
  const payload = cleanParams({
    ...params,
    recvWindow: RECV_WINDOW,
    timestamp: Date.now(),
  });
  const qs = new URLSearchParams(payload).toString();
  const signedParams = { ...payload, signature: sign(qs) };

  const { data } = await client.request({
    method,
    url: path,
    params: signedParams,
    headers: { 'X-MBX-APIKEY': API_KEY },
  });
  return data;
}

function ok(result) {
  return { retCode: 0, retMsg: 'OK', result };
}

function fail(error) {
  const data = error?.response?.data;
  return {
    retCode: data?.code || -1,
    retMsg: data?.msg || error?.message || 'Unknown error',
    result: {},
  };
}

function normalizeTicker(t = {}) {
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

function normalizeSide(side) {
  return side === 'BUY' ? 'Buy' : side === 'SELL' ? 'Sell' : side;
}

function normalizeType(type) {
  if (!type) return type;
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase().replace(/_(.)/g, (_, c) => c.toUpperCase());
}

function normalizeStatus(status) {
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

function normalizeOrder(o = {}) {
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

export const getKline = async (symbol, interval = '15', limit = 300, category = 'spot') => {
  const client = clientFor(category);
  const path = category === 'linear' ? '/v1/klines' : '/v3/klines';
  const { data } = await client.get(path, {
    params: { symbol, interval: intervalMap[interval] || interval, limit },
  });
  return ok({
    list: data.map(([t, o, h, l, c, v]) => [String(t), o, h, l, c, v]),
  });
};

export const getAllTickers = async (category = 'spot') => {
  const client = clientFor(category);
  const path = category === 'linear' ? '/v1/ticker/24hr' : '/v3/ticker/24hr';
  const { data } = await client.get(path);
  return ok({ list: data.map(normalizeTicker) });
};

export const getTicker = async (symbol, category = 'spot') => {
  const client = clientFor(category);
  const path = category === 'linear' ? '/v1/ticker/24hr' : '/v3/ticker/24hr';
  const { data } = await client.get(path, { params: { symbol } });
  return ok({ list: [normalizeTicker(data)] });
};

export const getWalletBalance = async () => {
  const [spot, futures] = await Promise.allSettled([
    signedRequest('spot', 'GET', '/v3/account'),
    signedRequest('linear', 'GET', '/v2/account'),
  ]);

  const map = new Map();
  let spotUsdtWallet = 0;
  if (spot.status === 'fulfilled') {
    (spot.value?.balances || []).forEach(b => {
      const equity = parseFloat(b.free || 0) + parseFloat(b.locked || 0);
      if (equity <= 0) return;
      if (b.asset === 'USDT') spotUsdtWallet = equity;
      map.set(b.asset, {
        coin: b.asset,
        equity: String(equity),
        walletBalance: String(equity),
        availableToWithdraw: b.free,
        unrealisedPnl: '0',
      });
    });
  }

  let futuresEquity = 0;
  let futuresPnl = 0;
  if (futures.status === 'fulfilled') {
    futuresEquity = parseFloat(futures.value?.totalWalletBalance || 0);
    futuresPnl = parseFloat(futures.value?.totalUnrealizedProfit || 0);
    (futures.value?.assets || []).forEach(a => {
      const walletBalance = parseFloat(a.walletBalance || 0);
      const available = parseFloat(a.availableBalance || 0);
      const upnl = parseFloat(a.unrealizedProfit || 0);
      if (walletBalance === 0 && available === 0 && upnl === 0) return;
      const current = map.get(a.asset) || { coin: a.asset };
      map.set(a.asset, {
        ...current,
        equity: String((parseFloat(current.equity || 0) + walletBalance + upnl).toFixed(8)),
        walletBalance: String((parseFloat(current.walletBalance || 0) + walletBalance).toFixed(8)),
        availableToWithdraw: String((parseFloat(current.availableToWithdraw || 0) + available).toFixed(8)),
        unrealisedPnl: String((parseFloat(current.unrealisedPnl || 0) + upnl).toFixed(8)),
      });
    });
  }

  return ok({
    list: [{
      totalEquity: String((spotUsdtWallet + futuresEquity + futuresPnl).toFixed(8)),
      totalPerpUPL: String(futuresPnl.toFixed(8)),
      coin: [...map.values()],
    }],
  });
};

export const getPositions = async (category = 'linear') => {
  if (category !== 'linear') return ok({ list: [] });
  try {
    const data = await signedRequest('linear', 'GET', '/v2/positionRisk');
    return ok({
      list: data.map(p => {
        const amount = parseFloat(p.positionAmt || 0);
        return {
          symbol: p.symbol,
          side: amount >= 0 ? 'Buy' : 'Sell',
          size: String(Math.abs(amount)),
          avgPrice: p.entryPrice,
          markPrice: p.markPrice,
          liqPrice: p.liquidationPrice,
          unrealisedPnl: p.unRealizedProfit,
          curRealisedPnl: '',
          takeProfit: '',
          stopLoss: '',
        };
      }),
    });
  } catch (e) {
    return fail(e);
  }
};

export const getOpenOrders = async (category = 'spot', symbol = '') => {
  try {
    const path = category === 'linear' ? '/v1/openOrders' : '/v3/openOrders';
    const data = await signedRequest(category, 'GET', path, symbol ? { symbol } : {});
    return ok({ list: data.map(normalizeOrder) });
  } catch (e) {
    return fail(e);
  }
};

export const getOrderHistory = async (category = 'spot', limit = 100) => {
  const path = category === 'linear' ? '/v1/allOrders' : '/v3/allOrders';
  const rows = await Promise.all(
    WATCH_SYMBOLS.map(symbol =>
      signedRequest(category, 'GET', path, { symbol, limit: Math.min(limit, 100) })
        .then(list => list.map(normalizeOrder))
        .catch(() => [])
    )
  );
  return ok({
    list: rows.flat().sort((a, b) => parseInt(b.createdTime || 0) - parseInt(a.createdTime || 0)).slice(0, limit),
  });
};

export const getTradeHistory = async (category = 'spot', limit = 100) => {
  const path = category === 'linear' ? '/v1/userTrades' : '/v3/myTrades';
  const rows = await Promise.all(
    WATCH_SYMBOLS.map(symbol =>
      signedRequest(category, 'GET', path, { symbol, limit: Math.min(limit, 100) })
        .then(list => list)
        .catch(() => [])
    )
  );
  return ok({ list: rows.flat().slice(0, limit) });
};

export const placeOrder = async (params) => {
  const category = params.category === 'linear' ? 'linear' : 'spot';
  const isMarket = params.orderType === 'Market';
  const payload = {
    symbol: params.symbol,
    side: params.side.toUpperCase(),
    type: params.orderType.toUpperCase(),
    quantity: params.qty,
    ...(isMarket ? {} : { timeInForce: params.timeInForce || 'GTC', price: params.price }),
  };
  const path = category === 'linear' ? '/v1/order' : '/v3/order';

  try {
    const data = await signedRequest(category, 'POST', path, payload);
    return ok({ orderId: String(data.orderId), ...normalizeOrder(data) });
  } catch (e) {
    return fail(e);
  }
};

export const cancelOrder = async (category, symbol, orderId) => {
  const path = category === 'linear' ? '/v1/order' : '/v3/order';
  try {
    const data = await signedRequest(category, 'DELETE', path, { symbol, orderId });
    return ok({ orderId: String(data.orderId), ...normalizeOrder(data) });
  } catch (e) {
    return fail(e);
  }
};

export const setLeverage = async (symbol, buyLev) => {
  try {
    const data = await signedRequest('linear', 'POST', '/v1/leverage', {
      symbol,
      leverage: buyLev,
    });
    return ok(data);
  } catch (e) {
    return fail(e);
  }
};

export const startUserDataStream = async (category = 'spot') => {
  const path = category === 'linear' ? '/v1/listenKey' : '/v3/userDataStream';
  const { data } = await clientFor(category).post(path, null, {
    headers: { 'X-MBX-APIKEY': API_KEY },
  });
  return data.listenKey;
};

export const keepAliveUserDataStream = async (category = 'spot', listenKey) => {
  const path = category === 'linear' ? '/v1/listenKey' : '/v3/userDataStream';
  return clientFor(category).put(path, null, {
    params: { listenKey },
    headers: { 'X-MBX-APIKEY': API_KEY },
  });
};
