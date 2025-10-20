import axios from "axios";

const http = axios.create({
  baseURL: "http://localhost:8080/api", // hoặc URL gateway thật
  timeout: 5000,
  headers: {
    "Content-Type": "application/json"
  }
});

export default http;
