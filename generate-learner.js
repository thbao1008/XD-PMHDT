import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const learnerDir = path.join(__dirname, "src/components/learner");

// ✅ Tạo thư mục nếu chưa có
fs.mkdirSync(learnerDir, { recursive: true });

const components = [
  "PackageCatalog",
  "SpeakingPractice",
  "Challenges",
  "ProgressAnalytics"
];

components.forEach(name => {
  const filePath = path.join(learnerDir, `${name}.jsx`);

  if (fs.existsSync(filePath)) {
    console.log(`⚠️ ${name}.jsx đã tồn tại, bỏ qua. - generate-learner.js:24`);
    return;
  }

  const content = `import React from "react";

export default function ${name}() {
  return (
    <div className="${name.toLowerCase()}-page">
      <h2>${name}</h2>
      <p>Trang ${name} dành cho học viên.</p>
    </div>
  );
}
`;

  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Đã tạo ${name}.jsx - generate-learner.js:41`);
});

console.log("🎉 Hoàn tất tạo các file learner! - generate-learner.js:44");
