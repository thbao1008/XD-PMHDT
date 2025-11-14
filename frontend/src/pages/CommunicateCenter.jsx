// src/pages/CommunicateCenter.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

export default function CommunicateCenter() {
  const [resources, setResources] = useState([]);

  useEffect(() => {
    async function fetchFeed() {
      const res = await api.get("/resources/feed"); 
      setResources(res.data.resources || []);
    }
    fetchFeed();
  }, []);

  return (
    <div className="communicate-center">
      <h2>Trung tâm học tập</h2>
      {resources.map(r => (
        <div key={r.id} className="feed-card">
          <h3>{r.title}</h3>
          <p>{r.description}</p>
          <small>
            👨‍🏫 {r.mentor_name} • {new Date(r.created_at).toLocaleDateString("vi-VN")}
          </small>

          {r.type === "video" && <video src={r.file_url} controls style={{ width: "100%" }} />}
          {r.type === "pdf" && <a href={r.file_url} target="_blank" rel="noreferrer">Xem PDF</a>}

          
        </div>
      ))}
    </div>
  );
}
