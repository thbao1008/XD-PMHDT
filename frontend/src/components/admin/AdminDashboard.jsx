// src/components/admin/Dashboard.jsx
import React, { useEffect, useState } from "react";
import api from "../../api.js";
import { 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaDollarSign,
  FaBox,
  FaTasks,
  FaUsers,
  FaChartLine,
  FaRobot,
  FaEye,
  FaUserCheck
} from "react-icons/fa";
import { FiActivity, FiClock, FiRefreshCw, FiChevronLeft, FiChevronRight } from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import "../../styles/admin-dashboard.css";

// Đăng ký Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalLearners: 0,
    totalMentors: 0,
    totalRevenue: 0,
    totalPackages: 0,
    totalChallenges: 0,
    totalActiveUsers: 0
  });
  const [trafficStats, setTrafficStats] = useState({
    totalTraffic: 0,
    onlineUsers: 0,
    todayTraffic: 0,
    todayUniqueVisitors: 0,
    weekTraffic: 0
  });
  const [activity, setActivity] = useState([]);
  const [aiProgress, setAiProgress] = useState({
    trainingSamples: 0,
    newSamples: 0,
    totalModels: 0,
    accuracy: null,
    status: 'initializing',
    taskTypes: {},
    tokenUsage: {
      used: 0,
      usedToday: 0,
      usedThisMonth: 0,
      limit: 1000000,
      percentage: 0,
      status: 'ok'
    }
  });
  const [chartData, setChartData] = useState({
    revenue6Months: [],
    userGrowth: [],
    dailyRevenue: [],
    packageDistribution: [],
    revenueByPackage: [],
    userStatusBreakdown: [],
    purchaseStatusDistribution: [],
    growthMetrics: []
  });
  const [timeframe, setTimeframe] = useState({
    revenue: 'month', // 'year', 'month', 'week'
    users: 'month',
    traffic: 'week',
    daily: 'week'
  });
  const [periodOffset, setPeriodOffset] = useState({
    revenue: 0, // 0 = current period, -1 = previous, 1 = next
    users: 0,
    traffic: 0,
    daily: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 120000); // Refresh mỗi 2 phút để tránh tốn tài nguyên
    return () => clearInterval(interval);
  }, [timeframe, periodOffset]);

  async function loadAllData() {
    try {
      setError(null);
      
      // Load dashboard stats
      const statsRes = await api.get("/admin/dashboard/stats");
      if (statsRes.data?.success && statsRes.data.stats) {
        setStats(statsRes.data.stats);
      }

      // Load traffic stats
      const trafficRes = await api.get("/admin/dashboard/traffic");
      if (trafficRes.data?.success && trafficRes.data.stats) {
        setTrafficStats(trafficRes.data.stats);
      }

      // Load activity
      const activityRes = await api.get("/admin/dashboard/activity?limit=8");
      if (activityRes.data?.success && activityRes.data.activity) {
        setActivity(activityRes.data.activity || []);
      }

      // Load AiESP learning progress
      const aiRes = await api.get("/admin/dashboard/ai-progress");
      if (aiRes.data?.success && aiRes.data.progress) {
        setAiProgress(aiRes.data.progress);
      }

      // Load chart data với timeframe và period offset
      const chartRes = await api.get(`/admin/dashboard/charts?revenue=${timeframe.revenue}&users=${timeframe.users}&traffic=${timeframe.traffic}&daily=${timeframe.daily}&revenueOffset=${periodOffset.revenue}&usersOffset=${periodOffset.users}&trafficOffset=${periodOffset.traffic}&dailyOffset=${periodOffset.daily}`);
      if (chartRes.data?.success && chartRes.data.chartData) {
        setChartData(chartRes.data.chartData);
      }
      } catch (err) {
      console.error("❌ Lỗi load dashboard data:", err);
      setError("Không thể tải dữ liệu dashboard");
    } finally {
      setLoading(false);
    }
  }

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return "₫0";
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAIStatusColor = (status) => {
    switch (status) {
      case 'excellent': return '#10b981';
      case 'good': return '#3b82f6';
      case 'training': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const getAIStatusText = (status) => {
    switch (status) {
      case 'excellent': return 'Xuất sắc';
      case 'good': return 'Tốt';
      case 'training': return 'Đang huấn luyện';
      default: return 'Khởi tạo';
    }
  };

  // Tính toán growth rate
  const calculateGrowthRate = (current, previous) => {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Tính toán màu sắc và xu hướng cho từng điểm dữ liệu
  const calculateTrendColors = (data) => {
    if (!data || data.length === 0) return [];
    return data.map((value, index) => {
      if (index === 0) return 'rgb(156, 163, 175)'; // Màu xám cho điểm đầu
      const prev = data[index - 1];
      if (value > prev) return 'rgb(16, 185, 129)'; // Xanh = tăng
      if (value < prev) return 'rgb(239, 68, 68)'; // Đỏ = giảm
      return 'rgb(156, 163, 175)'; // Xám = không đổi
    });
  };

  // Tính toán và format khoảng thời gian hiển thị dựa trên offset (không cần dữ liệu)
  const getPeriodRangeFromOffset = (timeframeType, offset) => {
    const now = new Date();
    
    if (timeframeType === 'week') {
      // Tính thứ 2 của tuần hiện tại
      const currentWeekStart = new Date(now);
      const dayOfWeek = currentWeekStart.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Đưa về thứ 2
      currentWeekStart.setDate(now.getDate() + diff);
      currentWeekStart.setHours(0, 0, 0, 0);
      
      // Áp dụng offset (offset = 0 là tuần hiện tại, -1 là tuần trước, 1 là tuần sau)
      const targetWeekStart = new Date(currentWeekStart);
      targetWeekStart.setDate(currentWeekStart.getDate() + (offset * 7));
      
      const targetWeekEnd = new Date(targetWeekStart);
      targetWeekEnd.setDate(targetWeekStart.getDate() + 6);
      targetWeekEnd.setHours(23, 59, 59, 999);
      
      return `Tuần ${targetWeekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${targetWeekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    } else if (timeframeType === 'month') {
      // Tính tháng hiện tại (hoặc tháng offset)
      const targetMonth = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return `Tháng ${targetMonth.toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' })}`;
    } else if (timeframeType === 'year') {
      // Tính năm hiện tại (hoặc năm offset)
      const targetYear = now.getFullYear() + offset;
      return `Năm ${targetYear}`;
    }
    
    return '';
  };

  // Lấy khoảng thời gian từ dữ liệu thực tế
  const getPeriodRangeFromData = (timeframeType, data) => {
    if (!data || data.length === 0) return '';
    
    const firstItem = data[0];
    const lastItem = data[data.length - 1];
    
    if (!firstItem || !lastItem) return '';
    
    const startDate = new Date(firstItem.period || firstItem.date || firstItem.month);
    const endDate = new Date(lastItem.period || lastItem.date || lastItem.month);
    
    if (timeframeType === 'week') {
      // Với tuần, hiển thị khoảng ngày của từng tuần
      // Nếu chỉ có 1 tuần, hiển thị ngày bắt đầu và kết thúc của tuần đó
      if (data.length === 1) {
        // Tính thứ 2 và chủ nhật của tuần
        const weekStart = new Date(startDate);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Thứ 2 = 1, CN = 0
        weekStart.setDate(startDate.getDate() + diff);
        weekStart.setHours(0, 0, 0, 0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return `Tuần ${weekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} - ${weekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      } else {
        // Nhiều tuần: hiển thị tuần đầu và tuần cuối
        const firstWeekStart = new Date(startDate);
        const firstDayOfWeek = firstWeekStart.getDay();
        const firstDiff = firstDayOfWeek === 0 ? -6 : 1 - firstDayOfWeek;
        firstWeekStart.setDate(startDate.getDate() + firstDiff);
        firstWeekStart.setHours(0, 0, 0, 0);
        
        const lastWeekStart = new Date(endDate);
        const lastDayOfWeek = lastWeekStart.getDay();
        const lastDiff = lastDayOfWeek === 0 ? -6 : 1 - lastDayOfWeek;
        lastWeekStart.setDate(endDate.getDate() + lastDiff);
        lastWeekStart.setHours(0, 0, 0, 0);
        
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        
        return `Từ ${firstWeekStart.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} đến ${lastWeekEnd.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
      }
    } else if (timeframeType === 'month') {
      if (data.length === 1) {
        return `Tháng ${startDate.toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' })}`;
      } else {
        // Nhiều tháng: hiển thị tháng đầu và tháng cuối
        return `Từ ${startDate.toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' })} đến ${endDate.toLocaleDateString('vi-VN', { month: 'numeric', year: 'numeric' })}`;
      }
    } else if (timeframeType === 'year') {
      if (data.length === 1) {
        return `Năm ${startDate.getFullYear()}`;
      } else {
        // Nhiều năm: hiển thị năm đầu và năm cuối
        return `Từ ${startDate.getFullYear()} đến ${endDate.getFullYear()}`;
      }
    }
    
    return '';
  };

  const revenueGrowth = chartData.revenue6Months.length >= 2 
    ? calculateGrowthRate(
        chartData.revenue6Months[chartData.revenue6Months.length - 1]?.revenue || 0,
        chartData.revenue6Months[chartData.revenue6Months.length - 2]?.revenue || 0
      )
    : null;

  // Tính toán summary và growth cho revenue
  const revenueData = chartData.revenue6Months.map(item => item.revenue);
  const revenueColors = calculateTrendColors(revenueData);
  const totalRevenue = revenueData.reduce((sum, val) => sum + val, 0);
  const avgRevenue = revenueData.length > 0 ? totalRevenue / revenueData.length : 0;
  const revenueGrowthPercent = revenueGrowth;

  // Line Chart Zigzag - Revenue Trends với màu sắc xu hướng
  const revenueAreaChartData = {
    labels: chartData.revenue6Months.map(item => {
      const date = new Date(item.period || item.month);
      if (timeframe.revenue === 'year') {
        return date.toLocaleDateString('vi-VN', { year: 'numeric' });
      } else if (timeframe.revenue === 'month') {
        return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
      } else {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
      }
    }),
    datasets: [
      {
        label: 'Doanh thu (₫)',
        data: revenueData,
        borderColor: revenueColors.length > 0 ? revenueColors : 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0, // Zigzag pattern
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: revenueColors.length > 0 ? revenueColors : 'rgb(245, 158, 11)',
        pointBorderColor: '#fff',
        pointBorderWidth: 3,
        segment: {
          borderColor: (ctx) => {
            if (!ctx.p0 || !ctx.p1) return 'rgb(156, 163, 175)';
            const nextValue = ctx.p1.parsed.y;
            const prevValue = ctx.p0.parsed.y;
            if (nextValue > prevValue) return 'rgb(16, 185, 129)';
            if (nextValue < prevValue) return 'rgb(239, 68, 68)';
            return 'rgb(156, 163, 175)';
          }
        }
      }
    ]
  };

  // Chuẩn bị dữ liệu biểu đồ tổng người dùng
  const userGrowthChartData = {
    labels: chartData.userGrowth.map(item => {
      const date = new Date(item.period || item.month);
      if (timeframe.users === 'year') {
        return date.toLocaleDateString('vi-VN', { year: 'numeric' });
      } else if (timeframe.users === 'month') {
        return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
      } else {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
      }
    }),
    datasets: [
      {
        label: 'Học viên',
        data: chartData.userGrowth.map(item => item.learners),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
      {
        label: 'Giảng viên',
        data: chartData.userGrowth.map(item => item.mentors),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 14,
          weight: '600'
        },
        bodyFont: {
          size: 13
        },
        cornerRadius: 8,
        displayColors: true
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#6b7280'
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#6b7280'
        }
      }
    }
  };

  const revenueAreaChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return `Doanh thu: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        ticks: {
          ...chartOptions.scales.y.ticks,
          callback: function(value) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          }
        }
      }
    }
  };

  // Tính toán summary cho traffic
  const visitorsData = chartData.traffic7Days?.map(item => item.visitors) || [];
  const requestsData = chartData.traffic7Days?.map(item => item.requests) || [];
  const totalVisitors = visitorsData.reduce((sum, val) => sum + val, 0);
  const totalRequests = requestsData.reduce((sum, val) => sum + val, 0);
  const avgVisitors = visitorsData.length > 0 ? totalVisitors / visitorsData.length : 0;
  const avgRequests = requestsData.length > 0 ? totalRequests / requestsData.length : 0;
  const visitorsGrowth = visitorsData.length >= 2
    ? calculateGrowthRate(visitorsData[visitorsData.length - 1], visitorsData[visitorsData.length - 2])
    : null;

  // Tính toán summary cho user growth
  const learnersData = chartData.userGrowth?.map(item => item.learners) || [];
  const mentorsData = chartData.userGrowth?.map(item => item.mentors) || [];
  const totalLearners = learnersData.reduce((sum, val) => sum + val, 0);
  const totalMentors = mentorsData.reduce((sum, val) => sum + val, 0);
  const avgLearners = learnersData.length > 0 ? totalLearners / learnersData.length : 0;
  const learnersGrowth = learnersData.length >= 2
    ? calculateGrowthRate(learnersData[learnersData.length - 1], learnersData[learnersData.length - 2])
    : null;

  // Tính toán summary cho daily revenue
  const dailyRevenueData = chartData.dailyRevenue?.map(item => item.revenue) || [];
  const dailyTotalRevenue = dailyRevenueData.reduce((sum, val) => sum + val, 0);
  const dailyAvgRevenue = dailyRevenueData.length > 0 ? dailyTotalRevenue / dailyRevenueData.length : 0;
  const dailyRevenueGrowth = dailyRevenueData.length >= 2
    ? calculateGrowthRate(dailyRevenueData[dailyRevenueData.length - 1], dailyRevenueData[dailyRevenueData.length - 2])
    : null;

  // Tính toán summary cho activity
  const totalActivities = activity.reduce((sum, item) => sum + (item.activity_count || 0), 0);
  const avgActivities = activity.length > 0 ? totalActivities / activity.length : 0;

  // Area Chart - Traffic Trends với zigzag
  const visitorsColors = calculateTrendColors(visitorsData);
  const requestsColors = calculateTrendColors(requestsData);
  
  const trafficAreaChartData = {
    labels: chartData.traffic7Days?.map(item => {
      const date = new Date(item.period || item.date);
      if (timeframe.traffic === 'year') {
        return date.toLocaleDateString('vi-VN', { year: 'numeric' });
      } else if (timeframe.traffic === 'month') {
        return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
      } else {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
      }
    }) || [],
    datasets: [
      {
        label: 'Lượt truy cập',
        data: visitorsData,
        borderColor: visitorsColors.length > 0 ? visitorsColors : 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0, // Zigzag
        pointRadius: 5,
        pointHoverRadius: 7,
        pointBackgroundColor: visitorsColors.length > 0 ? visitorsColors : 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        segment: {
          borderColor: (ctx) => {
            if (!ctx.p0 || !ctx.p1) return 'rgb(156, 163, 175)';
            const nextValue = ctx.p1.parsed.y;
            const prevValue = ctx.p0.parsed.y;
            if (nextValue > prevValue) return 'rgb(16, 185, 129)';
            if (nextValue < prevValue) return 'rgb(239, 68, 68)';
            return 'rgb(156, 163, 175)';
          }
        }
      },
      {
        label: 'Requests',
        data: requestsData,
        borderColor: requestsColors.length > 0 ? requestsColors : 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0, // Zigzag
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: requestsColors.length > 0 ? requestsColors : 'rgb(16, 185, 129)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        segment: {
          borderColor: (ctx) => {
            if (!ctx.p0 || !ctx.p1) return 'rgb(156, 163, 175)';
            const nextValue = ctx.p1.parsed.y;
            const prevValue = ctx.p0.parsed.y;
            if (nextValue > prevValue) return 'rgb(16, 185, 129)';
            if (nextValue < prevValue) return 'rgb(239, 68, 68)';
            return 'rgb(156, 163, 175)';
          }
        }
      }
    ]
  };

  // Line Chart Zigzag - Daily Revenue với màu sắc xu hướng
  const dailyRevenueColors = calculateTrendColors(dailyRevenueData);
  
  const dailyRevenueChartData = {
    labels: chartData.dailyRevenue?.map(item => {
      const date = new Date(item.period || item.date);
      if (timeframe.daily === 'week') {
        return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
      } else if (timeframe.daily === 'month') {
        return date.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
      } else {
        return date.toLocaleDateString('vi-VN', { year: 'numeric' });
      }
    }) || [],
    datasets: [
      {
        label: 'Doanh thu',
        data: dailyRevenueData,
        borderColor: dailyRevenueColors.length > 0 ? dailyRevenueColors : 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0, // Zigzag pattern
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: dailyRevenueColors.length > 0 ? dailyRevenueColors : 'rgb(245, 158, 11)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        segment: {
          borderColor: (ctx) => {
            if (!ctx.p0 || !ctx.p1) return 'rgb(156, 163, 175)';
            const nextValue = ctx.p1.parsed.y;
            const prevValue = ctx.p0.parsed.y;
            if (nextValue > prevValue) return 'rgb(16, 185, 129)';
            if (nextValue < prevValue) return 'rgb(239, 68, 68)';
            return 'rgb(156, 163, 175)';
          }
        }
      }
    ]
  };

  const dailyRevenueChartOptions = {
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            return `Doanh thu: ${formatCurrency(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      ...chartOptions.scales,
      y: {
        ...chartOptions.scales.y,
        ticks: {
          ...chartOptions.scales.y.ticks,
          callback: function(value) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          }
        }
      }
    }
  };

  // Donut Chart - Package Distribution - Tốt nhất cho phân bố tỷ lệ
  const packageDistributionData = {
    labels: chartData.packageDistribution?.map(item => item.name) || [],
    datasets: [
      {
        data: chartData.packageDistribution?.map(item => item.purchaseCount) || [],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(20, 184, 166, 0.8)',
          'rgba(251, 146, 60, 0.8)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(239, 68, 68)',
          'rgb(139, 92, 246)',
          'rgb(236, 72, 153)',
          'rgb(20, 184, 166)',
          'rgb(251, 146, 60)'
        ],
        borderWidth: 3
      }
    ]
  };

  const donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Horizontal Bar Chart - Revenue by Package - Tốt nhất cho so sánh top packages
  const revenueByPackageData = {
    labels: chartData.revenueByPackage?.map(item => item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name) || [],
    datasets: [
      {
        label: 'Doanh thu (₫)',
        data: chartData.revenueByPackage?.map(item => item.totalRevenue) || [],
        backgroundColor: 'rgba(245, 158, 11, 0.8)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 2,
        borderRadius: 6
      }
    ]
  };

  const horizontalBarChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context) {
            return `Doanh thu: ${formatCurrency(context.parsed.x)}`;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
          drawBorder: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#6b7280',
          callback: function(value) {
            if (value >= 1000000) {
              return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#6b7280'
        }
      }
    }
  };

  // Stacked Bar Chart - User Status Breakdown
  const userStatusData = {
    labels: ['Học viên', 'Giảng viên'],
    datasets: [
      {
        label: 'Active',
        data: [
          chartData.userStatusBreakdown?.find(u => u.role === 'learner' && u.status === 'active')?.count || 0,
          chartData.userStatusBreakdown?.find(u => u.role === 'mentor' && u.status === 'active')?.count || 0
        ],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 2
      },
      {
        label: 'Banned',
        data: [
          chartData.userStatusBreakdown?.find(u => u.role === 'learner' && u.status === 'banned')?.count || 0,
          chartData.userStatusBreakdown?.find(u => u.role === 'mentor' && u.status === 'banned')?.count || 0
        ],
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
        borderColor: 'rgb(239, 68, 68)',
        borderWidth: 2
      },
      {
        label: 'Inactive',
        data: [
          chartData.userStatusBreakdown?.find(u => u.role === 'learner' && u.status === 'inactive')?.count || 0,
          chartData.userStatusBreakdown?.find(u => u.role === 'mentor' && u.status === 'inactive')?.count || 0
        ],
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderColor: 'rgb(156, 163, 175)',
        borderWidth: 2
      }
    ]
  };

  const stackedBarChartOptions = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      x: {
        ...chartOptions.scales.x,
        stacked: true
      },
      y: {
        ...chartOptions.scales.y,
        stacked: true
      }
    }
  };

  // Pie Chart - Purchase Status Distribution
  const purchaseStatusData = {
    labels: chartData.purchaseStatusDistribution?.map(item => {
      const statusMap = {
        'active': 'Đang hoạt động',
        'expired': 'Đã hết hạn',
        'paused': 'Tạm dừng'
      };
      return statusMap[item.status] || item.status;
    }) || [],
    datasets: [
      {
        data: chartData.purchaseStatusDistribution?.map(item => item.count) || [],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(156, 163, 175, 0.8)'
        ],
        borderColor: [
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
          'rgb(156, 163, 175)'
        ],
        borderWidth: 3
      }
    ]
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: '600'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadAllData}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <button className="btn-refresh" onClick={loadAllData} title="Làm mới">
          <FiRefreshCw />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card card-learners">
          <div className="card-icon">
            <FaUserGraduate />
          </div>
          <div className="card-content">
            <div className="card-label">Học viên</div>
            <div className="card-value">{stats.totalLearners.toLocaleString()}</div>
          </div>
        </div>

        <div className="summary-card card-mentors">
          <div className="card-icon">
            <FaChalkboardTeacher />
          </div>
          <div className="card-content">
            <div className="card-label">Giảng viên</div>
            <div className="card-value">{stats.totalMentors.toLocaleString()}</div>
          </div>
        </div>

        <div className="summary-card card-revenue">
          <div className="card-icon">
            <FaDollarSign />
          </div>
          <div className="card-content">
            <div className="card-label">Doanh thu</div>
            <div className="card-value">{formatCurrency(stats.totalRevenue)}</div>
          </div>
        </div>

        <div className="summary-card card-packages">
          <div className="card-icon">
            <FaBox />
          </div>
          <div className="card-content">
            <div className="card-label">Gói dịch vụ</div>
            <div className="card-value">{stats.totalPackages.toLocaleString()}</div>
          </div>
        </div>

        <div className="summary-card card-challenges">
          <div className="card-icon">
            <FaTasks />
          </div>
          <div className="card-content">
            <div className="card-label">Challenge</div>
            <div className="card-value">{stats.totalChallenges.toLocaleString()}</div>
          </div>
        </div>

        <div className="summary-card card-users">
          <div className="card-icon">
            <FaUsers />
          </div>
          <div className="card-content">
            <div className="card-label">Người dùng</div>
            <div className="card-value">{stats.totalActiveUsers.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-content">
        {/* Traffic Stats */}
        <div className="dashboard-card traffic-card">
          <div className="card-header">
            <h3>
              <FaChartLine />
              Lưu lượng truy cập
            </h3>
          </div>
          <div className="traffic-stats">
            <div className="traffic-item">
              <div className="traffic-label">Tổng lưu lượng</div>
              <div className="traffic-value">{trafficStats.totalTraffic.toLocaleString()}</div>
            </div>
            <div className="traffic-item">
              <div className="traffic-label">Hiện tại</div>
              <div className="traffic-value primary">{trafficStats.todayTraffic.toLocaleString()}</div>
            </div>
            <div className="traffic-item">
              <div className="traffic-label">Đang online</div>
              <div className="traffic-value success">
                <FaUserCheck style={{ marginRight: 4 }} />
                {trafficStats.onlineUsers}
              </div>
            </div>
            <div className="traffic-item">
              <div className="traffic-label">7 ngày qua</div>
              <div className="traffic-value">{trafficStats.weekTraffic.toLocaleString()}</div>
            </div>
          </div>
          
          {/* Thêm thông tin bổ sung */}
          <div style={{ 
            marginTop: "20px", 
            paddingTop: "20px", 
            borderTop: "1px solid #e5e7eb" 
          }}>
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr", 
              gap: "16px",
              marginBottom: "16px"
            }}>
              <div style={{ 
                padding: "12px", 
                background: "#f9fafb", 
                borderRadius: "8px" 
              }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  Người truy cập hôm nay
                </div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>
                  {trafficStats.todayUniqueVisitors || 0}
                </div>
              </div>
              <div style={{ 
                padding: "12px", 
                background: "#f9fafb", 
                borderRadius: "8px" 
              }}>
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>
                  Người truy cập 7 ngày
                </div>
                <div style={{ fontSize: "18px", fontWeight: "600", color: "#1f2937" }}>
                  {trafficStats.weekUniqueVisitors || 0}
                </div>
              </div>
            </div>
            
            {/* Biểu đồ mini 7 ngày */}
            {chartData.traffic7Days && chartData.traffic7Days.length > 0 && (
              <div style={{ marginTop: "16px" }}>
                <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>
                  Xu hướng 7 ngày qua
                </div>
                <div style={{ 
                  display: "flex", 
                  alignItems: "flex-end", 
                  gap: "4px", 
                  height: "60px",
                  padding: "8px",
                  background: "#f9fafb",
                  borderRadius: "8px"
                }}>
                  {chartData.traffic7Days.slice(-7).map((day, idx) => {
                    const maxValue = Math.max(...chartData.traffic7Days.slice(-7).map(d => d.visitors || 0), 1);
                    const height = ((day.visitors || 0) / maxValue) * 100;
                    return (
                      <div key={idx} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{
                          width: "100%",
                          height: `${Math.max(height, 5)}%`,
                          background: height > 0 ? "linear-gradient(to top, #3b82f6, #60a5fa)" : "#e5e7eb",
                          borderRadius: "4px 4px 0 0",
                          minHeight: "4px",
                          transition: "all 0.3s"
                        }}></div>
                        <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "4px" }}>
                          {new Date(day.date || day.period).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Thông tin bổ sung */}
            <div style={{ 
              marginTop: "16px", 
              padding: "12px", 
              background: "#eff6ff", 
              borderRadius: "8px",
              border: "1px solid #dbeafe"
            }}>
              <div style={{ fontSize: "12px", color: "#1e40af", fontWeight: "500", marginBottom: "4px" }}>
                💡 Mẹo tăng traffic
              </div>
              <div style={{ fontSize: "11px", color: "#3b82f6", lineHeight: "1.5" }}>
                {trafficStats.totalTraffic < 100 
                  ? "Tăng cường marketing, SEO và quảng cáo để thu hút người dùng mới"
                  : trafficStats.onlineUsers === 0
                  ? "Tạo nội dung hấp dẫn và thông báo để người dùng quay lại"
                  : "Hệ thống đang hoạt động tốt! Tiếp tục duy trì chất lượng dịch vụ"}
              </div>
            </div>
          </div>
        </div>

        {/* AiESP Learning Progress */}
        <div className="dashboard-card ai-card">
          <div className="card-header">
            <h3>
              <FaRobot />
              Tiến trình AiESP Học Tập
            </h3>
          </div>
          <div className="ai-stats">
            <div className="ai-item">
              <div className="ai-label">Training Samples</div>
              <div className="ai-value">{aiProgress.trainingSamples.toLocaleString()}</div>
              <div className="ai-desc">Mẫu đã huấn luyện</div>
            </div>
            <div className="ai-item">
              <div className="ai-label">New Samples</div>
              <div className="ai-value" style={{ color: aiProgress.newSamples > 0 ? '#f59e0b' : '#6b7280' }}>
                {aiProgress.newSamples.toLocaleString()}
              </div>
              <div className="ai-desc">Mẫu mới chưa train</div>
            </div>
            <div className="ai-item">
              <div className="ai-label">Models</div>
              <div className="ai-value">{aiProgress.totalModels}</div>
              <div className="ai-desc">Số mô hình đã train</div>
            </div>
            {aiProgress.accuracy !== null && (
              <div className="ai-item">
                <div className="ai-label">Độ chính xác</div>
                <div className="ai-value" style={{ color: getAIStatusColor(aiProgress.status) }}>
                  {(aiProgress.accuracy * 100).toFixed(1)}%
                </div>
                <div className="ai-desc">Hiệu suất trung bình</div>
              </div>
            )}
            <div className="ai-status">
              <span 
                className="status-badge"
                style={{ 
                  background: getAIStatusColor(aiProgress.status) + "20",
                  color: getAIStatusColor(aiProgress.status)
                }}
              >
                {getAIStatusText(aiProgress.status)}
              </span>
            </div>
          </div>
          
          {/* Task Types Breakdown */}
          {aiProgress.taskTypes && Object.keys(aiProgress.taskTypes).length > 0 && (
          <div style={{ 
            marginTop: "20px", 
            paddingTop: "20px", 
            borderTop: "1px solid #e5e7eb" 
          }}>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "12px", fontWeight: "500" }}>
                Các Task Types
        </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {Object.entries(aiProgress.taskTypes).map(([taskType, stats]) => (
                  <div key={taskType} style={{ 
                  padding: "10px", 
                    background: stats.latestAccuracy && stats.latestAccuracy >= 0.85 ? "#f0fdf4" : stats.latestAccuracy && stats.latestAccuracy >= 0.70 ? "#fef3c7" : "#fee2e2", 
                  borderRadius: "6px",
                    border: `1px solid ${stats.latestAccuracy && stats.latestAccuracy >= 0.85 ? "#bbf7d0" : stats.latestAccuracy && stats.latestAccuracy >= 0.70 ? "#fde68a" : "#fecaca"}`
                }}>
                    <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "4px" }}>
                      {taskType.replace('_', ' ').toUpperCase()}
                  </div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "#1f2937" }}>
                      {stats.latestAccuracy ? `${(stats.latestAccuracy * 100).toFixed(1)}%` : "Chưa train"}
                  </div>
                    <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>
                      {stats.trainingSamples} samples
                </div>
                  </div>
                ))}
                  </div>
                </div>
          )}
                  </div>

        {/* Token Usage */}
        <div className="dashboard-card ai-card">
          <div className="card-header">
            <h3>
              <FaChartLine />
              Token Usage (OpenRouter)
            </h3>
                  </div>
          <div className="ai-stats">
            <div className="ai-item">
              <div className="ai-label">Used (Total)</div>
              <div className="ai-value" style={{ 
                color: aiProgress.tokenUsage?.status === 'warning' ? '#ef4444' : 
                       aiProgress.tokenUsage?.status === 'caution' ? '#f59e0b' : '#10b981'
              }}>
                {aiProgress.tokenUsage?.used.toLocaleString() || 0}
                  </div>
              <div className="ai-desc">Tokens đã sử dụng</div>
                  </div>
            <div className="ai-item">
              <div className="ai-label">Used (Today)</div>
              <div className="ai-value">{aiProgress.tokenUsage?.usedToday.toLocaleString() || 0}</div>
              <div className="ai-desc">Tokens hôm nay</div>
                </div>
            <div className="ai-item">
              <div className="ai-label">Used (This Month)</div>
              <div className="ai-value">{aiProgress.tokenUsage?.usedThisMonth.toLocaleString() || 0}</div>
              <div className="ai-desc">Tokens tháng này</div>
            </div>
            <div className="ai-item">
              <div className="ai-label">Limit</div>
              <div className="ai-value">{aiProgress.tokenUsage?.limit.toLocaleString() || 'N/A'}</div>
              <div className="ai-desc">Giới hạn tokens</div>
              </div>
            </div>
            
          {/* Token Usage Progress Bar */}
          <div style={{ 
            marginTop: "20px", 
            paddingTop: "20px", 
            borderTop: "1px solid #e5e7eb" 
          }}>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "8px", fontWeight: "500" }}>
              Token Usage: {aiProgress.tokenUsage?.percentage.toFixed(1) || 0}%
              </div>
              <div style={{ 
              height: "12px", 
                background: "#e5e7eb", 
              borderRadius: "6px",
                overflow: "hidden"
              }}>
                <div style={{
                  height: "100%",
                width: `${Math.min(aiProgress.tokenUsage?.percentage || 0, 100)}%`,
                background: aiProgress.tokenUsage?.status === 'warning' 
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : aiProgress.tokenUsage?.status === 'caution'
                  ? "linear-gradient(90deg, #f59e0b, #d97706)"
                  : "linear-gradient(90deg, #10b981, #059669)",
                  transition: "width 0.3s",
                borderRadius: "6px"
                }}></div>
              </div>
              <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>
              {aiProgress.tokenUsage?.used.toLocaleString() || 0} / {aiProgress.tokenUsage?.limit.toLocaleString() || 'N/A'} tokens
              </div>
            {aiProgress.tokenUsage?.status === 'warning' && (
            <div style={{ 
                padding: "8px", 
                background: "#fee2e2", 
                borderRadius: "6px",
                border: "1px solid #fecaca",
                marginTop: "8px"
            }}>
                <div style={{ fontSize: "11px", color: "#dc2626" }}>
                  ⚠️ Token usage đã vượt quá 90% giới hạn. Vui lòng kiểm tra và điều chỉnh.
              </div>
              </div>
            )}
            {aiProgress.tokenUsage?.status === 'caution' && (
              <div style={{ 
                padding: "8px", 
                background: "#fef3c7", 
                borderRadius: "6px",
                border: "1px solid #fde68a",
                marginTop: "8px"
              }}>
                <div style={{ fontSize: "11px", color: "#b45309" }}>
                  ⚠️ Token usage đã vượt quá 70% giới hạn. Cần theo dõi.
                    </div>
                </div>
              )}
                </div>
                </div>
      </div>

      {/* Charts Section - Professional Analytics Dashboard */}
      <div className="charts-section">
        {/* Row 1: User Growth */}
        <div className="chart-row">
          {/* User Growth Line Chart */}
          <div className="dashboard-card chart-card chart-large">
            <div className="card-header">
              <div>
                <div>
                  <h3>
                    <FaUsers />
                    Tăng trưởng Người dùng
                  </h3>
                  <div className="period-range">
                    {getPeriodRangeFromOffset(timeframe.users, periodOffset.users)}
                  </div>
                </div>
                <div className="timeframe-controls">
                  <select 
                    className="timeframe-select"
                    value={timeframe.users}
                    onChange={(e) => {
                      setTimeframe({...timeframe, users: e.target.value});
                      setPeriodOffset({...periodOffset, users: 0}); // Reset về kỳ hiện tại
                    }}
                  >
                    <option value="year">Theo năm</option>
                    <option value="month">Theo tháng</option>
                    <option value="week">Theo tuần</option>
                  </select>
                  <button
                    className="nav-button"
                    onClick={() => setPeriodOffset({...periodOffset, users: periodOffset.users - 1})}
                    title="Kỳ trước"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    className={`nav-button reset ${periodOffset.users === 0 ? 'active' : ''}`}
                    onClick={() => setPeriodOffset({...periodOffset, users: 0})}
                    title="Về hiện tại"
                  >
                    Hiện tại
                  </button>
                  <button
                    className="nav-button"
                    onClick={() => setPeriodOffset({...periodOffset, users: periodOffset.users + 1})}
                    title="Kỳ sau"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
              <div className="summary-stats">
                {learnersData.length > 0 && (
                  <>
                    <div className="summary-item">
                      <span className="summary-label">Tổng HV:</span>
                      <span className="summary-value">{totalLearners.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Tổng GV:</span>
                      <span className="summary-value">{totalMentors.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">TB HV:</span>
                      <span className="summary-value">{avgLearners.toFixed(1)}</span>
                    </div>
                    {learnersGrowth && (
                      <div className={`summary-item ${learnersGrowth >= 0 ? 'positive' : 'negative'}`}>
                        <span className="summary-label">Tăng trưởng HV:</span>
                        <span className="summary-value">
                          {learnersGrowth >= 0 ? '↑' : '↓'} {Math.abs(learnersGrowth)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="chart-container">
              {chartData.userGrowth && chartData.userGrowth.length > 0 ? (
                <Line data={userGrowthChartData} options={chartOptions} />
              ) : (
                <div className="empty-state">
                  <p>Chưa có dữ liệu người dùng</p>
                </div>
              )}
            </div>
          </div>
      </div>

        {/* Row 2: Traffic & Daily Revenue */}
        <div className="chart-row">
          {/* Traffic Area Chart */}
          <div className="dashboard-card chart-card chart-medium">
            <div className="card-header">
              <div>
                <div>
                  <h3>
                    <FaChartLine />
                    Lưu lượng Truy cập
                  </h3>
                  <div className="period-range">
                    {getPeriodRangeFromOffset(timeframe.traffic, periodOffset.traffic)}
                  </div>
                </div>
                <div className="timeframe-controls">
                  <select 
                    className="timeframe-select"
                    value={timeframe.traffic}
                    onChange={(e) => {
                      setTimeframe({...timeframe, traffic: e.target.value});
                      setPeriodOffset({...periodOffset, traffic: 0}); // Reset về kỳ hiện tại
                    }}
                  >
                    <option value="year">Theo năm</option>
                    <option value="month">Theo tháng</option>
                    <option value="week">Theo tuần</option>
                  </select>
                  <button
                    className="nav-button"
                    onClick={() => setPeriodOffset({...periodOffset, traffic: periodOffset.traffic - 1})}
                    title="Kỳ trước"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    className={`nav-button reset ${periodOffset.traffic === 0 ? 'active' : ''}`}
                    onClick={() => setPeriodOffset({...periodOffset, traffic: 0})}
                    title="Về hiện tại"
                  >
                    Hiện tại
                  </button>
                  <button
                    className="nav-button"
                    onClick={() => setPeriodOffset({...periodOffset, traffic: periodOffset.traffic + 1})}
                    title="Kỳ sau"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
              <div className="summary-stats">
                {visitorsData.length > 0 && (
                  <>
                    <div className="summary-item">
                      <span className="summary-label">Tổng truy cập:</span>
                      <span className="summary-value">{totalVisitors.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Tổng requests:</span>
                      <span className="summary-value">{totalRequests.toLocaleString()}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">TB truy cập:</span>
                      <span className="summary-value">{avgVisitors.toFixed(0)}</span>
                    </div>
                    {visitorsGrowth && (
                      <div className={`summary-item ${visitorsGrowth >= 0 ? 'positive' : 'negative'}`}>
                        <span className="summary-label">Tăng trưởng:</span>
                        <span className="summary-value">
                          {visitorsGrowth >= 0 ? '↑' : '↓'} {Math.abs(visitorsGrowth)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="chart-container">
              {chartData.traffic7Days && chartData.traffic7Days.length > 0 ? (
                <Line data={trafficAreaChartData} options={chartOptions} />
              ) : (
                <div className="empty-state">
                  <p>Chưa có dữ liệu traffic</p>
                </div>
              )}
            </div>
        </div>

          {/* Daily Revenue Line Chart Zigzag */}
          <div className="dashboard-card chart-card chart-medium">
            <div className="card-header">
              <div>
                <div>
                  <h3>
                    <FaDollarSign />
                    Doanh thu Chi tiết
                  </h3>
                  <div className="period-range">
                    {getPeriodRangeFromOffset(timeframe.daily, periodOffset.daily)}
                  </div>
                </div>
                <div className="timeframe-controls">
                  <select 
                    className="timeframe-select"
                    value={timeframe.daily}
                    onChange={(e) => {
                      setTimeframe({...timeframe, daily: e.target.value});
                      setPeriodOffset({...periodOffset, daily: 0}); // Reset về kỳ hiện tại
                    }}
                  >
                    <option value="week">Theo tuần</option>
                    <option value="month">Theo tháng</option>
                    <option value="year">Theo năm</option>
                  </select>
                  <button
                    className="nav-button"
                    onClick={() => setPeriodOffset({...periodOffset, daily: periodOffset.daily - 1})}
                    title="Kỳ trước"
                  >
                    <FiChevronLeft />
                  </button>
                  <button
                    className={`nav-button reset ${periodOffset.daily === 0 ? 'active' : ''}`}
                    onClick={() => setPeriodOffset({...periodOffset, daily: 0})}
                    title="Về hiện tại"
                  >
                    Hiện tại
                  </button>
                  <button
                    className="nav-button"
                    onClick={() => setPeriodOffset({...periodOffset, daily: periodOffset.daily + 1})}
                    title="Kỳ sau"
                  >
                    <FiChevronRight />
                  </button>
                </div>
              </div>
              <div className="summary-stats">
                {dailyRevenueData.length > 0 && (
                  <>
                    <div className="summary-item">
                      <span className="summary-label">Tổng:</span>
                      <span className="summary-value">{formatCurrency(dailyTotalRevenue)}</span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">Trung bình:</span>
                      <span className="summary-value">{formatCurrency(dailyAvgRevenue)}</span>
                    </div>
                    {dailyRevenueGrowth && (
                      <div className={`summary-item ${dailyRevenueGrowth >= 0 ? 'positive' : 'negative'}`}>
                        <span className="summary-label">Tăng trưởng:</span>
                        <span className="summary-value">
                          {dailyRevenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(dailyRevenueGrowth)}%
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="chart-container">
              {chartData.dailyRevenue && chartData.dailyRevenue.length > 0 ? (
                <Line data={dailyRevenueChartData} options={dailyRevenueChartOptions} />
              ) : (
                <div className="empty-state">
                  <p>Chưa có dữ liệu doanh thu</p>
                </div>
              )}
            </div>
          </div>
        </div>

        </div>

      {/* Activity - Tần suất hoạt động */}
      <div className="dashboard-card activity-card">
        <div className="card-header">
          <h3>
            <FiActivity />
            Tần suất hoạt động (7 ngày qua)
          </h3>
        </div>
        {activity.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có hoạt động nào</p>
          </div>
        ) : (
          <div className="activity-list">
            {activity.map((item, index) => (
              <div key={item.user_id || index} className="activity-item">
                <div className="activity-rank">
                  <span className="rank-number">{index + 1}</span>
                </div>
                <div 
                  className="activity-avatar"
                  style={{ 
                    background: item.actor_type === 'learner' 
                      ? 'linear-gradient(135deg, #3b82f6, #2563eb)' 
                      : 'linear-gradient(135deg, #10b981, #059669)'
                  }}
                >
                  {item.actor_type === 'learner' ? 'HV' : 'GV'}
                </div>
                <div className="activity-content">
                  <div className="activity-name">{item.user_name || "N/A"}</div>
                  <div className="activity-desc">
                    {item.actor_type === 'learner' 
                      ? `Luyện phát âm: ${item.practice_count || 0} | Challenge: ${item.submission_count || 0}`
                      : `Chấm bài: ${item.feedback_count || 0} | Lịch: ${item.schedule_count || 0}`
                    }
                  </div>
                </div>
                <div className="activity-stats">
                  <div className="activity-count">
                    <span className="count-value">{item.activity_count || 0}</span>
                    <span className="count-label">hoạt động</span>
                  </div>
                  <div className="activity-time">
                    <FiClock />
                    {formatDate(item.last_activity)}
        </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
