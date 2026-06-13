-- ============================================================
-- 経費管理アプリ — Supabase スキーマ定義
-- ============================================================

-- ------------------------------------------------------------
-- 1. テーブル作成
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id         UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  date       DATE          NOT NULL,
  category   TEXT          NOT NULL,
  amount     INTEGER       NOT NULL CHECK (amount > 0),
  memo       TEXT          NOT NULL DEFAULT '',
  status     TEXT          NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending', 'settled')),
  created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 2. RLS 有効化
-- ------------------------------------------------------------
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. RLS ポリシー（anon ロール = Publishable key からの全操作を許可）
-- ------------------------------------------------------------
CREATE POLICY "anon_select"
  ON expenses
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "anon_insert"
  ON expenses
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "anon_update"
  ON expenses
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "anon_delete"
  ON expenses
  FOR DELETE
  TO anon
  USING (true);

-- ------------------------------------------------------------
-- 4. RPC 関数
-- ------------------------------------------------------------

-- カテゴリ別合計
CREATE OR REPLACE FUNCTION get_category_totals()
RETURNS TABLE (category TEXT, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    category,
    SUM(amount)::BIGINT AS total
  FROM expenses
  GROUP BY category
  ORDER BY total DESC;
$$;

-- ステータス別件数
CREATE OR REPLACE FUNCTION get_status_counts()
RETURNS TABLE (status TEXT, count BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    status,
    COUNT(*)::BIGINT AS count
  FROM expenses
  GROUP BY status;
$$;

-- ------------------------------------------------------------
-- 5. anon ロールへの EXECUTE 権限付与
-- ------------------------------------------------------------
GRANT EXECUTE ON FUNCTION get_category_totals() TO anon;
GRANT EXECUTE ON FUNCTION get_status_counts()    TO anon;

-- ------------------------------------------------------------
-- 6. 初期データ 5 件
-- ------------------------------------------------------------
INSERT INTO expenses (date, category, amount, memo, status) VALUES
  ('2026-05-08', '交通費', 1280,  '新宿→品川 出張往復',   'settled'),
  ('2026-05-15', '接待費', 12800, '〇〇社 山田様 会食',    'settled'),
  ('2026-05-22', '会議費', 3200,  '社内MTG 飲み物・軽食',  'pending'),
  ('2026-06-03', '消耗品', 550,   'ボールペン・付箋 購入', 'pending'),
  ('2026-06-10', '通信費', 4980,  'モバイルWi-Fi 6月分',   'pending');
