import React, { useState, memo } from 'react';
import { Box, Typography, TextField, InputAdornment, List, ListItemButton } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useStore, selSymbol, selCategory } from '../../store';
import { useAllTickersWS } from '../../hooks/useBybitWS';

const SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'DOGEUSDT','ADAUSDT','AVAXUSDT','DOTUSDT','LINKUSDT',
  'MATICUSDT','UNIUSDT','LTCUSDT','ATOMUSDT','NEARUSDT',
];

const SymbolList = memo(function SymbolList() {
  const symbol   = useStore(selSymbol);
  const category = useStore(selCategory);
  const setSymbol = useStore(s => s.setSymbol);
  const [search, setSearch] = useState('');

  useAllTickersWS(category);

  const filtered = SYMBOLS.filter(s => s.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box sx={{ bgcolor: '#06060f', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1, borderBottom: '1px solid #0e0e1e' }}>
        <TextField placeholder="Search..." size="small" fullWidth value={search}
          onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: '#4b5563', fontSize: 14 }} /></InputAdornment> }}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: '#0a0a18', color: '#e5e7eb', fontSize: 11,
              '& fieldset': { borderColor: '#0e0e1e' },
              '&:hover fieldset': { borderColor: '#1a1a2e' },
              '&.Mui-focused fieldset': { borderColor: '#f7a600' },
            },
          }} />
      </Box>
      <Box sx={{ display: 'flex', px: 1.5, py: 0.4 }}>
        <Typography sx={{ flex: 1, fontSize: 9, color: '#4b5563' }}>Pair</Typography>
        <Typography sx={{ fontSize: 9, color: '#4b5563' }}>Change</Typography>
      </Box>
      <List dense sx={{ overflow: 'auto', flex: 1, p: 0 }}>
        {filtered.map(sym => <SymbolRow key={sym} sym={sym} active={symbol === sym} onSelect={setSymbol} />)}
      </List>
    </Box>
  );
});

export default SymbolList;

const SymbolRow = memo(function SymbolRow({ sym, active, onSelect }) {
  const ticker = useStore(s => s.tickers[sym]);
  const price  = ticker?.lastPrice  ? parseFloat(ticker.lastPrice)  : null;
  const pct    = ticker?.price24hPcnt ? parseFloat(ticker.price24hPcnt) * 100 : null;
  const isUp   = pct != null ? pct >= 0 : true;
  const base   = sym.replace('USDT', '');

  return (
    <ListItemButton onClick={() => onSelect(sym)} selected={active}
      sx={{
        py: 0.7, px: 1.5,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderLeft: `2px solid ${active ? '#f7a600' : 'transparent'}`,
        bgcolor: active ? '#f7a60008' : 'transparent',
        '&.Mui-selected': { bgcolor: '#f7a60008' },
        '&:hover': { bgcolor: '#ffffff05' },
      }}>
      <Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: '#e5e7eb', lineHeight: 1.2 }}>
          {base}<Typography component="span" sx={{ fontSize: 9, color: '#4b5563' }}>/USDT</Typography>
        </Typography>
        {price && (
          <Typography sx={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
            {price.toLocaleString(undefined, { maximumSignificantDigits: 6 })}
          </Typography>
        )}
      </Box>
      {pct != null && (
        <Typography sx={{ fontSize: 10, color: isUp ? '#00d98b' : '#f6465d',
          bgcolor: isUp ? '#00d98b12' : '#f6465d12',
          px: 0.5, borderRadius: 0.5 }}>
          {isUp ? '+' : ''}{pct.toFixed(2)}%
        </Typography>
      )}
    </ListItemButton>
  );
});
