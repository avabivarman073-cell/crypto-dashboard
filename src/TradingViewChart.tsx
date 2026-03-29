import React, { useEffect, useRef } from 'react';
import { createChart, ColorType, UTCTimestamp, SeriesMarker, CandlestickData, HistogramData, LineData, CandlestickSeries, HistogramSeries, LineSeries } from 'lightweight-charts';
import { Candle, Trade } from './types';

interface ChartProps {
  data: Candle[];
  ma20: number[];
  ma50: number[];
  trades: Trade[];
}

export const TradingViewChart: React.FC<ChartProps> = ({ data, ma20, ma50, trades }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const ma20SeriesRef = useRef<any>(null);
  const ma50SeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#ffffff60',
      },
      grid: {
        vertLines: { color: '#ffffff05' },
        horzLines: { color: '#ffffff05' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
        borderColor: '#ffffff10',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#ffffff10',
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#ffffff20',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const ma20Series = chart.addSeries(LineSeries, {
      color: '#f97316',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ma50Series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    chartRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;
    volumeSeriesRef.current = volumeSeries;
    ma20SeriesRef.current = ma20Series;
    ma50SeriesRef.current = ma50Series;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!candlestickSeriesRef.current || !volumeSeriesRef.current || !ma20SeriesRef.current || !ma50SeriesRef.current) return;

    const candleData: CandlestickData[] = data.map(d => ({
      time: Math.floor(d.time / 1000) as UTCTimestamp,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    const volData: HistogramData[] = data.map(d => ({
      time: Math.floor(d.time / 1000) as UTCTimestamp,
      value: d.volume,
      color: d.close >= d.open ? '#10b98130' : '#ef444430',
    }));

    const ma20Data: LineData[] = data.map((d, i) => ({
      time: Math.floor(d.time / 1000) as UTCTimestamp,
      value: ma20[i],
    })).filter(d => !isNaN(d.value));

    const ma50Data: LineData[] = data.map((d, i) => ({
      time: Math.floor(d.time / 1000) as UTCTimestamp,
      value: ma50[i],
    })).filter(d => !isNaN(d.value));

    const chartMarkers: SeriesMarker<UTCTimestamp>[] = trades.map(trade => ({
      time: Math.floor(trade.timestamp / 1000) as UTCTimestamp,
      position: trade.type === 'BUY' ? 'belowBar' : 'aboveBar',
      color: trade.type === 'BUY' ? '#10b981' : '#ef4444',
      shape: trade.type === 'BUY' ? 'arrowUp' : 'arrowDown',
      text: trade.type,
    }));

    candlestickSeriesRef.current.setData(candleData);
    volumeSeriesRef.current.setData(volData);
    ma20SeriesRef.current.setData(ma20Data);
    ma50SeriesRef.current.setData(ma50Data);
    
    if (candlestickSeriesRef.current) {
      try {
        if (typeof candlestickSeriesRef.current.setMarkers === 'function') {
          candlestickSeriesRef.current.setMarkers(chartMarkers);
        } else {
          // DO NOT log the circular object itself to avoid JSON serialization errors
          console.error('setMarkers is not a function on candlestickSeriesRef.current');
        }
      } catch (e) {
        // Log only the error message to avoid circular structure issues
        console.error('Error setting markers:', e instanceof Error ? e.message : String(e));
      }
    }
  }, [data, ma20, ma50, trades]);

  return <div ref={chartContainerRef} className="w-full h-[400px]" />;
};
