-- MNN Sponsor: Supabase Migration
-- スポンサー獲得管理アプリ テーブル定義 + RLS + Realtime

-- スポンサー企業テーブル
CREATE TABLE IF NOT EXISTS sponsors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  representative TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  address TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  priority TEXT DEFAULT 'mid'
    CHECK (priority IN ('high', 'mid', 'low')),
  status TEXT DEFAULT 'not_started'
    CHECK (status IN (
      'not_started', 'approaching', 'negotiating',
      'verbal_commit', 'confirmed', 'declined'
    )),
  plan TEXT DEFAULT 'undecided'
    CHECK (plan IN (
      'diamond', 'platinum', 'gold', 'silver', 'support', 'undecided'
    )),
  amount INTEGER DEFAULT 0,
  approach_reason TEXT DEFAULT '',
  relationship_memo TEXT DEFAULT '',
  next_action TEXT DEFAULT '',
  next_action_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 活動ログテーブル
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  sponsor_id TEXT NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  log_date DATE NOT NULL,
  log_type TEXT NOT NULL
    CHECK (log_type IN ('phone', 'visit', 'email', 'meeting', 'other')),
  memo TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_sponsors_status ON sponsors(status);
CREATE INDEX IF NOT EXISTS idx_sponsors_priority ON sponsors(priority);
CREATE INDEX IF NOT EXISTS idx_sponsors_plan ON sponsors(plan);
CREATE INDEX IF NOT EXISTS idx_sponsors_next_action_date ON sponsors(next_action_date);
CREATE INDEX IF NOT EXISTS idx_activity_logs_sponsor_id ON activity_logs(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_log_date ON activity_logs(log_date);

-- RLS: チームツール（anonキーで全操作許可）
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to sponsors"
  ON sponsors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to activity_logs"
  ON activity_logs FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sponsors;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sponsors_updated_at
  BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
