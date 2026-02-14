import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Sparkles, FileText, Calendar, Upload } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { usePrompt } from '../hooks/useDialog';
import PromptDialog from '../components/PromptDialog';

export default function AIChat({ isOpen, onClose, userLevel = 'L2', projectId = null, user }) {
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello${user?.full_name ? ` ${user.full_name}` : ''}! I'm your personal AI assistant for the Atelier MEP system. 

I can help you with:

📊 **Project Management**
• Project details and status tracking
• MAS & RFI analysis and trends
• Team assignments and workload

📋 **Design & Documentation**
• Create design sheets with calculations
• Design calculations and specifications
• Reference standards and codes

📅 **Schedule & Delivery**
• Track drawing schedules
• Monitor material deliveries
• Identify overdue items and deadlines

📁 **Document Analysis**
• Query uploaded documents
• Standards and code compliance
• Custom reports and insights

Ask me anything about your projects! I'll only use data from your database and uploaded documents.`,
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { prompt: promptDialog, dialogProps: promptDialogProps } = usePrompt();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await apiFetch('/api/llm/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages.slice(-10), // Last 10 messages for context
          projectId: projectId,
          sessionId: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage = {
          role: 'assistant',
          content: data.answer,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: error.error === 'AI assistant is only available for lodhagroup users' 
            ? `⚠️ ${error.error}` 
            : `Sorry, I encountered an error: ${error.message || error.error || 'Please try again'}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDesignSheet = async () => {
    const requirements = await promptDialog({ title: 'Design Sheet Requirements', message: 'Enter the requirements for the design sheet', inputType: 'textarea', placeholder: 'e.g., Electrical load calculation for Tower A...' });
    if (!requirements) return;

    setLoading(true);
    try {
      const response = await apiFetch('/api/llm/design-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          requirements: requirements,
          sheetType: 'general'
        })
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Design sheet "${data.content.title}" created successfully!\n\nSheet ID: ${data.sheetId}\n\nYou can view it in the Design Sheets section.`,
          timestamp: new Date()
        }]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Error creating design sheet: ${error.error || error.message}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Design sheet error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to create design sheet. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSchedule = async () => {
    setLoading(true);
    try {
      const endpoint = projectId 
        ? `/api/llm/track-schedule/${projectId}` 
        : '/api/llm/track-schedule';
      
      const response = await apiFetch(endpoint);

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📅 **Schedule & Delivery Tracking**\n\n${data.summary}`,
          timestamp: new Date()
        }]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Error tracking schedule: ${error.error || error.message}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Schedule tracking error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to track schedule. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('projectId', projectId || '');
      formData.append('documentType', 'user_upload');
      formData.append('documentName', file.name);

      const response = await apiFetch('/api/user-documents', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Document "${file.name}" uploaded successfully!\n\nI can now reference this document when answering your questions.`,
          timestamp: new Date()
        }]);
      } else {
        const error = await response.json();
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Error uploading document: ${error.error || error.message}`,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Failed to upload document. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div 
        className={`bg-white rounded-lg shadow-2xl border-2 border-lodha-gold transition-all duration-300 ${
          isMinimized ? 'w-80 h-16' : 'w-96 h-[600px]'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-lodha-gold to-yellow-600 text-white px-4 py-3 rounded-t-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-garamond font-bold text-lg">AI Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Quick Actions */}
            <div className="px-4 pt-3 pb-2 bg-white border-b border-lodha-steel/30">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={handleTrackSchedule}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Calendar className="w-3 h-3" />
                  Track Schedule
                </button>
                {projectId && (
                  <button
                    onClick={handleCreateDesignSheet}
                    disabled={loading}
                    className="px-3 py-1.5 text-xs bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <FileText className="w-3 h-3" />
                    Create Design Sheet
                  </button>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors disabled:opacity-50 flex items-center gap-1"
                >
                  <Upload className="w-3 h-3" />
                  Upload Document
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip"
                />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-lodha-sand/40">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-lodha-gold rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-lodha-gold text-white'
                        : 'bg-white border border-lodha-steel/30'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {message.timestamp.toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-lodha-gold rounded-full flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div className="bg-white border border-lodha-steel/30 rounded-lg p-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-lodha-steel/30 bg-white rounded-b-lg">
              <div className="flex gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your projects..."
                  disabled={loading}
                  rows={2}
                  className="flex-1 px-3 py-2 border border-lodha-steel rounded-lg focus:ring-2 focus:ring-lodha-gold focus:border-transparent resize-none text-sm"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className="px-4 bg-lodha-gold text-white rounded-lg hover:bg-lodha-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-lodha-grey/70 mt-2">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </>
        )}
      </div>
      <PromptDialog {...promptDialogProps} />
    </div>
  );
}
