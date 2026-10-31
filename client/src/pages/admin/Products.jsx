import { useEffect, useState } from "react";

import AdminSidebar from "../../components/AdminSidebar";
import { Link } from "react-router-dom";
import api from "../../api/axios";
import useProductStore from "../../store/productStore";

export default function AdminProducts() {
  const { products, fetchProducts } = useProductStore();
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetchProducts({});
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    const res = await useProductStore.getState().deleteProduct(id);
    if (res.success) {
      setMsg("Deleted");
      fetchProducts({});
      setTimeout(() => setMsg(""), 2000);
    } else {
      setMsg(res.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Products</h1>
          <Link
            to="/admin/products/new"
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
          >
            + Add Product
          </Link>
        </div>

        {msg && (
          <div className="bg-green-100 text-green-700 p-3 rounded mb-4">
            {msg}
          </div>
        )}

        <div className="bg-white rounded shadow overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Image</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Category</th>
                <th className="p-3 text-left">Price</th>
                <th className="p-3 text-left">Stock</th>
                <th className="p-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p._id} className="border-t">
                  <td className="p-3">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  </td>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">₹{p.price}</td>
                  <td className="p-3">{p.stock}</td>
                  <td className="p-3 flex gap-2">
                    <Link
                      to={`/admin/products/edit/${p._id}`}
                      className="text-blue-600 hover:underline"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(p._id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
