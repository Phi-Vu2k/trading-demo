import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { Box, Button, Typography, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import { useStore, selSymbol, selCategory, selTicker } from '../../store';
import { useKlineWS } from '../../hooks/useBinanceWS';
import { formatCompactVolume, formatFixed, formatPercent, formatPrice } from '../../utils/format';

const INTERVALS = [
  { l: '1m', v: '1' }, { l: '5m', v: '5' }, { l: '15m', v: '15' },
  { l: '30m', v: '30' }, { l: '1h', v: '60' }, { l: '4h', v: '240' }, { l: '1D', v: 'D' },
];

const INDICATORS = ['EMA9', 'EMA21', 'MA50', 'RSI'];

// ── EMA/MA calculations ──────────────────────────────────────────────────────
function calcEMA(candles, period) {
  const k = 2 / (period + 1);
  let ema = candles[0]?.close || 0;
  return candles.map(c => {
    ema = c.close * k + ema * (1 - k);
    return { time: c.time, value: ema };
  });
}

function calcMA(candles, period) {
  return candles.slice(period - 1).map((_, i) => ({
    time: candles[i + period - 1].time,
    value: candles.slice(i, i + period).reduce((s, c) => s + c.close, 0) / period,
  }));
}

function calcRSI(candles, period = 14) {
  if (candles.length < period + 1) return [];
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = candles[i].close - candles[i - 1].close;
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  const result = [];
  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      const d = candles[i].close - candles[i - 1].close;
      avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: candles[i].time, value: 100 - 100 / (1 + rs) });
  }
  return result;
}

