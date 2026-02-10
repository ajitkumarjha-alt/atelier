import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';

export default function ElectricalLoadCalc() {
  const [loadData, setLoadData] = useState(null);

  useEffect(() => {
    // Fetch load calculation from backend
    fetch('/api/electrical-load-calc')
      .then(res => res.json())
      .then(setLoadData);
  }, []);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h2 className="text-2xl font-bold mb-4">Electrical Load Synopsis</h2>
        {loadData ? (
          <>
            <table className="w-full border border-gray-300 rounded-lg mb-6">
              <thead className="bg-gray-100">
                <tr>
                  <th>Category</th>
                  <th>Area (sqm)</th>
                  <th>Density (W/sqm)</th>
                  <th>Connected Load (kW)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Residential</td>
                  <td>{loadData.resiArea}</td>
                  <td>{loadData.densityResi}</td>
                  <td>{(loadData.resiArea * loadData.densityResi / 1000).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Commercial AC</td>
                  <td>{loadData.commArea}</td>
                  <td>{loadData.densityCommAC}</td>
                  <td>{(loadData.commArea * loadData.densityCommAC / 1000).toFixed(2)}</td>
                </tr>
                <tr>
                  <td>Other Commercial</td>
                  <td>{loadData.otherCommArea}</td>
                  <td>{loadData.densityOtherComm}</td>
                  <td>{(loadData.otherCommArea * loadData.densityOtherComm / 1000).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <div className="mb-4">
              <strong>Max Demand (KW):</strong> {loadData.maxDemandKW.toFixed(2)}<br />
              <strong>Required KVA:</strong> {loadData.requiredKVA.toFixed(2)}<br />
              <strong>Diversity Factor:</strong> {loadData.diversityFactor}<br />
              <strong>Power Factor:</strong> {loadData.powerFactor}<br />
              <strong>Substation Required:</strong> {loadData.substationRequired ? 'Yes' : 'No'}<br />
              <strong>Land (Indoor DTC):</strong> {loadData.landIndoorDTC} sqm<br />
              <strong>Land (Outdoor DTC):</strong> {loadData.landOutdoorDTC} sqm<br />
            </div>
          </>
        ) : (
          <div>Loading...</div>
        )}
      </div>
    </Layout>
  );
}
