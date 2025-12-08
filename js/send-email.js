// Supabase는 전역에서 window.supabaseClient 로 초기화됨
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const resultBox = document.getElementById("contactResult");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const customer_email = document.getElementById("customer_email").value.trim();
        const message = document.getElementById("customer_message").value.trim();

        if (!customer_email || !message) {
            resultBox.textContent = "Please enter all items.";
            resultBox.style.color = "red";
            return;
        }

        resultBox.textContent = "Sending...";

        try {
            /* --------------------------------------------------
                1) 문의내용 Supabase DB 저장
            -------------------------------------------------- */
            const {data: saved, error: saveError} = await supabaseClient
            .from("inquiries")
            .insert([{customer_email, message}])
            .select();

            if (saveError) throw saveError;

            /* --------------------------------------------------
                2) 관리자 이메일 가져오기
            -------------------------------------------------- */
            const {data: setting, error: settingError} = await supabaseClient
            .from("system_settings")
            .select("admin_email")
            .eq("id", 1)
            .single();

            if (settingError) throw settingError;

            const adminEmail = setting.admin_email;

            /* --------------------------------------------------
                3) Supabase Edge Function 호출 (smooth-function)
                   → 관리자 이메일 전송
            -------------------------------------------------- */
            const functionURL = "https://kacybdckxdromylxdptz.supabase.co/functions/v1/smooth-function";

            const emailRes = await fetch(functionURL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    to: adminEmail,
                    subject: "[SEJONG205 Inquiry] New Message Received",
                    message: `
                        <b>Customer Email:</b> ${customer_email}<br><br>
                        <b>Message:</b><br>${message.replace(/\n/g, "<br>")}
                    `,
                }),
            });

            // Edge Function 응답 체크
            if (!emailRes.ok) {
                const errData = await emailRes.text();
                console.error("Email function error:", errData);
                throw new Error("Email function request failed");
            }

            /* -------------------------------------------------- */
            resultBox.textContent = "Your inquiry has been sent successfully!";
            resultBox.style.color = "green";
            form.reset();
        } catch (err) {
            console.error("ERROR:", err);
            resultBox.textContent = "Transmission failed! Please try again.";
            resultBox.style.color = "red";
        }
    });
});
