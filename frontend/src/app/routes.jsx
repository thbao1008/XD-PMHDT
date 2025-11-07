import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import GuestRoute from "../components/GuestRoute";

// Pages
import Home from "../pages/Home";            
import Login from "../pages/Login";
import ProfilePage from "../pages/Profile"; 
import NotFound from "../pages/NotFound";

// Admin
import AdminLayout from "../components/admin/AdminLayout";
import Dashboard from "../components/admin/Dashboard";
import ReportsPage from "../components/admin/ReportsPage";
import UsersList from "../components/admin/UsersList";
import PackagesList from "../components/admin/PackagesList";
import PurchasesList from "../components/admin/PurchasesList";
import SupportTickets from "../components/admin/SupportTickets";

// Learner
import LearnerLayout from "../components/learner/LearnerLayout";
import SpeakingPractice from "../components/learner/SpeakingPractice";
import ProgressAnalytics from "../components/learner/ProgressAnalytics";
import Challenges from "../components/learner/Challenges";
import PackageCatalog from "../components/learner/PackageCatalog";

// Mentor
import MentorLayout from "../components/mentor/MentorLayout";
import AssessmentPanel from "../components/mentor/AssessmentPanel";
import FeedbackPanel from "../components/mentor/FeedbackPanel";
import TopicManager from "../components/mentor/TopicManager";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Home />} />
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />

      {/* Profile chung cho tất cả role */}
      <Route
        path="/profile/:id"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />

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
        <Route path="users" element={<UsersList />} />
        <Route path="packages" element={<PackagesList />} />
        <Route path="purchases" element={<PurchasesList />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="support" element={<SupportTickets />} />
        {/* fallback riêng cho admin */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
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
        <Route path="*" element={<Navigate to="/learn/catalog" replace />} />
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
        <Route path="*" element={<Navigate to="/mentor/assessment" replace />} />
      </Route>

      {/* Fallback chung */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
