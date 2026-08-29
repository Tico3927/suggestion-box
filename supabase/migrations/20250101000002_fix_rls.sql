-- 修复 RLS 策略：去掉 TO anon 限制，让策略对所有角色生效
DROP POLICY IF EXISTS "Anyone can insert suggestions" ON suggestions;
CREATE POLICY "Anyone can insert suggestions"
  ON suggestions FOR INSERT
  WITH CHECK (true);

-- 同样修复其他策略
DROP POLICY IF EXISTS "No public read on suggestions" ON suggestions;
CREATE POLICY "No public read on suggestions"
  ON suggestions FOR SELECT
  USING (false);

DROP POLICY IF EXISTS "No public update on suggestions" ON suggestions;
CREATE POLICY "No public update on suggestions"
  ON suggestions FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No public delete on suggestions" ON suggestions;
CREATE POLICY "No public delete on suggestions"
  ON suggestions FOR DELETE
  USING (false);