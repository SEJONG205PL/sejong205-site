/*
======================================================
Include HTML Files (Header/Footer)
- 중복 초기화 방지
- Supabase 자동 초기화
======================================================
*/

document.addEventListener("DOMContentLoaded", async () => {
    console.log("📄 DOM loaded, starting include process...");

    const targets = document.querySelectorAll("[data-include]");
    if (targets.length === 0) {
        console.log("ℹ️ No include targets found, dispatching appReady");
        document.dispatchEvent(new Event("appReady"));
        return;
    }

    let loadedCount = 0;
    let errorCount = 0;

    targets.forEach((el) => {
        const url = el.getAttribute("data-include");
        console.log(`📥 Loading include: ${url}`);

        fetch(url)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.text();
        })
        .then((html) => {
            el.innerHTML = html;
            loadedCount++;
            console.log(`✅ Include loaded: ${url} (${loadedCount}/${targets.length})`);
            checkCompletion();
        })
        .catch((error) => {
            console.error(`❌ Failed to load ${url}:`, error);
            errorCount++;
            el.innerHTML = `<div class="error">Failed to load content</div>`;
            checkCompletion();
        });
    });

    function checkCompletion() {
        if (loadedCount + errorCount === targets.length) {
            console.log("✅ All includes loaded, checking Supabase...");

            // include 로딩 완료 이벤트 발생
            document.dispatchEvent(new Event("includeLoaded"));

            // Supabase 초기화 (단 한번만)
            initializeSupabaseOnce();
        }
    }
});

function initializeSupabaseOnce() {
    console.log("🔍 Checking Supabase initialization status...");

    // 이미 초기화되었는지 확인
    if (window.supabaseInitialized === true && typeof window.supabaseClient !== "undefined") {
        console.log("ℹ️ Supabase already initialized, skipping");
        document.dispatchEvent(new Event("appReady"));
        return;
    }

    // Supabase 라이브러리 확인
    if (typeof supabase === "undefined") {
        console.warn("⚠️ Supabase library not found, proceeding without it");
        document.dispatchEvent(new Event("appReady"));
        return;
    }

    // 이미 다른 곳에서 생성했는지 확인
    if (window.supabaseClient) {
        console.log("ℹ️ Supabase client already exists, using existing one");
        window.supabaseInitialized = true;
        document.dispatchEvent(new Event("supabaseReady"));
        setTimeout(() => {
            document.dispatchEvent(new Event("appReady"));
        }, 100);
        return;
    }

    try {
        console.log("🔧 Creating new Supabase client...");

        // Supabase 클라이언트 생성
        window.supabaseClient = supabase.createClient(
            "https://kacybdckxdromylxdptz.supabase.co",
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY3liZGNreGRyb215bHhkcHR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxODE3NDcsImV4cCI6MjA3OTc1Nzc0N30.O7aJjNrcCinIprlSdbe0EAK0FQgSmBRBl6PaOTwm1Rg"
        );

        window.supabaseInitialized = true;

        console.log("✅ Supabase initialization successful");

        // 다른 스크립트들을 위해 이벤트 발생
        document.dispatchEvent(new Event("supabaseReady"));

        // 약간의 지연 후 appReady 발생
        setTimeout(() => {
            document.dispatchEvent(new Event("appReady"));
        }, 100);
    } catch (error) {
        console.error("❌ Supabase initialization failed:", error);
        console.log("⚠️ Proceeding without Supabase");
        document.dispatchEvent(new Event("appReady"));
    }
}
