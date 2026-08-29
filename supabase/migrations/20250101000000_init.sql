-- ============================================================
-- 意见箱数据库 Schema
-- 在 Supabase SQL Editor 中执行此文件
-- ============================================================

-- 1. 意见表
CREATE TABLE IF NOT EXISTS suggestions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT '其他',
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'read', 'replied', 'archived')),
  author_name   TEXT,
  author_email  TEXT,
  is_anonymous  BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 回复表
CREATE TABLE IF NOT EXISTS replies (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 管理员会话表
CREATE TABLE IF NOT EXISTS admin_sessions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token         TEXT NOT NULL UNIQUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);

-- ============================================================
-- 索引
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON suggestions(category);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_replies_suggestion_id ON replies(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires_at ON admin_sessions(expires_at);

-- ============================================================
-- 辅助函数：自动更新 updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_suggestions_updated_at ON suggestions;
CREATE TRIGGER trg_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 辅助函数：清理过期会话
-- ============================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM admin_sessions WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- RLS 策略：公开可插入，管理员可读写
-- ============================================================
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

-- 任何人可以插入意见
CREATE POLICY "Anyone can insert suggestions"
  ON suggestions FOR INSERT
  TO anon
  WITH CHECK (true);

-- 只有管理员可以查看/更新/删除意见
-- (通过 Edge Function 绕过 RLS，使用 service_role key)
-- 这里不给 anon 角色 SELECT 权限，保证隐私

-- 匿名用户无法直接读取任何数据
CREATE POLICY "No public read on suggestions"
  ON suggestions FOR SELECT
  TO anon
  USING (false);

CREATE POLICY "No public update on suggestions"
  ON suggestions FOR UPDATE
  TO anon
  USING (false);

CREATE POLICY "No public delete on suggestions"
  ON suggestions FOR DELETE
  TO anon
  USING (false);

-- 回复表同理
CREATE POLICY "No public access on replies"
  ON replies FOR ALL
  TO anon
  USING (false);

CREATE POLICY "No public access on admin_sessions"
  ON admin_sessions FOR ALL
  TO anon
  USING (false);