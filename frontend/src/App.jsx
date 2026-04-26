import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import AuctionList from "./pages/AuctionList.jsx";
import AuctionDetail from "./pages/AuctionDetail.jsx";
import CreateRfq from "./pages/CreateRfq.jsx";

const Navbar = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="bg-blue-700 text-white px-6 py-3 flex items-center justify-between shadow-md">
      <div className="flex items-center gap-8">
        <Link to="/auctions" className="text-xl font-bold tracking-wide">
          🏷️ BritishAuction RFQ
        </Link>
        {token && (
          <div className="flex gap-6 text-sm font-medium">
            <Link to="/auctions" className="hover:text-blue-200 transition-colors">
              All Auctions
            </Link>
            {user.role === "BUYER" && (
              <Link to="/create-rfq" className="hover:text-blue-200 transition-colors">
                + Create RFQ
              </Link>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4 text-sm">
        {token ? (
          <>
            <span className="bg-blue-600 px-3 py-1 rounded-full text-xs font-semibold">
              {user.role}
            </span>
            <span className="text-blue-100">{user.name}</span>
            <button
              onClick={handleLogout}
              className="bg-white text-blue-700 px-3 py-1 rounded font-semibold hover:bg-blue-50 transition-colors"
            >
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" className="bg-white text-blue-700 px-3 py-1 rounded font-semibold hover:bg-blue-50">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
};

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/auctions" element={<PrivateRoute><AuctionList /></PrivateRoute>} />
          <Route path="/auctions/:id" element={<PrivateRoute><AuctionDetail /></PrivateRoute>} />
          <Route path="/create-rfq" element={<PrivateRoute><CreateRfq /></PrivateRoute>} />
          <Route path="*" element={<Navigate to="/auctions" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;