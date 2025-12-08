// assets/js/supabase-init.js
// ===========================
// SEJONG205 SUPABASE INIT FINAL (Browser-Safe Version)
// ===========================

// 📌 1) Supabase 기본 설정
const SUPABASE_URL = "https://kacybdckxdromylxdptz.supabase.co";
const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3liZGNreGRyb215bHhkcHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODE3NDcsImV4cCI6MjA3OTc1Nzc0N30.O7aJjNrcCinIprlSdbe0EAK0FQgSmBRBl6PaOTwm1Rg";

// Supabase 클라이언트 초기화
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 🎯 전역 변수로 설정 (메인 클라이언트)
window.supabaseClient = supabaseClient;

// 🎯 하위 호환용 전역 변수 추가 (header-menu.js 호환)
window.supabase = supabaseClient;

// 🎯 초기화 상태 확인용 변수
window.supabaseReady = true;

// 📝 초기화 완료 로그
console.log("✅ Supabase initialized successfully");
console.log("🔗 Supabase URL:", SUPABASE_URL);
console.log("🔑 Supabase Client:", supabaseClient);
console.log("🌐 Global window.supabase:", window.supabase);
console.log("🌐 Global window.supabaseClient:", window.supabaseClient);

// 🎯 다양한 이벤트 발생 (호환성을 위해 여러 이벤트 발생)
document.dispatchEvent(new CustomEvent("supabaseReady"));
document.dispatchEvent(new CustomEvent("appReady"));

// 📱 window도 준비되었다면 추가 이벤트 발생
window.dispatchEvent(new CustomEvent("supabaseReady"));
window.dispatchEvent(new CustomEvent("appReady"));

console.log("🎉 Supabase initialization events dispatched");
