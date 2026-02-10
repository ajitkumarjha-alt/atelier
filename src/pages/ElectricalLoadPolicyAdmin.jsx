import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function ElectricalLoadPolicyAdmin() {
  const [norms, setNorms] = useState([]);
  const [editIdx, setEditIdx] = useState(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    fetch('/api/electrical-load-norms')
      .then(res => res.json())
      .then(setNorms);
  }, []);

  const handleEdit = idx => {
    setEditIdx(idx);
    setEditValue(norms[idx].value);
  };

  const handleSave = async idx => {
    await fetch(`/api/electrical-load-norms/${norms[idx].key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: editValue })
    });
    setEditIdx(null);
    setEditValue('');
    // Refresh
    fetch('/api/electrical-load-norms')
      .then(res => res.json())
      .then(setNorms);
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Policy Admin: Electrical Load Norms</h2>
        <table className="w-full border border-gray-300 rounded-lg">
          <thead className="bg-gray-100">
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Unit</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {norms.map((norm, idx) => (
              <tr key={norm.key}>
                <td>{norm.key}</td>
                <td>
                  {editIdx === idx ? (
                    <input value={editValue} onChange={e => setEditValue(e.target.value)} className="border px-2 py-1" />
                  ) : norm.value}
                </td>
                <td>{norm.unit}</td>
                <td>{norm.description}</td>
                <td>
                  {editIdx === idx ? (
                    <button onClick={() => handleSave(idx)} className="bg-green-600 text-white px-3 py-1 rounded">Save</button>
                  ) : (
                    <button onClick={() => handleEdit(idx)} className="bg-blue-600 text-white px-3 py-1 rounded">Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}
