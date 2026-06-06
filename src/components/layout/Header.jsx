import React, { memo } from 'react';
import { AppBar, Toolbar, Typography, Box, Chip, Button, Badge, Tooltip } from '@mui/material';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HistoryIcon from '@mui/icons-material/History';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useStore, selActiveTab, selUnread, selSymbol, selCategory, selTicker } from '../../store';

const TABS = [
  { id: 'trade',         label: 'Trade',         icon: <ShowChartIcon sx={{ fontSize: 15 }} /> },
  { id: 'portfolio',     label: 'Portfolio',      icon: <AccountBalanceWalletIcon sx={{ fontSize: 15 }} /> },
  { id: 'notifications', label: 'Notifications',  icon: <NotificationsNoneIcon sx={{ fontSize: 15 }} /> },
];

const Header = memo(function Header() {
  const activeTab   = useStore(selActiveTab);
  const setActiveTab = useStore(s => s.setActiveTab);
  const unread      = useStore(selUnread);
  const total       = useStore(s => s.totalEquity);
  const pnl         = useStore(s => s.totalPnl);
  const symbol      = useStore(selSymbol);
  const category    = useStore(selCategory);
  const setCategory = useStore(s => s.setCategory);
  const ticker      = useStore(selTicker(symbol));

  const change = ticker?.price24hPcnt ? parseFloat(ticker.price24hPcnt) * 100 : 0;
  const isUp   = change >= 0;

  return (
    <AppBar position="static" elevation={0}
      sx={{ bgcolor: '#06060f', borderBottom: '1px solid #0e0e1e', backgroundImage: 'none' }}>
      <Toolbar sx={{ minHeight: '44px !important', px: 2, gap: 2 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
          <Box sx={{ width: 26, height: 26, borderRadius: 1,
            background: 'linear-gradient(135deg, #f7a600, #ff6b00)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShowChartIcon sx={{ fontSize: 15, color: '#000' }} />
          </Box>
          <Typography sx={{ fontFamily: '"Bebas Neue", Impact, sans-serif',
            fontSize: 18, letterSpacing: 2, color: '#f7a600', lineHeight: 1 }}>
            NEXBIT
          </Typography>
          <Chip label="TESTNET" size="small"
            sx={{ bgcolor: '#a78bfa20', color: '#a78bfa', fontSize: 8, height: 16, fontWeight: 700,
              '& .MuiChip-label': { px: 0.8 } }} />
        </Box>

        {/* Market category */}
        <Box sx={{ display: 'flex', gap: 0.3, p: 0.3, bgcolor: '#0a0a18', borderRadius: 1 }}>
          {[{ v: 'spot', l: 'Spot' }, { v: 'linear', l: 'Futures' }].map(({ v, l }) => (
            <Button key={v} size="small" onClick={() => setCategory(v)}
              sx={{ px: 1.2, py: 0.2, fontSize: 11, fontWeight: 600, borderRadius: 0.8, textTransform: 'none',
                color:   category === v ? '#000' : '#6b7280',
                bgcolor: category === v ? '#f7a600' : 'transparent',
                '&:hover': { bgcolor: category === v ? '#f7a600' : '#ffffff08' } }}>
              {l}
            </Button>
          ))}
        </Box>

        {/* Symbol + price */}
        {ticker && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ color: '#e5e7eb', fontWeight: 700, fontSize: 14 }}>{symbol}</Typography>
            <Typography sx={{ color: isUp ? '#00d98b' : '#f6465d', fontSize: 13, fontFamily: 'monospace' }}>
              {parseFloat(ticker.lastPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </Typography>
            <Chip label={`${isUp ? '+' : ''}${change.toFixed(2)}%`} size="small"
              sx={{ bgcolor: isUp ? '#00d98b18' : '#f6465d18',
                color: isUp ? '#00d98b' : '#f6465d',
                fontSize: 10, height: 18 }} />
          </Box>
        )}

        {/* Nav tabs */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 0.5 }}>
          {TABS.map(t => (
            <Button key={t.id}
              startIcon={t.id === 'notifications'
                ? <Badge badgeContent={unread} max={99}
                    sx={{ '& .MuiBadge-badge': { bgcolor: '#f6465d', color: '#fff', fontSize: 8, minWidth: 14, height: 14, top: -2, right: -2 } }}>
                    {t.icon}
                  </Badge>
                : t.icon}
              onClick={() => setActiveTab(t.id)}
              sx={{ px: 1.5, py: 0.4, fontSize: 11, textTransform: 'none', borderRadius: 1,
                color:   activeTab === t.id ? '#f7a600' : '#6b7280',
                bgcolor: activeTab === t.id ? '#f7a60012' : 'transparent',
                borderBottom: activeTab === t.id ? '1.5px solid #f7a600' : '1.5px solid transparent',
                '&:hover': { bgcolor: '#ffffff08', color: '#9ca3af' },
              }}>
              {t.label}
            </Button>
          ))}
        </Box>

        {/* Balance */}
        {total > 0 && (
          <Tooltip title={`Unrealised PnL: ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`} arrow>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, cursor: 'default' }}>
              <AccountBalanceWalletIcon sx={{ fontSize: 14, color: '#4b5563' }} />
              <Box>
                <Typography sx={{ fontSize: 9, color: '#4b5563', lineHeight: 1 }}>Total Equity</Typography>
                <Typography sx={{ fontSize: 13, color: '#e5e7eb', fontFamily: 'monospace', lineHeight: 1.2 }}>
                  ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Typography>
              </Box>
              {pnl !== 0 && (
                <Typography sx={{ fontSize: 10, color: pnl >= 0 ? '#00d98b' : '#f6465d', fontFamily: 'monospace' }}>
                  {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                </Typography>
              )}
            </Box>
          </Tooltip>
        )}

        {/* Status dot */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#00d98b',
            animation: 'pulse 2s infinite',
            '@keyframes pulse': {
              '0%': { boxShadow: '0 0 0 0 #00d98b60' },
              '70%': { boxShadow: '0 0 0 6px transparent' },
              '100%': { boxShadow: '0 0 0 0 transparent' },
            },
          }} />
          <Typography sx={{ fontSize: 10, color: '#00d98b', fontWeight: 600 }}>WS LIVE</Typography>
        </Box>
      </Toolbar>
    </AppBar>
  );
});

export default Header;
