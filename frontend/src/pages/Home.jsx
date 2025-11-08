import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChalkboardTeacher,
  FaBookOpen,
  FaAward,
  FaLaptopCode,
} from "react-icons/fa";
import logo from "../assets/images/logo.png";
import "../styles/home.css";
import atmLogo from "../assets/payments/ATM.png";
import paypalLogo from "../assets/payments/Paypal.png";
import momoLogo from "../assets/payments/Momo.png";
import zalopayLogo from "../assets/payments/Zalopay.png";
import mentorImage from "../assets/images/mentor-intro.png";
import viettelLogo from "../assets/partners/viettel.png";
import vibLogo from "../assets/partners/VIB.jpg";
import oxfordLogo from "../assets/partners/oxford.jpg";
import ieltsLogo from "../assets/partners/ielts.png";
import vnairlineLogo from "../assets/partners/vnairline.png";
import api from "../api";

// ===== Partners mẫu =====
const samplePartners = [
  { id: 1, name: "Tập đoàn Viettel", logo: viettelLogo },
  { id: 2, name: "Ngân Hàng Quốc Tế VIB", logo: vibLogo },
  { id: 3, name: "Oxford University", logo: oxfordLogo },
  { id: 4, name: "IELTS Official", logo: ieltsLogo },
  { id: 5, name: "Việt Nam Airline", logo: vnairlineLogo },
];

export default function Home() {
  const navigate = useNavigate();
  const introRef = useRef([]);
  const sectionRefs = useRef({});
  const [visibleSentences, setVisibleSentences] = useState([]);
  const [visibleSections, setVisibleSections] = useState({});
  const [packages, setPackages] = useState([]);

  // Lấy packages từ API
 useEffect(() => {
  api.get("/packages/public")
    .then((res) => {
      const sorted = (res.data.packages || []).sort((a, b) => a.price - b.price);
      setPackages(sorted);
    })
    .catch((err) => console.error("❌ Lỗi khi load packages:", err));
}, []);

  // Hàm xử lý đăng ký
  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = {
      name: e.target.name.value,
      email: e.target.email.value,
      phone: e.target.phone.value,
      note: "Đăng ký từ trang Home"
    };

    try {
      const res = await fetch("/api/admin/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert("✅ Đăng ký thành công! Admin sẽ nhận được thông tin hỗ trợ.");
        e.target.reset();
      } else {
        alert("❌ Có lỗi xảy ra, vui lòng thử lại.");
      }
    } catch (err) {
      console.error("Lỗi gửi đăng ký:", err);
      alert("❌ Server error");
    }
  };
  // Observer cho từng câu trong "Về AESP"
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = introRef.current.indexOf(entry.target);
          if (entry.isIntersecting && index !== -1) {
            setVisibleSentences((prev) =>
              prev.includes(index) ? prev : [...prev, index]
            );
          }
        });
      },
      { threshold: 0.3 }
    );
    introRef.current.forEach((el) => el && observer.observe(el));
    return () => {
      introRef.current.forEach((el) => el && observer.unobserve(el));
    };
  }, []);

  // Observer cho các section khác
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = entry.target.getAttribute("id");
          if (entry.isIntersecting && id) {
            setVisibleSections((prev) => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.2 }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => {
      Object.values(sectionRefs.current).forEach((el) => el && observer.unobserve(el));
    };
  }, []);

  const introSentences = [
    "AESP mang đến ứng dụng học tiếng Anh được hỗ trợ bởi AI, giúp học viên luyện nói trong môi trường thoải mái, không bị đánh giá.",
    "AI đóng vai trò như một trợ lý hội thoại, cung cấp từ vựng, ví dụ, phản hồi phát âm tức thì và lộ trình học tập thích ứng cho nhiều tình huống: công việc, du lịch, hay cuộc sống hàng ngày.",
    "Ngay từ bài kiểm tra nói ban đầu, hệ thống đánh giá trình độ và xây dựng lộ trình phù hợp.",
    "Học viên mới sẽ nhận gợi ý câu đầy đủ, trong khi học viên nâng cao chỉ nhận cụm từ chính.",
    "AI theo dõi tiến trình, tinh chỉnh bài học và hỗ trợ cải thiện phát âm theo thời gian thực.",
    "Ứng dụng phục vụ Học viên – truy cập bài tập cá nhân hóa, theo dõi tiến độ.",
    "Và Quản trị viên – quản lý tài khoản, kiểm duyệt nội dung, xử lý thanh toán và theo dõi hiệu suất.",
  ];

  return (
    <div className="home-wrap">
      {/* HEADER */}
      <header className="header">
        <img src={logo} alt="Logo" className="header-logo" onClick={() => navigate("/")} />
        <nav className="header-nav">
          <a href="#features">Tính năng</a>
          <a href="#packages">Gói học</a>
          <a href="#register">Đăng ký</a>
          <a href="#contact">Liên hệ</a>
          <button className="btn btn-primary" onClick={() => navigate("/login")}>
            Đăng nhập
          </button>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <h1 className="hero-title">Nền tảng luyện nói tiếng Anh với AI</h1>
        <p className="hero-subtitle">Tự tin luyện nói từ cơ bản đến nâng cao với giảng viên hàng đầu.</p>
        <div className="hero-cta">
          <button className="btn btn-outline" onClick={() => document.getElementById("packages").scrollIntoView({ behavior: "smooth" })}>
            Xem gói học
          </button>
          <button className="btn btn-primary" onClick={() => document.getElementById("register").scrollIntoView({ behavior: "smooth" })}>
            Đăng ký ngay
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="features">
        <div className="feature" onClick={() => document.getElementById("mentor-intro").scrollIntoView({ behavior: "smooth" })}>
          <FaChalkboardTeacher size={32} />
          <p>Giảng viên</p>
        </div>
        <div className="feature" onClick={() => document.getElementById("packages").scrollIntoView({ behavior: "smooth" })}>
          <FaBookOpen size={32} />
          <p>Khoá học</p>
        </div>
        <div className="feature" onClick={() => document.getElementById("certificate").scrollIntoView({ behavior: "smooth" })}>
          <FaAward size={32} />
          <p>Chứng chỉ</p>
        </div>
        <div className="feature" onClick={() => navigate("/login")}>
          <FaLaptopCode size={32} />
          <p>Học online</p>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="introduction" id="about">
        <h2>Về AESP</h2>
        {introSentences.map((text, i) => (
          <p
            key={i}
            ref={(el) => (introRef.current[i] = el)}
            className={visibleSentences.includes(i) ? "visible" : ""}
          >
            {text}
          </p>
        ))}
      </section>

      {/* CERTIFICATE */}
      <section id="certificate" ref={(el) => (sectionRefs.current["certificate"] = el)} className={`certificate ${visibleSections["certificate"] ? "visible" : ""}`}>
        <h2>Chứng chỉ được cấp phép</h2>
        <p>
          Sau khi hoàn thành các cột mốc, học viên sẽ nhận được chứng chỉ xác nhận năng lực giao tiếp tiếng Anh,
          được cấp bởi hệ thống AESP và đối tác kiểm định chất lượng.
        </p>
      </section>

      {/* PACKAGES */}
<section
  id="packages"
  ref={(el) => (sectionRefs.current["packages"] = el)}
  className={`packages ${visibleSections["packages"] ? "visible" : ""}`}
>
  <h2>Các gói học</h2>
  <p className="packages-desc">
    Truy cập toàn bộ khóa học và tài liệu học tập. <br />
    Sử dụng không giới hạn tất cả tính năng luyện nói với AI. <br />
    Nhận phản hồi phát âm tức thì và lộ trình học tập cá nhân hóa. <br />
    Có sự hỗ trợ từ giảng viên hướng dẫn tận tình, chuyên nghiệp.
  </p>
  <div className="package-list">
    {packages.map((pkg) => (
      <div key={pkg.id} className="card package-card">
        <h3>{pkg.name}</h3>
        <div className="price-block">
          {pkg.original_price && (
            <div className="original">
              {pkg.original_price.toLocaleString()} đ
            </div>
          )}
          <div className="current">
            {pkg.price.toLocaleString()} đ / {pkg.duration_days} Ngày
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() =>
            document.getElementById("register").scrollIntoView({ behavior: "smooth" })
          }
        >
          Đăng ký ngay để nhận ưu đãi
        </button>
      </div>
    ))}
  </div>
