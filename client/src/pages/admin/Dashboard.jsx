import { useEffect, useState } from 'react';

import AdminSidebar from '../../components/AdminSidebar';
import api from '../../api/axios';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, users: 0 });

  useEffect(() => {
    api.get('/products').then(({ data }) => {
      setStats((s) => ({ ...s, products: data.products.length }));
    });
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded shadow">
            <p className="text-gray-500">Total Products</p>
            <p className="text-4xl font-bold text-purple-600">{stats.products}</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <p className="text-gray-500">Categories</p>
            <p className="text-4xl font-bold text-rose-600">5</p>
          </div>
          <div className="bg-white p-6 rounded shadow">
            <p className="text-gray-500">Revenue</p>
            <p className="text-4xl font-bold text-green-600">₹0</p>
          </div>
        </div>
      </main>
    </div>
  );
}