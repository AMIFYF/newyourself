import { useState } from "react";
import type { Data } from "../types";
import { totals, displayMinutes } from "../utils/model";
import { Summary } from "../components/Summary";
export function History({ data }: { data: Data }) {
  const [selected, setSelected] = useState<string | null>(null);
  const days = Object.values(data.days).sort((a, b) =>
    b.date.localeCompare(a.date),
  );
  const d = selected ? data.days[selected] : undefined;
  return (
    <>
      <section className="heading">
        <div>
          <p className="eyebrow">每一天，都有自己的记录</p>
          <h1>回看走过的路。</h1>
          <p className="muted">完成多少，都值得留下。</p>
        </div>
      </section>
      {d ? (
        <>
          <button onClick={() => setSelected(null)}>← 返回日期列表</button>
          <h2 className="detail-title">{d.date}</h2>
          <Summary day={d} />
          <section className="card">
            <h2>专注记录</h2>
            {d.focusSessions.length ? (
              d.focusSessions.map((f) => (
                <p key={f.id}>
                  {f.duration} 分钟 · +{f.xp} XP ·{" "}
                  {f.manual ? "手动补录" : "计时完成"} ·{" "}
                  {new Date(f.completedAt).toLocaleTimeString("zh-CN")}
                </p>
              ))
            ) : (
              <p className="muted">尚无专注记录</p>
            )}
            <h2>低刺激活动记录</h2>
            {d.lowStimulusActivities.length ? (
              d.lowStimulusActivities.map((a) => (
                <p key={a.id}>
                  {a.name} · {displayMinutes(a.minutes)} 分钟
                </p>
              ))
            ) : (
              <p className="muted">尚无活动记录</p>
            )}
          </section>
        </>
      ) : (
        <section className="card history-list">
          {days.length ? (
            days.map((d) => {
              const t = totals(d);
              return (
                <button key={d.date} onClick={() => setSelected(d.date)}>
                  <strong>{d.date.replaceAll("-", " / ")}</strong>
                  <span>{t.complete} / 5 项</span>
                  <span>{t.xp} XP</span>
                  <span>{t.minutes} min</span>
                  <span>→</span>
                </button>
              );
            })
          ) : (
            <div className="empty">
              还没有记录。今天的一点行动，会从这里留下。
            </div>
          )}
        </section>
      )}
    </>
  );
}
