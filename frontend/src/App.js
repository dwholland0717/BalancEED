import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { token: newToken, user: userData } = response.data;
      
      setToken(newToken);
      setUser(userData);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post(`${API}/auth/register`, userData);
      const { token: newToken, user: newUser } = response.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      isAuthenticated: !!token && !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Components
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  
  return !isAuthenticated ? children : <Navigate to="/dashboard" />;
};

// Landing Page Component
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      {/* Navigation */}
      <nav className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-2xl font-bold text-white">BalancEED</h1>
          </div>
          <div className="flex space-x-4">
            <a href="/login" className="text-white hover:text-yellow-300 transition-colors">
              Sign In
            </a>
            <a 
              href="/register" 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-6 py-2 rounded-lg font-semibold hover:from-yellow-500 hover:to-orange-600 transition-all duration-200"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Level Up Your
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent block">
              Learning Game
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            The ultimate learning platform for high school and college students. 
            Combine ASVAB prep, academic success, and social learning with AI-powered content, 
            gamification, and real rewards.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <a 
              href="/register"
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-8 py-4 rounded-xl font-bold text-lg hover:from-yellow-500 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-2xl"
            >
              🚀 Start Learning Now
            </a>
            <a 
              href="/demo"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-900 transition-all duration-200"
            >
              🎮 Try Demo
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-yellow-400 mb-2">AI-Powered</div>
              <div className="text-gray-300">Smart Content</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-green-400 mb-2">Gamified</div>
              <div className="text-gray-300">Learning Path</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-blue-400 mb-2">Social</div>
              <div className="text-gray-300">Study Groups</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-2">Real</div>
              <div className="text-gray-300">Prizes</div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 text-6xl animate-bounce opacity-20">🎮</div>
        <div className="absolute top-40 right-20 text-5xl animate-pulse opacity-20">⭐</div>
        <div className="absolute bottom-20 left-20 text-4xl animate-spin opacity-20">🏆</div>
      </div>

      {/* Features Section */}
      <div id="features" className="bg-black bg-opacity-30 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            Why Students <span className="text-yellow-400">Love</span> BalancEED
          </h3>
          
          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">🤖</div>
              <h4 className="text-2xl font-bold text-white mb-4">AI-Powered Learning</h4>
              <p className="text-gray-300 mb-6">
                Personalized content generation with Google Gemini AI. Get custom lessons, 
                quizzes, and assessments tailored to your learning style and pace.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-purple-500 text-white px-3 py-1 rounded-full text-sm">ASVAB Prep</span>
                <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-sm">Smart Assessments</span>
                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">Adaptive Content</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">🎮</div>
              <h4 className="text-2xl font-bold text-white mb-4">Gamified Experience</h4>
              <p className="text-gray-300 mb-6">
                Earn XP, maintain streaks, level up, and collect coins! Inspired by gaming mechanics 
                to make learning addictive and fun.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-yellow-500 text-white px-3 py-1 rounded-full text-sm">XP Points</span>
                <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm">Daily Streaks</span>
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">Level System</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-5xl mb-4">🏆</div>
              <h4 className="text-2xl font-bold text-white mb-4">Real Rewards</h4>
              <p className="text-gray-300 mb-6">
                Redeem coins for actual prizes! Homework passes, early dismissal, 
                premium meals, and even amusement park tickets.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">Homework Pass</span>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm">Early Dismissal</span>
                <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm">Fun Prizes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to <span className="text-yellow-400">Transform</span> Your Learning?
          </h3>
          <p className="text-xl text-gray-300 mb-12">
            Join thousands of students who are already leveling up their education with BalancEED.
          </p>
          
          <a 
            href="/register"
            className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-12 py-6 rounded-2xl font-bold text-xl hover:from-yellow-500 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            🎓 Start Your Journey Today
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black bg-opacity-50 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-lg">🎓</span>
            </div>
            <h1 className="text-xl font-bold text-white">BalancEED</h1>
          </div>
          <p className="text-gray-400 mb-4">
            Empowering students through AI-driven, gamified learning experiences.
          </p>
          <div className="flex justify-center space-x-6 text-gray-400">
            <span className="hover:text-white transition-colors cursor-pointer">About</span>
            <span className="hover:text-white transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-white transition-colors cursor-pointer">Terms</span>
            <span className="hover:text-white transition-colors cursor-pointer">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Demo Page Component - Interactive showcase
