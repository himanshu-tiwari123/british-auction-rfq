import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:5001/api",
});

// Automatically attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const registerUser = (data) => API.post("/auth/register", data);
export const loginUser = (data) => API.post("/auth/login", data);

// RFQ
export const createRfq = (data) => API.post("/rfq/create", data);
export const listRfqs = () => API.get("/rfq/list");
export const getRfqById = (id) => API.get(`/rfq/${id}`);

// Bids
export const submitBid = (data) => API.post("/bid/submit", data);
export const getBidsForRfq = (rfqId) => API.get(`/bid/${rfqId}`);