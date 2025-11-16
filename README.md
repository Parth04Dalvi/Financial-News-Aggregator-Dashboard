# FinSense: AI-Powered Financial News Aggregator 📈



<img width="458" height="656" alt="image" src="https://github.com/user-attachments/assets/6cd67858-ef1d-464a-acbc-d1cec90169dd" />

Overview

FinSense is a modern, full-stack application designed to help users quickly gauge market sentiment by aggregating financial headlines and applying real-time, simulated Natural Language Processing (NLP) to them.

This project showcases expertise in Full-Stack Development (React/Next.js), Data Visualization (Recharts), Cloud Persistence (Firebase Firestore), and Predictive Analytics/NLP. It provides a clean, responsive dashboard for tracking market mood and saving articles for later review.

🚀 Project Demo (Animation Placeholder)

Showcase the app in action! This GIF should demonstrate the key features: the sentiment chart updating, filtering headlines by sentiment, and saving/unsaving an article.

Key Features

The application is built around data processing, visualization, and user experience:

Simulated NLP Sentiment Analysis: Each incoming headline is instantly analyzed and assigned a sentiment (Positive, Negative, or Neutral) and a corresponding score (0.0 to 1.0).

Interactive Sentiment Trend Chart: A line chart visualizes the Average Daily Market Sentiment Score, allowing users to quickly identify shifts in overall market mood over time.

Sentiment and Keyword Filtering: Users can filter the headline list to view only Positive, Negative, or Neutral articles, and use a dedicated search bar to find articles by specific keywords or stock tickers.

Persistent Article Saving: Users can save important articles to their profile. This functionality is backed by Firebase Firestore, ensuring data persistence across sessions.

Modern and Responsive UI: Built using React and styled with Tailwind CSS for a fast, mobile-friendly, and professional user interface.

Application Architecture (Simulated)

The application component (FinancialNewsAggregator.jsx) is designed to integrate into a modern JavaScript stack (like Next.js or a standalone React app).

Frontend (FinSense Dashboard): Handles all rendering, user interaction, filtering, and data visualization.

Data Simulation Layer: The runSentimentAnalysis function simulates a key backend microservice, where a dedicated Python environment (e.g., FastAPI running FinBERT) would perform the resource-intensive NLP task and return the resulting sentiment and score.

Persistence Layer: All user actions (saving/removing articles) interact directly with the Firestore database, ensuring security and persistence tied to the unique user ID.

Setup and Installation

This is a single-file React component, designed to run within a modern build environment.

Environment: Ensure you have Node.js and npm/yarn installed.

Dependencies: This project relies on standard React/Firebase packages: firebase/app, firebase/auth, firebase/firestore, and the visualization library recharts.

Local Setup: Integrate the FinancialNewsAggregator.jsx component into a React project structure where Tailwind CSS is configured.

Firebase Configuration: The application requires environment variables for Firebase configuration (__app_id, __firebase_config, __initial_auth_token) to connect to the Firestore instance.
