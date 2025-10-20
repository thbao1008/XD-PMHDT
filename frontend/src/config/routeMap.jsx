import Dashboard from "../components/admin/Dashboard.jsx";
import UsersList from "../components/admin/UsersList.jsx";
import MentorsList from "../components/admin/MentorsList.jsx";
import PackagesList from "../components/admin/PackagesList.jsx";
import PurchasesList from "../components/admin/PurchasesList.jsx";
import ReportsPage from "../components/admin/ReportsPage.jsx";
import SupportTickets from "../components/admin/SupportTickets.jsx";

import AssessmentPanel from "../components/mentor/AssessmentPanel.jsx";
import FeedbackPanel from "../components/mentor/FeedbackPanel.jsx";
import TopicManager from "../components/mentor/TopicManager.jsx";

import PackageCatalog from "../components/learner/PackageCatalog.jsx";
import SpeakingPractice from "../components/learner/SpeakingPractice.jsx";
import Challenges from "../components/learner/Challenges.jsx";
import ProgressAnalytics from "../components/learner/ProgressAnalytics.jsx";

export const ROUTE_MAP = {
  dashboard: Dashboard,
  users: UsersList,
  mentors: MentorsList,
  packages: PackagesList,
  purchases: PurchasesList,
  reports: ReportsPage,
  support: SupportTickets,

  assessment: AssessmentPanel,
  feedback: FeedbackPanel,
  topics: TopicManager,

  catalog: PackageCatalog,
  practice: SpeakingPractice,
  challenges: Challenges,
  progress: ProgressAnalytics
};
