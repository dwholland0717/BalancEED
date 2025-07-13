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

// Demo Page Component
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
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showNotification, setShowNotification] = useState(false);

  // Demo data
  const demoCourses = [
    {
      id: '1',
      title: 'ASVAB Math Mastery',
      description: 'Master arithmetic reasoning and mathematics knowledge for ASVAB success',
      difficulty: 'intermediate',
      progress: 73,
      xp_reward: 200,
      lessons: 8,
      completed: 6,
      icon: '📊'
    },
    {
      id: '2',
      title: 'Science & Technology',
      description: 'Physics, chemistry, and general science for high school and ASVAB',
      difficulty: 'beginner',
      progress: 45,
      xp_reward: 150,
      lessons: 6,
      completed: 3,
      icon: '🔬'
    },
    {
      id: '3',
      title: 'Business & Leadership',
      description: 'Essential business skills and leadership development',
      difficulty: 'advanced',
      progress: 28,
      xp_reward: 250,
      lessons: 10,
      completed: 3,
      icon: '💼'
    }
  ];

  const demoStudyGroup = {
    name: 'ASVAB Warriors 💪',
    members: [
      { name: 'Jordan M.', avatar: 'J', status: 'Just completed Math Module 3! 🎉', color: 'bg-blue-500' },
      { name: 'Maya S.', avatar: 'M', status: 'On a 7-day streak! 🔥', color: 'bg-green-500' },
      { name: 'Sam P.', avatar: 'S', status: 'Who wants to tackle Science together? 🧬', color: 'bg-purple-500' },
      { name: 'Riley K.', avatar: 'R', status: 'Just earned 50 coins! 💰', color: 'bg-orange-500' }
    ]
  };

  const demoPrizes = [
    { name: 'Homework Pass', cost: 50, icon: '📝', color: 'bg-green-500' },
    { name: 'Early Dismissal', cost: 75, icon: '🚪', color: 'bg-blue-500' },
    { name: 'Premium Lunch', cost: 25, icon: '🍕', color: 'bg-orange-500' },
    { name: 'Study Break Pass', cost: 30, icon: '☕', color: 'bg-purple-500' },
    { name: 'Amusement Park Ticket', cost: 200, icon: '🎢', color: 'bg-red-500' },
    { name: 'Movie Ticket', cost: 40, icon: '🎬', color: 'bg-indigo-500' }
  ];

  const simulateEarnCoins = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const xpProgress = ((demoUser.total_xp % 100) / 100) * 100;
  const xpForNextLevel = 100 - (demoUser.total_xp % 100);

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
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: '📊 Dashboard', desc: 'Your learning overview' },
              { id: 'courses', label: '📚 Courses', desc: 'Browse & enroll' },
              { id: 'ai-content', label: '🤖 AI Content', desc: 'Personalized lessons' },
              { id: 'social', label: '👥 Social', desc: 'Study groups & friends' },
              { id: 'prizes', label: '🏆 Prize Store', desc: 'Redeem your coins' },
              { id: 'journal', label: '📝 Journal', desc: 'Track your journey' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
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
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform">
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
                  <p className="text-sm text-blue-100 mt-1">{xpForNextLevel} XP to next level</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform">
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

              <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Total XP</p>
                    <p className="text-3xl font-bold">{demoUser.total_xp}</p>
                  </div>
                  <div className="text-4xl">⭐</div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white transform hover:scale-105 transition-transform">
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

            {/* Progress Overview */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">📈 Learning Progress</h3>
                <div className="space-y-4">
                  {demoCourses.map((course) => (
                    <div key={course.id} className="flex items-center space-x-4">
                      <div className="text-2xl">{course.icon}</div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <h4 className="font-semibold">{course.title}</h4>
                          <span className="text-sm text-gray-500">{course.progress}%</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                            style={{ width: `${course.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">🎯 Recent Achievements</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
                    <span className="text-2xl">🏅</span>
                    <div>
                      <p className="font-semibold">Math Master</p>
                      <p className="text-sm text-gray-600">Completed 5 math lessons in a row</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                    <span className="text-2xl">🔥</span>
                    <div>
                      <p className="font-semibold">Streak Warrior</p>
                      <p className="text-sm text-gray-600">Maintained 12-day learning streak</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <span className="text-2xl">🚀</span>
                    <div>
                      <p className="font-semibold">Level Up!</p>
                      <p className="text-sm text-gray-600">Reached Level 25</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Courses View */}
        {currentView === 'courses' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📚 Your Courses</h2>
              <p className="text-gray-600">Continue learning or explore new subjects</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {demoCourses.map((course) => (
                <div key={course.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                     onClick={() => setSelectedCourse(course)}>
                  <div className="h-48 bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                    <span className="text-6xl">{course.icon}</span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg text-gray-900">{course.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        course.difficulty === 'beginner' ? 'bg-green-100 text-green-800' :
                        course.difficulty === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {course.difficulty}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{course.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-3 transition-all duration-300"
                          style={{ width: `${course.progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>📖 {course.completed}/{course.lessons} lessons</span>
                      <span>⭐ {course.xp_reward} XP</span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        simulateEarnCoins();
                      }}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                    >
                      Continue Learning
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Course Detail Modal */}
            {selectedCourse && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="text-4xl">{selectedCourse.icon}</span>
                        <div>
                          <h3 className="text-2xl font-bold">{selectedCourse.title}</h3>
                          <p className="text-gray-600">{selectedCourse.description}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setSelectedCourse(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Course Progress</span>
                        <span>{selectedCourse.progress}%</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-full h-3"
                          style={{ width: `${selectedCourse.progress}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {Array.from({ length: selectedCourse.lessons }, (_, i) => (
                        <div key={i} className={`flex items-center space-x-3 p-3 rounded-lg ${
                          i < selectedCourse.completed ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                        }`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            i < selectedCourse.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                          }`}>
                            {i < selectedCourse.completed ? '✓' : i + 1}
                          </div>
                          <div>
                            <p className="font-medium">Lesson {i + 1}: Module Topic {i + 1}</p>
                            <p className="text-sm text-gray-600">
                              {i < selectedCourse.completed ? 'Completed ✓' : 'Not started'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-4">
                      <button 
                        onClick={() => {
                          simulateEarnCoins();
                          setSelectedCourse(null);
                        }}
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
                      >
                        Continue Learning
                      </button>
                      <button 
                        onClick={() => setSelectedCourse(null)}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Content View */}
        {currentView === 'ai-content' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">🤖 AI-Powered Learning</h2>
              <p className="text-gray-600">Personalized content generated just for you using Google Gemini AI</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🧠</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Smart Content Generation</h3>
                      <p className="text-gray-600">AI creates lessons based on your learning style</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 mb-2"><strong>Latest AI Lesson:</strong></p>
                    <p className="text-gray-600">"Mastering Algebraic Expressions: A personalized approach based on your visual learning preference and current progress in ASVAB math preparation."</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-2xl">❓</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Adaptive Assessments</h3>
                      <p className="text-gray-600">AI generates questions that match your skill level</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3">
                      <p className="font-medium mb-2">Sample AI-Generated Question:</p>
                      <p className="text-gray-700 mb-2">"If a car travels 240 miles in 4 hours, what is its average speed?"</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <button className="p-2 bg-blue-50 rounded hover:bg-blue-100">A) 60 mph</button>
                        <button className="p-2 bg-blue-50 rounded hover:bg-blue-100">B) 50 mph</button>
                        <button className="p-2 bg-blue-50 rounded hover:bg-blue-100">C) 70 mph</button>
                        <button className="p-2 bg-blue-50 rounded hover:bg-blue-100">D) 80 mph</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">🎯 Your AI Learning Profile</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Learning Style:</span>
                      <span className="font-semibold">Visual + Interactive</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Preferred Difficulty:</span>
                      <span className="font-semibold">Progressive Challenge</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Best Study Time:</span>
                      <span className="font-semibold">Afternoon</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Content Focus:</span>
                      <span className="font-semibold">ASVAB Math & Science</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">⚡ Quick AI Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-200"
                    >
                      🧪 Generate Science Quiz
                    </button>
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full p-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg hover:from-blue-600 hover:to-indigo-600 transition-all duration-200"
                    >
                      📊 Create Math Practice
                    </button>
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full p-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-200"
                    >
                      📚 Personalized Study Plan
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Social View */}
        {currentView === 'social' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">👥 Social Learning</h2>
              <p className="text-gray-600">Connect with classmates and learn together</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                  <h3 className="text-xl font-bold mb-4">💬 Study Group Activity</h3>
                  <div className="space-y-4">
                    {demoStudyGroup.members.map((member, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`w-10 h-10 ${member.color} rounded-full flex items-center justify-center text-white font-bold`}>
                          {member.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-semibold">{member.name}</span>
                            <span className="text-xs text-gray-500">2 min ago</span>
                          </div>
                          <p className="text-gray-700">{member.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <input 
                      type="text" 
                      placeholder="Share your progress or ask a question..."
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button 
                      onClick={simulateEarnCoins}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Send
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">🎵 Focus Playlists</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { name: 'Deep Focus', genre: 'Lo-fi Hip Hop', tracks: 45, icon: '🎧' },
                      { name: 'Study Motivation', genre: 'Upbeat Instrumental', tracks: 32, icon: '🚀' },
                      { name: 'Math Master Mix', genre: 'Classical Focus', tracks: 28, icon: '🎼' },
                      { name: 'Science Vibes', genre: 'Ambient Electronic', tracks: 38, icon: '⚗️' }
                    ].map((playlist, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg hover:from-purple-200 hover:to-pink-200 transition-all cursor-pointer">
                        <div className="text-2xl mb-2">{playlist.icon}</div>
                        <h4 className="font-semibold">{playlist.name}</h4>
                        <p className="text-sm text-gray-600">{playlist.genre}</p>
                        <p className="text-xs text-gray-500">{playlist.tracks} tracks</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">🏆 Group Leaderboard</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Maya S.', xp: 3240, position: 1, avatar: 'M', color: 'bg-yellow-500' },
                      { name: 'Alex D.', xp: 2450, position: 2, avatar: 'A', color: 'bg-gray-400' },
                      { name: 'Jordan M.', xp: 2180, position: 3, avatar: 'J', color: 'bg-orange-500' },
                      { name: 'Sam P.', xp: 1960, position: 4, avatar: 'S', color: 'bg-blue-500' }
                    ].map((student, index) => (
                      <div key={index} className="flex items-center space-x-3">
                        <div className="text-lg font-bold w-6">{student.position}</div>
                        <div className={`w-8 h-8 ${student.color} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                          {student.avatar}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{student.name}</p>
                          <p className="text-sm text-gray-600">{student.xp} XP</p>
                        </div>
                        {student.position <= 3 && (
                          <span className="text-xl">
                            {student.position === 1 ? '🥇' : student.position === 2 ? '🥈' : '🥉'}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">📱 Quick Actions</h3>
                  <div className="space-y-3">
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-left"
                    >
                      👥 Join New Study Group
                    </button>
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-left"
                    >
                      📝 Update Journal Entry
                    </button>
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full p-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-left"
                    >
                      🎵 Create New Playlist
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Prize Store View */}
        {currentView === 'prizes' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">🏆 Prize Store</h2>
              <p className="text-gray-600">Redeem your hard-earned coins for amazing rewards!</p>
              <div className="mt-4 inline-flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-lg">
                <span className="text-2xl">🪙</span>
                <span className="font-bold text-yellow-800">{demoUser.total_coins} coins available</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demoPrizes.map((prize, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow">
                  <div className={`h-32 ${prize.color} flex items-center justify-center`}>
                    <span className="text-5xl">{prize.icon}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-2">{prize.name}</h3>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl font-bold text-gray-900">{prize.cost}</span>
                      <span className="text-yellow-600">🪙</span>
                    </div>
                    <button
                      onClick={() => {
                        if (demoUser.total_coins >= prize.cost) {
                          simulateEarnCoins();
                          alert(`🎉 You've successfully redeemed ${prize.name}! Check with your instructor to claim it.`);
                        } else {
                          alert(`You need ${prize.cost - demoUser.total_coins} more coins to redeem this prize!`);
                        }
                      }}
                      className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                        demoUser.total_coins >= prize.cost
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {demoUser.total_coins >= prize.cost ? 'Redeem Now' : 'Not Enough Coins'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">💰 How to Earn More Coins</h3>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-3xl mb-2">📚</div>
                    <p className="font-semibold">Complete Lessons</p>
                    <p className="text-sm opacity-80">5-15 coins per lesson</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🎯</div>
                    <p className="font-semibold">Pass Quizzes</p>
                    <p className="text-sm opacity-80">10-25 coins per quiz</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🔥</div>
                    <p className="font-semibold">Daily Streaks</p>
                    <p className="text-sm opacity-80">Bonus coins for consistency</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-2">🏆</div>
                    <p className="font-semibold">Achievements</p>
                    <p className="text-sm opacity-80">Special milestone rewards</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Journal View */}
        {currentView === 'journal' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">📝 Learning Journal</h2>
              <p className="text-gray-600">Reflect on your learning journey and track your growth</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                  <h3 className="text-xl font-bold mb-4">✍️ Today's Reflection</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">How did your study session go?</label>
                      <div className="flex space-x-2">
                        {['😫', '😐', '🙂', '😊', '🤩'].map((emoji, index) => (
                          <button key={index} className="text-3xl hover:scale-110 transition-transform">
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">What did you learn today?</label>
                      <textarea 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows="3"
                        placeholder="Today I learned about algebraic expressions and how to solve basic equations. The AI-generated examples really helped me understand the concepts better..."
                      ></textarea>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Goals for tomorrow</label>
                      <input 
                        type="text" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Complete Science Module 4, practice more math problems..."
                      />
                    </div>
                    
                    <button 
                      onClick={simulateEarnCoins}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-semibold"
                    >
                      💾 Save Entry (+5 coins)
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">📊 Learning Insights</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">87%</div>
                      <p className="text-sm text-gray-600">Average Quiz Score</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">4.2h</div>
                      <p className="text-sm text-gray-600">Study Time This Week</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">15</div>
                      <p className="text-sm text-gray-600">Lessons Completed</p>
                    </div>
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">3</div>
                      <p className="text-sm text-gray-600">Subjects Mastered</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="text-xl font-bold mb-4">📈 Recent Entries</h3>
                  <div className="space-y-4">
                    {[
                      { date: 'Yesterday', mood: '😊', title: 'Great progress on ASVAB math!' },
                      { date: '2 days ago', mood: '🤩', title: 'Aced the science quiz!' },
                      { date: '3 days ago', mood: '🙂', title: 'Learning about physics was fun' },
                      { date: '4 days ago', mood: '😐', title: 'Struggled with algebra today' }
                    ].map((entry, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-2xl">{entry.mood}</span>
                        <div>
                          <p className="font-semibold text-sm">{entry.title}</p>
                          <p className="text-xs text-gray-500">{entry.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-4">🎯 Weekly Goals</h3>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" checked className="rounded" readOnly />
                      <span className="line-through">Complete 5 math lessons</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" checked className="rounded" readOnly />
                      <span className="line-through">Maintain daily streak</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded" />
                      <span>Finish Science Module 4</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <input type="checkbox" className="rounded" />
                      <span>Earn 50 coins</span>
                    </div>
                  </div>
                </div>
              </div>
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