</section>
      {/* MENTOR INTRO */}
      <section
        id="mentor-intro"
        ref={(el) => (sectionRefs.current["mentor-intro"] = el)}
        className={`mentor-intro ${visibleSections["mentor-intro"] ? "visible" : ""}`}
      >
        <div className="mentor-intro-content">
          <img src={mentorImage} alt="Giảng viên hỗ trợ" />
          <div>
            <h2>Giảng viên hỗ trợ</h2>
            <p>
              Các giáo viên hỗ trợ có chuyên môn sẽ giúp bạn duy trì động lực học và tiến bộ đúng hướng.
              Bạn sẽ không bao giờ cô đơn trên hành trình chinh phục tiếng Anh tại AESP.
            </p>
          </div>
        </div>
      </section>

      {/* REGISTER FORM */}
      <section
        id="register"
        ref={(el) => (sectionRefs.current["register"] = el)}
        className={`register-form ${visibleSections["register"] ? "visible" : ""}`}
      >
        <h2>Đăng ký nhanh</h2>
        <form onSubmit={handleRegister}>
          <input type="text" name="name" placeholder="Họ tên" required />
          <input type="email" name="email" placeholder="Email" required />
          <input type="tel" name="phone" placeholder="Số điện thoại" required />
          <button type="submit" className="btn btn-primary">
            Gửi đăng ký
          </button>
        </form>
      </section>

      {/* PARTNERS */}
      <section
        id="partners"
        ref={(el) => (sectionRefs.current["partners"] = el)}
        className={`partners ${visibleSections["partners"] ? "visible" : ""}`}
      >
        <h2>Đối tác tin cậy</h2>
        <div className="partner-list">
          {samplePartners.map((p) => (
            <div key={p.id} className="partner-card">
              <img src={p.logo} alt={p.name} />
              <p>{p.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" className="footer">
        <div className="footer-top">
          <div className="footer-left">
            <h4>Chấp nhận thanh toán</h4>
            <div className="payment-list">
              <img src={atmLogo} alt="ATM" />
              <img src={paypalLogo} alt="PayPal" />
              <img src={momoLogo} alt="Momo" />
              <img src={zalopayLogo} alt="ZaloPay" />
            </div>
          </div>
          <div className="footer-right">
            <h4>Công ty TNHH AESP</h4>
            <p>Địa chỉ trụ sở: 70 Đ. Tô Ký, Tân Chánh Hiệp, Quận 12, TP. Hồ Chí Minh</p>
            <p>Số điện thoại hỗ trợ: 0123456789</p>
            <p>Email hỗ trợ: admin@gmail.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          © 2025 AESP - All rights reserved
        </div>
      </footer>
    </div>
  );
}