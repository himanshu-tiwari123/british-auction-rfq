import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createRfq } from "../services/api";

const CreateRfq = () => {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    pickupDate: "",
    bidStartTime: "",
    bidCloseTime: "",
    forcedBidCloseTime: "",
    triggerWindowMins: 10,
    extensionDurationMins: 5,
    extensionTrigger: "BID_RECEIVED",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Frontend validation — forced close must be after bid close
    if (new Date(form.forcedBidCloseTime) <= new Date(form.bidCloseTime)) {
      setError("Forced Bid Close Time must be later than Bid Close Time.");
      return;
    }

    setLoading(true);
    try {
      const res = await createRfq(form);
      navigate(`/auctions/${res.data.rfq.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create RFQ.");
    } finally {
      setLoading(false);
    }
  };

  const triggerOptions = [
    { value: "BID_RECEIVED", label: "Any new bid received in last X minutes" },
    { value: "ANY_RANK_CHANGE", label: "Any supplier rank change in last X minutes" },
    { value: "L1_RANK_CHANGE", label: "Lowest bidder (L1) rank change in last X minutes" },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New RFQ</h1>
        <p className="text-gray-500 text-sm mt-1">Configure a British Auction for your freight requirements</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-base border-b pb-2">Basic Details</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">RFQ Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Mumbai to Delhi Freight Q1 2025"
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pickup / Service Date</label>
            <input
              type="datetime-local"
              name="pickupDate"
              value={form.pickupDate}
              onChange={handleChange}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Auction Timing */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-base border-b pb-2">Auction Timing</h2>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bid Start Date & Time</label>
              <input
                type="datetime-local"
                name="bidStartTime"
                value={form.bidStartTime}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bid Close Date & Time</label>
              <input
                type="datetime-local"
                name="bidCloseTime"
                value={form.bidCloseTime}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forced Bid Close Date & Time
                <span className="ml-1 text-xs text-red-500 font-normal">(must be after Bid Close)</span>
              </label>
              <input
                type="datetime-local"
                name="forcedBidCloseTime"
                value={form.forcedBidCloseTime}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* British Auction Configuration */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-800 text-base border-b pb-2">
            British Auction Configuration
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trigger Window (X minutes)
              </label>
              <input
                type="number"
                name="triggerWindowMins"
                value={form.triggerWindowMins}
                onChange={handleChange}
                min={1}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Watch this many minutes before close</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extension Duration (Y minutes)
              </label>
              <input
                type="number"
                name="extensionDurationMins"
                value={form.extensionDurationMins}
                onChange={handleChange}
                min={1}
                required
                className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Add this many minutes when triggered</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Extension Trigger</label>
            <select
              name="extensionTrigger"
              value={form.extensionTrigger}
              onChange={handleChange}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {triggerOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Summary box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <strong>How this works:</strong> The system will monitor activity in the last{" "}
            <strong>{form.triggerWindowMins} minute(s)</strong> before auction close. If triggered,
            the auction extends by <strong>{form.extensionDurationMins} minute(s)</strong>, but
            never beyond the Forced Close Time.
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold text-base hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Creating RFQ..." : "Create RFQ"}
        </button>
      </form>
    </div>
  );
};

export default CreateRfq;