"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AnalysisPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/results"); }, [router]);
  return <main><section className="panel" aria-live="polite"><h1>練習内容を分析しています</h1><p>利用できる分析結果をまとめています。</p></section></main>;
}
