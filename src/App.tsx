import { useEffect, useState, useSyncExternalStore } from "react";
import { store } from "./services/storage";
import { localDate, remaining } from "./utils/model";
import { Today } from "./pages/Today";
import { History } from "./pages/History";
import { Stats } from "./pages/Stats";
import { DataTools } from "./components/DataTools";
import { UpdateCheck } from "./components/UpdateCheck";
import { watchLifecycle } from "./services/lifecycle";
import { isNative } from "./services/persistence";
import "./App.css";
export default function App() {
  const data = useSyncExternalStore(store.subscribe, store.snapshot);
  const [now, setNow] = useState(() => Date.now()),
    [page, setPage] = useState("今日");
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const timer = setInterval(tick, 500);
    const cleanup = watchLifecycle(tick);
    return () => {
      clearInterval(timer);
      cleanup();
    };
  }, []);
  useEffect(() => {
    if (
      data.focus &&
      data.focus.startedAt !== null &&
      remaining(data.focus, now) === 0
    )
      void store.update(() => {});
  }, [data.focus, now]);
  return (
    <div className="shell">
      <aside>
        <a className="brand" href="#" onClick={() => setPage("今日")}>
          <b>一</b> 日有所得
        </a>
        <p className="brand-sub">给每一点行动，留个回声。</p>
        <nav aria-label="主导航">
          {["今日", "历史", "统计"].map((p, i) => (
            <button
              key={p}
              className={page === p ? "active" : ""}
              onClick={() => setPage(p)}
            >
              <span>0{i + 1}</span>
              {p}
            </button>
          ))}
        </nav>
        <div className="aside-note">
          行动不必很大。
          <br />
          今天的推进，都算数。<small>个人每日正反馈记录器</small>
        </div>
      </aside>
      <main>
        <header>
          <span>
            DAILY REFLECTION /{" "}
            {page === "今日"
              ? "TODAY"
              : page === "历史"
                ? "HISTORY"
                : "OVERVIEW"}
          </span>
          <span>● 本地自动保存</span>
        </header>
        {store.error() && (
          <div role="alert" className="notice">
            {store.error()}
          </div>
        )}
        {page === "今日" ? (
          <Today data={data} now={now} today={localDate(now)} />
        ) : page === "历史" ? (
          <History data={data} />
        ) : (
          <Stats data={data} today={localDate(now)} />
        )}
        <DataTools />
        <UpdateCheck />
        <footer>
          一点一滴，都是向前。
          <span>
            {isNative ? "数据仅保存在当前设备" : "数据仅保存在当前浏览器"}
          </span>
        </footer>
      </main>
    </div>
  );
}
