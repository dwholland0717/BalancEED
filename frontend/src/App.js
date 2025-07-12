import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on component mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        console.log('🔄 Restored authentication from localStorage');
      } catch (error) {
        console.error('❌ Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Update axios headers when token changes
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const login = async (email, password) => {
    try {
      console.log('🔐 Attempting login with:', email);
      const response = await axios.post(`${API}/auth/login`, { email, password });
      console.log('✅ Login response:', response.data);
      
      const { access_token, user: userData } = response.data;
      
      if (access_token && userData) {
        console.log('🔑 Setting token and user data');
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        setToken(access_token);
        setUser(userData);
        console.log('✅ Authentication successful');
        return { success: true };
      } else {
        console.error('❌ Missing token or user data in response');
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const register = async (userData) => {
    try {
      console.log('📝 Attempting registration');
      const response = await axios.post(`${API}/auth/register`, userData);
      console.log('✅ Registration response:', response.data);
      
      const { access_token, user: newUser } = response.data;
      
      if (access_token && newUser) {
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(newUser));
        setToken(access_token);
        setUser(newUser);
        return { success: true };
      } else {
        return { success: false, error: 'Invalid response from server' };
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      return { success: false, error: error.response?.data?.detail || 'Registration failed' };
    }
  };

  const setupDemo = async () => {
    try {
      console.log('🎭 Setting up demo data');
      
      // First cleanup any existing demo data
      try {
        await axios.post(`${API}/demo/cleanup`);
        console.log('✅ Demo cleanup completed');
      } catch (cleanupError) {
        console.log('ℹ️ Cleanup skipped, proceeding with setup');
      }
      
      // Setup fresh demo data
      const setupResponse = await axios.post(`${API}/demo/setup`);
      console.log('✅ Demo setup response:', setupResponse.data);
      
      // Auto-login with demo credentials
      console.log('🔐 Attempting demo login');
      const loginResult = await login('student@demo.com', 'demo123');
      
      if (loginResult.success) {
        console.log('✅ Demo login successful');
        return { success: true };
      } else {
        console.error('❌ Demo login failed:', loginResult.error);
        return { success: false, error: loginResult.error };
      }
    } catch (error) {
      console.error('❌ Demo setup error:', error);
      return { success: false, error: 'Demo setup failed: ' + (error.response?.data?.detail || error.message) };
    }
  };

  const logout = () => {
    console.log('🚪 Logging out');
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, setupDemo }}>
      {children}
    </AuthContext.Provider>
  );
};

// Components
const Navigation = ({ showBack, onBack }) => {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {showBack && (
                <button
                  onClick={onBack}
                  className="mr-4 text-white hover:text-blue-200 transition-colors"
                >
                  ← Back
                </button>
              )}
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold">BalancEDD</h1>
                <p className="text-xs opacity-75">Youth Development Platform</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <Link to="/" className="text-2xl font-bold hover:text-blue-200">BalancEDD</Link>
            </div>
            <div className="hidden md:flex space-x-6">
              <Link to="/brain-training" className="hover:text-blue-200">🧠 Brain Training</Link>
              <Link to="/trade-learning" className="hover:text-blue-200">🔧 Trade Learning</Link>
              <Link to="/chat-rooms" className="hover:text-blue-200">💬 Study Groups</Link>
              <Link to="/donate" className="hover:text-blue-200">💝 Donate</Link>
              <Link to="/contact" className="hover:text-blue-200">📞 Contact</Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, {user?.name}</span>
            <div className="text-xs">
              <div>🧠 Level {user?.brain_training_level || 1}</div>
              <div>🏆 {user?.certification_progress || 0}% Certified</div>
            </div>
            <button
              onClick={logout}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1 rounded text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Brain Training Components
const BrainTrainingExercise = ({ exercise, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userAnswers, setUserAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(exercise.time_limit || 60);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (timeLeft > 0 && !isCompleted) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleComplete();
    }
  }, [timeLeft, isCompleted]);

  const handleAnswer = (answer) => {
    const newAnswers = [...userAnswers, answer];
    setUserAnswers(newAnswers);

    if (exercise.exercise_type === "multiple_choice") {
      const questions = exercise.content.questions || exercise.content.problems;
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else {
        handleComplete(newAnswers);
      }
    }
  };

  const handleComplete = (answers = userAnswers) => {
    setIsCompleted(true);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    
    let correctAnswers = 0;
    let totalQuestions = 0;

    if (exercise.exercise_type === "multiple_choice") {
      const questions = exercise.content.questions || exercise.content.problems;
      totalQuestions = questions.length;
      correctAnswers = answers.reduce((count, answer, index) => {
        return count + (answer === questions[index].correct ? 1 : 0);
      }, 0);
    } else if (exercise.exercise_type === "calculation") {
      totalQuestions = exercise.content.problems.length;
      correctAnswers = answers.reduce((count, answer, index) => {
        return count + (answer === exercise.content.problems[index].answer ? 1 : 0);
      }, 0);
    }

    const score = Math.round((correctAnswers / totalQuestions) * 100);

    onComplete({
      exercise_id: exercise.id,
      score,
      time_taken: timeTaken,
      correct_answers: correctAnswers,
      total_questions: totalQuestions
    });
  };

  const renderQuestion = () => {
    if (exercise.exercise_type === "multiple_choice") {
      const questions = exercise.content.questions;
      const question = questions[currentQuestion];
      
      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{question.question}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswer(index)}
                className="p-3 bg-blue-100 hover:bg-blue-200 rounded-lg text-left transition-colors"
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      );
    } else if (exercise.exercise_type === "calculation") {
      const problems = exercise.content.problems;
      const problem = problems[currentQuestion];
      
      return (
        <div className="space-y-4">
          <h3 className="text-2xl font-bold text-center">{problem.question}</h3>
          <input
            type="number"
            placeholder="Your answer"
            className="w-full p-3 border rounded-lg text-center text-xl"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAnswer(parseInt(e.target.value));
                e.target.value = '';
              }
            }}
            autoFocus
          />
          <p className="text-sm text-gray-600 text-center">Press Enter to submit</p>
        </div>
      );
    }
  };

  if (isCompleted) {
    return (
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">Exercise Complete!</h2>
        <p className="text-gray-600">Great job! Your results have been recorded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold">{exercise.title}</h2>
          <div className="text-right">
            <div className="text-sm text-gray-600">Time Left</div>
            <div className="text-lg font-bold text-red-600">{timeLeft}s</div>
          </div>
        </div>
        <p className="text-gray-600">{exercise.description}</p>
        
        {exercise.exercise_type === "multiple_choice" && (
          <div className="mt-2">
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / exercise.content.questions.length) * 100}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Question {currentQuestion + 1} of {exercise.content.questions.length}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        {renderQuestion()}
      </div>
    </div>
  );
};

