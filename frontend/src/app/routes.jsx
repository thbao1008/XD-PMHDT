import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/Login";
import Profile from "../pages/Profile";
import NotFound from "../pages/NotFound";

import AdminLayout from "../components/admin/AdminLayout";
import Dashboard from "../components/admin/Dashboard";
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

import ProtectedRoute from "../components/ProtectedRoute";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
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
          <ProtectedRoute requiredRole="learner">
            <LearnerLayout />
          </ProtectedRoute>
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
          <ProtectedRoute requiredRole="mentor">
            <MentorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AssessmentPanel />} />
        <Route path="assessment" element={<AssessmentPanel />} />
        <Route path="feedback" element={<FeedbackPanel />} />
        <Route path="topics" element={<TopicManager />} />
      </Route>

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
