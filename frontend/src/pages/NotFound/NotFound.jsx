import { Link } from "react-router-dom";

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-6 text-center">
      <p className="text-6xl font-bold text-brand-600">404</p>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Page not found
      </h1>

      <p className="mt-2 text-slate-500">
        The page you are looking for does not exist.
      </p>

      <Link
        to="/dashboard"
        className="mt-6 text-sm font-semibold text-brand-600 hover:underline"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}

export default NotFound;
