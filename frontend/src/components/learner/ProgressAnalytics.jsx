// frontend/src/components/learner/ProgressAnalytics.jsx
import React, { useState, useEffect } from "react";
import { getAuth } from "../../utils/auth";
import api from "../../api";
import { 
  FiTrendingUp, 
  FiTrendingDown, 
  FiActivity, 
  FiAward, 
  FiTarget,
  FiCheckCircle,
  FiAlertCircle,
  FiMessageSquare
} from "react-icons/fi";
import "../../styles/progress-analytics.css";

export default function ProgressAnalytics({ analytics: propsAnalytics = null, hideRecommendations = false }) {
  const auth = getAuth();
  const userId = auth?.user?.id ?? auth?.user?._id ?? auth?.user?.user_id ?? null;
  const [learnerId, setLearnerId] = useState(null);
  const [analytics, setAnalytics] = useState(propsAnalytics);
  const [loading, setLoading] = useState(!propsAnalytics);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Nếu có propsAnalytics, dùng luôn
    if (propsAnalytics) {
      setAnalytics(propsAnalytics);
      setLoading(false);
      return;
    }

    if (!userId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        
        // Get learner ID
        const lres = await api.get(`/learners/by-user/${userId}`);
        const learnerObj = lres.data?.learner ?? lres.data ?? null;
        const lid = learnerObj?.id ?? learnerObj?.learner_id ?? null;
        
        if (!lid) {
          setError("Không tìm thấy learner");
          setLoading(false);
          return;
        }
        
        setLearnerId(lid);
        
        // Get progress analytics
        const ares = await api.get(`/learners/${lid}/progress-analytics`);
        setAnalytics(ares.data);
      } catch (err) {
        console.error("Load progress analytics error:", err);
        setError(err.message || "Lỗi khi tải dữ liệu");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId, propsAnalytics]);

  if (loading) {
    return (
      <div className="progress-analytics-page">
        <div className="loading-state">
          <p>Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="progress-analytics-page">
        <div className="error-state">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="progress-analytics-page">
        <div className="empty-state">
          <p>Chưa có dữ liệu phân tích. Hãy bắt đầu luyện tập!</p>
        </div>
      </div>
    );
  }

  const { speaking_practice, challenges, overall, recommendations } = analytics;

  return (
    <div className="progress-analytics-page">
      {/* Header đã được xử lý ở dashboard, không cần hiển thị lại */}

      {/* Overall Progress */}
      <div className="analytics-section overall-section">
        <h3>
          <FiTarget /> Tổng Quan
        </h3>
        <div className="overall-stats">
          <div className="stat-card primary">
            <div className="stat-value">{Math.round(overall.overall_score)}</div>
            <div className="stat-label">Điểm Tổng Thể / 100</div>
            <div className="stat-progress">
              <div 
                className="stat-progress-bar" 
                style={{ width: `${overall.overall_score_rate * 100}%` }}
              />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{overall.total_practice_count}</div>
            <div className="stat-label">Tổng Số Lần Luyện Tập</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{overall.speaking_practice_count}</div>
            <div className="stat-label">Lần Luyện Nói</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-value">{overall.challenge_count}</div>
            <div className="stat-label">Challenges Đã Làm</div>
          </div>
        </div>
      </div>

      {/* Speaking Practice Stats */}
      <div className="analytics-section">
        <h3>
          <FiActivity /> Thống Kê Luyện Nói
        </h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Tổng số lần luyện</div>
            <div className="stat-value">{speaking_practice.total_sessions}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Đã hoàn thành</div>
            <div className="stat-value">{speaking_practice.completed_sessions}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Điểm trung bình</div>
            <div className="stat-value highlight">
              {speaking_practice.average_score.toFixed(1)}/100
            </div>
            <div className="stat-rate">
              Tỷ lệ: {(speaking_practice.score_rate * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Xu hướng (7 ngày gần nhất)</div>
            <div className={`stat-value ${speaking_practice.improvement_trend.is_improving ? 'trend-up' : 'trend-down'}`}>
              {speaking_practice.improvement_trend.is_improving ? (
                <><FiTrendingUp /> +{speaking_practice.improvement_trend.improvement.toFixed(2)}</>
              ) : (
                <><FiTrendingDown /> {speaking_practice.improvement_trend.improvement.toFixed(2)}</>
              )}
            </div>
          </div>
        </div>

        {/* Score by Level */}
        {speaking_practice.score_by_level && speaking_practice.score_by_level.length > 0 && (
          <div className="level-stats">
            <h4>Điểm theo Level</h4>
            <div className="level-list">
              {speaking_practice.score_by_level.map((level, idx) => (
                <div key={idx} className="level-item">
                  <span className="level-name">Level {level.level}</span>
                  <span className="level-score">{level.average_score.toFixed(1)}/100</span>
                  <span className="level-count">({level.count} lần)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Challenge Stats */}
      <div className="analytics-section">
        <h3>
          <FiAward /> Thống Kê Challenges
        </h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Tổng số challenges</div>
            <div className="stat-value">{challenges.total_challenges}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Đã được mentor chấm</div>
            <div className="stat-value">{challenges.graded_challenges}</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Điểm trung bình (Mentor)</div>
            <div className="stat-value highlight">
              {challenges.average_final_score.toFixed(1)}/100
            </div>
            <div className="stat-rate">
              Tỷ lệ: {(challenges.score_rate * 100).toFixed(1)}%
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Phát âm</div>
            <div className="stat-value">{challenges.average_pronunciation.toFixed(1)}/100</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Độ trôi chảy</div>
            <div className="stat-value">{challenges.average_fluency.toFixed(1)}/100</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-label">Xu hướng (7 ngày gần nhất)</div>
            <div className={`stat-value ${challenges.improvement_trend.is_improving ? 'trend-up' : 'trend-down'}`}>
              {challenges.improvement_trend.is_improving ? (
                <><FiTrendingUp /> +{challenges.improvement_trend.improvement.toFixed(2)}</>
              ) : (
                <><FiTrendingDown /> {challenges.improvement_trend.improvement.toFixed(2)}</>
              )}
            </div>
          </div>
        </div>

        {/* Recent Challenges */}
        {challenges.recent_challenges && challenges.recent_challenges.length > 0 && (
          <div className="recent-challenges">
            <h4>Challenges Gần Đây</h4>
            <div className="challenges-list">
              {challenges.recent_challenges.map((challenge, idx) => (
                <div key={idx} className="challenge-item">
                  <div className="challenge-title">{challenge.title}</div>
                  <div className="challenge-scores">
                    <span>Điểm: {challenge.final_score.toFixed(1)}/100</span>
                    <span>Phát âm: {challenge.pronunciation_score.toFixed(1)}/100</span>
                    <span>Trôi chảy: {challenge.fluency_score.toFixed(1)}/100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Recommendations - Chỉ hiển thị nếu không hideRecommendations */}
      {!hideRecommendations && (
        <div className="analytics-section recommendations-section">
          <h3>
            <FiMessageSquare /> Đánh Giá & Gợi Ý Từ AI
          </h3>
          
          {recommendations.overall_assessment && (
            <div className="assessment-box">
              <p>{recommendations.overall_assessment}</p>
            </div>
          )}

          {recommendations.strengths && recommendations.strengths.length > 0 && (
            <div className="recommendations-group">
              <h4>
                <FiCheckCircle className="icon-success" /> Điểm Mạnh
              </h4>
              <ul className="recommendations-list">
                {recommendations.strengths.map((strength, idx) => (
                  <li key={idx}>{strength}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.improvements_needed && recommendations.improvements_needed.length > 0 && (
            <div className="recommendations-group">
              <h4>
                <FiAlertCircle className="icon-warning" /> Cần Cải Thiện
              </h4>
              <ul className="recommendations-list">
                {recommendations.improvements_needed.map((improvement, idx) => (
                  <li key={idx}>{improvement}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.recommendations && recommendations.recommendations.length > 0 && (
            <div className="recommendations-group">
              <h4>
                <FiTarget className="icon-primary" /> Gợi Ý Cải Thiện
              </h4>
              <ul className="recommendations-list">
                {recommendations.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {recommendations.priority_areas && recommendations.priority_areas.length > 0 && (
            <div className="recommendations-group">
              <h4>
                <FiTarget className="icon-primary" /> Lĩnh Vực Ưu Tiên
              </h4>
              <ul className="recommendations-list">
                {recommendations.priority_areas.map((area, idx) => (
                  <li key={idx}>{area}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
