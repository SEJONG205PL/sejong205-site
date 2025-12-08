// 세션 확인 방식 수정 (v1 호환)
async function initAdminSession() {
    console.log("🔵 관리자 세션 체크 시작...");

    try {
        // v1 방식 세션 확인
        const session = supabaseClient.auth.session();

        if (!session || !session.user) {
            alert("로그인이 필요합니다.");
            window.location.href = "/login.html";
            return;
        }

        // 사용자 정보 로드
        const {data: profile, error} = await supabaseClient
        .from("profiles")
        .select("email, role")
        .eq("id", session.user.id)
        .single();

        if (error) {
            console.error("프로필 로드 실패:", error);
        }

        document.getElementById("adminEmail").textContent = profile?.email || session.user.email || "관리자";

        // 로그아웃 이벤트 리스너
        document.getElementById("logoutBtn").addEventListener("click", async () => {
            await supabaseClient.auth.signOut();
            window.location.href = "/login.html";
        });
    } catch (err) {
        console.error("관리자 세션 오류:", err);
    }
}
