from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)
CORS(app)

# Helper for calculating stock metrics and ML prediction
def process_stock_data(symbol, days=30):
    try:
        # Fetch extra data (1 year) to ensure 52-week High/Low is accurate
        raw = yf.download([symbol, "^NSEI"], period="1y")
        if raw.empty: return None

        df_close = raw['Close'].copy()
        df_close.columns = [symbol, "Market"]
        df = raw.xs(symbol, axis=1, level=1).copy()
        df["Market_Close"] = df_close["Market"]
        df = df.ffill().reset_index()
        df["Date"] = pd.to_datetime(df["Date"])

        # Core Metrics
        df["Daily_Return"] = (df["Close"] - df["Open"]) / df["Open"]
        df["MA_7"] = df["Close"].rolling(window=7).mean()
        df["52_Week_High"] = df["High"].rolling(window=252, min_periods=1).max()
        df["52_Week_Low"] = df["Low"].rolling(window=252, min_periods=1).min()
        df["Volatility_Score"] = df["Daily_Return"].rolling(window=21).std() * np.sqrt(252) * 100
        df["Market_Correlation"] = df["Daily_Return"].rolling(window=60).corr(df["Market_Close"].pct_change())

        # --- Basic ML Prediction (Linear Trend) ---
        recent = df.tail(15) # Use last 15 days to predict trend
        y = recent['Close'].values.reshape(-1, 1)
        X = np.array(range(len(y))).reshape(-1, 1)
        model = LinearRegression().fit(X, y)
        
        # Predict next 3 days
        future_X = np.array(range(len(y), len(y) + 3)).reshape(-1, 1)
        predictions = model.predict(future_X).flatten().tolist()

        return df.fillna(0), predictions
    except Exception as e:
        print(f"Error: {e}")
        return None, []

@app.route('/companies')
def get_companies():
    return jsonify({"companies": [
        {"symbol": "WIPRO.NS", "name": "Wipro Ltd"},
        {"symbol": "RELIANCE.NS", "name": "Reliance Ind"},
        {"symbol": "TCS.NS", "name": "TCS Ltd"},
        {"symbol": "INFY.NS", "name": "Infosys Ltd"}
    ]})

@app.route('/data/<symbol>')
def get_data(symbol):
    days = int(request.args.get('days', 30))
    df, preds = process_stock_data(symbol)
    if df is None: return jsonify({"error": "Failed"}), 404
    
    chart_data = df.tail(days).to_dict(orient="records")
    for item in chart_data:
        item['Date'] = item['Date'].strftime('%Y-%m-%d')
    
    return jsonify({"history": chart_data, "predictions": preds})

@app.route('/insights')
def get_insights():
    symbols = ["WIPRO.NS", "RELIANCE.NS", "TCS.NS", "INFY.NS"]
    data = []
    for s in symbols:
        ticker = yf.Ticker(s)
        hist = ticker.history(period="2d")
        change = ((hist['Close'].iloc[-1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0]) * 100
        data.append({"symbol": s, "change": round(change, 2)})
    
    data.sort(key=lambda x: x['change'], reverse=True)
    return jsonify({"top_gainer": data[0], "top_loser": data[-1]})

@app.route('/summary/<symbol>')
def get_summary(symbol):
    df, _ = process_stock_data(symbol)
    last = df.iloc[-1]
    return jsonify({
        "current_price": round(float(last["Close"]), 2),
        "volatility": round(float(last["Volatility_Score"]), 2),
        "market_correlation": round(float(last["Market_Correlation"]), 3)
    })

if __name__ == '__main__':
    # host='0.0.0.0' tells Flask to listen to ALL interfaces
    app.run(debug=True, host='0.0.0.0', port=5000)