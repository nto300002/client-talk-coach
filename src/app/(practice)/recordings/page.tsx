import Link from "next/link";

export default function RecordingsPage() {
  return <main><section className="panel" aria-labelledby="recordings-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="recordings-title">録画管理</h1><p>録画の確認と削除は、練習履歴から行えます。動画を削除しても分析結果と自己評価は保持されます。</p><Link className="primary-action" href="/history">練習履歴を開く</Link></section></main>;
}
