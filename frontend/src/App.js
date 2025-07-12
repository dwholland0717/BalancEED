import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
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
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold">BalancEDD</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">Welcome, {user?.name}</span>
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
  const [surveyQuestions, setSurveyQuestions] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [error, setError] = useState('');
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
    setQuestionsLoading(true);
    try {
      console.log('🔄 Fetching survey questions from:', `${API}/survey/questions`);
      const response = await axios.get(`${API}/survey/questions`);
      console.log('✅ Survey questions loaded:', response.data);
      setSurveyQuestions(response.data);
    } catch (error) {
      console.error('❌ Error fetching survey questions:', error);
      setError('Failed to load survey questions. Please refresh the page.');
      // Set dummy questions as fallback
      setSurveyQuestions({
        academic: [{
          id: "grade_level",
          type: "select",
          question: "What grade level are you currently in?",
          options: ["6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade"],
          required: true
        }],
        goals: [{
          id: "primary_goals",
          type: "multi_select",
          question: "What are your main goals?",
          options: ["Academic improvement", "Personal growth", "Life skills"],
          required: true
        }],
        wellness: [{
          id: "mood_tracking_interest",
          type: "scale",
          question: "Interest in mood tracking?",
          scale: { min: 1, max: 10, labels: { "1": "Not interested", "10": "Very interested" }},
          required: true
        }],
        nutrition: [{
          id: "nutrition_knowledge_level",
          type: "select",
          question: "Your nutrition knowledge level?",
          options: ["Beginner", "Intermediate", "Advanced"],
          required: true
        }],
        life_skills: [{
          id: "life_skills_priorities",
          type: "multi_select",
          question: "Important life skills?",
          options: ["Financial literacy", "Time management", "Communication"],
          required: true
        }],
        preferences: [{
          id: "communication_style",
          type: "select",
          question: "Preferred communication style?",
          options: ["Formal", "Casual", "Encouraging"],
          required: true
        }]
      });
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
    setError('');

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
        setError(result.error);
      }
    } catch (error) {
      setError('Registration failed. Please try again.');
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

    if (questionsLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading personalization questions...</p>
        </div>
      );
    }

    if (!surveyQuestions) {
      return (
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">Failed to load questions</p>
          <button 
            onClick={fetchSurveyQuestions}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry Loading Questions
          </button>
        </div>
      );
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
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

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

  const { stats, plan, recommendations, recent_progress, recent_journals, life_skills, profile } = dashboardData;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Enhanced Hero Section with Personalization */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-bold mb-4">Your Personalized BalancEDD Journey</h1>
              <p className="text-xl opacity-90 mb-6">
                Customized for your {profile?.learning_style} learning style and personal goals
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
        
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Academic Progress"
            value={stats.academic_progress}
            icon="📚"
            color="border-blue-500"
            subtitle="Modules completed"
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
                      <span className="text-sm font-medium">Wellness</span>
                      <span className="text-sm text-gray-500">60%</span>
                    </div>
                    <ProgressBar percentage={60} color="bg-green-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Nutrition</span>
                      <span className="text-sm text-gray-500">80%</span>
                    </div>
                    <ProgressBar percentage={80} color="bg-orange-500" />
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