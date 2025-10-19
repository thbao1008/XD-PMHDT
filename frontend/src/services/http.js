export const http = (url, options={}) => fetch(url, { headers:{ "Content-Type":"application/json", ...(options.headers||{}) }, ...options });
