// src/app/routes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../components/admin/Dashboard";
import Profile from "../pages/Profile";
import NotFound from "../pages/NotFound";

import AdminLayout from "../components/admin/AdminLayout";
import ReportsPage from "../components/admin/ReportsPage";

import LearnerLayout from "../components/learner/LearnerLayout";
import SpeakingPractice from "../components/learner/SpeakingPractice";
import ProgressAnalytics from "../components/learner/ProgressAnalytics";
import Challenges from "../components/learner/Challenges";
import PackageCatalog from "../components/learner/PackageCatalog";

import MentorLayout from "../components/mentor/MentorLayout";
import AssessmentPanel from "../components/mentor/AssessmentPanel";
import FeedbackPanel from "../components/mentor/FeedbackPanel";
import TopicManager from "../components/mentor/TopicManager";

import { getAuth } from "../utils/auth";

/* Bọc route cần đăng nhập cho admin */
function RequireAdmin({ children }) {
  const auth = getAuth();
  if (!auth?.token || auth?.user?.role !== "admin") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/* Bọc route cần đăng nhập cho learner */
function RequireLearner({ children }) {
  const auth = getAuth();
  if (!auth?.token || auth?.user?.role !== "learner") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/* Bọc route cần đăng nhập cho mentor */
function RequireMentor({ children }) {
  const auth = getAuth();
  if (!auth?.token || auth?.user?.role !== "mentor") {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Route không cần đăng nhập */}
      <Route path="/login" element={<Login />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="404" element={<NotFound />} />
        <Route path="*" element={<Navigate to="/admin/404" replace />} />
      </Route>

      {/* Learner */}
      <Route
        path="/learn"
        element={
          <RequireLearner>
            <LearnerLayout />
          </RequireLearner>
        }
      >
        <Route index element={<PackageCatalog />} />
        <Route path="catalog" element={<PackageCatalog />} />
        <Route path="practice" element={<SpeakingPractice />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="progress" element={<ProgressAnalytics />} />
      </Route>

      {/* Mentor */}
      <Route
        path="/mentor"
        element={
          <RequireMentor>
            <MentorLayout />
          </RequireMentor>
        }
      >
        <Route index element={<AssessmentPanel />} />
        <Route path="assessment" element={<AssessmentPanel />} />
        <Route path="feedback" element={<FeedbackPanel />} />
        <Route path="topics" element={<TopicManager />} />
      </Route>

      {/* Fallback root */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/admin/404" replace />} />
    </Routes>
  );
}