const BrainTrainingDashboard = () => {
  const [exercises, setExercises] = useState([]);
  const [progress, setProgress] = useState(null);
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExercises();
    fetchProgress();
  }, []);

  const fetchExercises = async () => {
    try {
      const response = await axios.get(`${API}/brain-training/exercises`);
      setExercises(response.data);
    } catch (error) {
      console.error('Error fetching exercises:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await axios.get(`${API}/brain-training/progress`);
      setProgress(response.data);
    } catch (error) {
      console.error('Error fetching progress:', error);
    }
  };

  const handleExerciseComplete = async (result) => {
    try {
      await axios.post(`${API}/brain-training/submit-result`, result);
      setSelectedExercise(null);
      fetchProgress(); // Refresh progress
    } catch (error) {
      console.error('Error submitting result:', error);
    }
  };

  const categories = [
    { id: 'all', name: 'All Exercises', icon: '🧠' },
    { id: 'math', name: 'Mathematics', icon: '🔢' },
    { id: 'reading', name: 'Reading', icon: '📚' },
    { id: 'science', name: 'Science', icon: '🔬' },
    { id: 'memory', name: 'Memory', icon: '🧩' },
    { id: 'logic', name: 'Logic', icon: '🤔' }
  ];

  const filteredExercises = activeCategory === 'all' 
    ? exercises 
    : exercises.filter(ex => ex.category === activeCategory);

  if (selectedExercise) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => setSelectedExercise(null)}
            className="mb-6 text-blue-600 hover:text-blue-800"
          >
            ← Back to Exercises
          </button>
          <BrainTrainingExercise 
            exercise={selectedExercise} 
            onComplete={handleExerciseComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">🧠 Brain Training Center</h1>
            <p className="text-xl opacity-90 mb-6">
              Strengthen your cognitive abilities with interactive exercises
            </p>
            {progress && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold">{progress.total_exercises}</div>
                  <div className="text-sm">Exercises Completed</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold">{Math.round(progress.average_score)}%</div>
                  <div className="text-sm">Average Score</div>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <div className="text-2xl font-bold">Level {progress.current_level}</div>
                  <div className="text-sm">Brain Training Level</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {category.icon} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading exercises...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredExercises.map((exercise) => (
              <div key={exercise.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">{exercise.title}</h3>
                  <div className="flex items-center">
                    <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Level {exercise.level}
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      {exercise.points} pts
                    </span>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{exercise.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    ⏱️ {exercise.time_limit || 60}s
                  </span>
                  <button
                    onClick={() => setSelectedExercise(exercise)}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Start Exercise
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Trade Learning Components
const TradeLearningDashboard = () => {
  const [pathways, setPathways] = useState([]);
  const [selectedPathway, setSelectedPathway] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPathways();
  }, []);

  const fetchPathways = async () => {
    try {
      const response = await axios.get(`${API}/trades/pathways`);
      setPathways(response.data);
    } catch (error) {
      console.error('Error fetching pathways:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchModules = async (pathway) => {
    try {
      const response = await axios.get(`${API}/trades/${pathway}/modules`);
      setModules(response.data);
    } catch (error) {
      console.error('Error fetching modules:', error);
    }
  };

  const handlePathwaySelect = (pathway) => {
    setSelectedPathway(pathway);
    fetchModules(pathway.id);
  };

  if (selectedPathway) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <button
              onClick={() => setSelectedPathway(null)}
              className="mb-4 text-white hover:text-green-200"
            >
              ← Back to Pathways
            </button>
            <h1 className="text-3xl font-bold">{selectedPathway.name}</h1>
            <p className="text-lg opacity-90">{selectedPathway.description}</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-2xl font-bold mb-6">Learning Modules</h2>
          
          <div className="space-y-4">
            {modules.map((module, index) => (
              <div key={module.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-4">
                      {module.level}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{module.module_name}</h3>
                      <p className="text-gray-600">{module.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Certification Value</div>
                    <div className="text-lg font-bold text-green-600">{module.certification_value}%</div>
                  </div>
                </div>

                {module.user_progress && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{module.user_progress.completion_percentage}%</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${module.user_progress.completion_percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Learning Objectives:</h4>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {module.learning_objectives.map((objective, idx) => (
                      <li key={idx}>{objective}</li>
                    ))}
                  </ul>
                </div>

                {module.prerequisites.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Prerequisites:</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.prerequisites.map((prereq, idx) => (
                        <span key={idx} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                          {prereq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors">
                  {module.user_progress ? 'Continue Module' : 'Start Module'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">🔧 Trade Learning Pathways</h1>
          <p className="text-xl opacity-90 mb-6">
            Build practical skills and work toward industry certifications
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl font-bold mb-8">Choose Your Career Path</h2>
        
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading pathways...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pathways.map((pathway) => (
              <div 
                key={pathway.id} 
                className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => handlePathwaySelect(pathway)}
              >
                <h3 className="text-xl font-semibold mb-3">{pathway.name}</h3>
                <p className="text-gray-600 mb-4">{pathway.description}</p>
                <button className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors">
                  Explore Pathway
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Chat Room Components
const ChatRoom = ({ room, onLeave }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    connectWebSocket();
    
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/chat/rooms/${room.id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const connectWebSocket = () => {
    const wsUrl = `${BACKEND_URL.replace('https://', 'wss://').replace('http://', 'ws://')}/api/chat/rooms/${room.id}/ws`;
    const ws = new WebSocket(wsUrl);
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };
    
    setSocket(ws);
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket) {
      socket.send(JSON.stringify({
        user_id: user.id,
        username: user.name,
        message: newMessage.trim()
      }));
      setNewMessage('');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-96 bg-white rounded-lg shadow-lg">
      <div className="bg-blue-600 text-white p-4 rounded-t-lg">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{room.name}</h3>
            <p className="text-sm opacity-75">{room.topic}</p>
          </div>
          <button
            onClick={onLeave}
            className="text-white hover:text-red-200"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.user_id === user.id ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-3 py-2 rounded-lg ${
              message.user_id === user.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-800'
            }`}>
              {message.user_id !== user.id && (
                <div className="text-xs font-semibold mb-1">{message.username}</div>
              )}
              <div>{message.message}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message..."
            className="flex-1 border border-gray-300 rounded px-3 py-2"
          />
          <button
            onClick={sendMessage}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatRoomsDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    topic: '',
    category: 'study_group',
    max_participants: 10
  });

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get(`${API}/chat/rooms`);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const createRoom = async () => {
    try {
      await axios.post(`${API}/chat/rooms`, newRoom);
      setShowCreateForm(false);
      setNewRoom({ name: '', topic: '', category: 'study_group', max_participants: 10 });
      fetchRooms();
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  const joinRoom = async (room) => {
    try {
      await axios.post(`${API}/chat/rooms/${room.id}/join`);
      setActiveRoom(room);
    } catch (error) {
      console.error('Error joining room:', error);
    }
  };

  if (activeRoom) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ChatRoom room={activeRoom} onLeave={() => setActiveRoom(null)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">💬 Interactive Study Groups</h1>
          <p className="text-xl opacity-90 mb-6">
            Collaborate with peers in real-time chat rooms
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Create New Room
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Create Room Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Create New Chat Room</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Room name"
                value={newRoom.name}
                onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <input
                type="text"
                placeholder="Topic/subject"
                value={newRoom.topic}
                onChange={(e) => setNewRoom({...newRoom, topic: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2"
              />
              <select
                value={newRoom.category}
                onChange={(e) => setNewRoom({...newRoom, category: e.target.value})}
                className="border border-gray-300 rounded px-3 py-2"
              >
                <option value="study_group">Study Group</option>
                <option value="trade_discussion">Trade Discussion</option>
                <option value="brain_training">Brain Training</option>
                <option value="general">General Chat</option>
              </select>
              <input
                type="number"
                placeholder="Max participants"
                value={newRoom.max_participants}
                onChange={(e) => setNewRoom({...newRoom, max_participants: parseInt(e.target.value)})}
                className="border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="flex space-x-4 mt-4">
              <button
                onClick={createRoom}
                className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
              >
                Create Room
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Room List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{room.name}</h3>
                  <p className="text-gray-600 text-sm">{room.topic}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                  {room.category.replace('_', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {room.participants.length}/{room.max_participants} members
                </span>
                <button
                  onClick={() => joinRoom(room)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Business Pages
const DonatePage = () => {
  const [donationAmount, setDonationAmount] = useState('25');
  const [customAmount, setCustomAmount] = useState('');
  const [donorInfo, setDonorInfo] = useState({
    name: '',
    email: '',
    message: ''
  });

  const predefinedAmounts = ['10', '25', '50', '100', '250'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">💝 Support BalancEDD</h1>
          <p className="text-xl opacity-90 mb-6">
            Help us transform young lives through comprehensive development programs
          </p>
          <div className="bg-white bg-opacity-20 rounded-lg p-6 inline-block">
            <div className="text-3xl font-bold">$127,845</div>
            <div className="text-sm">Raised this year for youth programs</div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Donation Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Make a Donation</h2>
            
            {/* Amount Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Amount</label>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {predefinedAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {setDonationAmount(amount); setCustomAmount('');}}
                    className={`p-3 border rounded-lg text-center font-medium ${
                      donationAmount === amount 
                        ? 'bg-green-600 text-white border-green-600' 
                        : 'border-gray-300 hover:border-green-600'
                    }`}
                  >
                    ${amount}
                  </button>
                ))}
              </div>
              <input
                type="number"
                placeholder="Custom amount"
                value={customAmount}
                onChange={(e) => {setCustomAmount(e.target.value); setDonationAmount('');}}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Donor Information */}
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="Your name"
                value={donorInfo.name}
                onChange={(e) => setDonorInfo({...donorInfo, name: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <input
                type="email"
                placeholder="Your email"
                value={donorInfo.email}
                onChange={(e) => setDonorInfo({...donorInfo, email: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
              <textarea
                placeholder="Optional message"
                value={donorInfo.message}
                onChange={(e) => setDonorInfo({...donorInfo, message: e.target.value})}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            <button className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors">
              Donate ${customAmount || donationAmount}
            </button>
            
            <p className="text-xs text-gray-500 mt-4 text-center">
              Your donation is secure and helps fund youth development programs
            </p>
          </div>

          {/* Impact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Your Impact</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    🧠
                  </div>
                  <div>
                    <div className="font-semibold">$25 provides</div>
                    <div className="text-gray-600">Brain training exercises for one student for a month</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                    🔧
                  </div>
                  <div>
                    <div className="font-semibold">$50 provides</div>
                    <div className="text-gray-600">Trade certification pathway for one student</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                    💬
                  </div>
                  <div>
                    <div className="font-semibold">$100 provides</div>
                    <div className="text-gray-600">Complete wellness and life skills program</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Success Stories</h3>
              <blockquote className="italic text-gray-600">
                "BalancEDD helped me discover my passion for technology. The brain training improved my focus, 
                and the trade pathway gave me real skills. I'm now pursuing a computer science degree!"
              </blockquote>
              <p className="text-sm text-gray-500 mt-2">- Maria, Program Graduate</p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Tax Information</h3>
              <p className="text-gray-600 text-sm">
                BalancEDD Solutions is a registered 501(c)(3) nonprofit organization. 
                Your donation is tax-deductible to the extent allowed by law. 
                Tax ID: 12-3456789
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ContactPage = () => {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    type: 'general'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
    console.log('Contact form submitted:', contactForm);
    alert('Thank you for your message! We\'ll get back to you within 24 hours.');
    setContactForm({ name: '', email: '', subject: '', message: '', type: 'general' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">📞 Contact BalancEDD</h1>
          <p className="text-xl opacity-90">
            We're here to help you succeed. Reach out anytime!
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-bold mb-6">Send us a message</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Your name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                  className="p-3 border border-gray-300 rounded-lg"
                  required
                />
                <input
                  type="email"
                  placeholder="Your email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  className="p-3 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <select
                value={contactForm.type}
                onChange={(e) => setContactForm({...contactForm, type: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="general">General Inquiry</option>
                <option value="technical">Technical Support</option>
                <option value="partnership">Partnership Opportunities</option>
                <option value="press">Press & Media</option>
                <option value="feedback">Feedback & Suggestions</option>
              </select>

              <input
                type="text"
                placeholder="Subject"
                value={contactForm.subject}
                onChange={(e) => setContactForm({...contactForm, subject: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />

              <textarea
                placeholder="Your message"
                value={contactForm.message}
                onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg"
                required
              />

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    📧
                  </div>
                  <div>
                    <div className="font-semibold">Email</div>
                    <div className="text-gray-600">hello@balancedd.org</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    📞
                  </div>
                  <div>
                    <div className="font-semibold">Phone</div>
                    <div className="text-gray-600">(555) 123-4567</div>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                    📍
                  </div>
                  <div>
                    <div className="font-semibold">Address</div>
                    <div className="text-gray-600">
                      123 Education Lane<br />
                      Youth Development Center<br />
                      Innovation City, IC 12345
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Office Hours</h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span>8:00 AM - 6:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span>10:00 AM - 4:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span>Closed</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <div className="space-y-2">
                <a href="#" className="block text-blue-600 hover:text-blue-800">📚 Student Support Center</a>
                <a href="#" className="block text-blue-600 hover:text-blue-800">👥 Parent Resources</a>
                <a href="#" className="block text-blue-600 hover:text-blue-800">🏫 Institutional Partnerships</a>
                <a href="#" className="block text-blue-600 hover:text-blue-800">💼 Career Services</a>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-blue-600 hover:text-blue-800">📘 Facebook</a>
                <a href="#" className="text-blue-600 hover:text-blue-800">🐦 Twitter</a>
                <a href="#" className="text-blue-600 hover:text-blue-800">📷 Instagram</a>
                <a href="#" className="text-blue-600 hover:text-blue-800">💼 LinkedIn</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced Student Dashboard with Brain Training
const StatsCard = ({ title, value, icon, color, subtitle }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${color}`}>
    <div className="flex items-center">
      <div className="flex-shrink-0">
        <div className={`text-2xl ${color.replace('border-', 'text-')}`}>
          {icon}
        </div>
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  </div>
);

const ProgressBar = ({ percentage, color = "bg-blue-500" }) => (
  <div className="w-full bg-gray-200 rounded-full h-2">
    <div 
      className={`${color} h-2 rounded-full transition-all duration-300`}
      style={{ width: `${percentage}%` }}
    ></div>
  </div>
);

const RecommendationCard = ({ recommendation }) => {
  const categoryColors = {
    academic: 'border-blue-500 bg-blue-50',
    wellness: 'border-green-500 bg-green-50',
    nutrition: 'border-orange-500 bg-orange-50',
    life_skills: 'border-purple-500 bg-purple-50'
  };

  const categoryIcons = {
    academic: '📚',
    wellness: '🧘',
    nutrition: '🥗',
    life_skills: '🛠️'
  };

  return (
    <div className={`border-l-4 p-4 rounded-r-lg ${categoryColors[recommendation.category] || 'border-gray-500 bg-gray-50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <span className="text-lg mr-2">{categoryIcons[recommendation.category]}</span>
            <h4 className="font-semibold text-gray-900">{recommendation.title}</h4>
          </div>
          <p className="text-sm text-gray-700 mb-2">{recommendation.description}</p>
          <div className="flex flex-wrap gap-1">
            {recommendation.personalization_reasons?.map((reason, index) => (
              <span key={index} className="text-xs bg-white bg-opacity-60 px-2 py-1 rounded">
                {reason}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-2">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white">
            Priority {recommendation.priority}
          </span>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/student/dashboard`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addJournalEntry = async (mood_rating, content, tags) => {
    try {
      await axios.post(`${API}/student/journal`, {
        mood_rating,
        content,
        tags: tags.split(',').map(tag => tag.trim())
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding journal entry:', error);
    }
  };

  const addNutritionLog = async (meal_type, foods, notes) => {
    try {
      await axios.post(`${API}/student/nutrition`, {
        meal_type,
        foods: foods.split(',').map(food => food.trim()),
        notes
      });
      fetchDashboardData();
    } catch (error) {
      console.error('Error adding nutrition log:', error);
    }
  };

  const completeLifeSkill = async (taskId) => {
    try {
      await axios.put(`${API}/student/life-skills/${taskId}/complete`);
      fetchDashboardData();
    } catch (error) {
      console.error('Error completing life skill:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No dashboard data available</p>
      </div>
    );
  }

  const { stats, plan, recommendations, recent_progress, recent_journals, life_skills, profile, brain_training_results, trade_progress } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Enhanced Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">Your Enhanced BalancEDD Journey</h1>
              <p className="text-xl opacity-90 mb-6">
                Brain training, trade skills, wellness, and academic excellence - all in one place
              </p>
              {plan && (
                <div className="bg-white bg-opacity-20 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">{plan.title}</h3>
                  <p className="text-sm opacity-90 mb-2">{plan.description}</p>
                  {plan.personalized && (
                    <div className="text-xs opacity-75">
                      ✨ {plan.customization_reasons?.join(', ')}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="hidden lg:block">
              <img 
                src="https://images.pexels.com/photos/5212695/pexels-photo-5212695.jpeg"
                alt="Students collaborating"
                className="rounded-lg shadow-2xl w-full h-64 object-cover"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Enhanced Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
          <StatsCard
            title="Academic Progress"
            value={stats.academic_progress}
            icon="📚"
            color="border-blue-500"
            subtitle="Modules completed"
          />
          <StatsCard
            title="Brain Level"
            value={stats.brain_training_level}
            icon="🧠"
            color="border-purple-500"
            subtitle="Training level"
          />
          <StatsCard
            title="Certification"
            value={`${stats.certification_progress}%`}
            icon="🏆"
            color="border-green-500"
            subtitle="Trade progress"
          />
          <StatsCard
            title="Wellness Entries"
            value={stats.wellness_progress}
            icon="🧘"
            color="border-green-500"
            subtitle="Journal entries"
          />
          <StatsCard
            title="Nutrition Logs"
            value={stats.nutrition_progress}
            icon="🥗"
            color="border-orange-500"
            subtitle="Meals tracked"
          />
          <StatsCard
            title="Life Skills"
            value={`${stats.life_skills_completed}/${stats.life_skills_total}`}
            icon="🛠️"
            color="border-purple-500"
            subtitle="Tasks completed"
          />
        </div>

        {/* Quick Access to New Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/brain-training" className="bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🧠</div>
            <h3 className="text-lg font-semibold mb-2">Brain Training</h3>
            <p className="text-sm opacity-90">Strengthen cognitive abilities with interactive exercises</p>
          </Link>
          
          <Link to="/trade-learning" className="bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">🔧</div>
            <h3 className="text-lg font-semibold mb-2">Trade Learning</h3>
            <p className="text-sm opacity-90">Build practical skills for industry certifications</p>
          </Link>
          
          <Link to="/chat-rooms" className="bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg p-6 hover:shadow-lg transition-shadow">
            <div className="text-3xl mb-2">💬</div>
            <h3 className="text-lg font-semibold mb-2">Study Groups</h3>
            <p className="text-sm opacity-90">Collaborate with peers in real-time chat rooms</p>
          </Link>
        </div>

        {/* Personalized Recommendations Section */}
        {recommendations && recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🎯 Personalized for You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.slice(0, 4).map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} />
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', name: 'Overview', icon: '📊' },
                { id: 'journal', name: 'Wellness Journal', icon: '📝' },
                { id: 'nutrition', name: 'Nutrition', icon: '🥗' },
                { id: 'skills', name: 'Life Skills', icon: '🛠️' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {activeTab === 'overview' && (
            <>
              {/* Recent Progress */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Progress</h3>
                <div className="space-y-4">
                  {recent_progress.map((progress, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                      <h4 className="font-medium text-gray-900">{progress.title}</h4>
                      <p className="text-sm text-gray-600">{progress.description}</p>
                      <p className="text-xs text-gray-500">
                        {progress.category} • {new Date(progress.date).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Goals Progress */}
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Goals Progress</h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Academic</span>
                      <span className="text-sm text-gray-500">75%</span>
                    </div>
                    <ProgressBar percentage={75} color="bg-blue-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Brain Training</span>
                      <span className="text-sm text-gray-500">{(stats.brain_training_level - 1) * 25}%</span>
                    </div>
                    <ProgressBar percentage={(stats.brain_training_level - 1) * 25} color="bg-purple-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Trade Certification</span>
                      <span className="text-sm text-gray-500">{stats.certification_progress}%</span>
                    </div>
                    <ProgressBar percentage={stats.certification_progress} color="bg-green-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Life Skills</span>
                      <span className="text-sm text-gray-500">{Math.round((stats.life_skills_completed / stats.life_skills_total) * 100)}%</span>
                    </div>
                    <ProgressBar percentage={(stats.life_skills_completed / stats.life_skills_total) * 100} color="bg-purple-500" />
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'journal' && (
            <>
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Add Journal Entry</h3>
                <JournalForm onSubmit={addJournalEntry} />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Entries</h3>
                <div className="space-y-3">
                  {recent_journals.map((journal, index) => (
                    <div key={index} className="border-b pb-3">
                      <div className="flex items-center mb-2">
                        <span className="text-sm font-medium">Mood: {journal.mood_rating}/10</span>
                        <span className="ml-2 text-xs text-gray-500">
                          {new Date(journal.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{journal.content}</p>
                      {journal.tags.length > 0 && (
                        <div className="mt-1">
                          {journal.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'nutrition' && (
            <>
              <div className="lg:col-span-2 bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Log Nutrition</h3>
                <NutritionForm onSubmit={addNutritionLog} />
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Meals</h3>
                <div className="space-y-3">
                  {dashboardData.recent_nutrition.map((nutrition, index) => (
                    <div key={index} className="border-b pb-3">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-medium capitalize">{nutrition.meal_type}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(nutrition.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{nutrition.foods.join(', ')}</p>
                      {nutrition.notes && (
                        <p className="text-xs text-gray-500 mt-1">{nutrition.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {activeTab === 'skills' && (
            <div className="lg:col-span-3 bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Life Skills Tracker</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {life_skills.map((skill, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${skill.completed ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{skill.task_name}</h4>
                      {skill.completed ? (
                        <span className="text-green-600">✅</span>
                      ) : (
                        <button
                          onClick={() => completeLifeSkill(skill.id)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{skill.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                        {skill.skill_category.replace('_', ' ')}
                      </span>
                      {skill.personalized && (
                        <span className="text-xs text-purple-600">✨ Personalized</span>
                      )}
                    </div>
                    {skill.notes && (
                      <p className="text-xs text-gray-500 mt-2">{skill.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const JournalForm = ({ onSubmit }) => {
  const [moodRating, setMoodRating] = useState(5);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(moodRating, content, tags);
    setContent('');
    setTags('');
    setMoodRating(5);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mood Rating (1-10)
        </label>
        <input
          type="range"
          min="1"
          max="10"
          value={moodRating}
          onChange={(e) => setMoodRating(parseInt(e.target.value))}
          className="w-full"
        />
        <div className="text-center text-sm text-gray-600">{moodRating}</div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Journal Entry
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="How are you feeling today? What's on your mind?"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags (comma separated)
        </label>
        <input
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="happy, stressed, achievement, etc."
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
      >
        Add Entry
      </button>
    </form>
  );
};

const NutritionForm = ({ onSubmit }) => {
  const [mealType, setMealType] = useState('breakfast');
  const [foods, setFoods] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(mealType, foods, notes);
    setFoods('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Meal Type
        </label>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Foods (comma separated)
        </label>
        <input
          type="text"
          value={foods}
          onChange={(e) => setFoods(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="eggs, toast, orange juice"
          required
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="How did you feel? Any observations?"
        />
      </div>
      
      <button
        type="submit"
        className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition-colors"
      >
        Log Meal
      </button>
    </form>
  );
};

// Adaptive Registration (keeping existing code)
const AdaptiveRegistrationForm = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    institution_id: 'default'
  });
  const [surveyData, setSurveyData] = useState({});
  const [surveyQuestions, setSurveyQuestions] = useState({
    // Load immediately with comprehensive fallback questions
    academic: [
      {
        id: "grade_level",
        type: "select",
        question: "What grade level are you currently in?",
        options: ["6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade", "Other"],
        required: true
      },
      {
        id: "academic_strengths",
        type: "multi_select",
        question: "What subjects do you feel strongest in? (Select all that apply)",
        options: ["Mathematics", "Science", "English/Language Arts", "History", "Art", "Music", "Physical Education", "Technology"],
        required: false
      },
      {
        id: "learning_style",
        type: "select",
        question: "How do you learn best?",
        options: ["Visual (seeing pictures, diagrams)", "Auditory (hearing explanations)", "Kinesthetic (hands-on activities)", "Reading/Writing", "Combination"],
        required: true
      }
    ],
    goals: [
      {
        id: "primary_goals",
        type: "multi_select",
        question: "What are your main goals for this program? (Select up to 3)",
        options: ["Improve academic performance", "Build confidence", "Develop life skills", "Improve health and wellness", "Learn stress management", "Prepare for future career"],
        max_selections: 3,
        required: true
      }
    ],
    wellness: [
      {
        id: "mood_tracking_interest",
        type: "scale",
        question: "How interested are you in tracking your daily mood and emotions?",
        scale: { min: 1, max: 10, labels: { "1": "Not interested", "10": "Very interested" }},
        required: true
      }
    ],
    nutrition: [
      {
        id: "nutrition_knowledge_level",
        type: "select",
        question: "How would you rate your current nutrition knowledge?",
        options: ["Beginner - I'm just starting to learn", "Intermediate - I know the basics", "Advanced - I'm quite knowledgeable"],
        required: true
      }
    ],
    life_skills: [
      {
        id: "life_skills_priorities",
        type: "multi_select",
        question: "Which life skills are most important to you right now? (Select up to 4)",
        options: ["Financial literacy", "Time management", "Communication skills", "Career preparation", "Technology skills", "Leadership"],
        max_selections: 4,
        required: true
      }
    ],
    preferences: [
      {
        id: "communication_style",
        type: "select",
        question: "What communication style do you prefer?",
        options: ["Formal and structured", "Casual and friendly", "Encouraging and supportive", "Direct and clear"],
        required: true
      }
    ]
  });
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const steps = [
    'Basic Information',
    'Academic Profile', 
    'Goals & Motivation',
    'Wellness & Nutrition',
    'Life Skills & Preferences'
  ];

  useEffect(() => {
    fetchSurveyQuestions();
  }, []);

  const fetchSurveyQuestions = async () => {
    // Questions are already loaded as fallback, try to enhance them
    console.log('🔄 Attempting to load enhanced questions in background...');
    try {
      const apiUrl = `${API}/survey/questions`;
      const response = await axios.get(apiUrl, { timeout: 10000 }); // 10 second timeout
      
      if (response.data && Object.keys(response.data).length > 0) {
        console.log('✅ Enhanced questions loaded successfully');
        setSurveyQuestions(response.data);
      }
    } catch (error) {
      console.log('ℹ️ Using fallback questions (API slow/unavailable):', error.message);
      // Keep the fallback questions that are already loaded
    }
  };

  const handleInputChange = (field, value) => {
    if (currentStep === 0) {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setSurveyData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleMultiSelect = (field, option, maxSelections = null) => {
    setSurveyData(prev => {
      const current = prev[field] || [];
      const isSelected = current.includes(option);
      
      if (isSelected) {
        return { ...prev, [field]: current.filter(item => item !== option) };
      } else {
        if (maxSelections && current.length >= maxSelections) {
          return prev; // Don't add if at max
        }
        return { ...prev, [field]: [...current, option] };
      }
    });
  };

  const isStepValid = () => {
    if (currentStep === 0) {
      return formData.email && formData.password && formData.name;
    }
    
    if (!surveyQuestions) return true;
    
    const stepQuestions = {
      1: surveyQuestions.academic,
      2: surveyQuestions.goals,
      3: [...surveyQuestions.wellness, ...surveyQuestions.nutrition],
      4: [...surveyQuestions.life_skills, ...surveyQuestions.preferences]
    };
    
    const currentQuestions = stepQuestions[currentStep] || [];
    const requiredQuestions = currentQuestions.filter(q => q.required);
    
    return requiredQuestions.every(q => {
      const value = surveyData[q.id];
      return value !== undefined && value !== null && 
             (Array.isArray(value) ? value.length > 0 : value !== '');
    });
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      submitRegistration();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const submitRegistration = async () => {
    setLoading(true);

    try {
      // Create survey responses
      const surveyResponses = [];
      Object.entries(surveyData).forEach(([questionId, response]) => {
        surveyResponses.push({
          question_id: questionId,
          question_text: `Survey response for ${questionId}`,
          response: response
        });
      });

      // Prepare registration data
      const registrationData = {
        ...formData,
        profile_data: surveyData,
        survey_responses: surveyResponses
      };

      const result = await register(registrationData);
      
      if (result.success) {
        navigate('/', { replace: true });
      } else {
        console.error('Registration failed:', result.error);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderBasicInfo = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Join BalancEDD</h2>
        <p className="text-gray-600">Let's start with your basic information</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your full name"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your email address"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
        <input
          type="password"
          value={formData.password}
          onChange={(e) => handleInputChange('password', e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Create a secure password"
          required
        />
      </div>
    </div>
  );

  const renderQuestion = (question) => {
    const value = surveyData[question.id];

    switch (question.type) {
      case 'select':
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              value={value || ''}
              onChange={(e) => handleInputChange(question.id, e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select an option...</option>
              {question.options.map((option, index) => (
                <option key={index} value={option.toLowerCase().replace(/\s+/g, '_')}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        );

      case 'multi_select':
        const selectedValues = value || [];
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
              {question.max_selections && (
                <span className="text-gray-500 ml-2">
                  (Select up to {question.max_selections})
                </span>
              )}
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {question.options.map((option, index) => {
                const optionValue = option.toLowerCase().replace(/\s+/g, '_');
                const isSelected = selectedValues.includes(optionValue);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleMultiSelect(question.id, optionValue, question.max_selections)}
                    className={`text-left p-3 border rounded-md transition-colors ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-500 text-blue-700' 
                        : 'bg-white border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <span className="flex items-center">
                      <span className={`w-4 h-4 mr-2 rounded border ${
                        isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                        {isSelected && <span className="block w-full h-full text-white text-xs leading-4 text-center">✓</span>}
                      </span>
                      {option}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 'scale':
        return (
          <div key={question.id} className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {question.question}
              {question.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="px-3">
              <input
                type="range"
                min={question.scale.min}
                max={question.scale.max}
                value={value || question.scale.min}
                onChange={(e) => handleInputChange(question.id, parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>{question.scale.labels[question.scale.min]}</span>
                <span className="font-medium text-blue-600">
                  {value || question.scale.min}
                </span>
                <span>{question.scale.labels[question.scale.max]}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderCurrentStep = () => {
    if (currentStep === 0) {
      return renderBasicInfo();
    }

    const stepQuestions = {
      1: { title: 'Academic Profile', questions: surveyQuestions.academic || [] },
      2: { title: 'Goals & Motivation', questions: surveyQuestions.goals || [] },
      3: { title: 'Wellness & Nutrition', questions: [...(surveyQuestions.wellness || []), ...(surveyQuestions.nutrition || [])] },
      4: { title: 'Life Skills & Preferences', questions: [...(surveyQuestions.life_skills || []), ...(surveyQuestions.preferences || [])] }
    };

    const currentStepData = stepQuestions[currentStep];
    
    if (!currentStepData || !currentStepData.questions.length) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600">No questions available for this step</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentStepData.title}</h2>
          <p className="text-gray-600">Help us personalize your BalancEDD experience</p>
        </div>
        
        {currentStepData.questions.map(renderQuestion)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      <Navigation showBack={currentStep > 0} onBack={prevStep} />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  index <= currentStep 
                    ? 'bg-white text-blue-600' 
                    : 'bg-blue-300 text-white'
                }`}>
                  {index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div className={`hidden sm:block w-12 lg:w-24 h-1 mx-2 ${
                    index < currentStep ? 'bg-white' : 'bg-blue-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="text-center">
            <p className="text-white text-sm">{steps[currentStep]}</p>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-lg shadow-xl p-8">

          {renderCurrentStep()}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            <button
              type="button"
              onClick={nextStep}
              disabled={!isStepValid() || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : currentStep === steps.length - 1 ? 'Complete Registration' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const LoginForm = () => {
  const { login, setupDemo } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    console.log('📤 Submitting login form');
    const result = await login(email, password);
    
    if (!result.success) {
      console.error('❌ Login failed:', result.error);
      setError(result.error);
    } else {
      console.log('✅ Login successful, redirecting...');
      navigate('/', { replace: true });
    }
    setLoading(false);
  };

  const handleDemoSetup = async () => {
    setLoading(true);
    setError('');
    console.log('🎭 Demo button clicked');
    
    const result = await setupDemo();
    if (!result.success) {
      console.error('❌ Demo setup failed:', result.error);
      setError(result.error || 'Demo setup failed');
    } else {
      console.log('✅ Demo setup successful');
      navigate('/', { replace: true });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-4xl font-bold text-white mb-2">BalancEDD</h2>
          <p className="text-blue-100">Youth Development Platform</p>
          <p className="text-sm text-blue-200 mt-2">🧠 Brain Training • 🔧 Trade Learning • 💬 Study Groups</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-6">
            Welcome Back
          </h3>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          
          <div className="mt-6 text-center space-y-4">
            <button
              onClick={handleDemoSetup}
              disabled={loading}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Setting up demo...' : 'Try Demo Account'}
            </button>
            
            <div className="text-center">
              <span className="text-gray-500 text-sm">New to BalancEDD? </span>
              <button
                onClick={() => navigate('/register')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Create Account
              </button>
            </div>
          </div>
          
          <div className="mt-4 text-center text-sm text-gray-600">
            Demo credentials: student@demo.com / demo123
          </div>
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  console.log('🛡️ ProtectedRoute - User:', user ? 'Authenticated' : 'Not authenticated');
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<AdaptiveRegistrationForm />} />
            <Route path="/launch" element={<LaunchPage />} />
            <Route path="/brain-training" element={
              <ProtectedRoute>
                <BrainTrainingDashboard />
              </ProtectedRoute>
            } />
            <Route path="/trade-learning" element={
              <ProtectedRoute>
                <TradeLearningDashboard />
              </ProtectedRoute>
            } />
            <Route path="/chat-rooms" element={
              <ProtectedRoute>
                <ChatRoomsDashboard />
              </ProtectedRoute>
            } />
            <Route path="/donate" element={<DonatePage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/" element={
              <ProtectedRoute>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;