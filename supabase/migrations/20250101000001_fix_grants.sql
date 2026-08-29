-- 修复：授予 anon 角色 INSERT 权限（RLS 策略已允许，但缺少基础权限）
GRANT INSERT ON suggestions TO anon;
GRANT USAGE ON SCHEMA public TO anon;