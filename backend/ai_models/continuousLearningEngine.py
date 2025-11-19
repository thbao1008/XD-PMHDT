"""
Continuous Learning Engine - Training AI liên tục với cường độ tư duy cao
Dựa trên: Khai phá sức mạnh AI trong giảng dạy tiếng Anh

Tính năng:
1. Cá nhân hóa trải nghiệm học tập - điều chỉnh theo từng học viên
2. Tự động hóa phân tích - chấm điểm, theo dõi tiến độ, tạo bài kiểm tra
3. Phân tích dữ liệu học tập chi tiết - hiệu suất, patterns, insights
4. Continuous learning - học từ mỗi interaction
"""

import json
import sys
import os
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from collections import defaultdict

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

class ContinuousLearningEngine:
    def __init__(self):
        self.learner_profiles = {}  # Lưu profile từng học viên
        self.learning_patterns = defaultdict(list)  # Patterns học tập
        self.performance_analytics = {}  # Phân tích hiệu suất
        self.adaptive_strategies = {}  # Chiến lược thích ứng
        
    def analyze_learner_performance(self, learner_id: int, session_data: Dict) -> Dict[str, Any]:
        """
        Phân tích chi tiết hiệu suất học tập của học viên
        Tư duy cao: Pattern recognition, trend analysis, predictive insights
        """
        # Thu thập dữ liệu
        scores = session_data.get('scores', [])
        topics = session_data.get('topics', [])
        durations = session_data.get('durations', [])
        strengths = session_data.get('strengths', [])
        improvements = session_data.get('improvements', [])
        
        # Phân tích patterns
        analysis = {
            'learner_id': learner_id,
            'timestamp': datetime.now().isoformat(),
            'performance_metrics': self._calculate_performance_metrics(scores, durations),
            'learning_patterns': self._identify_learning_patterns(scores, topics, durations),
            'strength_areas': self._analyze_strengths(strengths),
            'improvement_areas': self._analyze_improvements(improvements),
            'trend_analysis': self._analyze_trends(scores),
            'personalized_recommendations': self._generate_recommendations(scores, topics, strengths, improvements),
            'adaptive_strategy': self._create_adaptive_strategy(learner_id, scores, topics)
        }
        
        # Lưu vào profile
        if learner_id not in self.learner_profiles:
            self.learner_profiles[learner_id] = {
                'created_at': datetime.now().isoformat(),
                'sessions': [],
                'total_practice_time': 0,
                'average_score': 0
            }
        
        self.learner_profiles[learner_id]['sessions'].append(analysis)
        self._update_learner_profile(learner_id, analysis)
        
        return analysis
    
    def _calculate_performance_metrics(self, scores: List[float], durations: List[int]) -> Dict:
        """Tính toán các metrics hiệu suất"""
        if not scores:
            return {}
        
        return {
            'average_score': sum(scores) / len(scores),
            'max_score': max(scores),
            'min_score': min(scores),
            'score_variance': self._calculate_variance(scores),
            'improvement_rate': self._calculate_improvement_rate(scores),
            'consistency': self._calculate_consistency(scores),
            'average_duration': sum(durations) / len(durations) if durations else 0,
            'efficiency': self._calculate_efficiency(scores, durations)
        }
    
    def _identify_learning_patterns(self, scores: List[float], topics: List[str], durations: List[int]) -> Dict:
        """Nhận diện patterns học tập - tư duy cao"""
        patterns = {
            'peak_performance_times': self._find_peak_times(scores, durations),
            'topic_preferences': self._analyze_topic_performance(topics, scores),
            'learning_curve': self._calculate_learning_curve(scores),
            'retention_patterns': self._analyze_retention(scores),
            'engagement_patterns': self._analyze_engagement(durations, scores)
        }
        return patterns
    
    def _analyze_strengths(self, strengths: List[str]) -> Dict:
        """Phân tích điểm mạnh - tư duy phân tích"""
        if not strengths:
            return {}
        
        strength_frequency = defaultdict(int)
        for strength_list in strengths:
            if isinstance(strength_list, list):
                for s in strength_list:
                    strength_frequency[s.lower()] += 1
            elif isinstance(strength_list, str):
                try:
                    parsed = json.loads(strength_list)
                    if isinstance(parsed, list):
                        for s in parsed:
                            strength_frequency[s.lower()] += 1
                except:
                    strength_frequency[strength_list.lower()] += 1
        
        sorted_strengths = sorted(strength_frequency.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'top_strengths': [s[0] for s in sorted_strengths[:5]],
            'strength_frequency': dict(sorted_strengths),
            'consistency': len(set(strength_frequency.keys())) / len(strength_frequency) if strength_frequency else 0
        }
    
    def _analyze_improvements(self, improvements: List[str]) -> Dict:
        """Phân tích cần cải thiện - tư duy phản biện"""
        if not improvements:
            return {}
        
        improvement_frequency = defaultdict(int)
        for improvement_list in improvements:
            if isinstance(improvement_list, list):
                for i in improvement_list:
                    improvement_frequency[i.lower()] += 1
            elif isinstance(improvement_list, str):
                try:
                    parsed = json.loads(improvement_list)
                    if isinstance(parsed, list):
                        for i in parsed:
                            improvement_frequency[i.lower()] += 1
                except:
                    improvement_frequency[improvement_list.lower()] += 1
        
        sorted_improvements = sorted(improvement_frequency.items(), key=lambda x: x[1], reverse=True)
        
        return {
            'priority_improvements': [i[0] for i in sorted_improvements[:5]],
            'improvement_frequency': dict(sorted_improvements),
            'focus_areas': self._categorize_improvements(sorted_improvements)
        }
    
    def _analyze_trends(self, scores: List[float]) -> Dict:
        """Phân tích xu hướng - tư duy dự đoán"""
        if len(scores) < 2:
            return {}
        
        # Tính slope (xu hướng)
        n = len(scores)
        x = list(range(n))
        y = scores
        
        # Linear regression để tìm trend
        sum_x = sum(x)
        sum_y = sum(y)
        sum_xy = sum(x[i] * y[i] for i in range(n))
        sum_x2 = sum(x[i] ** 2 for i in range(n))
        
        slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x ** 2) if (n * sum_x2 - sum_x ** 2) != 0 else 0
        intercept = (sum_y - slope * sum_x) / n
        
        # Dự đoán điểm tiếp theo
        predicted_next = slope * n + intercept
        
        return {
            'trend': 'improving' if slope > 0.1 else 'declining' if slope < -0.1 else 'stable',
            'slope': slope,
            'predicted_next_score': max(0, min(10, predicted_next)),
            'momentum': self._calculate_momentum(scores),
            'volatility': self._calculate_volatility(scores)
        }
    
    def _generate_recommendations(self, scores: List[float], topics: List[str], 
                                  strengths: List, improvements: List) -> List[Dict]:
        """Tạo recommendations cá nhân hóa - tư duy sáng tạo"""
        recommendations = []
        
        # Dựa trên performance
        avg_score = sum(scores) / len(scores) if scores else 5
        if avg_score < 6:
            recommendations.append({
                'type': 'foundation',
                'priority': 'high',
                'message': 'Focus on building strong foundation. Practice basic vocabulary and simple sentences.',
                'action': 'Increase practice frequency with level-appropriate content'
            })
        elif avg_score < 8:
            recommendations.append({
                'type': 'intermediate',
                'priority': 'medium',
                'message': 'Good progress! Challenge yourself with more complex topics.',
                'action': 'Try level 2-3 topics to push boundaries'
            })
        else:
            recommendations.append({
                'type': 'advanced',
                'priority': 'low',
                'message': 'Excellent performance! Maintain consistency and explore advanced topics.',
                'action': 'Focus on fluency and natural expression'
            })
        
        # Dựa trên improvements
        improvement_analysis = self._analyze_improvements(improvements)
        if improvement_analysis.get('priority_improvements'):
            top_improvement = improvement_analysis['priority_improvements'][0]
            recommendations.append({
                'type': 'targeted',
                'priority': 'high',
                'message': f'Focus on improving: {top_improvement}',
                'action': f'Practice exercises specifically targeting {top_improvement}'
            })
        
        # Dựa trên topics
        if topics:
            topic_analysis = self._analyze_topic_performance(topics, scores)
            weak_topics = [t for t, s in topic_analysis.items() if s < avg_score]
            if weak_topics:
                recommendations.append({
                    'type': 'topic_focus',
                    'priority': 'medium',
                    'message': f'Review and practice these topics: {", ".join(weak_topics[:3])}',
                    'action': 'Spend extra time on challenging topics'
                })
        
        return recommendations
    
    def _create_adaptive_strategy(self, learner_id: int, scores: List[float], topics: List[str]) -> Dict:
        """Tạo chiến lược thích ứng - tư duy chiến lược"""
        avg_score = sum(scores) / len(scores) if scores else 5
        trend = self._analyze_trends(scores)
        
        strategy = {
            'learner_id': learner_id,
            'current_level': self._determine_level(avg_score),
            'recommended_level': self._recommend_level(avg_score, trend),
            'pace_adjustment': self._recommend_pace(scores),
            'content_focus': self._recommend_content_focus(topics, scores),
            'practice_frequency': self._recommend_frequency(scores),
            'intervention_needed': avg_score < 4 or trend.get('trend') == 'declining'
        }
        
        self.adaptive_strategies[learner_id] = strategy
        return strategy
    
    def personalize_prompt_generation(self, learner_id: int, level: int, 
                                     used_topics: List[str] = None) -> Dict[str, Any]:
        """
        Cá nhân hóa prompt generation dựa trên profile học viên
        Tư duy cao: Adaptive learning, personalization engine
        """
        profile = self.learner_profiles.get(learner_id, {})
        strategy = self.adaptive_strategies.get(learner_id, {})
        
        # Điều chỉnh level dựa trên performance
        recommended_level = strategy.get('recommended_level', level)
        content_focus = strategy.get('content_focus', [])
        
        # Lấy topics phù hợp với sở thích và điểm yếu
        preferred_topics = profile.get('preferred_topics', [])
        weak_topics = profile.get('weak_topics', [])
        
        # Tạo personalized prompt
        personalization_context = {
            'learner_id': learner_id,
            'current_level': level,
            'recommended_level': recommended_level,
            'preferred_topics': preferred_topics[:3],
            'focus_areas': weak_topics[:2],
            'content_focus': content_focus,
            'learning_style': profile.get('learning_style', 'balanced'),
            'pace': strategy.get('pace_adjustment', 'normal')
        }
        
        return personalization_context
    
    # Helper methods
    def _calculate_variance(self, scores: List[float]) -> float:
        if len(scores) < 2:
            return 0
        mean = sum(scores) / len(scores)
        variance = sum((x - mean) ** 2 for x in scores) / len(scores)
        return variance
    
    def _calculate_improvement_rate(self, scores: List[float]) -> float:
        if len(scores) < 2:
            return 0
        return (scores[-1] - scores[0]) / len(scores) if len(scores) > 0 else 0
    
    def _calculate_consistency(self, scores: List[float]) -> float:
        if len(scores) < 2:
            return 1.0
        variance = self._calculate_variance(scores)
        return max(0, 1 - variance / 10)  # Normalize to 0-1
    
    def _calculate_efficiency(self, scores: List[float], durations: List[int]) -> float:
        if not scores or not durations:
            return 0
        avg_score = sum(scores) / len(scores)
        avg_duration = sum(durations) / len(durations)
        return avg_score / avg_duration if avg_duration > 0 else 0
    
    def _find_peak_times(self, scores: List[float], durations: List[int]) -> List[int]:
        # Simplified - would need timestamps for real implementation
        return []
    
    def _analyze_topic_performance(self, topics: List[str], scores: List[float]) -> Dict[str, float]:
        topic_scores = defaultdict(list)
        for i, topic in enumerate(topics):
            if i < len(scores):
                topic_scores[topic].append(scores[i])
        
        return {topic: sum(s) / len(s) for topic, s in topic_scores.items()}
    
    def _calculate_learning_curve(self, scores: List[float]) -> Dict:
        if len(scores) < 3:
            return {}
        
        # Split into segments
        segment_size = max(1, len(scores) // 3)
        segments = [
            scores[i:i+segment_size] 
            for i in range(0, len(scores), segment_size)
        ]
        
        segment_avgs = [sum(s) / len(s) for s in segments if s]
        
        return {
            'early_avg': segment_avgs[0] if segment_avgs else 0,
            'mid_avg': segment_avgs[1] if len(segment_avgs) > 1 else 0,
            'recent_avg': segment_avgs[-1] if segment_avgs else 0,
            'curve_type': 'accelerating' if len(segment_avgs) > 2 and segment_avgs[-1] > segment_avgs[0] else 'stable'
        }
    
    def _analyze_retention(self, scores: List[float]) -> Dict:
        if len(scores) < 2:
            return {}
        return {
            'retention_rate': 1 - abs(scores[-1] - scores[0]) / 10 if scores[0] > 0 else 0,
            'consistency': self._calculate_consistency(scores)
        }
    
    def _analyze_engagement(self, durations: List[int], scores: List[float]) -> Dict:
        if not durations:
            return {}
        return {
            'avg_duration': sum(durations) / len(durations),
            'engagement_level': 'high' if sum(durations) / len(durations) > 300 else 'medium' if sum(durations) / len(durations) > 180 else 'low'
        }
    
    def _calculate_momentum(self, scores: List[float]) -> float:
        if len(scores) < 3:
            return 0
        recent = scores[-3:]
        return (recent[-1] - recent[0]) / len(recent)
    
    def _calculate_volatility(self, scores: List[float]) -> float:
        return self._calculate_variance(scores) ** 0.5
    
    def _categorize_improvements(self, improvements: List[tuple]) -> Dict[str, List[str]]:
        categories = {
            'pronunciation': [],
            'vocabulary': [],
            'grammar': [],
            'fluency': [],
            'comprehension': []
        }
        
        for imp, freq in improvements:
            imp_lower = imp.lower()
            if any(word in imp_lower for word in ['pronunciation', 'pronounce', 'sound', 'accent']):
                categories['pronunciation'].append(imp)
            elif any(word in imp_lower for word in ['vocabulary', 'word', 'vocab']):
                categories['vocabulary'].append(imp)
            elif any(word in imp_lower for word in ['grammar', 'sentence', 'structure']):
                categories['grammar'].append(imp)
            elif any(word in imp_lower for word in ['fluency', 'speed', 'pace']):
                categories['fluency'].append(imp)
            elif any(word in imp_lower for word in ['comprehension', 'understand', 'meaning']):
                categories['comprehension'].append(imp)
            else:
                categories['fluency'].append(imp)  # Default
        
        return {k: v[:3] for k, v in categories.items() if v}
    
    def _determine_level(self, avg_score: float) -> int:
        if avg_score < 4:
            return 1
        elif avg_score < 7:
            return 2
        else:
            return 3
    
    def _recommend_level(self, avg_score: float, trend: Dict) -> int:
        current_level = self._determine_level(avg_score)
        if trend.get('trend') == 'improving' and avg_score > 6.5:
            return min(3, current_level + 1)
        elif trend.get('trend') == 'declining' and avg_score < 5:
            return max(1, current_level - 1)
        return current_level
    
    def _recommend_pace(self, scores: List[float]) -> str:
        if not scores:
            return 'normal'
        improvement_rate = self._calculate_improvement_rate(scores)
        if improvement_rate > 0.2:
            return 'accelerated'
        elif improvement_rate < -0.1:
            return 'slower'
        return 'normal'
    
    def _recommend_content_focus(self, topics: List[str], scores: List[float]) -> List[str]:
        topic_perf = self._analyze_topic_performance(topics, scores)
        if not topic_perf:
            return []
        avg = sum(scores) / len(scores) if scores else 5
        weak_topics = [t for t, s in topic_perf.items() if s < avg]
        return weak_topics[:3]
    
    def _recommend_frequency(self, scores: List[float]) -> str:
        if not scores:
            return 'moderate'
        consistency = self._calculate_consistency(scores)
        if consistency < 0.5:
            return 'high'
        elif consistency > 0.8:
            return 'moderate'
        return 'moderate'
    
    def _update_learner_profile(self, learner_id: int, analysis: Dict):
        """Cập nhật profile học viên từ analysis"""
        profile = self.learner_profiles[learner_id]
        
        # Cập nhật metrics
        metrics = analysis.get('performance_metrics', {})
        profile['average_score'] = metrics.get('average_score', profile.get('average_score', 0))
        profile['total_practice_time'] += metrics.get('average_duration', 0)
        
        # Cập nhật strengths và weaknesses
        strength_areas = analysis.get('strength_areas', {})
        improvement_areas = analysis.get('improvement_areas', {})
        
        profile['preferred_topics'] = strength_areas.get('top_strengths', [])
        profile['weak_topics'] = improvement_areas.get('priority_improvements', [])
        
        # Cập nhật learning style
        patterns = analysis.get('learning_patterns', {})
        if patterns.get('engagement_patterns', {}).get('engagement_level') == 'high':
            profile['learning_style'] = 'active'
        else:
            profile['learning_style'] = 'balanced'


def main():
    """Main function để analyze learner performance"""
    engine = ContinuousLearningEngine()
    
    if len(sys.argv) > 1 and sys.argv[1] == 'analyze':
        learner_id = int(sys.argv[2]) if len(sys.argv) > 2 else 1
        session_data_json = sys.argv[3] if len(sys.argv) > 3 else "{}"
        
        try:
            session_data = json.loads(session_data_json)
        except:
            session_data = {
                'scores': [],
                'topics': [],
                'durations': [],
                'strengths': [],
                'improvements': []
            }
        
        analysis = engine.analyze_learner_performance(learner_id, session_data)
        
        # Tạo personalization context
        personalization = engine.personalize_prompt_generation(
            learner_id,
            analysis.get('adaptive_strategy', {}).get('recommended_level', 2),
            []
        )
        
        result = {
            'analysis': analysis,
            'personalization_context': personalization
        }
        
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        # Test với sample data
        session_data = {
            'scores': [5.5, 6.0, 6.5, 7.0, 7.5],
            'topics': ['Travel', 'Food', 'Work', 'Education', 'Technology'],
            'durations': [180, 200, 220, 240, 250],
            'strengths': [['pronunciation', 'fluency'], ['vocabulary'], ['grammar']],
            'improvements': [['speed', 'comprehension'], ['pronunciation']]
        }
        
        analysis = engine.analyze_learner_performance(1, session_data)
        print(json.dumps(analysis, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()

