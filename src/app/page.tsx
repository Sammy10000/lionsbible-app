export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gray-100">
      <div className="bg-white shadow-lg rounded-lg p-8 text-center max-w-md">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Welcome to Lions Bible</h1>
        <p className="text-lg text-gray-600 mb-6">
          A Progressive Web App for Bible study and community engagement at lionsbible.com.
        </p>
        <button className="bg-blue-500 text-white font-semibold py-2 px-4 rounded hover:bg-blue-600 transition">
          Get Started
        </button>
      </div>
    </main>
  );
}