const DemoPage = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [demoUser] = useState({
    first_name: 'Alex',
    total_xp: 2450,
    current_streak: 12,
    longest_streak: 18,
    current_level: 25,
    total_coins: 156
  });
  const [showNotification, setShowNotification] = useState(false);

  const simulateEarnCoins = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const xpProgress = ((demoUser.total_xp % 100) / 100) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Header */}
      <header className="bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎓</span>
                </div>
                <h1 className="text-xl font-bold">BalancEED</h1>
              </a>
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-full text-sm font-bold">
                🎮 INTERACTIVE DEMO
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <span className="text-xl">🔥</span>
                  <span className="font-bold">{demoUser.current_streak}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xl">⭐</span>
                  <span className="font-bold">{demoUser.total_xp}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xl">🪙</span>
                  <span className="font-bold">{demoUser.total_coins}</span>
                </div>
              </div>
              <a 
                href="/register" 
                className="bg-yellow-400 text-black px-4 py-2 rounded-lg font-semibold hover:bg-yellow-500 transition-colors"
              >
                Start Learning
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { id: 'dashboard', label: '📊 Dashboard', desc: 'Your learning overview' },
              { id: 'courses', label: '📚 Courses', desc: 'Browse & learn' },
              { id: 'ai-content', label: '🤖 AI Magic', desc: 'Personalized content' },
              { id: 'social', label: '👥 Social', desc: 'Study groups' },
              { id: 'prizes', label: '🏆 Prizes', desc: 'Redeem coins' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  currentView === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold">{tab.label}</div>
                  <div className="text-xs">{tab.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Notification */}
      {showNotification && (
        <div className="fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          🎉 +15 coins earned! Great job!
        </div>
      )}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {demoUser.first_name}! 👋
              </h2>
              <p className="text-gray-600">Here's your learning progress and achievements</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Level</p>
                    <p className="text-3xl font-bold">{demoUser.current_level}</p>
                  </div>
                  <div className="text-4xl">🏆</div>
                </div>
                <div className="mt-4">
                  <div className="bg-blue-400 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${xpProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-blue-100 mt-1">50 XP to next level</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">Streak</p>
                    <p className="text-3xl font-bold">{demoUser.current_streak}</p>
                  </div>
                  <div className="text-4xl animate-pulse">🔥</div>
                </div>
                <p className="text-sm text-green-100 mt-4">
                  Longest: {demoUser.longest_streak} days
                </p>
              </div>

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Total XP</p>
                    <p className="text-3xl font-bold">{demoUser.total_xp}</p>
                  </div>
                  <div className="text-4xl">⭐</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Coins</p>
                    <p className="text-3xl font-bold">{demoUser.total_coins}</p>
                  </div>
                  <div className="text-4xl">🪙</div>
                </div>
                <p className="text-sm text-orange-100 mt-4">Ready to spend!</p>
              </div>
            </div>

            {/* Demo Action Buttons */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-8">
              <h3 className="text-xl font-bold mb-4">🎮 Try These Demo Actions</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={simulateEarnCoins}
                  className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200 transform hover:scale-105"
                >
                  📚 Complete a Lesson (+15 coins)
                </button>
                <button 
                  onClick={simulateEarnCoins}
                  className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 transform hover:scale-105"
                >
                  🎯 Pass a Quiz (+25 coins)
                </button>
                <button 
                  onClick={simulateEarnCoins}
                  className="p-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-105"
                >
                  🏆 Unlock Achievement (+50 coins)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other views with simplified content for demo */}
        {currentView === 'courses' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-3xl font-bold mb-4">Course Library</h2>
            <p className="text-gray-600 mb-8">ASVAB prep, Math, Science, Business skills and more!</p>
            <button 
              onClick={simulateEarnCoins}
              className="bg-blue-500 text-white px-8 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Browse Courses
            </button>
          </div>
        )}

        {currentView === 'ai-content' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🤖</div>
            <h2 className="text-3xl font-bold mb-4">AI-Powered Learning</h2>
            <p className="text-gray-600 mb-8">Personalized content generated by Google Gemini AI</p>
            <button 
              onClick={simulateEarnCoins}
              className="bg-purple-500 text-white px-8 py-3 rounded-lg hover:bg-purple-600 transition-colors"
            >
              Generate AI Content
            </button>
          </div>
        )}

        {currentView === 'social' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-3xl font-bold mb-4">Social Learning</h2>
            <p className="text-gray-600 mb-8">Study groups, journals, playlists, and peer interaction</p>
            <button 
              onClick={simulateEarnCoins}
              className="bg-green-500 text-white px-8 py-3 rounded-lg hover:bg-green-600 transition-colors"
            >
              Join Study Group
            </button>
          </div>
        )}

        {currentView === 'prizes' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold mb-4">Prize Store</h2>
            <p className="text-gray-600 mb-8">Redeem coins for homework passes, early dismissal, and more!</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {[
                { name: 'Homework Pass', cost: 50, icon: '📝' },
                { name: 'Early Dismissal', cost: 75, icon: '🚪' },
                { name: 'Amusement Park Ticket', cost: 200, icon: '🎢' }
              ].map((prize, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md p-6">
                  <div className="text-4xl mb-3">{prize.icon}</div>
                  <h3 className="font-bold mb-2">{prize.name}</h3>
                  <div className="text-2xl font-bold text-orange-500 mb-4">{prize.cost} 🪙</div>
                  <button 
                    onClick={() => {
                      if (demoUser.total_coins >= prize.cost) {
                        alert(`🎉 You've redeemed ${prize.name}!`);
                      } else {
                        alert(`You need ${prize.cost - demoUser.total_coins} more coins!`);
                      }
                    }}
                    className={`w-full py-2 rounded-lg font-semibold ${
                      demoUser.total_coins >= prize.cost
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-300 text-gray-500'
                    } transition-colors`}
                  >
                    {demoUser.total_coins >= prize.cost ? 'Redeem' : 'Need More Coins'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-12">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Real Journey? 🚀
          </h3>
          <p className="text-xl text-gray-200 mb-8">
            This was just a taste! Create your account and unlock the full BalancEED experience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/register"
              className="bg-yellow-400 text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-500 transform hover:scale-105 transition-all duration-200 shadow-lg"
            >
              🎓 Create Free Account
            </a>
            <a 
              href="/"
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-900 transition-all duration-200"
            >
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Login Component (simplified for demo)
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">BalancEED</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome Back!</h2>
          <p className="text-gray-600">Continue your learning journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>

          <div className="text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <a href="/register" className="text-blue-600 hover:text-blue-800 font-semibold">
                Sign Up
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

// Register Component (simplified for demo)
const Register = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await register(formData);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-600 via-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">BalancEED</h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Join BalancEED</h2>
          <p className="text-gray-600">Start your learning adventure today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transform hover:scale-105 transition-all duration-200 disabled:opacity-50"
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <a href="/login" className="text-blue-600 hover:text-blue-800 font-semibold">
                Sign In
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;