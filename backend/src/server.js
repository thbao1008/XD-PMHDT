﻿import express from "express"; import cors from "cors";
const app = express(); app.use(cors()); app.use(express.json());
app.get("/health", (_,res)=>res.json({ok:true}));
app.listen(4000, ()=>console.log("API chạy tại http://localhost:4000"));
