// 2603班主任工作台 - Supabase 配置
// 1) 把 SUPABASE_URL 改成你的 Project URL，例如 https://xxxx.supabase.co
// 2) 把 SUPABASE_PUBLISHABLE_KEY 改成 sb_publishable_... 开头的 Publishable key
// 3) 只允许填写 Publishable key。绝对不要把 Secret key / service_role key 放进网页或 GitHub。
window.APP_CONFIG = {
  SUPABASE_URL: '',
  SUPABASE_PUBLISHABLE_KEY: '',
  REQUIRE_LOGIN: true,
  CLASS_CODE: '2603',
  CLASS_NAME: '2603班',
  TEACHER_NAME: '易老师',
  SCHOOL_STAGE: '学前教育阶段',
  AUTO_SYNC_SECONDS: 30
};
