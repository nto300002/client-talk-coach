import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <section className="panel" aria-labelledby="home-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="home-title">顧客折衝練習</h1>
        <p>受託開発の顧客対応を、記録を非公開のまま繰り返し練習します。</p>
        <div className="practice-controls">
          <Link className="primary-action" href="/setup">新しい練習を始める</Link>
          <Link className="secondary-link" href="/history">練習履歴</Link>
          <Link className="secondary-link" href="/recordings">録画管理</Link>
          <Link className="secondary-link" href="/recovery">中断データを確認</Link>
          <Link className="secondary-link" href="/admin/experiments">実験モード</Link>
        </div>
      </section>
    </main>
  );
}
