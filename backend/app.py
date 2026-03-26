from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy  # Import SQLAlchemy
import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# --- Update this section in app.py ---
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'tickerpulse.db') # Forces it to the root of /backend

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + db_path
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

with app.app_context():
    db.create_all()
    print(f"✅ Database initialized at: {db_path}") # This will tell you exactly where it is

# Database Model to store Search History
class SearchLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    symbol = db.Column(db.String(20), nullable=False)
    price = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

# Create the database tables
with app.app_context():
    db.create_all()

# Helper for calculating stock metrics and ML prediction
def process_stock_data(symbol, days=30):
    try:
        raw = yf.download([symbol, "^NSEI"], period="1y", progress=False)
        if raw.empty: return None, []

        df_close = raw['Close'].copy()
        df_close.columns = [symbol, "Market"]
        df = raw.xs(symbol, axis=1, level=1).copy()
        df["Market_Close"] = df_close["Market"]
        df = df.ffill().reset_index()
        df["Date"] = pd.to_datetime(df["Date"])

        # Core Metrics
        df["Daily_Return"] = (df["Close"] - df["Open"]) / df["Open"]
        df["MA_7"] = df["Close"].rolling(window=7).mean()
        df["Volatility_Score"] = df["Daily_Return"].rolling(window=21).std() * np.sqrt(252) * 100
        df["Market_Correlation"] = df["Daily_Return"].rolling(window=60).corr(df["Market_Close"].pct_change())

        # ML Prediction
        recent = df.tail(15)
        y = recent['Close'].values.reshape(-1, 1)
        X = np.array(range(len(y))).reshape(-1, 1)
        model = LinearRegression().fit(X, y)
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
        if len(hist) < 2: continue
        change = ((hist['Close'].iloc[-1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0]) * 100
        data.append({"symbol": s, "change": round(change, 2)})
    
    data.sort(key=lambda x: x['change'], reverse=True)
    return jsonify({"top_gainer": data[0], "top_loser": data[-1]})

@app.route('/summary/<symbol>')
def get_summary(symbol):
    df, _ = process_stock_data(symbol)
    if df is None: return jsonify({"error": "No data"}), 404
    
    last = df.iloc[-1]
    current_p = round(float(last["Close"]), 2)

    # --- SAVE TO SQLITE ---
    try:
        log = SearchLog(symbol=symbol, price=current_p)
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"DB Error: {e}")

    return jsonify({
        "current_price": current_p,
        "volatility": round(float(last["Volatility_Score"]), 2),
        "market_correlation": round(float(last["Market_Correlation"]), 3)
    })

# New Route to view search history from the DB
@app.route('/logs')
def get_logs():
    logs = SearchLog.query.order_by(SearchLog.timestamp.desc()).limit(10).all()
    return jsonify([{
        "symbol": l.symbol, 
        "price": l.price, 
        "time": l.timestamp.strftime("%Y-%m-%d %H:%M:%S")
    } for l in logs])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)