import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import GuestRoute from "../components/GuestRoute";

// Pages chung
import Home from "../pages/Home";
import Login from "../pages/Login";
import ProfilePage from "../pages/Profile";
import NotFound from "../pages/NotFound";
import CommunicateCenter from "../pages/CommunicateCenter";   // thêm

// Admin
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboard from "../components/admin/AdminDashboard";
import ReportsPage from "../components/admin/ReportsPage";
import UsersList from "../components/admin/UsersList";
import PackagesList from "../components/admin/PackagesList";
import PurchasesList from "../components/admin/PurchasesList";
import PurchasesPage from "../components/admin/PurchasesPage";
import SupportTickets from "../components/admin/SupportTickets";

// Learner
import LearnerLayout from "../components/learner/LearnerLayout";
// Đổi import: dùng LearningCatalog thay cho PackageCatalog
import LearningCatalog from "../components/learner/LearningCatalog";
import SpeakingPractice from "../components/learner/SpeakingPractice";
import Challenges from "../components/learner/Challenges";
import ProgressAnalytics from "../components/learner/ProgressAnalytics";

// Mentor
import MentorLayout from "../components/mentor/MentorLayout";
import MentorDashboard from "../components/mentor/MentorDashboard";
import AssessmentPanel from "../components/mentor/AssessmentPanel";
import FeedbackPanel from "../components/mentor/FeedbackPanel";
import TopicManager from "../components/mentor/TopicManager";
import MentorSessions from "../components/mentor/MentorSessions";
import MentorLearners from "../components/mentor/MentorLearners";
import MentorResources from "../components/mentor/MentorResources";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
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

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UsersList />} />
        <Route path="packages" element={<PackagesList />} />
        <Route path="purchases" element={<PurchasesList />} />
        <Route path="learners/:id/purchases" element={<PurchasesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="support" element={<SupportTickets />} />
        <Route path="communicate" element={<CommunicateCenter />} /> {/* thêm */}
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Route>

      {/* Learner routes */}
      <Route
        path="/learn"
        element={
          <ProtectedRoute requiredRole="learner">
            <LearnerLayout />
          </ProtectedRoute>
        }
      >
        {/* Đổi component ở đây */}
        <Route index element={<LearningCatalog />} />
        <Route path="catalog" element={<LearningCatalog />} />
        <Route path="practice" element={<SpeakingPractice />} />
        <Route path="challenges" element={<Challenges />} />
        <Route path="progress" element={<ProgressAnalytics />} />
        <Route path="communicate" element={<CommunicateCenter />} /> {/* thêm */}
        <Route path="*" element={<Navigate to="/learn/catalog" replace />} />
      </Route>

      {/* Mentor routes */}
      <Route
        path="/mentor"
        element={
          <ProtectedRoute requiredRole="mentor">
            <MentorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<MentorDashboard />} />
        <Route path="dashboard" element={<MentorDashboard />} />
        <Route path="assessment" element={<AssessmentPanel />} />
        <Route path="feedback" element={<FeedbackPanel />} />
        <Route path="topics" element={<TopicManager />} />
        <Route path="sessions" element={<MentorSessions />} />
        <Route path="learners" element={<MentorLearners />} />
        <Route path="resources" element={<MentorResources />} />
        <Route path="communicate" element={<CommunicateCenter />} /> {/* thêm */}
        <Route path="*" element={<Navigate to="/mentor/dashboard" replace />} />
      </Route>

      {/* Fallback chung */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
