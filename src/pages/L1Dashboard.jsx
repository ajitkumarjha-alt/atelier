import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import L1ProjectTable from '../components/L1ProjectTable';
import { auth } from '../lib/firebase';

export default function L1Dashboard() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(auth.currentUser);
  }, []);

  return (
    <Layout>
      {/* Dashboard Header */}
      <div className="mb-8">
        <h1 className="heading-primary mb-2">Project Allocation</h1>
        <p className="text-body">Manage MEP project assignments across all leads</p>
      </div>

      {/* Projects Table */}
      <div className="card">
        <L1ProjectTable userEmail={user?.email} />
      </div>
    </Layout>
  );
}
