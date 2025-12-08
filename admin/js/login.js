// -----------------------
// 관리자 로그인 스크립트
// -----------------------

document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("adminEmail").value.trim();
    const password = document.getElementById("adminPassword").value.trim();

    if (!email || !password) {
        alert("이메일과 비밀번호를 입력하세요.");
        return;
    }

    console.log("로그인 시도:", email);

    const {data, error} = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("로그인 실패:", error);
        alert("로그인 실패: " + error.message);
        return;
    }

    console.log("로그인 성공:", data);
    alert("로그인 성공!");

    // 관리자 페이지로 이동
    window.location.href = "/admin/dashboard.html";
});
