const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided, access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, email, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Only buyers can access certain routes
const buyerOnly = (req, res, next) => {
  if (req.user.role !== "BUYER") {
    return res.status(403).json({ message: "Access restricted to buyers only" });
  }
  next();
};

// Only suppliers can access certain routes
const supplierOnly = (req, res, next) => {
  if (req.user.role !== "SUPPLIER") {
    return res.status(403).json({ message: "Access restricted to suppliers only" });
  }
  next();
};

module.exports = { protect, buyerOnly, supplierOnly };