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
            <button 
              onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}
              className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white hover:text-purple-900 transition-all duration-200"
            >
              🎯 Explore Features
            </button>
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

      {/* Social Features */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Learn Together, <span className="text-green-400">Grow Together</span>
              </h3>
              <p className="text-xl text-gray-300 mb-8">
                Join study groups, share journals, create motivational playlists, 
                and connect with peers on your learning journey. Inspired by social 
                platforms that students actually use.
              </p>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">👥</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">Study Groups</h5>
                    <p className="text-gray-400">Collaborate and learn with classmates</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">📝</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">Personal Journals</h5>
                    <p className="text-gray-400">Reflect on your learning journey</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                    <span className="text-2xl">🎵</span>
                  </div>
                  <div>
                    <h5 className="text-white font-semibold">Focus Playlists</h5>
                    <p className="text-gray-400">Curated music for optimal learning</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="bg-white rounded-xl p-6">
                  <h4 className="text-gray-800 font-bold text-xl mb-4">Study Group: ASVAB Warriors 💪</h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">J</div>
                      <span className="text-gray-700">Just completed Math Module 3! 🎉</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">M</div>
                      <span className="text-gray-700">On a 7-day streak! 🔥</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">S</div>
                      <span className="text-gray-700">Who wants to tackle Science together? 🧬</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Curriculum Preview */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-900 py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Complete <span className="text-yellow-400">Curriculum</span> Coverage
          </h3>
          <p className="text-xl text-gray-300 mb-12 max-w-3xl mx-auto">
            From ASVAB preparation to general education requirements, 
            we've got everything you need to succeed in high school and college.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
            {[
              { icon: "📊", title: "ASVAB Math", color: "from-blue-500 to-cyan-500" },
              { icon: "📚", title: "Reading", color: "from-green-500 to-emerald-500" },
              { icon: "🔬", title: "Science", color: "from-purple-500 to-violet-500" },
              { icon: "⚙️", title: "Mechanical", color: "from-orange-500 to-red-500" },
              { icon: "💼", title: "Business", color: "from-indigo-500 to-blue-500" },
              { icon: "💡", title: "Life Skills", color: "from-pink-500 to-rose-500" }
            ].map((subject, index) => (
              <div key={index} className="group cursor-pointer">
                <div className={`bg-gradient-to-r ${subject.color} rounded-2xl p-6 transform group-hover:scale-110 transition-all duration-300 shadow-lg`}>
                  <div className="text-4xl mb-3">{subject.icon}</div>
                  <h5 className="text-white font-bold">{subject.title}</h5>
                </div>
              </div>
            ))}
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
          
          <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 mb-12">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-yellow-400 mb-2">Free to Start</div>
                <div className="text-gray-300">No credit card required</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">Instant Access</div>
                <div className="text-gray-300">Start learning immediately</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">Real Results</div>
                <div className="text-gray-300">Proven learning outcomes</div>
              </div>
            </div>
          </div>
          
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

// Login Component
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
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

// Register Component
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
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

// Dashboard Component
const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchDashboardData();
    fetchCourses();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await axios.get(`${API}/courses`);
      setCourses(response.data);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const enrollInCourse = async (courseId) => {
    try {
      await axios.post(`${API}/courses/${courseId}/enroll`);
      fetchDashboardData(); // Refresh dashboard
      alert('Successfully enrolled in course!');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to enroll');
    }
  };

  if (loading) return <LoadingSpinner />;

  const currentLevel = dashboardData ? Math.floor(user.total_xp / 100) + 1 : 1;
  const xpForNextLevel = dashboardData ? (currentLevel * 100) - user.total_xp : 100;
  const xpProgress = dashboardData ? ((user.total_xp % 100) / 100) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-lg">🎓</span>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                BalancEED
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <span className="text-2xl">🔥</span>
                  <span className="font-bold text-orange-500">{user.current_streak}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-2xl">⭐</span>
                  <span className="font-bold text-yellow-500">{user.total_xp}</span>
                </div>
              </div>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user.first_name}! 👋
          </h2>
          <p className="text-gray-600">Ready to continue your learning journey?</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100">Level</p>
                <p className="text-3xl font-bold">{currentLevel}</p>
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
              <p className="text-sm text-blue-100 mt-1">{xpForNextLevel} XP to next level</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100">Streak</p>
                <p className="text-3xl font-bold">{user.current_streak}</p>
              </div>
              <div className="text-4xl">🔥</div>
            </div>
            <p className="text-sm text-green-100 mt-4">
              Longest: {user.longest_streak} days
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100">Total XP</p>
                <p className="text-3xl font-bold">{user.total_xp}</p>
              </div>
              <div className="text-4xl">⭐</div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100">Completed</p>
                <p className="text-3xl font-bold">{user.completed_courses.length}</p>
              </div>
              <div className="text-4xl">📚</div>
            </div>
            <p className="text-sm text-orange-100 mt-4">courses completed</p>
          </div>
        </div>

        {/* Continue Learning Section */}
        {dashboardData && dashboardData.enrolled_courses.length > 0 && (
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Continue Learning</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dashboardData.enrolled_courses.map(({ course, progress }) => (
                <div key={course.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-lg text-gray-900">{course.title}</h4>
                    <span className="text-2xl">📖</span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                  
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{Math.round(progress.progress_percentage)}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${progress.progress_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <button className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition-colors">
                    Continue Learning
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Courses */}
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Discover Courses</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                  <span className="text-6xl">📚</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg text-gray-900">{course.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      course.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                      course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {course.difficulty}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>⏱️ {Math.round(course.estimated_duration / 60)} hours</span>
                    <span>⭐ {course.xp_reward} XP</span>
                    <span>👨‍🎓 {course.enrollment_count}</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {course.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  <button
                    onClick={() => enrollInCourse(course.id)}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
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
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;