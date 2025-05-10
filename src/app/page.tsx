export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-base-200">
      <div className="card bg-base-100 shadow-xl p-6 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Lions Bible</h1>
        <p className="text-lg mb-6">
          A Progressive Web App for Bible study and community engagement at lionsbible.com.
        </p>
        <button className="btn btn-primary">Get Started</button>
      </div>
    </main>
  );
}