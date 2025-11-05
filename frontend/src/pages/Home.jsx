import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaChalkboardTeacher, FaBookOpen, FaAward, FaLaptopCode } from "react-icons/fa";
import logo from "../assets/images/logo.png";
import "../styles/home.css";
import atmLogo from "../assets/payments/ATM.png";
import paypalLogo from "../assets/payments/Paypal.png";
import momoLogo from "../assets/payments/Momo.png";
import zalopayLogo from "../assets/payments/Zalopay.png";

export default function Home() {
  const navigate = useNavigate();
  const [packages, setPackages] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [partners, setPartners] = useState([]);

  useEffect(() => {
    fetch("/api/admin/packages")
      .then(res => res.json())
      .then(data => setPackages(data.packages || []));

    fetch("/api/admin/users")
      .then(res => res.json())
      .then(data => {
        const teacherUsers = (data.users || []).filter(u => u.role === "mentor");
        setTeachers(teacherUsers);
      });

    fetch("/api/partners")
      .then(res => res.json())
      .then(data => setPartners(data.partners || []));
  }, []);

  return (
    <div className="home-wrap">
      {/* HEADER */}
      <header className="header">
        <img
          src={logo}
          alt="Logo"
          className="header-logo"
          onClick={() => navigate("/")}
        />
        <nav className="header-nav">
          <a href="#intro">Giới thiệu</a>
          <a href="#packages">Gói học</a>
          <a href="#register">Đăng ký</a>
          <a href="#contact">Liên hệ</a>
          <button
            className="btn btn-primary"
            onClick={() => navigate("/login")}
          >
            Đăng nhập
          </button>
        </nav>
      </header>

      {/* HERO */}
      <section id="intro" className="hero">
        <h1 className="hero-title">Nền tảng luyện nói tiếng Anh với AI</h1>
        <p className="hero-subtitle">
          Tự tin luyện nói từ cơ bản đến nâng cao với giảng viên hàng đầu.
        </p>
        <div className="hero-cta">
          <button
            className="btn btn-outline"
            onClick={() =>
              document
                .getElementById("packages")
                .scrollIntoView({ behavior: "smooth" })
            }
          >
            Xem gói học
          </button>
          <button
            className="btn btn-primary"
            onClick={() =>
              document
                .getElementById("register")
                .scrollIntoView({ behavior: "smooth" })
            }
          >
            Đăng ký ngay
          </button>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <div className="feature">
          <FaChalkboardTeacher size={32} />
          <p>Giảng viên</p>
        </div>
        <div className="feature">
          <FaBookOpen size={32} />
          <p>Khoá học</p>
        </div>
        <div className="feature">
          <FaAward size={32} />
          <p>Chứng chỉ</p>
        </div>
        <div className="feature">
          <FaLaptopCode size={32} />
          <p>Học online</p>
        </div>
      </section>

      {/* MENTORS */}
      <section className="mentors">
        <h2>Giảng viên hướng dẫn</h2>
        <div className="mentor-list">
          {teachers.map((t) => (
            <div key={t.id} className="card mentor-card">
              <img
                src={t.avatar || "https://i.pravatar.cc/150"}
                alt={t.fullName}
              />
              <h3>{t.fullName}</h3>
              <p>{t.bio || "Giảng viên tiếng Anh giàu kinh nghiệm"}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PACKAGES */}
      <section id="packages" className="packages">
        <h2>Các gói học</h2>
        <div className="package-list">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`card package-card ${pkg.featured ? "featured" : ""}`}
            >
              <h3>{pkg.name}</h3>
              <p className="price">{pkg.price} VND / tháng</p>
              <ul>
                {pkg.features?.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
              <button
                className="btn btn-primary"
                onClick={() =>
                  document
                    .getElementById("register")
                    .scrollIntoView({ behavior: "smooth" })
                }
              >
                Đăng ký ngay
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* REGISTER FORM */}
      <section id="register" className="register-form">
        <h2>Đăng ký nhanh</h2>
        <form onSubmit={(e) => e.preventDefault()}>
          <input type="text" placeholder="Họ tên" required />
          <input type="email" placeholder="Email" required />
          <input type="tel" placeholder="Số điện thoại" required />
          <button type="submit" className="btn btn-primary">
            Gửi đăng ký
          </button>
        </form>
      </section>

      {/* PARTNERS */}
      <section className="partners">
        <h2>Đối tác tin cậy</h2>
        <div className="partner-list">
          {partners.map((p) => (
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
