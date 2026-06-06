import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { subOrderbook, subTicker, subKline, subPrivate } from '../api/wsManager';
import { getKline, getWalletBalance, getPositions, getOpenOrders, getOrderHistory } from '../api/bybit';
import { mkNotif } from '../store';

// ─── Orderbook via WS ────────────────────────────────────────────────────────
export function useOrderbookWS(symbol, category) {
  const setOrderbook   = useStore(s => s.setOrderbook);
  const patchOrderbook = useStore(s => s.patchOrderbook);

  useEffect(() => {
    if (!symbol) return;
    setOrderbook({ a: [], b: [], ts: 0 });

    const unsub = subOrderbook(symbol, category, (data, msg) => {
      if (msg.type === 'snapshot') {
        setOrderbook({ a: data.a || [], b: data.b || [], ts: data.ts || 0 });
      } else {
        patchOrderbook({ a: data.a || [], b: data.b || [], ts: data.ts });
      }
    });
    return unsub;
  }, [symbol, category]);
}

// ─── Ticker via WS ───────────────────────────────────────────────────────────
export function useTickerWS(symbol, category) {
  const setTicker = useStore(s => s.setTicker);

  useEffect(() => {
    if (!symbol) return;
    const unsub = subTicker(symbol, category, (data) => {
      setTicker(symbol, data);
    });
    return unsub;
  }, [symbol, category]);
}

// ─── Multi-ticker for symbol list ────────────────────────────────────────────
const WATCH_SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','ADAUSDT','AVAXUSDT','DOTUSDT','LINKUSDT',
  'MATICUSDT','UNIUSDT','LTCUSDT','ATOMUSDT','NEARUSDT',
];

export function useAllTickersWS(category) {
  const setTicker = useStore(s => s.setTicker);

  useEffect(() => {
    const unsubs = WATCH_SYMBOLS.map(sym =>
      subTicker(sym, category, (data) => setTicker(sym, data))
    );
    return () => unsubs.forEach(fn => fn());
  }, [category]);
}

// ─── Kline history (REST) + live candle via WS ───────────────────────────────
export function useKlineWS(symbol, interval, category, onUpdate) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!symbol) return;
    let cancelled = false;

    // Initial REST load
    getKline(symbol, interval, 300, category === 'linear' ? 'linear' : 'spot').then(res => {
      if (cancelled || !res?.result?.list) return;
      const candles = res.result.list
        .map(([t, o, h, l, c, v]) => ({
          time: parseInt(t) / 1000,
          open: parseFloat(o), high: parseFloat(h),
          low: parseFloat(l),  close: parseFloat(c),
          volume: parseFloat(v),
        }))
        .sort((a, b) => a.time - b.time);
      onUpdateRef.current?.({ type: 'snapshot', candles });
    }).catch(() => {});

    // Live WS updates
    const unsub = subKline(symbol, interval, category, (data) => {
      if (!data?.[0]) return;
      const k = data[0];
      onUpdateRef.current?.({
        type: 'update',
        candle: {
          time: parseInt(k.start) / 1000,
          open: parseFloat(k.open), high: parseFloat(k.high),
          low: parseFloat(k.low),   close: parseFloat(k.close),
          volume: parseFloat(k.volume),
        },
      });
    });

    return () => { cancelled = true; unsub(); };
  }, [symbol, interval, category]);
}

// ─── Private data via WS + REST fallback ─────────────────────────────────────
export function usePrivateData() {
  const setWallet     = useStore(s => s.setWallet);
  const setPositions  = useStore(s => s.setPositions);
  const setOpenOrders = useStore(s => s.setOpenOrders);
  const pushNotif     = useStore(s => s.pushNotif);

  // Initial REST load
  useEffect(() => {
    async function load() {
      try {
        const [bal, assetBal, pos, ord] = await Promise.all([
          getWalletBalance('UNIFIED'),
          getPositions('linear'),
          getOpenOrders('spot'),
        ]);

        console.log('[wallet] /v5/account/wallet-balance', bal);
        console.log('[wallet] /v5/asset/transfer/query-account-coins-balance', assetBal);
        console.log('[wallet] account totalEquity', bal?.result?.list?.[0]?.totalEquity);
        console.log('[wallet] asset coins', assetBal?.result?.balance);

        _applyWallet(bal, setWallet);
        setPositions(pos?.result?.list?.filter(p => parseFloat(p.size) > 0) || []);
        setOpenOrders(ord?.result?.list || []);
      } catch (e) {
        console.error('Private REST load error', e?.response?.data || e);
      }
    }
    load();
  }, []);

  // WS private channel
  useEffect(() => {
    const unWallet = subPrivate('wallet', (data) => {
      if (!data?.[0]) return;
      const w = data[0];
      const coins = w.coin || [];
      const total = parseFloat(w.totalEquity || 0);
      const pnl   = parseFloat(w.totalPerpUPL || 0);
      setWallet(coins, total, pnl);
    });

    const unPos = subPrivate('position', (data) => {
      if (!Array.isArray(data)) return;
      const alive = data.filter(p => parseFloat(p.size) > 0);
      setPositions(alive);
    });

    const unOrder = subPrivate('order', (data) => {
      if (!Array.isArray(data)) return;
      data.forEach(o => {
        // Update open orders list
        useStore.setState(s => {
          let list = [...s.openOrders];
          const idx = list.findIndex(x => x.orderId === o.orderId);
          if (o.orderStatus === 'New' || o.orderStatus === 'PartiallyFilled') {
            if (idx >= 0) list[idx] = o; else list = [o, ...list];
          } else {
            if (idx >= 0) list.splice(idx, 1);
          }
          return { openOrders: list };
        });

        // Push notification
        const color = o.side === 'Buy' ? '🟢' : '🔴';
        let type = 'info', title = '';
        if (o.orderStatus === 'Filled') {
          type = 'success';
          title = `${color} Order Filled`;
        } else if (o.orderStatus === 'Cancelled') {
          type = 'warning';
          title = `⚪ Order Cancelled`;
        } else if (o.orderStatus === 'New') {
          title = `${color} Order Placed`;
        } else if (o.orderStatus === 'PartiallyFilled') {
          type = 'info';
          title = `${color} Partially Filled`;
        } else if (o.orderStatus === 'Rejected') {
          type = 'error';
          title = `❌ Order Rejected`;
        }
        if (title) {
          pushNotif(mkNotif(type, title,
            `${o.side} ${o.qty} ${o.symbol} @ ${o.price || 'Market'}`, { order: o }));
        }
      });
    });

    const unExec = subPrivate('execution', (data) => {
      if (!Array.isArray(data)) return;
      data.forEach(e => {
        pushNotif(mkNotif('success', `✅ Trade Executed`,
          `${e.side} ${e.execQty} ${e.symbol} @ ${parseFloat(e.execPrice).toFixed(2)}`,
          { execution: e }
        ));
      });
    });

    return () => { unWallet(); unPos(); unOrder(); unExec(); };
  }, []);
}

function _applyWallet(data, setWallet) {
  const list = data?.result?.list?.[0];
  if (!list) return;
  const coins = list.coin || [];
  const total = parseFloat(list.totalEquity || 0);
  const pnl   = parseFloat(list.totalPerpUPL || 0);
  setWallet(coins, total, pnl);
}
