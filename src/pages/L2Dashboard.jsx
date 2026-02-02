import { useState, useEffect } from 'react';
import { Loader, MessageCircle } from 'lucide-react';
import Layout from '../components/Layout';
import L2TopStats from '../components/L2TopStats';
import ProjectStatusBoard from '../components/ProjectStatusBoard';
import AIChat from '../components/AIChat';
import { auth } from '../lib/firebase';

export default function L2Dashboard() {
  const [user, setUser] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-2">Execution & Tracking</h1>
        <p className="text-body">Monitor MEP project progress and pending approvals</p>
      </div>

      {/* Top Stats */}
      {user && <L2TopStats userEmail={user.email} />}

      {/* Project Status Board */}
      {user && <ProjectStatusBoard userEmail={user.email} />}

      {/* Floating AI Chat Button */}
      <button
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-6 right-6 bg-lodha-gold text-white p-4 rounded-full shadow-lg hover:bg-lodha-gold/90 transition-all hover:scale-110 flex items-center gap-2 z-40"
        title="AI Assistant"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="font-medium">AI Help</span>
      </button>

      {/* AI Chat Widget */}
      <AIChat
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        userLevel="L2"
      />
    </Layout>
  );
}
