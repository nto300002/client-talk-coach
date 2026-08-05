import Link from "next/link";

export default function PartialRetryPage() {
  return <main><section className="panel" aria-labelledby="partial-retry-title"><p className="eyebrow">ClientTalk Coach</p><h1 id="partial-retry-title">部分再練習を確認する</h1><p>直前の改善課題を、30秒から2分の短い練習として繰り返します。</p><div className="practice-controls"><Link className="primary-action" href="/review">再練習を開始する</Link><Link className="secondary-link" href="/results">結果へ戻る</Link></div></section></main>;
}
