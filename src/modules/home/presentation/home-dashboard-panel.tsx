import Link from "next/link";

import type { HomeDashboard } from "@/modules/home/domain/home-dashboard";

export function HomeDashboardPanel({ dashboard }: { dashboard: HomeDashboard | null }) {
  return (
    <main>
      <section className="panel home-panel" aria-labelledby="home-title">
        <p className="eyebrow">ClientTalk Coach</p>
        <h1 id="home-title">顧客折衝練習</h1>
        <p>受託開発の顧客対応を、記録を非公開のまま繰り返し練習します。</p>
        <section className="home-summary" aria-labelledby="home-summary-title">
          <h2 id="home-summary-title">今日の状態</h2>
          {dashboard?.latestPractice ? (
            <>
              <p>前回: {dashboard.latestPractice.scenarioId} Lv.{dashboard.latestPractice.difficultyLevel}</p>
              <p>練習前緊張 {dashboard.latestPractice.tensionBefore} → 練習後 {dashboard.latestPractice.tensionAfter}</p>
            </>
          ) : <p>前回の練習はありません。</p>}
          <p>録画保存数 {dashboard?.recordingCount ?? 0} / 20</p>
          {dashboard?.hasRecovery ? <p className="status-warning">中断された練習があります。確認してから再開できます。</p> : null}
        </section>
        <div className="practice-controls">
          <Link className="primary-action" href="/setup">新しい練習を始める</Link>
          <Link className="secondary-link" href="/history">練習履歴</Link>
          <Link className="secondary-link" href="/recordings">録画管理</Link>
          {dashboard?.hasRecovery ? <Link className="secondary-link" href="/recovery">中断データを確認</Link> : null}
          <Link className="secondary-link" href="/admin/experiments">実験モード</Link>
        </div>
      </section>
    </main>
  );
}
