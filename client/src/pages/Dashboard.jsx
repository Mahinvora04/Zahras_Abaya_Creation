import useAuthStore from '../store/authStore';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
        <div className="space-y-2 text-gray-700">
          <p>
            <span className="font-semibold">Name:</span> {user?.name}
          </p>
          <p>
            <span className="font-semibold">Email:</span> {user?.email}
          </p>
          <p>
            <span className="font-semibold">ID:</span> {user?._id}
          </p>
        </div>
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-green-800 text-sm">
            ✅ You are logged in. This is a protected route.
          </p>
        </div>
      </div>
    </div>
  );
}