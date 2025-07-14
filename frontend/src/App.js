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

// Enhanced Landing Page Component
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
          <div className="flex space-x-6">
            <a href="/community" className="text-white hover:text-yellow-300 transition-colors">Community</a>
            <a href="/practice-tests" className="text-white hover:text-yellow-300 transition-colors">Practice Tests</a>
            <a href="/finance" className="text-white hover:text-yellow-300 transition-colors">Finance</a>
            <a href="/music" className="text-white hover:text-yellow-300 transition-colors">Music</a>
            <a href="/login" className="text-white hover:text-yellow-300 transition-colors">Sign In</a>
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
            Your Complete
            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent block">
              Learning Universe
            </span>
          </h2>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed">
            From ASVAB & SAT prep to financial literacy and music mastery. 
            AI-powered, gamified learning with real rewards for high school and college students.
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

          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 max-w-6xl mx-auto">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-yellow-400 mb-2">AI-Powered</div>
              <div className="text-gray-300 text-sm">Smart Content</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-400 mb-2">Test Prep</div>
              <div className="text-gray-300 text-sm">SAT & ASVAB</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-blue-400 mb-2">Financial</div>
              <div className="text-gray-300 text-sm">Literacy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-400 mb-2">Music</div>
              <div className="text-gray-300 text-sm">Theory & Practice</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-pink-400 mb-2">Social</div>
              <div className="text-gray-300 text-sm">Community</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-orange-400 mb-2">Real</div>
              <div className="text-gray-300 text-sm">Prizes</div>
            </div>
          </div>
        </div>

        {/* Floating Elements */}
        <div className="absolute top-20 left-10 text-6xl animate-bounce opacity-20">🎮</div>
        <div className="absolute top-40 right-20 text-5xl animate-pulse opacity-20">⭐</div>
        <div className="absolute bottom-20 left-20 text-4xl animate-spin opacity-20">🏆</div>
      </div>

      {/* Learning Tracks Preview */}
      <div className="bg-black bg-opacity-30 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-4xl md:text-5xl font-bold text-center text-white mb-16">
            Complete <span className="text-yellow-400">Learning Ecosystem</span>
          </h3>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Academic Excellence */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-4xl mb-4">📚</div>
              <h4 className="text-xl font-bold text-white mb-3">Academic Excellence</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• SAT & ASVAB Prep</li>
                <li>• College Exit Exams</li>
                <li>• Core Subjects</li>
                <li>• Language Learning</li>
              </ul>
            </div>

            {/* Financial Mastery */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-4xl mb-4">💰</div>
              <h4 className="text-xl font-bold text-white mb-3">Financial Mastery</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Accounting Basics</li>
                <li>• Stock Market</li>
                <li>• Wealth Building</li>
                <li>• Real Estate</li>
              </ul>
            </div>

            {/* Musical Excellence */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-4xl mb-4">🎵</div>
              <h4 className="text-xl font-bold text-white mb-3">Musical Excellence</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Music Theory</li>
                <li>• Ear Training</li>
                <li>• Instrument Mastery</li>
                <li>• Performance Skills</li>
              </ul>
            </div>

            {/* Community Hub */}
            <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-6 hover:bg-opacity-20 transition-all duration-300 transform hover:scale-105">
              <div className="text-4xl mb-4">👥</div>
              <h4 className="text-xl font-bold text-white mb-3">Community Hub</h4>
              <ul className="text-gray-300 text-sm space-y-1">
                <li>• Student Blogs</li>
                <li>• Teacher Insights</li>
                <li>• Study Groups</li>
                <li>• Newsletters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-4xl md:text-6xl font-bold text-white mb-6">
            Ready to <span className="text-yellow-400">Master</span> Everything?
          </h3>
          <p className="text-xl text-gray-300 mb-12">
            Join the most comprehensive learning platform designed for ambitious students.
          </p>
          
          <a 
            href="/register"
            className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-black px-12 py-6 rounded-2xl font-bold text-xl hover:from-yellow-500 hover:to-orange-600 transform hover:scale-105 transition-all duration-200 shadow-2xl"
          >
            🎓 Begin Your Journey
          </a>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black bg-opacity-50 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎓</span>
                </div>
                <h1 className="text-xl font-bold text-white">BalancEED</h1>
              </div>
              <p className="text-gray-400 text-sm">
                Empowering students through comprehensive, AI-driven learning experiences.
              </p>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">Academic</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/practice-tests" className="hover:text-white">Practice Tests</a></li>
                <li><a href="/subjects" className="hover:text-white">Core Subjects</a></li>
                <li><a href="/languages" className="hover:text-white">Languages</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">Life Skills</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/finance" className="hover:text-white">Financial Literacy</a></li>
                <li><a href="/music" className="hover:text-white">Music Education</a></li>
                <li><a href="/career" className="hover:text-white">Career Prep</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-bold mb-3">Community</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="/community" className="hover:text-white">Blogs & News</a></li>
                <li><a href="/forums" className="hover:text-white">Study Groups</a></li>
                <li><a href="/support" className="hover:text-white">Support</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2025 BalancEED. Empowering the next generation of learners.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Community & Blog Page
const CommunityPage = () => {
  const [activeTab, setActiveTab] = useState('blog');
  const [newPost, setNewPost] = useState({ title: '', content: '', category: 'student' });

  const blogPosts = [
    {
      id: 1,
      title: "How I Aced the ASVAB Math Section Using BalancEED",
      author: "Sarah M.",
      role: "Student",
      date: "2 days ago",
      category: "student",
      excerpt: "My journey from struggling with algebra to scoring 95% on the ASVAB math section...",
      likes: 124,
      comments: 18,
      tags: ["ASVAB", "Math", "Success Story"]
    },
    {
      id: 2,
      title: "Teaching Financial Literacy to Gen Z: A Teacher's Perspective",
      author: "Prof. Johnson",
      role: "Teacher",
      date: "1 week ago",
      category: "teacher",
      excerpt: "Why integrating real-world financial education is crucial for today's students...",
      likes: 89,
      comments: 12,
      tags: ["Finance", "Teaching", "Education"]
    },
    {
      id: 3,
      title: "My Music Theory Breakthrough Moment",
      author: "Alex K.",
      role: "Student",
      date: "3 days ago",
      category: "student",
      excerpt: "How BalancEED's ear training exercises finally made chord progressions click...",
      likes: 67,
      comments: 9,
      tags: ["Music", "Theory", "Breakthrough"]
    }
  ];

  const newsletters = [
    {
      id: 1,
      title: "Weekly Learning Digest",
      date: "January 15, 2025",
      subscribers: "12,450",
      preview: "Top study tips, new practice tests, and student achievements from this week...",
      topics: ["Study Tips", "New Features", "Success Stories"]
    },
    {
      id: 2,
      title: "Finance Focus Newsletter",
      date: "January 10, 2025",
      subscribers: "8,320",
      preview: "Stock market basics, budgeting for students, and scholarship opportunities...",
      topics: ["Investing", "Budgeting", "Scholarships"]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Community Hub</h1>
              <p className="text-indigo-100">Connect, Share, and Learn Together</p>
            </div>
            <a href="/" className="flex items-center space-x-2 hover:opacity-80">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-lg">🎓</span>
              </div>
              <span className="font-bold">BalancEED</span>
            </a>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {[
              { id: 'blog', label: '📝 Blog Posts', count: blogPosts.length },
              { id: 'newsletter', label: '📧 Newsletters', count: newsletters.length },
              { id: 'write', label: '✍️ Write Post', count: null }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} {tab.count && <span className="ml-1 text-sm">({tab.count})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Blog Posts */}
        {activeTab === 'blog' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">Latest Blog Posts</h2>
              <div className="flex space-x-4">
                <select className="border rounded-lg px-3 py-2">
                  <option>All Categories</option>
                  <option>Student Posts</option>
                  <option>Teacher Insights</option>
                </select>
                <select className="border rounded-lg px-3 py-2">
                  <option>Recent</option>
                  <option>Most Liked</option>
                  <option>Most Commented</option>
                </select>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                {blogPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                          post.role === 'Student' ? 'bg-blue-500' : 'bg-green-500'
                        }`}>
                          {post.author.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-semibold">{post.author}</h3>
                          <p className="text-sm text-gray-500">{post.role} • {post.date}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        post.category === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {post.category}
                      </span>
                    </div>
                    
                    <h2 className="text-xl font-bold mb-3 hover:text-indigo-600 cursor-pointer">
                      {post.title}
                    </h2>
                    <p className="text-gray-600 mb-4">{post.excerpt}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.tags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <span>❤️</span>
                          <span>{post.likes}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span>💬</span>
                          <span>{post.comments}</span>
                        </span>
                      </div>
                      <button className="text-indigo-600 hover:text-indigo-800 font-medium">
                        Read More →
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-md p-6">
                  <h3 className="font-bold mb-4">🔥 Trending Topics</h3>
                  <div className="space-y-2">
                    {['ASVAB Math Tips', 'Music Theory Basics', 'Stock Market 101', 'Study Motivation'].map((topic) => (
                      <div key={topic} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm">{topic}</span>
                        <span className="text-xs text-gray-500">24 posts</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white p-6">
                  <h3 className="font-bold mb-3">📊 Community Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Total Posts:</span>
                      <span className="font-bold">1,247</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Active Writers:</span>
                      <span className="font-bold">423</span>
                    </div>
                    <div className="flex justify-between">
                      <span>This Week:</span>
                      <span className="font-bold">89 new posts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Newsletters */}
        {activeTab === 'newsletter' && (
          <div>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold">BalancEED Newsletters</h2>
              <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700">
                Subscribe to All
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {newsletters.map((newsletter) => (
                <div key={newsletter.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold">{newsletter.title}</h3>
                    <span className="text-sm text-gray-500">{newsletter.date}</span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{newsletter.preview}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    {newsletter.topics.map((topic) => (
                      <span key={topic} className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      👥 {newsletter.subscribers} subscribers
                    </span>
                    <div className="space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-800">Read</button>
                      <button className="bg-indigo-600 text-white px-4 py-1 rounded hover:bg-indigo-700">
                        Subscribe
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Newsletter Signup */}
            <div className="mt-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl p-8 text-center">
              <h3 className="text-2xl font-bold text-black mb-4">📧 Stay Updated!</h3>
              <p className="text-black opacity-80 mb-6">Get weekly insights, study tips, and platform updates</p>
              <div className="flex max-w-md mx-auto">
                <input 
                  type="email" 
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-l-lg focus:outline-none"
                />
                <button className="bg-black text-white px-6 py-3 rounded-r-lg hover:bg-gray-800">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Write Post */}
        {activeTab === 'write' && (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-8">✍️ Write a New Post</h2>
            
            <div className="bg-white rounded-xl shadow-md p-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post Category</label>
                  <select 
                    value={newPost.category}
                    onChange={(e) => setNewPost({...newPost, category: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="student">Student Experience</option>
                    <option value="teacher">Teacher Insights</option>
                    <option value="success">Success Story</option>
                    <option value="tips">Study Tips</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Post Title</label>
                  <input 
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                    placeholder="What's your story about?"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea 
                    value={newPost.content}
                    onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                    placeholder="Share your experience, tips, or insights..."
                    rows="12"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>
                
                <div className="flex justify-between">
                  <div className="text-sm text-gray-500">
                    💡 Tip: Add emojis and be authentic to connect with other students!
                  </div>
                  <div className="space-x-3">
                    <button className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                      Save Draft
                    </button>
                    <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                      Publish Post
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Practice Tests Hub
const PracticeTestsPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('sat');

  const testCategories = {
    sat: {
      title: "SAT Practice Tests",
      icon: "📊",
      color: "from-blue-500 to-indigo-600",
      tests: [
        { name: "SAT Math", questions: 58, time: "80 min", difficulty: "Advanced", completed: false },
        { name: "SAT Reading", questions: 52, time: "65 min", difficulty: "Advanced", completed: true },
        { name: "SAT Writing", questions: 44, time: "35 min", difficulty: "Advanced", completed: false },
        { name: "Full SAT Practice", questions: 154, time: "3 hours", difficulty: "Advanced", completed: false }
      ]
    },
    asvab: {
      title: "ASVAB Practice Tests", 
      icon: "🎖️",
      color: "from-green-500 to-emerald-600",
      tests: [
        { name: "Arithmetic Reasoning", questions: 30, time: "36 min", difficulty: "Intermediate", completed: true },
        { name: "Mathematics Knowledge", questions: 25, time: "24 min", difficulty: "Intermediate", completed: false },
        { name: "General Science", questions: 25, time: "11 min", difficulty: "Beginner", completed: false },
        { name: "Complete ASVAB", questions: 225, time: "3 hours", difficulty: "Advanced", completed: false }
      ]
    },
    college: {
      title: "College Exit Exams",
      icon: "🎓",
      color: "from-purple-500 to-pink-600", 
      tests: [
        { name: "College Algebra", questions: 40, time: "90 min", difficulty: "Advanced", completed: false },
        { name: "English Literature", questions: 50, time: "120 min", difficulty: "Advanced", completed: false },
        { name: "African Diaspora Studies", questions: 35, time: "75 min", difficulty: "Intermediate", completed: false },
        { name: "Behavioral Psychology", questions: 45, time: "100 min", difficulty: "Advanced", completed: false }
      ]
    }
  };

  const subjects = [
    { name: "Mathematics", icon: "🔢", courses: 12, color: "bg-blue-500" },
    { name: "Science", icon: "🔬", courses: 8, color: "bg-green-500" },
    { name: "English", icon: "📚", courses: 10, color: "bg-purple-500" },
    { name: "History", icon: "🏛️", courses: 6, color: "bg-orange-500" },
    { name: "Languages", icon: "🌍", courses: 15, color: "bg-pink-500" },
    { name: "Sociology", icon: "👥", courses: 4, color: "bg-indigo-500" }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Practice Test Center</h1>
              <p className="text-blue-100">Master every exam with AI-powered practice</p>
            </div>
            <a href="/" className="flex items-center space-x-2 hover:opacity-80">
              <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                <span className="text-lg">🎓</span>
              </div>
              <span className="font-bold">BalancEED</span>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Test Categories */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Choose Your Test Category</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(testCategories).map(([key, category]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`p-6 rounded-xl text-white transition-all duration-300 transform hover:scale-105 ${
                  selectedCategory === key ? 'scale-105 shadow-lg' : ''
                } bg-gradient-to-r ${category.color}`}
              >
                <div className="text-4xl mb-3">{category.icon}</div>
                <h3 className="text-xl font-bold mb-2">{category.title}</h3>
                <p className="text-sm opacity-90">{category.tests.length} practice tests available</p>
              </button>
            ))}
          </div>
        </div>

        {/* Selected Category Tests */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{testCategories[selectedCategory].title}</h2>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                AI adapts difficulty based on your performance
              </span>
              <div className="flex items-center space-x-1">
                <span className="text-2xl">🤖</span>
                <span className="text-sm font-medium">AI Powered</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {testCategories[selectedCategory].tests.map((test, index) => (
              <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">{test.name}</h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>📝 {test.questions} questions</span>
                      <span>⏱️ {test.time}</span>
                      <span className={`px-2 py-1 rounded ${
                        test.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                        test.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {test.difficulty}
                      </span>
                    </div>
                  </div>
                  {test.completed && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <span>✅</span>
                      <span className="text-sm font-medium">Completed</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {test.completed ? 'Last score: 87%' : 'Not attempted yet'}
                  </div>
                  <div className="space-x-2">
                    {test.completed && (
                      <button className="text-blue-600 hover:text-blue-800">View Results</button>
                    )}
                    <button className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      test.completed 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}>
                      {test.completed ? 'Retake' : 'Start Test'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Areas */}
        <div>
          <h2 className="text-2xl font-bold mb-6">Browse by Subject</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {subjects.map((subject) => (
              <div key={subject.name} className="bg-white rounded-xl shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer">
                <div className={`w-12 h-12 ${subject.color} rounded-lg flex items-center justify-center text-white text-2xl mb-3 mx-auto`}>
                  {subject.icon}
                </div>
                <h3 className="font-bold text-center mb-1">{subject.name}</h3>
                <p className="text-sm text-gray-600 text-center">{subject.courses} courses</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

// Financial Education Hub
const FinancePage = () => {
  const [activeModule, setActiveModule] = useState('basics');
  const [userProgress, setUserProgress] = useState({
    level: 5,
    coins: 240,
    streak: 8,
    completedModules: ['basics', 'budgeting']
  });

  const financeModules = {
    basics: {
      title: "Financial Fundamentals",
      icon: "💰",
      color: "from-green-500 to-emerald-600",
      progress: 100,
      lessons: [
        { name: "Understanding Money", duration: "15 min", xp: 25, completed: true },
        { name: "Banking Basics", duration: "20 min", xp: 30, completed: true },
        { name: "Credit vs Debit", duration: "18 min", xp: 25, completed: true },
        { name: "Financial Goals", duration: "25 min", xp: 35, completed: true }
      ]
    },
    investing: {
      title: "Stock Market & Investing",
      icon: "📈",
      color: "from-blue-500 to-indigo-600", 
      progress: 60,
      lessons: [
        { name: "Stock Market Basics", duration: "30 min", xp: 40, completed: true },
        { name: "Reading Stock Charts", duration: "25 min", xp: 35, completed: true },
        { name: "Portfolio Diversification", duration: "35 min", xp: 45, completed: false },
        { name: "Risk Management", duration: "40 min", xp: 50, completed: false }
      ]
    },
    accounting: {
      title: "Accounting Principles",
      icon: "📊",
      color: "from-purple-500 to-pink-600",
      progress: 30,
      lessons: [
        { name: "Accounting Equation", duration: "20 min", xp: 30, completed: true },
        { name: "Balance Sheets", duration: "35 min", xp: 45, completed: false },
        { name: "Income Statements", duration: "30 min", xp: 40, completed: false },
        { name: "Cash Flow Analysis", duration: "45 min", xp: 55, completed: false }
      ]
    },
    realestate: {
      title: "Real Estate Fundamentals",
      icon: "🏠",
      color: "from-orange-500 to-red-600",
      progress: 0,
      lessons: [
        { name: "Property Types", duration: "25 min", xp: 35, completed: false },
        { name: "Mortgages & Loans", duration: "40 min", xp: 50, completed: false },
        { name: "Investment Properties", duration: "45 min", xp: 55, completed: false },
        { name: "Market Analysis", duration: "35 min", xp: 45, completed: false }
      ]
    }
  };

  const simulateEarnCoins = (amount) => {
    setUserProgress(prev => ({...prev, coins: prev.coins + amount}));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Financial Mastery Hub</h1>
              <p className="text-green-100">Build wealth through knowledge and smart decisions</p>
            </div>
            <div className="text-right">
              <a href="/" className="flex items-center space-x-2 hover:opacity-80 mb-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎓</span>
                </div>
                <span className="font-bold">BalancEED</span>
              </a>
              <div className="flex items-center space-x-4 text-sm">
                <span>Level {userProgress.level}</span>
                <span>🪙 {userProgress.coins}</span>
                <span>🔥 {userProgress.streak} days</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Module Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Financial Learning Tracks</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(financeModules).map(([key, module]) => (
              <button
                key={key}
                onClick={() => setActiveModule(key)}
                className={`p-6 rounded-xl text-white transition-all duration-300 transform hover:scale-105 ${
                  activeModule === key ? 'scale-105 shadow-lg' : ''
                } bg-gradient-to-r ${module.color}`}
              >
                <div className="text-4xl mb-3">{module.icon}</div>
                <h3 className="text-lg font-bold mb-2">{module.title}</h3>
                <div className="bg-white bg-opacity-20 rounded-full h-2 mb-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{ width: `${module.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm opacity-90">{module.progress}% Complete</p>
              </button>
            ))}
          </div>
        </div>

        {/* Active Module Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{financeModules[activeModule].title}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{financeModules[activeModule].icon}</span>
                  <span className="text-sm text-gray-600">
                    {financeModules[activeModule].progress}% Complete
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {financeModules[activeModule].lessons.map((lesson, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    lesson.completed 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          lesson.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {lesson.completed ? '✓' : index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{lesson.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>⏱️ {lesson.duration}</span>
                            <span>⭐ {lesson.xp} XP</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => lesson.completed ? null : simulateEarnCoins(lesson.xp)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          lesson.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {lesson.completed ? 'Completed' : 'Start Lesson'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Demo */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white p-6">
              <h3 className="text-xl font-bold mb-4">🎮 Interactive Financial Simulator</h3>
              <p className="mb-4">Practice real-world financial decisions in our safe environment!</p>
              <div className="grid md:grid-cols-2 gap-4">
                <button 
                  onClick={() => simulateEarnCoins(25)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  📊 Stock Trading Simulator
                </button>
                <button 
                  onClick={() => simulateEarnCoins(20)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  🏠 Real Estate Calculator
                </button>
                <button 
                  onClick={() => simulateEarnCoins(15)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  💰 Budget Planning Tool
                </button>
                <button 
                  onClick={() => simulateEarnCoins(30)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  📈 Investment Portfolio Builder
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold mb-4">💪 Your Financial Journey</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="font-bold">Financial Apprentice {userProgress.level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coins Earned:</span>
                  <span className="font-bold text-yellow-600">🪙 {userProgress.coins}</span>
                </div>
                <div className="flex justify-between">
                  <span>Learning Streak:</span>
                  <span className="font-bold text-orange-500">🔥 {userProgress.streak} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Modules Completed:</span>
                  <span className="font-bold text-green-500">{userProgress.completedModules.length}/4</span>
                </div>
              </div>
            </div>

            {/* Financial News */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold mb-4">📰 Student-Friendly Finance News</h3>
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold">Student Loan Interest Rates Drop</h4>
                  <p className="text-xs text-gray-600">Great news for college-bound students!</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold">Teen Investing Apps Comparison</h4>
                  <p className="text-xs text-gray-600">Best platforms for young investors</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-semibold">Summer Job Financial Tips</h4>
                  <p className="text-xs text-gray-600">Maximize your earning potential</p>
                </div>
              </div>
            </div>

            {/* Achievement Showcase */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl text-black p-6">
              <h3 className="font-bold mb-4">🏆 Recent Achievements</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span>🥇</span>
                  <span className="text-sm">Budget Master</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>📈</span>
                  <span className="text-sm">Stock Market Rookie</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>💰</span>
                  <span className="text-sm">Savings Champion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Music Education Hub
const MusicPage = () => {
  const [activeTrack, setActiveTrack] = useState('theory');
  const [selectedInstrument, setSelectedInstrument] = useState('piano');
  const [userProgress, setUserProgress] = useState({
    level: 8,
    coins: 180,
    streak: 15,
    completedLessons: 24
  });

  const musicTracks = {
    theory: {
      title: "Music Theory Fundamentals",
      icon: "🎼",
      color: "from-purple-500 to-indigo-600",
      progress: 75,
      lessons: [
        { name: "Note Recognition", type: "theory", duration: "20 min", xp: 30, completed: true },
        { name: "Scale Construction", type: "theory", duration: "25 min", xp: 35, completed: true },
        { name: "Chord Progressions", type: "theory", duration: "30 min", xp: 40, completed: false },
        { name: "Key Signatures", type: "theory", duration: "35 min", xp: 45, completed: false }
      ]
    },
    ear: {
      title: "Ear Training & Recognition",
      icon: "👂",
      color: "from-green-500 to-emerald-600",
      progress: 60,
      lessons: [
        { name: "Interval Training", type: "ear", duration: "15 min", xp: 25, completed: true },
        { name: "Chord Recognition", type: "ear", duration: "20 min", xp: 30, completed: true },
        { name: "Melody Dictation", type: "ear", duration: "25 min", xp: 35, completed: false },
        { name: "Rhythm Patterns", type: "ear", duration: "18 min", xp: 25, completed: false }
      ]
    },
    instruments: {
      title: "Instrument Mastery",
      icon: "🎹",
      color: "from-blue-500 to-cyan-600",
      progress: 45,
      lessons: [
        { name: "Beginner Technique", type: "practical", duration: "30 min", xp: 40, completed: true },
        { name: "Scales & Arpeggios", type: "practical", duration: "35 min", xp: 45, completed: false },
        { name: "Repertoire Study", type: "practical", duration: "45 min", xp: 55, completed: false },
        { name: "Performance Skills", type: "practical", duration: "40 min", xp: 50, completed: false }
      ]
    }
  };

  const instruments = {
    piano: {
      name: "Piano",
      icon: "🎹",
      repertoire: ["Bach Inventions", "Chopin Waltzes", "Debussy Arabesques"],
      techniques: ["Scales", "Arpeggios", "Chord Voicings", "Pedaling"]
    },
    voice: {
      name: "Voice",
      icon: "🎤",
      repertoire: ["Art Songs", "Musical Theatre", "Folk Songs"],
      techniques: ["Breathing", "Diction", "Pitch Control", "Vibrato"]
    },
    guitar: {
      name: "Guitar",
      icon: "🎸",
      repertoire: ["Classical Studies", "Folk Songs", "Jazz Standards"],
      techniques: ["Fingerpicking", "Strumming", "Barre Chords", "Scales"]
    },
    violin: {
      name: "Violin",
      icon: "🎻",
      repertoire: ["Suzuki Method", "Etudes", "Solo Pieces"],
      techniques: ["Bowing", "Intonation", "Vibrato", "Shifting"]
    }
  };

  const simulateEarnCoins = (amount) => {
    setUserProgress(prev => ({...prev, coins: prev.coins + amount, completedLessons: prev.completedLessons + 1}));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Musical Excellence Hub</h1>
              <p className="text-purple-100">Master music theory, ear training, and instrument performance</p>
            </div>
            <div className="text-right">
              <a href="/" className="flex items-center space-x-2 hover:opacity-80 mb-2">
                <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎓</span>
                </div>
                <span className="font-bold">BalancEED</span>
              </a>
              <div className="flex items-center space-x-4 text-sm">
                <span>Level {userProgress.level}</span>
                <span>🪙 {userProgress.coins}</span>
                <span>🔥 {userProgress.streak} days</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Learning Track Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Choose Your Musical Journey</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {Object.entries(musicTracks).map(([key, track]) => (
              <button
                key={key}
                onClick={() => setActiveTrack(key)}
                className={`p-6 rounded-xl text-white transition-all duration-300 transform hover:scale-105 ${
                  activeTrack === key ? 'scale-105 shadow-lg' : ''
                } bg-gradient-to-r ${track.color}`}
              >
                <div className="text-4xl mb-3">{track.icon}</div>
                <h3 className="text-xl font-bold mb-2">{track.title}</h3>
                <div className="bg-white bg-opacity-20 rounded-full h-2 mb-2">
                  <div 
                    className="bg-white rounded-full h-2 transition-all duration-300"
                    style={{ width: `${track.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm opacity-90">{track.progress}% Complete</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {/* Active Track Content */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{musicTracks[activeTrack].title}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{musicTracks[activeTrack].icon}</span>
                  <span className="text-sm text-gray-600">
                    {musicTracks[activeTrack].progress}% Complete
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {musicTracks[activeTrack].lessons.map((lesson, index) => (
                  <div key={index} className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                    lesson.completed 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-gray-200 hover:border-purple-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          lesson.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-300 text-gray-600'
                        }`}>
                          {lesson.completed ? '♫' : index + 1}
                        </div>
                        <div>
                          <h3 className="font-semibold">{lesson.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>⏱️ {lesson.duration}</span>
                            <span>⭐ {lesson.xp} XP</span>
                            <span className="capitalize">📝 {lesson.type}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => lesson.completed ? null : simulateEarnCoins(lesson.xp)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          lesson.completed 
                            ? 'bg-green-500 text-white' 
                            : 'bg-purple-500 text-white hover:bg-purple-600'
                        }`}
                      >
                        {lesson.completed ? 'Completed' : 'Start Lesson'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instrument-Specific Section */}
            {activeTrack === 'instruments' && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Select Your Instrument</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {Object.entries(instruments).map(([key, instrument]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedInstrument(key)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedInstrument === key 
                          ? 'border-purple-500 bg-purple-50' 
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="text-3xl mb-2">{instrument.icon}</div>
                      <div className="font-semibold text-sm">{instrument.name}</div>
                    </button>
                  ))}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-bold mb-3">🎵 Suggested Repertoire</h4>
                    <ul className="space-y-2">
                      {instruments[selectedInstrument].repertoire.map((piece, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span className="text-sm">{piece}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold mb-3">🎯 Technique Focus</h4>
                    <ul className="space-y-2">
                      {instruments[selectedInstrument].techniques.map((technique, index) => (
                        <li key={index} className="flex items-center space-x-2">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span className="text-sm">{technique}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Music Tools */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white p-6">
              <h3 className="text-xl font-bold mb-4">🎮 Interactive Music Tools</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <button 
                  onClick={() => simulateEarnCoins(20)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  🎹 Virtual Piano
                </button>
                <button 
                  onClick={() => simulateEarnCoins(15)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  🎵 Metronome
                </button>
                <button 
                  onClick={() => simulateEarnCoins(25)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  👂 Interval Trainer
                </button>
                <button 
                  onClick={() => simulateEarnCoins(30)}
                  className="bg-white bg-opacity-20 p-4 rounded-lg hover:bg-opacity-30 transition-colors"
                >
                  🎼 Staff Practice
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold mb-4">🎵 Your Musical Journey</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Level:</span>
                  <span className="font-bold">Music Student {userProgress.level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coins Earned:</span>
                  <span className="font-bold text-yellow-600">🪙 {userProgress.coins}</span>
                </div>
                <div className="flex justify-between">
                  <span>Practice Streak:</span>
                  <span className="font-bold text-orange-500">🔥 {userProgress.streak} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Lessons Completed:</span>
                  <span className="font-bold text-green-500">{userProgress.completedLessons}</span>
                </div>
              </div>
            </div>

            {/* Daily Practice */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="font-bold mb-4">📅 Today's Practice</h3>
              <div className="space-y-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <h4 className="text-sm font-semibold">🎼 Theory Review</h4>
                  <p className="text-xs text-gray-600">15 minutes • Circle of Fifths</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <h4 className="text-sm font-semibold">👂 Ear Training</h4>
                  <p className="text-xs text-gray-600">10 minutes • Interval recognition</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-semibold">🎹 Practice Session</h4>
                  <p className="text-xs text-gray-600">30 minutes • Scales & repertoire</p>
                </div>
              </div>
            </div>

            {/* Music Achievements */}
            <div className="bg-gradient-to-r from-purple-400 to-pink-500 rounded-xl text-white p-6">
              <h3 className="font-bold mb-4">🏆 Musical Achievements</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span>🎼</span>
                  <span className="text-sm">Theory Master</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>👂</span>
                  <span className="text-sm">Perfect Pitch Pro</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎹</span>
                  <span className="text-sm">Piano Pioneer</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span>🎵</span>
                  <span className="text-sm">Rhythm Rockstar</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Simplified Login and Register components for the expanded app
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
          <p className="text-gray-600">Start your comprehensive learning journey</p>
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

// Enhanced Demo Page
// YouTube Integration Component for Motivational Content
const YouTubeMotivationDemo = ({ simulateEarnCoins }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchMotivationalVideos = async (query) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API}/youtube/search`, {
        query: query || 'study motivation for students',
        max_results: 6,
        category: 'motivation'
      });
      
      setVideos(response.data.videos);
      simulateEarnCoins(10); // Reward for searching motivational content
    } catch (err) {
      setError('Failed to search videos. Please try again.');
      console.error('YouTube search error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load default motivational videos on component mount
    searchMotivationalVideos('study motivation productivity tips');
  }, []);

  return (
    <div className="text-center py-20">
      <div className="text-6xl mb-4">🎬</div>
      <h2 className="text-3xl font-bold mb-4">Motivational Content Hub</h2>
      <p className="text-gray-600 mb-8">Discover inspiring videos to fuel your learning journey</p>
      
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for motivational content..."
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyPress={(e) => e.key === 'Enter' && searchMotivationalVideos(searchQuery)}
          />
          <button
            onClick={() => searchMotivationalVideos(searchQuery)}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? '🔄' : '🔍'} Search
          </button>
        </div>
      </div>

      {/* Quick Search Categories */}
      <div className="flex flex-wrap justify-center gap-3 mb-8">
        {['Study Motivation', 'Success Stories', 'Productivity Tips', 'Focus Music', 'Goal Setting'].map((category) => (
          <button
            key={category}
            onClick={() => searchMotivationalVideos(category)}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors"
          >
            {category}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🔄</div>
          <p className="text-gray-600">Searching for motivational content...</p>
        </div>
      )}

      {/* Videos Grid */}
      {videos.length > 0 && !loading && (
        <div className="max-w-6xl mx-auto">
          <h3 className="text-xl font-bold mb-6 text-gray-800">
            🎯 Found {videos.length} motivational videos for you!
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <div key={video.id} className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative pb-56">
                  <iframe
                    src={video.embed_url}
                    title={video.title}
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allowFullScreen
                  />
                </div>
                <div className="p-4">
                  <h4 className="font-bold text-sm mb-2 line-clamp-2">{video.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">by {video.channel}</p>
                  <p className="text-xs text-gray-500 line-clamp-2">{video.description}</p>
                  <div className="mt-3 flex justify-between items-center">
                    <a 
                      href={video.watch_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 text-xs font-medium"
                    >
                      Watch on YouTube →
                    </a>
                    <button
                      onClick={() => simulateEarnCoins(5)}
                      className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600 transition-colors"
                    >
                      +5 XP Watched
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Default message when no videos */}
      {videos.length === 0 && !loading && !error && (
        <div className="text-center py-8">
          <div className="text-4xl mb-4">🎯</div>
          <p className="text-gray-600">Search for motivational content to get started!</p>
        </div>
      )}
    </div>
  );
};

// AI Recommendations Component
const AIRecommendationsDemo = ({ simulateEarnCoins }) => {
  const [recommendations, setRecommendations] = useState(null);
  const [learningPath, setLearningPath] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [selectedSubject, setSelectedSubject] = useState('computer_science');

  const getPersonalizedRecommendations = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/personalized-recommendations`);
      setRecommendations(response.data);
      simulateEarnCoins(15); // Reward for using AI recommendations
    } catch (err) {
      console.error('AI recommendations error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateLearningPath = async (subject) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ai/adaptive-learning-path?subject_area=${subject}`);
      setLearningPath(response.data);
      simulateEarnCoins(20); // Reward for generating learning path
    } catch (err) {
      console.error('Learning path error:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseRecommendations = (content) => {
    const sections = {};
    const lines = content.split('\n');
    let currentSection = '';
    
    lines.forEach(line => {
      if (line.includes('NEXT_LESSONS:') || line.includes('DIFFICULTY_ADJUSTMENT:') || 
          line.includes('STUDY_SCHEDULE:') || line.includes('MOTIVATION_TIPS:') ||
          line.includes('SKILL_GAPS:') || line.includes('LEARNING_PATH:')) {
        currentSection = line.split(':')[0].trim();
        sections[currentSection] = [];
      } else if (currentSection && line.trim()) {
        sections[currentSection].push(line.trim());
      }
    });
    
    return sections;
  };

  return (
    <div className="py-20">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🤖</div>
        <h2 className="text-3xl font-bold mb-4">AI-Powered Learning Magic</h2>
        <p className="text-gray-600 mb-8">Get personalized recommendations and adaptive learning paths</p>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex justify-center space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'recommendations' 
                ? 'bg-white text-blue-600 shadow' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🎯 Personal Recommendations
          </button>
          <button
            onClick={() => setActiveTab('learning-path')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              activeTab === 'learning-path' 
                ? 'bg-white text-blue-600 shadow' 
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            🗺️ Adaptive Learning Path
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="text-center">
            <button
              onClick={getPersonalizedRecommendations}
              disabled={loading}
              className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 disabled:opacity-50 mb-8"
            >
              {loading ? '🔄 Analyzing...' : '✨ Get AI Recommendations'}
            </button>

            {recommendations && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-left">
                <h3 className="text-2xl font-bold mb-6 text-center">🎯 Your Personalized Learning Plan</h3>
                
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-bold text-blue-800 mb-2">📊 Your Stats</h4>
                    <div className="space-y-1 text-sm">
                      <p>Completed Lessons: {recommendations.user_stats.completed_lessons}</p>
                      <p>Average Score: {recommendations.user_stats.avg_score.toFixed(1)}%</p>
                      <p>Total XP: {recommendations.user_stats.total_xp}</p>
                      <p>Preferred Subjects: {recommendations.user_stats.preferred_subjects.join(', ') || 'Exploring'}</p>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-bold text-green-800 mb-2">🎯 Recommendation Quality</h4>
                    <div className="text-sm">
                      <p>Generated: {new Date(recommendations.generated_at).toLocaleDateString()}</p>
                      <p>Based on your learning patterns and performance</p>
                      <p>Personalized for optimal progress</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-bold mb-4">🤖 AI Recommendations:</h4>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded border">
                      {recommendations.recommendations}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Learning Path Tab */}
        {activeTab === 'learning-path' && (
          <div className="text-center">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Choose Subject Area:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="computer_science">💻 Computer Science</option>
                <option value="general_math">🔢 Mathematics</option>
                <option value="english">📚 English Literature</option>
                <option value="science">🔬 Science</option>
                <option value="history">📜 History</option>
              </select>
            </div>
            
            <button
              onClick={() => generateLearningPath(selectedSubject)}
              disabled={loading}
              className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-teal-600 transition-all duration-200 disabled:opacity-50 mb-8"
            >
              {loading ? '🔄 Creating Path...' : '🗺️ Generate Learning Path'}
            </button>

            {learningPath && (
              <div className="bg-white rounded-xl shadow-lg p-8 text-left">
                <h3 className="text-2xl font-bold mb-6 text-center">
                  🗺️ Your {selectedSubject.replace('_', ' ').toUpperCase()} Learning Path
                </h3>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-purple-50 p-4 rounded-lg text-center">
                    <h4 className="font-bold text-purple-800">📈 Subject</h4>
                    <p className="text-sm">{learningPath.subject_area.replace('_', ' ')}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg text-center">
                    <h4 className="font-bold text-blue-800">🎯 Competency</h4>
                    <p className="text-sm">{learningPath.current_competency.toFixed(1)}%</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <h4 className="font-bold text-green-800">⏱️ Generated</h4>
                    <p className="text-sm">Just now</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-6 rounded-lg">
                  <h4 className="font-bold mb-4">🤖 AI-Generated Learning Path:</h4>
                  <div className="prose prose-sm max-w-none">
                    <pre className="whitespace-pre-wrap text-sm bg-white p-4 rounded border max-h-96 overflow-y-auto">
                      {learningPath.learning_path}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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
          <div className="flex space-x-6 overflow-x-auto">
            {[
              { id: 'dashboard', label: '📊 Dashboard', desc: 'Learning overview' },
              { id: 'academics', label: '📚 Academics', desc: 'SAT & ASVAB prep' },
              { id: 'finance', label: '💰 Finance', desc: 'Money mastery' },
              { id: 'music', label: '🎵 Music', desc: 'Musical excellence' },
              { id: 'community', label: '👥 Community', desc: 'Social learning' }
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
        {currentView === 'dashboard' && (
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, {demoUser.first_name}! 👋
              </h2>
              <p className="text-gray-600">Your complete learning universe awaits</p>
            </div>

            {/* Enhanced Stats Cards */}
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

            {/* Learning Tracks Overview */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Academic Excellence", icon: "📚", progress: 75, color: "from-blue-500 to-indigo-600" },
                { title: "Financial Mastery", icon: "💰", progress: 60, color: "from-green-500 to-emerald-600" },
                { title: "Musical Excellence", icon: "🎵", progress: 45, color: "from-purple-500 to-pink-600" },
                { title: "Community Engagement", icon: "👥", progress: 80, color: "from-orange-500 to-red-600" }
              ].map((track, index) => (
                <div key={index} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className={`w-16 h-16 bg-gradient-to-r ${track.color} rounded-xl flex items-center justify-center text-white text-2xl mb-4 mx-auto`}>
                    {track.icon}
                  </div>
                  <h3 className="font-bold text-center mb-2">{track.title}</h3>
                  <div className="bg-gray-200 rounded-full h-2 mb-2">
                    <div 
                      className={`bg-gradient-to-r ${track.color} rounded-full h-2 transition-all duration-300`}
                      style={{ width: `${track.progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">{track.progress}% Complete</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Other demo views with enhanced content */}
        {currentView === 'academics' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-3xl font-bold mb-4">Academic Excellence Hub</h2>
            <p className="text-gray-600 mb-8">SAT, ASVAB, college prep, and comprehensive subject mastery</p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <button onClick={simulateEarnCoins} className="bg-blue-500 text-white p-6 rounded-xl hover:bg-blue-600 transition-colors">
                📊 SAT Practice Tests
              </button>
              <button onClick={simulateEarnCoins} className="bg-green-500 text-white p-6 rounded-xl hover:bg-green-600 transition-colors">
                🎖️ ASVAB Preparation
              </button>
              <button onClick={simulateEarnCoins} className="bg-purple-500 text-white p-6 rounded-xl hover:bg-purple-600 transition-colors">
                🎓 College Exit Exams
              </button>
            </div>
          </div>
        )}

        {currentView === 'finance' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">💰</div>
            <h2 className="text-3xl font-bold mb-4">Financial Mastery Hub</h2>
            <p className="text-gray-600 mb-8">Build wealth through accounting, investing, and real estate knowledge</p>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button onClick={simulateEarnCoins} className="bg-green-500 text-white p-6 rounded-xl hover:bg-green-600 transition-colors">
                📊 Accounting Basics
              </button>
              <button onClick={simulateEarnCoins} className="bg-blue-500 text-white p-6 rounded-xl hover:bg-blue-600 transition-colors">
                📈 Stock Market
              </button>
              <button onClick={simulateEarnCoins} className="bg-purple-500 text-white p-6 rounded-xl hover:bg-purple-600 transition-colors">
                🏠 Real Estate
              </button>
              <button onClick={simulateEarnCoins} className="bg-orange-500 text-white p-6 rounded-xl hover:bg-orange-600 transition-colors">
                💎 Wealth Building
              </button>
            </div>
          </div>
        )}

        {currentView === 'music' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🎵</div>
            <h2 className="text-3xl font-bold mb-4">Musical Excellence Hub</h2>
            <p className="text-gray-600 mb-8">Master music theory, ear training, and instrument performance</p>
            <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <button onClick={simulateEarnCoins} className="bg-purple-500 text-white p-6 rounded-xl hover:bg-purple-600 transition-colors">
                🎼 Music Theory
              </button>
              <button onClick={simulateEarnCoins} className="bg-green-500 text-white p-6 rounded-xl hover:bg-green-600 transition-colors">
                👂 Ear Training
              </button>
              <button onClick={simulateEarnCoins} className="bg-blue-500 text-white p-6 rounded-xl hover:bg-blue-600 transition-colors">
                🎹 Instruments
              </button>
            </div>
          </div>
        )}

        {currentView === 'community' && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">👥</div>
            <h2 className="text-3xl font-bold mb-4">Community Hub</h2>
            <p className="text-gray-600 mb-8">Connect with peers, share knowledge, and grow together</p>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button onClick={simulateEarnCoins} className="bg-indigo-500 text-white p-6 rounded-xl hover:bg-indigo-600 transition-colors">
                📝 Student Blogs
              </button>
              <button onClick={simulateEarnCoins} className="bg-green-500 text-white p-6 rounded-xl hover:bg-green-600 transition-colors">
                📧 Newsletters
              </button>
              <button onClick={simulateEarnCoins} className="bg-purple-500 text-white p-6 rounded-xl hover:bg-purple-600 transition-colors">
                👥 Study Groups
              </button>
              <button onClick={simulateEarnCoins} className="bg-orange-500 text-white p-6 rounded-xl hover:bg-orange-600 transition-colors">
                🎵 Music Playlists
              </button>
            </div>
          </div>
        )}

        {/* AI Magic View - NEW */}
        {currentView === 'ai_magic' && <AIRecommendationsDemo simulateEarnCoins={simulateEarnCoins} />}

        {/* Social View - NEW */}
        {currentView === 'social' && <YouTubeMotivationDemo simulateEarnCoins={simulateEarnCoins} />}
      </main>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 py-12">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready for Your Complete Learning Journey? 🚀
          </h3>
          <p className="text-xl text-gray-200 mb-8">
            Experience the full BalancEED universe - academics, finance, music, and community!
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

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/demo" element={<DemoPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/practice-tests" element={<PracticeTestsPage />} />
            <Route path="/finance" element={<FinancePage />} />
            <Route path="/music" element={<MusicPage />} />
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