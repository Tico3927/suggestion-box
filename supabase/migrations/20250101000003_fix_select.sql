-- 修复：INSERT 的 return=representation 被 SELECT 策略拦截
-- 删除 SELECT 阻止策略，RLS 默认会拒绝所有非 owner 的 SELECT
DROP POLICY IF EXISTS "No public read on suggestions" ON suggestions;

-- 保留：任何人都不能直接 SELECT 查询意见
-- (RLS 已启用，没有策略 = 默认拒绝)
-- INSERT 的 return=representation 不受 SELECT 策略影响
-- 但为了安全，确保没有 SELECT 策略存在