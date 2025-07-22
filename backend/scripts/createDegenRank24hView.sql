-- Materialized view for 24h leaderboard (rolling window)
CREATE MATERIALIZED VIEW public.degen_rank_24h AS
WITH
  all_trades AS (
    SELECT
      trades_pump.user_address,
      trades_pump.status,
      trades_pump.pnl_sol,
      trades_pump.degen_score
    FROM
      trades_pump
    WHERE
      trades_pump.last_sell_at >= NOW() - INTERVAL '24 hours'
    UNION ALL
    SELECT
      trades_bonk.user_address,
      trades_bonk.status,
      trades_bonk.pnl_sol,
      trades_bonk.degen_score
    FROM
      trades_bonk
    WHERE
      trades_bonk.last_sell_at >= NOW() - INTERVAL '24 hours'
  ),
  aggregated_stats AS (
    SELECT
      all_trades.user_address,
      SUM(all_trades.degen_score) AS total_degen_score,
      SUM(all_trades.pnl_sol) AS total_pnl_sol,
      COUNT(*) AS total_trades,
      SUM(CASE WHEN all_trades.status = 'WIN' THEN 1 ELSE 0 END) AS total_wins,
      SUM(CASE WHEN all_trades.status = 'LOSS' THEN 1 ELSE 0 END) AS total_losses
    FROM
      all_trades
    GROUP BY
      all_trades.user_address
  )
SELECT
  ROW_NUMBER() OVER (
    ORDER BY
      (COALESCE(s.total_degen_score, 0)) DESC,
      (COALESCE(s.total_pnl_sol, 0)) DESC
  ) AS rank,
  u.address AS user_address,
  u.last_scanned_at,
  COALESCE(s.total_degen_score, 0) AS total_degen_score,
  COALESCE(s.total_pnl_sol, 0) AS total_pnl_sol,
  COALESCE(s.total_trades, 0) AS total_trades,
  COALESCE(s.total_wins, 0) AS total_wins,
  COALESCE(s.total_losses, 0) AS total_losses,
  CASE
    WHEN COALESCE(s.total_trades, 0) > 0 THEN COALESCE(s.total_wins, 0)::numeric / COALESCE(s.total_trades, 0)::numeric * 100
    ELSE 0
  END AS win_rate
FROM
  users u
  LEFT JOIN aggregated_stats s ON u.address = s.user_address
ORDER BY
  (
    ROW_NUMBER() OVER (
      ORDER BY
        (COALESCE(s.total_degen_score, 0)) DESC,
        (COALESCE(s.total_pnl_sol, 0)) DESC
    )
  ); 