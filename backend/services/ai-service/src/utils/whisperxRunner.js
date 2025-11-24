/**
 * Utility to find Python executable
 * Copied from backend/src/utils/whisperxRunner.js
 */
import { execSync } from "child_process";

export function findPythonExecutable() {
  const candidates = ["python3", "python", "py -3", "py"];
  
  for (const cmd of candidates) {
    try {
      const version = execSync(`${cmd} --version`, { encoding: "utf-8", stdio: "pipe" });
      if (version.includes("Python 3")) {
        return cmd;
      }
    } catch (err) {
      // Continue to next candidate
    }
  }
  
  return "python"; // Fallback
}

