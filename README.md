# 📊 Stock Data Intelligence Dashboard

## 🚀 Introduction

Stock Data Intelligence Dashboard is a mini financial data platform
built to analyze and visualize stock market data. It demonstrates data
collection, processing, API development, and interactive visualization
using modern technologies.

## 🎯 Objective

-   Collect and clean stock market data\
-   Build REST APIs using Python\
-   Visualize insights through charts\
-   Apply analytical thinking

## 🛠️ Tech Stack

-   Python, Flask\
-   Pandas, NumPy,scikit learn\
-   SQLite/PostgreSQL\
-   React\

## 📂 Project Structure

project/ │── backend/ │── data/ │── frontend/ │── requirements.txt │──
README.md

## 📥 Data Processing

-   Handled missing values\
-   Converted date formats\
-   Daily Return = (Close - Open) / Open\
-   7-Day Moving Average\
-   52-Week High/Low

## 🔌 API Endpoints

GET /companies\
GET /data/{symbol}\
GET /summary/{symbol}\
GET /compare?symbol1=INFY&symbol2=TCS

## 📊 Features

-   Stock visualization\
-   Compare stocks\
-   Top gainers/losers\
-   Optional ML prediction

## ⚙️ Setup

git clone `<repo>`{=html} cd backend pip install -r requirements.txt
python app.py

## 📄 API Docs

http://localhost:8000/docs

## 🚀 Deployment

Render / Oracle Cloud / GitHub Pages

## 🙌 Conclusion

A full-stack project demonstrating financial data analysis, API
development, and visualization.
