import type { DailyRecord } from "../types";
import { totals, displayMinutes } from "../utils/model";
export function Summary({ day }: { day: DailyRecord }) {
  const t = totals(day);
  return (
    <section className="card summary">
      <div className="section-head">
        <h2>今天的成果</h2>
        <span className="badge">五项完成 {t.complete} / 5</span>
      </div>
      <div className="summary-grid">
        <div>
          <small>今日核心任务</small>
          <p>
            {day.coreTask || "尚未记录"} {t.flags[1] ? "✓" : ""}
          </p>
          <small>今日专注</small>
          <p>
            {day.focusSessions.length} 次 · {t.minutes} 分钟 · {t.focusXP} XP
          </p>
          <small>起床后不刷手机 / 低刺激活动</small>
          <p>
            {day.morningNoPhone ? "已完成" : "未完成"} / {displayMinutes(t.low)}{" "}
            分钟
          </p>
        </div>
        <div>
          <small>
            完成的想做的事 · {t.wishes} 件 · {t.wishesXP} XP
          </small>
          {day.completedWishes.length ? (
            <ol>
              {day.completedWishes.map((w) => (
                <li key={w.id}>
                  {w.text} ✓<br />
                  <small>
                    {new Date(w.completedAt).toLocaleString("zh-CN")} · +{w.xp}{" "}
                    XP
                  </small>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">当天尚未完成事项</p>
          )}
          {t.notes > 0 && (
            <>
              <small>旧版推进记录（保留）</small>
              <ol>
                {day.progressNotes
                  .filter((n) => n.trim())
                  .map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
              </ol>
            </>
          )}
          <small>当日总 XP</small>
          <p>{t.xp} XP</p>
        </div>
      </div>
    </section>
  );
}
