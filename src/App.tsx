import React, { useState, useEffect, useMemo, ReactNode } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, ComposedChart, Legend
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Activity, Play, Square, 
  History, BarChart3, Settings, RefreshCw, DollarSign,
  ArrowUpRight, ArrowDownRight, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { Candle, Trade, BotState } from './types';
import { calculateMA, calculateRSI } from './indicators';
import { runBacktest } from './backtest';
import { TradingViewChart } from './TradingViewChart';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('1h');
  const [botState, setBotState] = useState<BotState>({
    balance: 10000,
    position: 0,
    trades: [],
    isRunning: false,
    strategy: 'MA_CROSSOVER'
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'backtest' | 'trades'>('dashboard');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!Array.isArray(data)) {
        throw new Error("Invalid data format received from API");
      }

      const formattedData: Candle[] = data.map((d: any) => ({
        time: d[0],
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5]),
      }));

      const ma20 = calculateMA(formattedData, 20);
      const ma50 = calculateMA(formattedData, 50);
      const rsi = calculateRSI(formattedData, 14);

      const enrichedData = formattedData.map((d, i) => ({
        ...d,
        ma20: ma20[i],
        ma50: ma50[i],
        rsi: rsi[i]
      }));

      setCandles(enrichedData);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred while fetching market data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // WebSocket for real-time data
    const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`);
    
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const k = msg.k;
      const newCandle: Candle = {
        time: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      };

      setCandles(prev => {
        if (prev.length === 0) return [newCandle];
        const last = prev[prev.length - 1];
        
        let newArr;
        if (last.time === newCandle.time) {
          // Update last candle
          newArr = [...prev.slice(0, -1), newCandle];
        } else {
          // Add new candle
          newArr = [...prev, newCandle];
        }

        // Recalculate indicators for the updated array
        const ma20 = calculateMA(newArr, 20);
        const ma50 = calculateMA(newArr, 50);
        const rsi = calculateRSI(newArr, 14);

        return newArr.map((d, i) => ({
          ...d,
          ma20: ma20[i],
          ma50: ma50[i],
          rsi: rsi[i]
        }));
      });
    };

    return () => {
      ws.close();
    };
  }, [symbol, interval]);

  const handleBacktest = () => {
    const result = runBacktest(candles, 10000, botState.strategy);
    setBotState(prev => ({
      ...prev,
      ...result,
      isRunning: false
    }));
    setActiveTab('trades');
  };

  const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;
  const priceChange = candles.length > 1 ? ((candles[candles.length - 1].close - candles[candles.length - 2].close) / candles[candles.length - 2].close) * 100 : 0;

  const stats = useMemo(() => {
    if (botState.trades.length === 0) return { pnl: 0, winRate: 0, totalTrades: 0 };
    
    let finalBalance = botState.balance;
    if (botState.position > 0) {
      finalBalance += botState.position * currentPrice;
    }
    
    const pnl = ((finalBalance - 10000) / 10000) * 100;
    
    let wins = 0;
    for (let i = 0; i < botState.trades.length; i += 2) {
      if (i + 1 < botState.trades.length) {
        const buy = botState.trades[i];
        const sell = botState.trades[i + 1];
        if (sell.price > buy.price) wins++;
      }
    }
    
    const totalCompleted = Math.floor(botState.trades.length / 2);
    const winRate = totalCompleted > 0 ? (wins / totalCompleted) * 100 : 0;

    return { pnl, winRate, totalTrades: botState.trades.length };
  }, [botState.trades, botState.balance, botState.position, currentPrice]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-orange-500/30">
      {/* Sidebar / Nav */}
      <div className="fixed left-0 top-0 h-full w-20 bg-[#141414] border-r border-white/5 flex flex-col items-center py-8 gap-8 z-50">
        <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
          <Zap className="text-black fill-black" size={24} />
        </div>
        
        <nav className="flex flex-col gap-4">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "p-3 rounded-xl transition-all duration-200",
              activeTab === 'dashboard' ? "bg-white/10 text-orange-500" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <BarChart3 size={24} />
          </button>
          <button 
            onClick={() => setActiveTab('backtest')}
            className={cn(
              "p-3 rounded-xl transition-all duration-200",
              activeTab === 'backtest' ? "bg-white/10 text-orange-500" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <Activity size={24} />
          </button>
          <button 
            onClick={() => setActiveTab('trades')}
            className={cn(
              "p-3 rounded-xl transition-all duration-200",
              activeTab === 'trades' ? "bg-white/10 text-orange-500" : "text-white/40 hover:text-white hover:bg-white/5"
            )}
          >
            <History size={24} />
          </button>
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button className="p-3 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <Settings size={24} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="pl-20 min-h-screen">
        {/* Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-8 sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-40">
          <div className="flex items-center gap-6">
            <div>
              <h1 className="text-xl font-bold tracking-tight">{symbol}</h1>
              <p className="text-xs text-white/40 font-mono">BINANCE:BTCUSDT</p>
            </div>
            <div className="h-8 w-[1px] bg-white/10" />
            <div className="flex items-center gap-4">
              <div className="text-2xl font-mono font-medium">
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
              <div className={cn(
                "flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg",
                priceChange >= 0 ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
              )}>
                {priceChange >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                {Math.abs(priceChange).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <select 
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="bg-[#141414] border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500/50 transition-colors"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
            <button 
              onClick={fetchData}
              className="p-2 rounded-lg bg-[#141414] border border-white/10 hover:bg-white/5 transition-all"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            <button 
              onClick={handleBacktest}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-black font-bold px-4 py-2 rounded-lg transition-all shadow-lg shadow-orange-500/20"
            >
              <Play size={18} fill="black" />
              Run Simulation
            </button>
          </div>
        </header>

        <div className="p-8">
          {error && (
            <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3 text-rose-400">
                <Activity size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
              <button 
                onClick={fetchData}
                className="text-xs font-bold uppercase tracking-wider text-rose-400 hover:text-rose-300 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Balance" 
                  value={`$${botState.balance.toLocaleString()}`} 
                  icon={<DollarSign className="text-orange-500" />}
                  subValue={`${botState.position.toFixed(4)} BTC held`}
                />
                <StatCard 
                  title="Total PnL" 
                  value={`${stats.pnl.toFixed(2)}%`} 
                  icon={<TrendingUp className={stats.pnl >= 0 ? "text-emerald-500" : "text-rose-500"} />}
                  trend={stats.pnl >= 0 ? 'up' : 'down'}
                />
                <StatCard 
                  title="Win Rate" 
                  value={`${stats.winRate.toFixed(1)}%`} 
                  icon={<Activity className="text-blue-500" />}
                  subValue={`From ${Math.floor(stats.totalTrades / 2)} closed trades`}
                />
                <StatCard 
                  title="Active Strategy" 
                  value={botState.strategy.replace('_', ' ')} 
                  icon={< Zap className="text-yellow-500" />}
                  subValue="Automated execution"
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Price Action</h3>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-orange-500" /> MA20</div>
                      <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500" /> MA50</div>
                    </div>
                  </div>
                  <div className="h-[400px] w-full">
                    <TradingViewChart 
                      data={candles} 
                      ma20={candles.map(c => c.ma20 || NaN)} 
                      ma50={candles.map(c => c.ma50 || NaN)} 
                      trades={botState.trades}
                    />
                  </div>
                </div>

                <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col">
                  <h3 className="text-lg font-semibold mb-6">RSI Momentum</h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={candles}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis domain={[0, 100]} stroke="#ffffff20" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                        />
                        <Line type="monotone" dataKey="rsi" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        {/* RSI Levels */}
                        <Line type="monotone" dataKey={() => 70} stroke="#ef4444" strokeDasharray="5 5" dot={false} />
                        <Line type="monotone" dataKey={() => 30} stroke="#10b981" strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-auto pt-6 border-t border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/40">Current RSI</span>
                      <span className={cn(
                        "font-mono font-bold",
                        candles.length > 0 && candles[candles.length-1].rsi! > 70 ? "text-rose-500" : 
                        candles.length > 0 && candles[candles.length-1].rsi! < 30 ? "text-emerald-500" : "text-white"
                      )}>
                        {candles.length > 0 ? candles[candles.length-1].rsi?.toFixed(2) : '0.00'}
                      </span>
                    </div>
                    <p className="text-xs text-white/30 leading-relaxed">
                      RSI above 70 indicates overbought conditions (sell signal), while below 30 suggests oversold conditions (buy signal).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'backtest' && (
            <div className="max-w-2xl mx-auto bg-[#141414] border border-white/5 rounded-2xl p-8 shadow-2xl">
              <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                <Zap className="text-orange-500" /> Strategy Configuration
              </h2>
              
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-3">Select Algorithm</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={() => setBotState(s => ({ ...s, strategy: 'MA_CROSSOVER' }))}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left",
                        botState.strategy === 'MA_CROSSOVER' ? "bg-orange-500/10 border-orange-500 text-orange-500" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      )}
                    >
                      <div className="font-bold mb-1">MA Crossover</div>
                      <div className="text-xs opacity-60">Buy when 20MA crosses 50MA</div>
                    </button>
                    <button 
                      onClick={() => setBotState(s => ({ ...s, strategy: 'RSI_OVERSOLD' }))}
                      className={cn(
                        "p-4 rounded-xl border transition-all text-left",
                        botState.strategy === 'RSI_OVERSOLD' ? "bg-orange-500/10 border-orange-500 text-orange-500" : "bg-white/5 border-white/10 text-white/40 hover:border-white/20"
                      )}
                    >
                      <div className="font-bold mb-1">RSI Oversold</div>
                      <div className="text-xs opacity-60">Buy at RSI 30, Sell at RSI 70</div>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Initial Capital</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                      <input 
                        type="number" 
                        value={botState.balance}
                        onChange={(e) => setBotState(s => ({ ...s, balance: parseFloat(e.target.value) }))}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/60 mb-2">Risk per Trade</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        defaultValue={100}
                        className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20">%</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleBacktest}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-4 rounded-xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-3"
                >
                  <Play fill="black" /> Start Backtest Simulation
                </button>
              </div>
            </div>
          )}

          {activeTab === 'trades' && (
            <div className="bg-[#141414] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Trade History</h3>
                <div className="text-xs text-white/40 font-mono">
                  {botState.trades.length} EXECUTIONS
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-white/30 bg-white/5">
                      <th className="px-6 py-4 font-medium">Time</th>
                      <th className="px-6 py-4 font-medium">Type</th>
                      <th className="px-6 py-4 font-medium">Price</th>
                      <th className="px-6 py-4 font-medium">Amount</th>
                      <th className="px-6 py-4 font-medium">Total</th>
                      <th className="px-6 py-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {botState.trades.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-white/20 italic">
                          No trades executed yet. Run a simulation to see results.
                        </td>
                      </tr>
                    ) : (
                      botState.trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-sm font-mono text-white/60">
                            {format(trade.timestamp, 'MMM dd, HH:mm:ss')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "text-xs font-bold px-2 py-1 rounded",
                              trade.type === 'BUY' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                            )}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono">
                            ${trade.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-sm font-mono">
                            {trade.amount.toFixed(6)} BTC
                          </td>
                          <td className="px-6 py-4 text-sm font-mono">
                            ${(trade.price * trade.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500" />
                              <span className="text-xs text-white/60">Filled</span>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, icon, subValue, trend }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  subValue?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="bg-[#141414] border border-white/5 rounded-2xl p-6 shadow-lg hover:border-white/10 transition-all group">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-white/40">{title}</span>
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-white/10 transition-all">
          {icon}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {subValue && (
          <div className="text-xs text-white/30 font-mono flex items-center gap-1">
            {trend === 'up' && <ArrowUpRight size={12} className="text-emerald-500" />}
            {trend === 'down' && <ArrowDownRight size={12} className="text-rose-500" />}
            {subValue}
          </div>
        )}
      </div>
    </div>
  );
}
