export async function api(path, opts){ const res=await fetch(path, opts); if(!res.ok) throw new Error("Request failed"); return res.json(); }
