import { useState } from "react";
import type { Data, Duration } from "../types";
import { store } from "../services/storage";
import {
  emptyDay,
  getDay,
  totals,
  remaining,
  displayMinutes,
} from "../utils/model";
import { XP } from "../config/rules";
import { Summary } from "../components/Summary";
import { SavedText } from "../components/SavedText";
import { WishList } from "../components/WishList";
const clock = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
export function Today({
  data,
  now,
  today,
}: {
  data: Data;
  now: number;
  today: string;
}) {
  const d = data.days[today] ?? emptyDay(today),
    t = totals(d);
  const [duration, setDuration] = useState<Duration>(25),
    [name, setName] = useState(""),
    [minutes, setMinutes] = useState(""),
    [notice, setNotice] = useState("");
  const edit = (fn: (day: typeof d) => void) =>
    store.update((s) => fn(getDay(s, today)));
  return (
    <>
      <section className="heading">
        <div>
          <p className="eyebrow">把今天，过得有迹可循</p>
          <h1>今日，每一步都算数。</h1>
          <p className="muted">
            {new Date(today + "T12:00:00").toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
              weekday: "long",
            })}
          </p>
        </div>
        <div className="completion">
          <strong>
            {t.complete}
            <em> / 5</em>
          </strong>
          <span>今日完成度</span>
        </div>
      </section>
      <section className="overview" aria-label="今日总览">
        {[
          ["起床后不刷手机", t.flags[0] ? "已完成" : "待记录"],
          ["今日核心任务", t.flags[1] ? "已完成" : "待完成"],
          ["今日 XP", `${t.xp} XP`],
          ["想做的事", `${t.wishes} 件已完成`],
          ["低刺激活动", `${displayMinutes(t.low)} / 30 min`],
        ].map(([label, value], i) => (
          <div key={label}>
            <small>{label}</small>
            <strong>
              {value}
              <span>{t.flags[i] ? "✓" : "○"}</span>
            </strong>
          </div>
        ))}
      </section>
      <div className="today-grid">
        <div className="stack">
          <section className="card core">
            <p className="eyebrow">01 / 最重要的一件事</p>
            <h2>
              今日核心任务{" "}
              {t.flags[1] && <span className="badge">已完成 ✓</span>}
            </h2>
            <SavedText
              key={today}
              label="今日核心任务"
              placeholder="今天，最想推进哪一件事？"
              maxLength={1000}
              value={d.coreTask}
              onSave={(value) => {
                edit((r) => {
                  r.coreTask = value;
                  r.coreTaskCompleted = false;
                });
              }}
            />
            <div className="row spread">
              <small>只选一件，给它一点专注。</small>
              <button
                className="primary"
                disabled={!d.coreTask.trim() || d.coreTaskCompleted}
                onClick={() =>
                  edit((r) => {
                    r.coreTaskCompleted = true;
                  })
                }
              >
                {d.coreTaskCompleted ? "已经完成 ✓" : "完成核心任务"}
              </button>
            </div>
          </section>
          <section className="card">
            <div className="section-head">
              <h2>起床后的第一刻</h2>
              <span>02</span>
            </div>
            <p className="muted">今天起床后是否避免立即刷手机？</p>
            <div className="row">
              <button
                aria-pressed={d.morningNoPhone}
                className={d.morningNoPhone ? "selected" : ""}
                onClick={() =>
                  edit((r) => {
                    r.morningNoPhone = true;
                  })
                }
              >
                完成 {d.morningNoPhone ? "✓" : ""}
              </button>
              <button
                aria-pressed={!d.morningNoPhone}
                onClick={() =>
                  edit((r) => {
                    r.morningNoPhone = false;
                  })
                }
              >
                未完成
              </button>
            </div>
          </section>
          <WishList data={data} today={today} />
        </div>
        <div className="stack">
          <section className="card focus">
            <div className="section-head">
              <h2>留一段时间，专注工作</h2>
              <span>03</span>
            </div>
            <div className="segments">
              {([25, 50] as const).map((v) => (
                <button
                  key={v}
                  disabled={!!data.focus}
                  className={duration === v ? "selected" : ""}
                  onClick={() => setDuration(v)}
                >
                  {v} 分钟 <small>+{XP[v]} XP</small>
                </button>
              ))}
            </div>
            <div className="timer" aria-label="专注剩余时间">
              {clock(
                data.focus ? remaining(data.focus, now) : duration * 60000,
              )}
            </div>
            <p className="timer-caption">
              {data.focus
                ? data.focus.startedAt === null
                  ? "已暂停 · 按自己的节奏继续"
                  : "专注进行中 · 时间到后自动结算"
                : "一次只做一件事"}
            </p>
            <div className="row center">
              {!data.focus ? (
                <button
                  className="primary"
                  onClick={() =>
                    void store.update((s) => {
                      if (!s.focus)
                        s.focus = {
                          id: crypto.randomUUID(),
                          duration,
                          remainingMs: duration * 60000,
                          startedAt: Date.now(),
                        };
                    })
                  }
                >
                  开始专注
                </button>
              ) : (
                <>
                  <button
                    className="primary"
                    onClick={() =>
                      void store.update((s) => {
                        if (s.focus) {
                          const n = Date.now();
                          if (s.focus.startedAt === null) s.focus.startedAt = n;
                          else {
                            s.focus.remainingMs = remaining(s.focus, n);
                            s.focus.startedAt = null;
                          }
                        }
                      })
                    }
                  >
                    {data.focus.startedAt === null ? "继续" : "暂停"}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("放弃本次专注？本次不会获得 XP。"))
                        void store.update((s) => {
                          s.focus = null;
                        });
                    }}
                  >
                    放弃
                  </button>
                  <button
                    disabled={remaining(data.focus, now) > 0}
                    onClick={() => void store.update(() => {})}
                  >
                    完成
                  </button>
                </>
              )}
            </div>
            <div className="focus-stats">
              <span>
                <strong>{t.xp}</strong>今日 XP
              </span>
              <span>
                <strong>{d.focusSessions.length}</strong>专注次数
              </span>
              <span>
                <strong>{t.minutes}</strong>专注分钟
              </span>
            </div>
            <details>
              <summary>忘记计时？手动补录</summary>
              <p className="muted">
                按上方所选时长补录，与计时完成获得相同 XP。
              </p>
              <button
                onClick={async () => {
                  const id = crypto.randomUUID();
                  await store.update((s) =>
                    getDay(s, today).focusSessions.push({
                      id,
                      duration,
                      xp: XP[duration],
                      completedAt: Date.now(),
                      manual: true,
                    }),
                  );
                  setNotice(
                    store.error() ||
                      `已补录 ${duration} 分钟专注，+${XP[duration]} XP`,
                  );
                }}
              >
                补录 {duration} 分钟 / +{XP[duration]} XP
              </button>
            </details>
          </section>
          <section className="card">
            <div className="section-head">
              <h2>低刺激活动</h2>
              <span>05</span>
            </div>
            <p className="muted">散步、洗澡、发呆，让注意力休息一下。</p>
            <p className="low-progress">
              <strong>{displayMinutes(t.low)}</strong> / 30 min{" "}
              {t.flags[4] ? "✓" : ""}
            </p>
            <progress max={30} value={t.low} />
            <div className="row low-timer">
              {data.low ? (
                <>
                  <strong aria-label="低刺激计时">
                    {clock(Math.max(0, now - data.low.startedAt))}
                  </strong>
                  <button
                    className="primary"
                    onClick={() =>
                      void store.update((s) => {
                        if (s.low) {
                          const end = Date.now(),
                            minutes =
                              Math.max(0, end - s.low.startedAt) / 60000;
                          if (minutes > 0)
                            getDay(s, today).lowStimulusActivities.push({
                              id: s.low.id,
                              name: "低刺激活动（计时）",
                              minutes,
                              createdAt: end,
                            });
                          s.low = null;
                        }
                      })
                    }
                  >
                    结束并记录
                  </button>
                </>
              ) : (
                <button
                  onClick={() =>
                    void store.update((s) => {
                      if (!s.low)
                        s.low = {
                          id: crypto.randomUUID(),
                          startedAt: Date.now(),
                        };
                    })
                  }
                >
                  开始低刺激活动
                </button>
              )}
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const n = Number(minutes);
                if (!name.trim() || !Number.isFinite(n) || n <= 0) return;
                await edit((r) =>
                  r.lowStimulusActivities.push({
                    id: crypto.randomUUID(),
                    name: name.trim(),
                    minutes: n,
                    createdAt: Date.now(),
                  }),
                );
                if (!store.error()) {
                  setName("");
                  setMinutes("");
                }
              }}
            >
              <div className="activity-input">
                <input
                  aria-label="活动名称"
                  placeholder="活动名称，如散步"
                  maxLength={100}
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  aria-label="持续分钟"
                  placeholder="分钟"
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                />
                <button type="submit">记录</button>
              </div>
            </form>
            {d.lowStimulusActivities.length > 0 && (
              <ul className="activity-list">
                {d.lowStimulusActivities.map((a) => (
                  <li key={a.id}>
                    {a.name}
                    <span>{displayMinutes(a.minutes)} min</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <Summary day={d} />
    </>
  );
}
