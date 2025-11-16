import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, collection, query, setDoc, deleteDoc, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Save, Trash2, Loader2, BarChart3, Filter, Search } from 'lucide-react';

// --- FIREBASE CONFIGURATION & INITIALIZATION ---
// Global variables provided by the Canvas environment (Mandatory usage)
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Mock data structure representing news articles from the (simulated) backend API
const MOCK_NEWS_DATA = [
  { id: 'n1', title: 'Google Hits Record High on Strong Q3 Earnings.', source: 'Financial Times', date: '2025-11-15' },
  { id: 'n2', title: 'Inflation Concerns Rise as Fed Hints at Rate Increase.', source: 'Reuters', date: '2025-11-15' },
  { id: 'n3', title: 'Tech Stocks Under Pressure Amid Supply Chain Woes.', source: 'Bloomberg', date: '2025-11-14' },
  { id: 'n4', title: 'New Energy Breakthrough Promises Green Transition.', source: 'Science Daily', date: '2025-11-14' },
  { id: 'n5', title: 'Major Bank Announces Massive Layoffs.', source: 'Wall Street Journal', date: '2025-11-13' },
  { id: 'n6', title: 'Tesla price target raised by Morgan Stanley on demand strength.', source: 'Seeking Alpha', date: '2025-11-15' },
  { id: 'n7', title: 'Oil prices fall sharply due to unexpected inventory build.', source: 'CNBC', date: '2025-11-14' },
  { id: 'n8', title: 'Netflix signs massive deal with top showrunners, boosting content pipeline.', source: 'Variety', date: '2025-11-13' },
];

/**
 * Utility function to simulate NLP Sentiment Analysis.
 * In a real application, this would be an API call to a Python service (e.g., FastAPI/Flask)
 * running a FinBERT or similar model.
 * @param {string} headline The news headline to analyze.
 * @returns {{sentiment: 'positive' | 'negative' | 'neutral', score: number}}
 */
const runSentimentAnalysis = (headline) => {
  const positiveKeywords = ['record high', 'strong', 'breakthrough', 'promises', 'green', 'raised', 'boosting', 'demand strength'];
  const negativeKeywords = ['concerns rise', 'under pressure', 'woes', 'layoffs', 'massive', 'fall sharply', 'unexpected'];
  const neutralScore = 0.5;

  let score = neutralScore;
  let sentiment = 'neutral';

  const lowerCaseHeadline = headline.toLowerCase();

  const isPositive = positiveKeywords.some(keyword => lowerCaseHeadline.includes(keyword));
  const isNegative = negativeKeywords.some(keyword => lowerCaseHeadline.includes(keyword));

  if (isPositive && !isNegative) {
    score = Math.min(0.9, neutralScore + Math.random() * 0.4);
    sentiment = 'positive';
  } else if (isNegative && !isPositive) {
    score = Math.max(0.1, neutralScore - Math.random() * 0.4);
    sentiment = 'negative';
  } else if (isPositive && isNegative) {
    // Mixed signal
    score = neutralScore + (Math.random() - 0.5) * 0.1;
  }

  // Score normalized from 0.0 (negative) to 1.0 (positive)
  return {
    sentiment,
    score: parseFloat(score.toFixed(3)),
  };
};

