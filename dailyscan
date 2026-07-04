import requests
import pandas as pd
import numpy as np
import json
import os
from datetime import datetime, timedelta
import time

FINNHUB_KEY = os.getenv("FINNHUB_KEY")
TICKERS = [
    "LAC", "BAC", "WFC", "JPM", "AXP", "AAPL", "MSFT", "NVDA", "AMD", "TSLA"
]

def rsi(series, period=14):
    delta = series.diff()
    gain = delta.where(delta > 0, 0).rolling(period).mean()
    loss = -delta.where(delta < 0, 0).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))

def get_finnhub_data(ticker, days=800):
    end = int(datetime.now().timestamp())
    start = int((datetime.now() - timedelta(days=days)).timestamp())
    url = "https://finnhub.io/api/v1/stock/candle"
    params = {"symbol": ticker, "resolution": "D", "from": start, "to": end, "token": FINNHUB_KEY}
    r = requests.get(url, params=params)
    data = r.json()
    if data.get("s")!= "ok": return None
    df = pd.DataFrame({"timestamp": pd.to_datetime(data["t"], unit="s"), "open": data["o"], "high": data["h"], "low": data["l"], "close": data["c"], "volume": data["v"]}).set_index("timestamp").sort_index()
    df["ma50"] = df["close"].rolling(50).mean()
    df["ma200"] = df["close"].rolling(200).mean()
    df["rsi"] = rsi(df["close"])
    return df

def trend_filter(df):
    if len(df) < 200: return False, "Not enough data"
    last = df.iloc[-1]
    ma200_rising = df["ma200"].iloc[-1] > df["ma200"].iloc[-20]
    price_above_200 = last["close"] > last["ma200"]
    ma_stack = last["ma50"] > last["ma200"]
    lows = df["low"].tail(40)
    higher_lows = lows.iloc[-1] > lows.iloc[:20].min()
    passed = (price_above_200 or ma200_rising) and ma_stack and higher_lows
    reason = f"200MA:{price_above_200 or ma200_rising}, 50>200:{ma_stack}, HL:{higher_lows}"
    return passed, reason

def find_inverse_hs_v3(df):
    if len(df) < 200: return None
    recent = df.tail(120).copy()
    lows = recent['low']
    minima_idx = [i for i in range(3, len(lows)-3) if lows.iloc[i] == lows.iloc[i-3:i+4].min()]
    if len(minima_idx) < 3: return None
    ls_idx, h_idx, rs_idx = minima_idx[-3:]
    ls, head, rs = lows.iloc[ls_idx], lows.iloc[h_idx], lows.iloc[rs_idx]
    if not (head < ls * 0.98 and head < rs * 0.98 and rs > head): return None
    neckline = recent['close'].iloc[ls_idx:rs_idx+1].max()
    current_price = recent['close'].iloc[-1]
    current_vol = recent['volume'].iloc[-1]
    avg_vol = recent['volume'].iloc[-20:-1].mean()
    vol_spike = round((current_vol / avg_vol - 1) * 100, 1)
    rsi_val = round(recent['rsi'].iloc[-1], 1)
    status = "broken_out" if current_price > neckline * 1.01 else "forming"
    if status == "broken_out" and vol_spike < 50: return None
    if rsi_val > 70: return None
    trend_ok, trend_reason = trend_filter(df)
    target = neckline + (neckline - head)
    stop = rs * 0.98
    risk_reward = round((target - current_price) / (current_price - stop), 1) if current_price > stop else 0
    return {"ticker": None, "price": round(current_price, 2), "neckline": round(neckline, 2), "status": status, "breakout_date": recent.index[-1].strftime("%Y-%m-%d") if status == "broken_out" else None, "target": round(target, 2), "proj_gain": round((target / current_price - 1) * 100, 1), "vol_spike": vol_spike, "rsi": rsi_val, "risk_reward": risk_reward, "trend": "strong" if trend_ok else "weak", "trend_detail": trend_reason, "stop": round(stop, 2)}

def backtest_pattern(df, breakout_idx, entry_price, target, stop):
    future = df.iloc[breakout_idx+1:breakout_idx+60]
    for i, row in future.iterrows():
        if row["low"] <= stop: return {"result": "loss", "return_pct": round((stop/entry_price-1)*100,1), "days": (i - df.index[breakout_idx]).days}
        if row["high"] >= target: return {"result": "win", "return_pct": round((target/entry_price-1)*100,1), "days": (i - df.index[breakout_idx]).days}
    exit_price = future.iloc[-1]["close"] if len(future) else entry_price
    return {"result": "time_exit", "return_pct": round((exit_price/entry_price-1)*100,1), "days": 60}

def scan_and_backtest():
    results, backtests = [], {}
    for i, ticker in enumerate(TICKERS):
        if i > 0 and i % 55 == 0: time.sleep(60)
        print(f"Scanning {ticker}...")
        df = get_finnhub_data(ticker, days=800)
        if df is None: continue
        pattern = find_inverse_hs_v3(df)
        if pattern:
            pattern["ticker"] = ticker
            results.append(pattern)
        ticker_backtests = []
        for idx in range(200, len(df)-60):
            window = df.iloc[idx-120:idx+1]
            p = find_inverse_hs_v3(window)
            if p and p["status"] == "broken_out":
                neckline = p["neckline"]
                head = window["low"].min()
                target = neckline + (neckline - head)
                stop = p["stop"]
                bt = backtest_pattern(df, idx, df.iloc[idx]["close"], target, stop)
                bt["date"] = df.index[idx].strftime("%Y-%m-%d")
                ticker_backtests.append(bt)
        if ticker_backtests:
            wins = sum(1 for b in ticker_backtests if b["result"] == "win")
            backtests[ticker] = {"total": len(ticker_backtests), "wins": wins, "win_rate": round(wins/len(ticker_backtests)*100,1), "avg_return": round(np.mean([b["return_pct"] for b in ticker_backtests]),1), "trades": ticker_backtests[-10:]}
    with open("data.json", "w") as f: json.dump({"last_updated": datetime.now().strftime("%Y-%m-%d %H:%M EST"), "stocks": results}, f, indent=2)
    with open("backtest.json", "w") as f: json.dump(backtests, f, indent=2)
    print(f"Done. {len(results)} current patterns. Backtest saved.")

if __name__ == "__main__":
    scan_and_backtest()
