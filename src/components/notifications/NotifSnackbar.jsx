import React, { memo, useEffect, useRef, useState, useCallback } from 'react';
import { Snackbar, Box, Typography, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useStore } from '../../store';

const iconMap = {
  success: <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#00d98b' }} />,
  error:   <ErrorOutlineIcon      sx={{ fontSize: 18, color: '#f6465d' }} />,
  warning: <WarningAmberIcon      sx={{ fontSize: 18, color: '#f7a600' }} />,
  info:    <InfoOutlinedIcon      sx={{ fontSize: 18, color: '#60a5fa' }} />,
};
const colorMap = { success: '#00d98b', error: '#f6465d', warning: '#f7a600', info: '#60a5fa' };

const AUTO_HIDE_MS = 3000;

const NotifSnackbar = memo(function NotifSnackbar() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);
  const lastIdRef = useRef(0);
  const timerRef  = useRef(null);

  // Subscribe to new notifications only
  useEffect(() => {
    const unsub = useStore.subscribe(
      (s) => s.notifications,
      (notifs) => {
        if (!notifs || notifs.length === 0) return;
        const latest = notifs[0];
        if (!latest) return;
        if (latest.id === lastIdRef.current) return;
        // Ignore pre-existing notifications on initial mount
        if (lastIdRef.current === 0) {
          lastIdRef.current = latest.id;
          return;
        }
        lastIdRef.current = latest.id;
        setCurrent(latest);
        setOpen(true);
      }
    );
    return unsub;
  }, []);

  const handleClose = useCallback((_, reason) => {
    if (reason === 'clickaway') return;
    setOpen(false);
  }, []);

  // Auto-dismiss after 3s (Snackbar's autoHideDuration also handles this,
  // but we keep a ref-based timer to be safe).
  useEffect(() => {
    if (open) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setOpen(false), AUTO_HIDE_MS);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [open]);

  if (!current) return null;

  const color = colorMap[current.type] || '#9ca3fa';

  return (
    <Snackbar
      open={open}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      autoHideDuration={AUTO_HIDE_MS}
      ClickAwayListenerProps={{ mouseEvent: false, touchEvent: false }}
      TransitionProps={{ timeout: 250 }}
      sx={{ mt: 6 }}
    >
      <Box
        onClick={handleClose}
        sx={{
          display: 'flex', alignItems: 'flex-start', gap: 1.2,
          minWidth: 300, maxWidth: 380,
          bgcolor: '#0a0a18',
          border: `1px solid ${color}55`,
          borderLeft: `3px solid ${color}`,
          borderRadius: 1.5,
          boxShadow: '0 6px 20px rgba(0,0,0,0.5)',
          p: 1.2, pr: 0.8,
          cursor: 'pointer',
        }}
      >
        <Box sx={{ mt: 0.1, flexShrink: 0 }}>
          {iconMap[current.type] || iconMap.info}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#e5e7eb', lineHeight: 1.2 }}>
            {current.title}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#9ca3af', mt: 0.3, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {current.msg}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleClose(null, null); }}
          sx={{ color: '#4b5563', p: 0.2, '&:hover': { color: '#e5e7eb' } }}>
          <CloseIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>
    </Snackbar>
  );
});

export default NotifSnackbar;
