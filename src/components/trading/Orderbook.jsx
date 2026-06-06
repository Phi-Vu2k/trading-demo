import React, { memo } from 'react';
import { Box, Typography } from '@mui/material';
import { useStore, selOrderbook, selSymbol, selCategory, selTicker } from '../../store';
import { useOrderbookWS } from '../../hooks/useBybitWS';

const Orderbook = memo(function Orderbook() {
  const symbol   = useStore(selSymbol);
  const category = useStore(selCategory);
  const ob       = useStore(selOrderbook);
  const ticker   = useStore(selTicker(symbol));

  useOrderbookWS(symbol, category);

  const asks = (ob.a || []).slice(0, 14).sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
  const bids = (ob.b || []).slice(0, 14);
  const maxA = Math.max(...asks.map(r => parseFloat(r[1])), 1);
  const maxB = Math.max(...bids.map(r => parseFloat(r[1])), 1);
  const price = ticker?.lastPrice ? parseFloat(ticker.lastPrice) : null;
  const isUp  = ticker?.price24hPcnt ? parseFloat(ticker.price24hPcnt) >= 0 : true;

  const totalAsk = asks.reduce((s, r) => s + parseFloat(r[1]), 0);
  const totalBid = bids.reduce((s, r) => s + parseFloat(r[1]), 0);
  const bidPct = totalBid + totalAsk > 0 ? (totalBid / (totalBid + totalAsk)) * 100 : 50;

  return (
    <Box sx={{ bgcolor: '#06060f', height: '100%', display: 'flex', flexDirection: 'column', userSelect: 'none' }}>
      {/* Header */}
      <Box sx={{ px: 1.5, py: 0.8, borderBottom: '1px solid #0e0e1e', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ color: '#9ca3af', fontSize: 11, fontWeight: 600, letterSpacing: 1 }}>ORDER BOOK</Typography>
      </Box>

      {/* Buy/sell pressure bar */}
      <Box sx={{ mx: 1.5, my: 0.5, height: 4, borderRadius: 2, overflow: 'hidden', bgcolor: '#f6465d40' }}>
        <Box sx={{ height: '100%', width: `${bidPct}%`, bgcolor: '#00d98b60', transition: 'width 0.3s' }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, mb: 0.5 }}>
        <Typography sx={{ fontSize: 9, color: '#00d98b' }}>B {bidPct.toFixed(0)}%</Typography>
        <Typography sx={{ fontSize: 9, color: '#f6465d' }}>S {(100 - bidPct).toFixed(0)}%</Typography>
      </Box>

      {/* Column headers */}
      <Box sx={{ display: 'flex', px: 1.5, pb: 0.3 }}>
        <Typography sx={{ flex: 1, fontSize: 9, color: '#4b5563' }}>Price</Typography>
        <Typography sx={{ flex: 1, fontSize: 9, color: '#4b5563', textAlign: 'right' }}>Size</Typography>
        <Typography sx={{ flex: 1, fontSize: 9, color: '#4b5563', textAlign: 'right' }}>Total</Typography>
      </Box>

      {/* Asks */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {asks.map(([p, q], i) => {
          const pct = (parseFloat(q) / maxA) * 100;
          return (
            <OBRow key={p} price={p} qty={q} total={(parseFloat(p) * parseFloat(q)).toFixed(0)}
              pct={pct} side="ask" />
          );
        })}
      </Box>

      {/* Spread / mid */}
      <Box sx={{ py: 0.6, px: 1.5, borderTop: '1px solid #0e0e1e', borderBottom: '1px solid #0e0e1e', bgcolor: '#0a0a18' }}>
        <Typography sx={{ fontSize: 15, fontWeight: 700, color: isUp ? '#00d98b' : '#f6465d', fontFamily: 'monospace' }}>
          {price ? price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
          <Typography component="span" sx={{ fontSize: 9, color: '#4b5563', ml: 1 }}>
            {asks[asks.length - 1] && bids[0]
              ? `Spread: ${(parseFloat(asks[asks.length - 1][0]) - parseFloat(bids[0][0])).toFixed(2)}`
              : 'Mark'}
          </Typography>
        </Typography>
      </Box>

      {/* Bids */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {bids.map(([p, q]) => {
          const pct = (parseFloat(q) / maxB) * 100;
          return (
            <OBRow key={p} price={p} qty={q} total={(parseFloat(p) * parseFloat(q)).toFixed(0)}
              pct={pct} side="bid" />
          );
        })}
      </Box>
    </Box>
  );
});

export default Orderbook;

const OBRow = memo(function OBRow({ price, qty, total, pct, side }) {
  const isAsk = side === 'ask';
  const color = isAsk ? '#f6465d' : '#00d98b';
  const bg    = isAsk ? '#f6465d12' : '#00d98b12';

  return (
    <Box sx={{ display: 'flex', px: 1.5, py: '1.5px', position: 'relative', cursor: 'pointer', '&:hover': { bgcolor: `${color}18` } }}>
      <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: `${pct}%`, bgcolor: bg, pointerEvents: 'none' }} />
      <Typography sx={{ flex: 1, fontSize: 11, color, fontFamily: 'monospace' }}>
        {parseFloat(price).toFixed(2)}
      </Typography>
      <Typography sx={{ flex: 1, fontSize: 11, color: '#d1d5db', fontFamily: 'monospace', textAlign: 'right' }}>
        {parseFloat(qty).toFixed(4)}
      </Typography>
      <Typography sx={{ flex: 1, fontSize: 11, color: '#6b7280', fontFamily: 'monospace', textAlign: 'right' }}>
        {parseInt(total).toLocaleString()}
      </Typography>
    </Box>
  );
});
