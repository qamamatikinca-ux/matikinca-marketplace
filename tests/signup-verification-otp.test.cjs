const {test}=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const path=require("node:path");
test("signup UI verifies Supabase-generated code and retains CAPTCHA resend guard",()=>{
 const page=fs.readFileSync(path.join(process.cwd(),"app/signup/page.tsx"),"utf8");
 assert.match(page,/supabase\.auth\.verifyOtp\(/);
 assert.match(page,/type:"signup"/);
 assert.match(page,/autoComplete="one-time-code"/);
 assert.match(page,/resendCooldown > 0/);
 assert.match(page,/captchaToken/);
 assert.match(page,/router\.replace\("\/complete-profile"\)/);
});
test("brand email uses Supabase one-time token, never a locally generated code",()=>{
 const html=fs.readFileSync(path.join(process.cwd(),"supabase/email-templates/confirm-signup.html"),"utf8");
 assert.match(html,/{{ \.Token }}/);
 assert.match(html,/Your verification code/);
 assert.match(html,/loadlink-logo-light.png/);
 assert.doesNotMatch(html,/script|onerror=/i);
});
