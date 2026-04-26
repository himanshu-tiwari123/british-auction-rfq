import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listRfqs } from "../services/api";

const statusColors = {
  UPCOMING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-700",
  FORCE_CLOSED: "bg-red-100 text-red-700",
};

const AuctionList = () => {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchRfqs = async () => {
    try {
      const res = await listRfqs();
      setRfqs(res.data.rfqs);
    } catch (err) {
      setError("Failed to load auctions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRfqs();
    // Refresh list every 30s to pick up status changes
    const interval = setInterval(fetchRfqs, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-500">
        Loading auctions...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">British Auctions</h1>
          <p className="text-gray-500 text-sm mt-1">{rfqs.length} auction(s) found</p>
        </div>
        <button
          onClick={fetchRfqs}
          className="text-sm text-blue-600 hover:underline font-medium"
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm border border-red-200">
          {error}
        </div>
      )}

      {rfqs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          No auctions found. Buyers can create a new RFQ.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">RFQ</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Buyer</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Lowest Bid</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Current Close</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Forced Close</th>
                <th className="text-left px-6 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rfqs.map((rfq) => (
                <tr key={rfq.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-gray-900">{rfq.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{rfq.referenceId}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{rfq.buyer}</td>
                  <td className="px-6 py-4">
                    {rfq.lowestBid != null ? (
                      <span className="font-semibold text-green-700">
                        ₹{rfq.lowestBid.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">No bids yet</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-xs">{formatDate(rfq.bidCloseTime)}</td>
                  <td className="px-6 py-4 text-gray-600 text-xs">{formatDate(rfq.forcedBidCloseTime)}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[rfq.status]}`}
                    >
                      {rfq.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/auctions/${rfq.id}`)}
                      className="text-blue-600 hover:underline font-medium text-xs"
                    >
                      View →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AuctionList;