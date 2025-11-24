// API Helper utilities for microservices architecture

/**
 * Get the base URL for API calls
 * Uses API Gateway (port 4000)
 */
export function getApiBaseUrl() {
  // Dùng relative URL để đi qua Vite proxy
  return import.meta.env.VITE_API_BASE || "/api";
}

/**
 * Get the base URL for static files (uploads)
 * Uses API Gateway which proxies to File Service
 */
export function getFileBaseUrl() {
  // Dùng relative URL để đi qua Vite proxy
  // Empty string = relative to current origin
  return import.meta.env.VITE_FILE_BASE || "";
}

/**
 * Normalize a file URL (handles both relative and absolute paths)
 * @param {string} url - The file URL (can be relative like /uploads/file.jpg or absolute)
 * @returns {string} - Full URL to the file
 */
export function normalizeFileUrl(url) {
  if (!url) return "";
  
  // If already a full URL, check if it's pointing to wrong port (service port instead of API Gateway)
  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const urlObj = new URL(url);
      const servicePorts = ["4001", "4002", "4003", "4004", "4005", "4006", "4007", "4008", "4009", "4010", "4011"];
      // If it's from API Gateway (port 4000) or service port, convert to relative path
      if (urlObj.port === "4000" || servicePorts.includes(urlObj.port)) {
        // Convert to relative path to go through Vite proxy
        return urlObj.pathname;
      }
      // External URL, return as is
      return url;
    } catch (e) {
      // Invalid URL, treat as relative
      console.warn("[normalizeFileUrl] Invalid URL:", url, e);
    }
  }
  
  // If relative path (starts with /uploads/), return as is (Vite proxy will handle it)
  if (url.startsWith("/uploads/") || url.startsWith("/")) {
    return url;
  }
  
  // Otherwise return as is
  return url;
}

/**
 * Normalize an audio URL for Audio element
 * @param {string} url - The audio URL
 * @returns {string} - Full URL to the audio file
 */
export function normalizeAudioUrl(url) {
  return normalizeFileUrl(url);
}

/**
 * Normalize an image URL for img src
 * @param {string} url - The image URL
 * @returns {string} - Full URL to the image
 */
export function normalizeImageUrl(url) {
  return normalizeFileUrl(url);
}

/**
 * Normalize a video URL for video src
 * @param {string} url - The video URL
 * @returns {string} - Full URL to the video
 */
export function normalizeVideoUrl(url) {
  return normalizeFileUrl(url);
}

