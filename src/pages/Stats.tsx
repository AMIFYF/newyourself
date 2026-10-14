import type { Data } from "../types";
import { totals, emptyDay, dateOffset, streak } from "../utils/model";
export function Stats({ data, today }: { data: Data; today: string }) {
  const days = Object.values(data.days);
  const sums = days.map(totals);
  const metrics = [
    ["累计 XP", sums.reduce((n, t) => n + t.xp, 0), "XP"],
    ["累计专注时间", sums.reduce((n, t) => n + t.minutes, 0), "分钟"],
    [
      "累计完成专注",
      days.reduce((n, d) => n + d.focusSessions.length, 0),
      "次",
    ],
    ["核心任务完成", sums.filter((t) => t.flags[1]).length, "天"],
    ["五项全部完成", sums.filter((t) => t.complete === 5).length, "天"],
    ["最近连续完成", streak(data, today), "天"],
  ];
  return (
    <>
      <section className="heading">
        <div>
          <p className="eyebrow">看得见的日积月累</p>
          <h1>行动，正在积累。</h1>
          <p className="muted">不必比较，只看看自己的足迹。</p>
        </div>
      </section>
      <section className="metrics">
        {metrics.map(([title, n, unit]) => (
          <div className="card" key={title}>
            <small>{title}</small>
            <p>
              <strong>{n}</strong> {unit}
            </p>
          </div>
        ))}
      </section>
      <section className="card">
        <h2>最近 7 天完成情况</h2>
        <div className="week">
          {Array.from({ length: 7 }, (_, i) => dateOffset(today, i - 6)).map(
            (date) => {
              const n = totals(data.days[date] ?? emptyDay(date)).complete;
              return (
                <div key={date}>
                  <span>{n}/5</span>
                  <div className="bar-track">
                    <div style={{ height: `${n * 20}%` }} />
                  </div>
                  <small>{date.slice(5).replace("-", "/")}</small>
                </div>
              );
            },
          )}
        </div>
        <p className="muted">
          连续天数按自然日达到 5/5 计算；今天尚未完成时，从昨天向前计算。
        </p>
      </section>
    </>
  );
}
