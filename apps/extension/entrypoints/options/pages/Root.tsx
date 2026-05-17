import { Outlet } from "@tanstack/react-router";

export default function Root() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Play AI</h1>
          <p className="text-sm text-gray-600 mt-2">Chat about YouTube videos</p>
        </div>
        <Outlet />
      </div>
    </div>
  );
}