// ── Component ─────────────────────────────────────────────────────────────────
const TradingChart = memo(function TradingChart() {
  const symbol   = useStore(selSymbol);
  const category = useStore(selCategory);
  const ticker   = useStore(selTicker(symbol));

  const containerRef = useRef(null);
  const rsiRef       = useRef(null);
  const chartRef     = useRef(null);
  const rsiChartRef  = useRef(null);
  const seriesMap    = useRef({});
  const candlesRef   = useRef([]);

  const [interval, setIntervalVal] = useState('15');
  const [activeIndicators, setActiveIndicators] = useState(['EMA9', 'EMA21']);

  // ── Init charts ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || !rsiRef.current) return;

    const opts = {
      layout: { background: { color: '#06060f' }, textColor: '#6b7280' },
      grid: { vertLines: { color: '#0e0e1e' }, horzLines: { color: '#0e0e1e' } },
      crosshair: { mode: CrosshairMode.Normal, vertLine: { color: '#f7a60060' }, horzLine: { color: '#f7a60060' } },
      rightPriceScale: { borderColor: '#0e0e1e' },
      timeScale: { borderColor: '#0e0e1e', timeVisible: true, secondsVisible: false },
    };

    const mainChart = createChart(containerRef.current, {
      ...opts,
      width: containerRef.current.clientWidth,
      height: Math.max(containerRef.current.clientHeight, 260),
    });
    const rsiChart  = createChart(rsiRef.current, {
      ...opts,
      width: rsiRef.current.clientWidth,
      height: 80,
    });

    // Sync time scales. The RSI chart can be empty while the indicator is off,
    // and lightweight-charts throws if a range cannot be mapped to its data.
    const syncRsiRange = () => {
      const range = mainChart.timeScale().getVisibleRange();
      if (!range || range.from == null || range.to == null) return;
      try {
        rsiChart.timeScale().setVisibleRange(range);
      } catch {}
    };
    mainChart.timeScale().subscribeVisibleTimeRangeChange(syncRsiRange);

    chartRef.current    = mainChart;
    rsiChartRef.current = rsiChart;

    // Candle series
    seriesMap.current.candle = mainChart.addCandlestickSeries({
      upColor: '#00d98b', downColor: '#f6465d',
      borderUpColor: '#00d98b', borderDownColor: '#f6465d',
      wickUpColor: '#00d98b', wickDownColor: '#f6465d',
    });

    // Volume
    seriesMap.current.volume = mainChart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    });
    mainChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    // RSI series
    seriesMap.current.rsi = rsiChart.addLineSeries({ color: '#a78bfa', lineWidth: 1.5, priceFormat: { type: 'price', precision: 1 } });
    rsiChart.addLineSeries({ color: '#f6465d40', lineWidth: 1, lastValueVisible: false, priceLineVisible: false }).setData([]);
    seriesMap.current.rsiOB = rsiChart.addLineSeries({ color: '#f6465d40', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });
    seriesMap.current.rsiOS = rsiChart.addLineSeries({ color: '#00d98b40', lineWidth: 1, lastValueVisible: false, priceLineVisible: false });

    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        mainChart.applyOptions({
          width: containerRef.current.clientWidth,
          height: Math.max(containerRef.current.clientHeight, 260),
        });
      }
      if (rsiRef.current) {
        rsiChart.applyOptions({
          width: rsiRef.current.clientWidth,
          height: 80,
        });
      }
    });
    ro.observe(containerRef.current);
    ro.observe(rsiRef.current);

    return () => {
      mainChart.timeScale().unsubscribeVisibleTimeRangeChange(syncRsiRange);
      ro.disconnect();
      mainChart.remove();
      rsiChart.remove();
    };
  }, []);

  // ── Draw indicators ──────────────────────────────────────────────────────────
  const drawIndicators = useCallback((candles) => {
    const chart = chartRef.current;
    if (!chart || candles.length < 50) return;

    // Remove old indicator series
    ['ema9', 'ema21', 'ma50'].forEach(k => {
      if (seriesMap.current[k]) { try { chart.removeSeries(seriesMap.current[k]); } catch {} delete seriesMap.current[k]; }
    });

    if (activeIndicators.includes('EMA9')) {
      seriesMap.current.ema9 = chart.addLineSeries({ color: '#f59e0b', lineWidth: 1.5, lastValueVisible: false, priceLineVisible: false });
      seriesMap.current.ema9.setData(calcEMA(candles, 9));
    }
    if (activeIndicators.includes('EMA21')) {
      seriesMap.current.ema21 = chart.addLineSeries({ color: '#60a5fa', lineWidth: 1.5, lastValueVisible: false, priceLineVisible: false });
      seriesMap.current.ema21.setData(calcEMA(candles, 21));
    }
    if (activeIndicators.includes('MA50')) {
      seriesMap.current.ma50 = chart.addLineSeries({ color: '#c084fc', lineWidth: 1.5, lastValueVisible: false, priceLineVisible: false });
      seriesMap.current.ma50.setData(calcMA(candles, 50));
    }

    // RSI
    if (activeIndicators.includes('RSI') && seriesMap.current.rsi) {
      const rsiData = calcRSI(candles);
      seriesMap.current.rsi.setData(rsiData);
      const times = rsiData.map(r => r.time);
      if (times.length) {
        seriesMap.current.rsiOB?.setData(times.map(t => ({ time: t, value: 70 })));
        seriesMap.current.rsiOS?.setData(times.map(t => ({ time: t, value: 30 })));
      }
    }
  }, [activeIndicators]);

  // ── Kline WS callback ───────────────────────────────────────────────────────
  const handleKline = useCallback((ev) => {
    if (ev.type === 'snapshot') {
      candlesRef.current = ev.candles;
      seriesMap.current.candle?.setData(ev.candles);
      seriesMap.current.volume?.setData(
        ev.candles.map(c => ({ time: c.time, value: c.volume, color: c.close >= c.open ? '#00d98b30' : '#f6465d30' }))
      );
      drawIndicators(ev.candles);
    } else if (ev.type === 'update') {
      const c = ev.candle;
      const arr = candlesRef.current;
      if (arr.length && arr[arr.length - 1].time === c.time) arr[arr.length - 1] = c;
      else arr.push(c);
      seriesMap.current.candle?.update(c);
      seriesMap.current.volume?.update({ time: c.time, value: c.volume, color: c.close >= c.open ? '#00d98b30' : '#f6465d30' });
    }
  }, [drawIndicators]);

  useKlineWS(symbol, interval, category, handleKline);

  // Redraw indicators when toggled
  useEffect(() => {
    if (candlesRef.current.length) drawIndicators(candlesRef.current);
  }, [activeIndicators, drawIndicators]);

  const price  = ticker?.lastPrice  ? parseFloat(ticker.lastPrice) : null;
  const change = ticker?.price24hPcnt ? parseFloat(ticker.price24hPcnt) * 100 : 0;
  const isUp   = change >= 0;

  function toggleIndicator(ind) {
    setActiveIndicators(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind]);
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#06060f' }}>
      {/* Ticker bar */}
      <Box sx={{ px: 2, py: 0.8, borderBottom: '1px solid #0e0e1e', display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: isUp ? '#00d98b' : '#f6465d', fontFamily: 'monospace', lineHeight: 1 }}>
            {price ? formatPrice(price) : '—'}
          </Typography>
          <Typography sx={{ fontSize: 11, color: isUp ? '#00d98b' : '#f6465d' }}>
            {isUp ? '▲' : '▼'} {formatPercent(Math.abs(change), 2, false)}
          </Typography>
        </Box>
        {ticker && [
          { l: '24h High', v: formatFixed(ticker.highPrice24h), c: '#00d98b' },
          { l: '24h Low',  v: formatFixed(ticker.lowPrice24h),  c: '#f6465d' },
          { l: '24h Vol',  v: formatCompactVolume(ticker.volume24h), c: '#9ca3af' },
          { l: 'Turnover', v: formatCompactVolume(ticker.turnover24h), c: '#9ca3af' },
        ].map(({ l, v, c }) => (
          <Box key={l}>
            <Typography sx={{ fontSize: 9, color: '#4b5563' }}>{l}</Typography>
            <Typography sx={{ fontSize: 12, color: c, fontFamily: 'monospace' }}>{v}</Typography>
          </Box>
        ))}
      </Box>

      {/* Toolbar */}
      <Box sx={{ px: 2, py: 0.5, borderBottom: '1px solid #0e0e1e', display: 'flex', gap: 2, alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {INTERVALS.map(iv => (
            <Button key={iv.v} size="small" onClick={() => setIntervalVal(iv.v)}
              sx={{ minWidth: 36, px: 1, py: 0.2, fontSize: 11, borderRadius: 1, textTransform: 'none',
                color: interval === iv.v ? '#f7a600' : '#4b5563',
                bgcolor: interval === iv.v ? '#f7a60015' : 'transparent',
                '&:hover': { bgcolor: '#ffffff08' },
              }}>
              {iv.l}
            </Button>
          ))}
        </Box>
        <Box sx={{ width: 1, bgcolor: '#0e0e1e', alignSelf: 'stretch' }} />
        <Box sx={{ display: 'flex', gap: 0.3 }}>
          {INDICATORS.map(ind => (
            <Button key={ind} size="small" onClick={() => toggleIndicator(ind)}
              sx={{ minWidth: 0, px: 1, py: 0.2, fontSize: 10, borderRadius: 1, textTransform: 'none',
                color: activeIndicators.includes(ind) ? indColor(ind) : '#4b5563',
                bgcolor: activeIndicators.includes(ind) ? `${indColor(ind)}18` : 'transparent',
                border: '1px solid',
                borderColor: activeIndicators.includes(ind) ? `${indColor(ind)}40` : 'transparent',
                '&:hover': { bgcolor: '#ffffff08' },
              }}>
              {ind}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Main chart */}
      <Box ref={containerRef} sx={{ flex: 1, minHeight: 0 }} />

      {/* RSI chart */}
      <Box
        ref={rsiRef}
        sx={{
          height: activeIndicators.includes('RSI') ? 80 : 0,
          overflow: 'hidden',
          borderTop: activeIndicators.includes('RSI') ? '1px solid #0e0e1e' : 0,
        }}
      />
    </Box>
  );
});

export default TradingChart;

function indColor(ind) {
  return { EMA9: '#f59e0b', EMA21: '#60a5fa', MA50: '#c084fc', RSI: '#a78bfa' }[ind] || '#fff';
}
