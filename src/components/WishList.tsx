import { useState } from "react";
import type { Data } from "../types";
import { store } from "../services/storage";
import { addWish, editWish, deleteWish, completeWish } from "../utils/wishes";
import { localDate } from "../utils/model";
import { WISH_XP } from "../config/rules";
export function WishList({ data, today }: { data: Data; today: string }) {
  const [text, setText] = useState(""),
    [editing, setEditing] = useState<string | null>(null),
    [draft, setDraft] = useState(""),
    [busy, setBusy] = useState(false);
  const completed = data.days[today]?.completedWishes ?? [];
  return (
    <section className="card wish-card">
      <div className="section-head">
        <h2>想做的事</h2>
        <span className="badge">今日完成 {completed.length} 件</span>
      </div>
      <p className="muted">未完成的事会一直保留。每完成一件，+{WISH_XP} XP。</p>
      <form
        className="row"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim() || busy) return;
          setBusy(true);
          const id = crypto.randomUUID(),
            value = text;
          await store.update((s) => addWish(s, id, value, Date.now()));
          if (!store.error()) setText("");
          setBusy(false);
        }}
      >
        <input
          aria-label="新的想做的事"
          placeholder="写下一件想做的事"
          maxLength={3000}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="primary" disabled={busy || !text.trim()}>
          增加
        </button>
      </form>
      <div className="wish-list">
        {data.wishes.length === 0 && (
          <p className="muted">暂时没有待完成的事，按自己的节奏来。</p>
        )}
        {data.wishes.map((w) => (
          <article
            className="wish-item"
            key={w.id}
            aria-label={`想做的事：${w.text}`}
          >
            {editing === w.id ? (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!draft.trim() || busy) return;
                  setBusy(true);
                  await store.update((s) => editWish(s, w.id, draft));
                  if (!store.error()) setEditing(null);
                  setBusy(false);
                }}
              >
                <input
                  aria-label="修改想做的事"
                  maxLength={3000}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <div className="row">
                  <button disabled={busy || !draft.trim()}>保存修改</button>
                  <button type="button" onClick={() => setEditing(null)}>
                    取消
                  </button>
                </div>
              </form>
            ) : (
              <>
                <p>{w.text}</p>
                <small>创建于 {localDate(w.createdAt)}</small>
                <div className="row">
                  <button
                    className="primary"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await store.update((s) =>
                        completeWish(s, w.id, Date.now()),
                      );
                      setBusy(false);
                    }}
                  >
                    完成 +{WISH_XP} XP
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      setEditing(w.id);
                      setDraft(w.text);
                    }}
                  >
                    修改
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => {
                      if (confirm("删除这件想做的事？删除不会获得 XP。"))
                        void store.update((s) => deleteWish(s, w.id));
                    }}
                  >
                    删除
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
      {completed.length > 0 && (
        <div className="completed-wishes">
          <h3>今日已完成</h3>
          {completed.map((w) => (
            <p key={w.id}>
              <span>✓ {w.text}</span>
              <small>
                {new Date(w.completedAt).toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · +{w.xp} XP
              </small>
            </p>
          ))}
        </div>
      )}
    </section>
  );
}
