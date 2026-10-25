// ============================================================================
// index.js - App Entry Point & Intelligent Routing
// ============================================================================
import supabase from "./credential.js";

// Check karte hain ke setup ho chuka hai ya nahi aur kahan redirect karna hai
const routeEntry = async () => {
  try {
    // 1. Company table check kar rahe hain
    const { data: companyData, error: companyError } = await supabase
      .from("company")
      .select("id")
      .limit(1);

    if (companyError || !companyData || companyData.length === 0) {
      // Agar company nahi bani to pehle setup.html par bhejte hain
      window.location.href = "setup.html";
      return;
    }

    // 2. Active session check kar rahe hain
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
      // 3. Profiles se check karte hain ke password change karna lazmi hai ya nahi
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change, active")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profile) {
        if (profile.active === false) {
          await supabase.auth.signOut();
          window.location.href = "login.html";
          return;
        }

        if (profile.must_change === true) {
          window.location.href = "change.html";
          return;
        }
      }

      window.location.href = "dashboard.html";
    } else {
      // Session nahi hai to login par bhejte hain
      window.location.href = "login.html";
    }
  } catch (error) {
    console.error("Entry routing error:", error);
    window.location.href = "login.html";
  }
};

routeEntry();
