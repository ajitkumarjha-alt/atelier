import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import Layout from '../components/Layout';
import L2TopStats from '../components/L2TopStats';
import ProjectStatusBoard from '../components/ProjectStatusBoard';
import { auth } from '../lib/firebase';

export default function L2Dashboard() {
  const [user, setUser] = useState(null);

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
    </Layout>
  );
}
