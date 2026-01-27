// components/FreeSignupBanner.jsx
import { Link } from "react-router-dom";

export default function FreeSignupBanner() {
  return (
    <div className="bg-[#0f2e1f] border-l-4 border-green-500 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-white mb-1">
        Follow CSB for free
      </h3>

      <p className="text-sm text-gray-300 mb-3">
        Create a free account to access dashboards, track performance,
        and follow featured picks.
        <br />
        <span className="text-gray-400">No card required.</span>
      </p>

      <Link
        to="/signup"
        className="inline-flex items-center justify-center
                   bg-green-500 hover:bg-green-600
                   text-black font-semibold
                   px-5 py-2 rounded text-sm"
      >
        Create free account
      </Link>

      <p className="text-xs text-gray-400 mt-2">
        Free plan · Upgrade to Premium anytime
      </p>
    </div>
  );
}