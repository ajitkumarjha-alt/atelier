import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import L1ProjectTable from '../components/L1ProjectTable';
import AIChat from '../components/AIChat';
import MyAssignmentsWidget from '../components/MyAssignmentsWidget';
import MeetingPointWidget from '../components/MeetingPointWidget';
import { auth } from '../lib/firebase';
import { Plus, MessageCircle, Calendar, Send, ListChecks, AlertTriangle, FileText, Database } from 'lucide-react';
import { apiFetchJson } from '../lib/api';

export default function L1Dashboard() {
  const [user, setUser] = useState(null);
  const [userLevel, setUserLevel] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [rfcStats, setRfcStats] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
    
    if (currentUser?.email) {
      fetchUserLevel(currentUser.email);
    }
    // Fetch extra stats
    apiFetchJson('/api/rfc/summary').then(setRfcStats).catch(() => {});
    apiFetchJson('/api/tasks/stats').then(setTaskStats).catch(() => {});
  }, []);

  const fetchUserLevel = async (email) => {
    try {
      const response = await fetch(`/api/users/email/${encodeURIComponent(email)}`);
      if (response.ok) {
        const userData = await response.json();
        setUserLevel(userData.user_level);
      }
    } catch (err) {
      console.error('Error fetching user level:', err);
      setUserLevel('L1'); // Default fallback
    }
  };

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-8">
        <div className="flex-1 min-w-0">
          <h1 className="heading-primary mb-2">Project Allocation</h1>
          <p className="text-body">Manage MEP project assignments across all leads</p>
        </div>
        <button
          onClick={() => navigate('/project-input')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-lodha-gold text-white font-jost font-semibold rounded-lg hover:bg-lodha-gold/90 whitespace-nowrap shrink-0"
        >
          <Plus className="w-5 h-5" />
          Create New Project
        </button>
      </div>

      {/* Meeting Point */}
      <MeetingPointWidget />

      {/* My Assignments Widget */}
      <MyAssignmentsWidget />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button onClick={() => navigate('/rfc-management')} className="bg-white border border-lodha-steel rounded-xl p-4 hover:shadow-md transition-all text-left">
          <Send className="w-5 h-5 text-amber-600 mb-2" />
          <p className="text-sm font-jost font-semibold text-lodha-grey">RFC Review</p>
          <p className="text-xs text-lodha-grey/60 font-jost">{rfcStats?.pending || 0} pending</p>
        </button>
        <button onClick={() => navigate('/task-management')} className="bg-white border border-lodha-steel rounded-xl p-4 hover:shadow-md transition-all text-left">
          <ListChecks className="w-5 h-5 text-blue-600 mb-2" />
          <p className="text-sm font-jost font-semibold text-lodha-grey">Tasks</p>
          <p className="text-xs text-lodha-grey/60 font-jost">{taskStats?.overdue || 0} overdue</p>
        </button>
        <button onClick={() => navigate('/mas-list')} className="bg-white border border-lodha-steel rounded-xl p-4 hover:shadow-md transition-all text-left">
          <FileText className="w-5 h-5 text-lodha-gold mb-2" />
          <p className="text-sm font-jost font-semibold text-lodha-grey">MAS Approvals</p>
          <p className="text-xs text-lodha-grey/60 font-jost">Review materials</p>
        </button>
        <button onClick={() => navigate('/standards')} className="bg-white border border-lodha-steel rounded-xl p-4 hover:shadow-md transition-all text-left">
          <Database className="w-5 h-5 text-lodha-grey mb-2" />
          <p className="text-sm font-jost font-semibold text-lodha-grey">Standards</p>
          <p className="text-xs text-lodha-grey/60 font-jost">Manage policies</p>
        </button>
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <L1ProjectTable userEmail={user?.email} userLevel={userLevel} />
        </div>
        {/* Scroll indicator for mobile */}
        <div className="lg:hidden text-center py-2 text-xs text-lodha-grey border-t border-lodha-steel/30">
          ← Scroll to see all columns →
        </div>
      </div>

      {/* AI Help Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-lodha-gold to-yellow-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 z-40"
        title="AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="font-medium">AI Help</span>
      </button>

      {/* AI Chat Widget */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel="L1"
        projectId={null}
        user={user}
      />
    </Layout>
  );
}