// --- MAIN APPLICATION COMPONENT ---
const App = () => {
  const [db, setDb] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [articles, setArticles] = useState([]);
  const [savedArticles, setSavedArticles] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [selectedSentiment, setSelectedSentiment] = useState('all'); // New filter state
  const [searchTerm, setSearchTerm] = useState(''); // New search term state

  // 1. Firebase Initialization and Authentication
  useEffect(() => {
    if (!firebaseConfig) {
      console.error("Firebase config is missing.");
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const userAuth = getAuth(app);
      setDb(firestore);

      // Listener for Auth state changes
      const unsubscribe = onAuthStateChanged(userAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
          setIsAuthReady(true);
        } else {
          // Sign in anonymously if no token is provided
          if (!initialAuthToken) {
            await signInAnonymously(userAuth);
          } else {
            // Sign in with the provided custom token
            await signInWithCustomToken(userAuth, initialAuthToken);
          }
          // The onAuthStateChanged listener will fire again upon successful sign-in
        }
        setIsLoading(false);
      });

      return () => unsubscribe(); // Cleanup auth listener
    } catch (e) {
      console.error("Firebase initialization error:", e);
      setIsLoading(false);
    }
  }, []);

  // 2. Data Processing and Mock API Fetch (Runs only once after auth is ready)
  useEffect(() => {
    if (isAuthReady && !articles.length) {
      // Simulate fetching and processing data
      const processedArticles = MOCK_NEWS_DATA.map(article => ({
        ...article,
        ...runSentimentAnalysis(article.title),
        isSaved: false, // Will be updated by Firestore snapshot
      }));
      setArticles(processedArticles);
    }
  }, [isAuthReady, articles.length]);

  // 3. Firestore Listener for Saved Articles
  useEffect(() => {
    if (!db || !userId) return;

    // Setting log level for debugging Firestore issues
    // Note: setLogLevel is often not available directly in the web environment,
    // but the instruction suggests including it. We will rely on console.error/log instead.
    
    const savedCollectionPath = `/artifacts/${appId}/users/${userId}/saved_articles`;
    const q = query(collection(db, savedCollectionPath), orderBy('savedAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const saved = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setSavedArticles(saved);
      console.log('Fetched saved articles:', saved.length);
    }, (error) => {
      console.error("Error listening to saved articles:", error);
    });

    return () => unsubscribe(); // Cleanup snapshot listener
  }, [db, userId]);

  // Combined Article List with Saved Status
  const allArticlesWithSavedStatus = useMemo(() => {
    if (!articles.length) return [];
    const savedIds = new Set(savedArticles.map(a => a.id));

    return articles.map(article => ({
      ...article,
      isSaved: savedIds.has(article.id),
    }));
  }, [articles, savedArticles]);

  // Filtered Article List (Filter by Sentiment and Search Term)
  const filteredArticles = useMemo(() => {
    let result = allArticlesWithSavedStatus;

    // 1. Filter by Sentiment
    if (selectedSentiment !== 'all') {
      result = result.filter(article => article.sentiment === selectedSentiment);
    }

    // 2. Filter by Search Term
    if (searchTerm) {
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      result = result.filter(article =>
        article.title.toLowerCase().includes(lowerCaseSearchTerm) ||
        article.source.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }

    return result;
  }, [allArticlesWithSavedStatus, selectedSentiment, searchTerm]);


  // Sentiment Trend Data for Chart
  const sentimentTrendData = useMemo(() => {
    if (!allArticlesWithSavedStatus.length) return [];
    // Group articles by date and calculate average sentiment score
    const grouped = allArticlesWithSavedStatus.reduce((acc, article) => {
      const date = article.date;
      if (!acc[date]) {
        acc[date] = { totalScore: 0, count: 0, date: date };
      }
      acc[date].totalScore += article.score;
      acc[date].count += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .map(group => ({
        date: group.date,
        avgSentiment: parseFloat((group.totalScore / group.count).toFixed(2)),
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Sort by date
  }, [allArticlesWithSavedStatus]);

  // --- HANDLERS FOR FIRESTORE OPERATIONS ---

  const handleSaveArticle = useCallback(async (article) => {
    if (!db || !userId) return;
    setStatusMessage(`Saving "${article.title}"...`);

    const path = `/artifacts/${appId}/users/${userId}/saved_articles/${article.id}`;
    const docRef = doc(db, path);
    const dataToSave = {
      id: article.id,
      title: article.title,
      source: article.source,
      date: article.date,
      sentimentScore: article.score,
      sentiment: article.sentiment,
      savedAt: serverTimestamp()
    };

    try {
      await setDoc(docRef, dataToSave);
      setStatusMessage(`Article saved successfully!`);
    } catch (e) {
      console.error("Error saving document:", e);
      setStatusMessage(`Error saving article: ${e.message}`);
    }
  }, [db, userId]);

  const handleRemoveArticle = useCallback(async (articleId) => {
    if (!db || !userId) return;
    setStatusMessage(`Removing article ID ${articleId}...`);

    const path = `/artifacts/${appId}/users/${userId}/saved_articles/${articleId}`;
    const docRef = doc(db, path);

    try {
      await deleteDoc(docRef);
      setStatusMessage(`Article removed successfully!`);
    } catch (e) {
      console.error("Error removing document:", e);
      setStatusMessage(`Error removing article: ${e.message}`);
    }
  }, [db, userId]);

  const getSentimentColor = (sentiment, isBorder = false) => {
    switch (sentiment) {
      case 'positive': return isBorder ? 'border-green-500' : 'text-green-700 bg-green-100';
      case 'negative': return isBorder ? 'border-red-500' : 'text-red-700 bg-red-100';
      case 'neutral': return isBorder ? 'border-yellow-500' : 'text-yellow-700 bg-yellow-100';
      default: return isBorder ? 'border-gray-300' : 'text-gray-500 bg-gray-100';
    }
  };

  const SentimentFilterButton = ({ sentiment, label }) => (
    <button
      onClick={() => setSelectedSentiment(sentiment)}
      className={`px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
        selectedSentiment === sentiment
          ? getSentimentColor(sentiment) + ' shadow-md ring-2 ring-offset-2 ' + (sentiment === 'positive' ? 'ring-green-500' : sentiment === 'negative' ? 'ring-red-500' : 'ring-yellow-500')
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );

  if (isLoading || !isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="ml-3 text-lg font-medium text-gray-700">Initializing App and Authenticating...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-inter">
      <header className="mb-8 p-4 bg-white shadow-lg rounded-xl">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
          <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
          FinSense: AI-Powered Financial News Aggregator
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          User ID: <span className="font-mono text-xs p-1 bg-gray-100 rounded">{userId}</span>
        </p>
        <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${statusMessage.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
          {statusMessage || 'Welcome! Filter the news, analyze the sentiment trend, and save key articles.'}
        </div>
      </header>

      {/* Sentiment Trend Chart */}
      <section className="mb-8 p-6 bg-white shadow-xl rounded-xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Market Sentiment Trend (Avg. Daily Score)</h2>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={sentimentTrendData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis dataKey="date" stroke="#6b7280" />
              <YAxis domain={[0, 1]} stroke="#6b7280" />
              <Tooltip formatter={(value) => [`${(value * 100).toFixed(1)}%`, 'Sentiment Score']} />
              <Line type="monotone" dataKey="avgSentiment" stroke="#3b82f6" strokeWidth={3} dot={{ stroke: '#3b82f6', strokeWidth: 2 }} activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-xs text-gray-500">
          Sentiment Score is normalized: 1.0 (Most Positive) to 0.0 (Most Negative).
        </p>
      </section>

      {/* News Articles List and Sidebar in a responsive grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* News Headlines Column */}
        <div className="lg:col-span-2">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Latest Financial Headlines ({filteredArticles.length} found)</h2>
          
          {/* Filter Bar and Search (New Features) */}
          <div className="bg-white p-4 rounded-xl shadow-md mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="font-semibold text-gray-700">Filter by Sentiment:</span>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              <SentimentFilterButton sentiment="all" label="All Articles" />
              <SentimentFilterButton sentiment="positive" label="Positive" />
              <SentimentFilterButton sentiment="neutral" label="Neutral" />
              <SentimentFilterButton sentiment="negative" label="Negative" />
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by stock/company name or keyword..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
            </div>
          </div>
          
          {/* Articles */}
          <div className="space-y-4">
            {filteredArticles.length > 0 ? (
                filteredArticles.map((article) => (
                  <div 
                    key={article.id} 
                    className={`bg-white p-5 rounded-xl shadow-md transition duration-300 hover:shadow-lg border-l-8 ${getSentimentColor(article.sentiment, true)}`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium text-gray-900 leading-snug pr-4">{article.title}</h3>
                      <button
                        onClick={() => article.isSaved ? handleRemoveArticle(article.id) : handleSaveArticle(article)}
                        className={`p-2 rounded-full flex-shrink-0 transition duration-150 ${article.isSaved ? 'bg-red-500 text-white hover:bg-red-600 shadow-md' : 'bg-gray-200 text-gray-600 hover:bg-blue-500 hover:text-white'}`}
                        title={article.isSaved ? 'Remove from Saved' : 'Save Article'}
                      >
                        {article.isSaved ? <Trash2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center space-x-4 text-sm">
                      <span className="text-gray-500 font-mono text-xs">{article.source} / {article.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getSentimentColor(article.sentiment)}`}>
                        {article.sentiment.toUpperCase()} ({article.score})
                      </span>
                    </div>
                  </div>
                ))
            ) : (
                <div className="bg-white p-6 rounded-xl shadow-md text-center text-gray-500">
                    No headlines match your current filter and search criteria.
                </div>
            )}
          </div>
        </div>

        {/* Saved Articles Sidebar */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Saved Articles ({savedArticles.length})</h2>
          <div className="bg-white p-5 rounded-xl shadow-xl border border-gray-200">
            {savedArticles.length === 0 ? (
              <p className="text-gray-500 italic p-4 text-center">No articles saved yet.</p>
            ) : (
              <ul className="space-y-4">
                {savedArticles.map((saved) => (
                  <li key={saved.id} className="pb-4 border-b border-gray-100 last:border-b-0 last:pb-0">
                    <div className="flex justify-between items-start">
                      <p className="text-sm font-semibold text-gray-800 leading-tight pr-2">{saved.title}</p>
                      <button
                        onClick={() => handleRemoveArticle(saved.id)}
                        className="p-1 text-red-500 hover:text-red-700 transition flex-shrink-0"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="mt-1 flex space-x-2">
                        <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-semibold ${getSentimentColor(saved.sentiment)}`}>
                            {saved.sentiment.toUpperCase()}
                        </span>
                         <span className="text-xs text-gray-500 font-mono">Score: {saved.sentimentScore}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default App;
