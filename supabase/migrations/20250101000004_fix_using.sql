-- 修复：显式添加 USING (true) 到 INSERT 策略
DROP POLICY IF EXISTS "Anyone can insert suggestions" ON suggestions;
CREATE POLICY "Anyone can insert suggestions"
  ON suggestions FOR INSERT
  USING (true)
  WITH CHECK (true);