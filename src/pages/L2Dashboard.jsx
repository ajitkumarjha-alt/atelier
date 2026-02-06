import { useState, useEffect } from 'react';
import { MessageCircle, Filter, Search, TrendingUp, Activity } from 'lucide-react';
import Layout from '../components/Layout';
import L2TopStats from '../components/L2TopStats';
import ProjectStatusBoard from '../components/ProjectStatusBoard';
import AIChat from '../components/AIChat';
import { auth } from '../lib/firebase';

export default function L2Dashboard() {
  const [user, setUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'
  const [filterStatus, setFilterStatus] = useState('All');

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="heading-primary mb-1">Execution Dashboard</h1>
            <p className="text-body">Lead-level project tracking and monitoring</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-white border border-lodha-steel rounded-lg p-1">
            <button
              onClick={() => setViewMode('board')}
              className={`px-4 py-2 rounded-md text-sm font-jost font-semibold transition-all ${
                viewMode === 'board'
                  ? 'bg-lodha-gold text-white shadow-sm'
                  : 'text-lodha-grey hover:bg-lodha-sand'
              }`}
            >
              Board View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-jost font-semibold transition-all ${
                viewMode === 'list'
                  ? 'bg-lodha-gold text-white shadow-sm'
                  : 'text-lodha-grey hover:bg-lodha-sand'
              }`}
            >
              List View
            </button>
          </div>
        </div>
      </div>

      {/* Top Stats with Lodha Colors */}
      {user && (
        <div className="mb-8">
          <L2TopStats userEmail={user.email} />
        </div>
      )}

      {/* Activity Ribbon */}
      <div className="mb-6 bg-lodha-cream border border-lodha-muted-gold/30 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-lodha-gold/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity className="w-5 h-5 text-lodha-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-jost font-semibold text-lodha-grey text-sm">Recent Activity</p>
            <p className="text-xs text-lodha-grey/60 font-jost">Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
          <button className="text-xs text-lodha-gold hover:text-lodha-grey font-jost font-semibold whitespace-nowrap">
            View All →
          </button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm font-jost font-semibold text-lodha-grey">
          <Filter className="w-4 h-4" />
          <span>Quick Filter:</span>
        </div>
        {['All', 'In Progress', 'Delayed', 'Completed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-4 py-2 rounded-full text-sm font-jost font-semibold transition-all ${
              filterStatus === status
                ? 'bg-lodha-gold text-white shadow-md'
                : 'bg-white border border-lodha-steel text-lodha-grey hover:bg-lodha-sand'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Project Status Board with enhanced styling */}
      {user && (
        <div className="mb-8">
          <ProjectStatusBoard userEmail={user.email} viewMode={viewMode} filterStatus={filterStatus} />
        </div>
      )}

      {/* Insights Section - Placeholder for future charts */}
      <div className="bg-white border border-lodha-steel rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-lodha-muted-gold/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-lodha-muted-gold" />
          </div>
          <div>
            <h2 className="font-garamond text-xl font-bold text-lodha-grey">Performance Insights</h2>
            <p className="text-sm text-lodha-grey/60 font-jost">Project velocity and trends</p>
          </div>
        </div>
        <div className="bg-lodha-sand/30 border border-lodha-muted-gold/20 rounded-lg p-8 text-center">
          <p className="text-lodha-grey/60 font-jost">Performance charts and analytics coming soon</p>
        </div>
      </div>

      {/* Floating AI Chat Button with Lodha styling */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-lodha-gold text-white p-4 rounded-full shadow-lg hover:bg-lodha-grey transition-all hover:scale-110 flex items-center gap-2 z-40"
        title="AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="font-medium font-jost">AI Help</span>
      </button>

      {/* AI Chat Widget */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel="L2"
        projectId={null}
        user={user}
      />
    </Layout>
  );
}
