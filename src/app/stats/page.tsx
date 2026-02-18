"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ClinicalCase } from "@/types";

const OUTCOME_LABELS = ["완치", "호전", "변화없음", "악화", "추적불가"];
const OUTCOME_COLORS: Record<string, string> = {
  "완치": "bg-green-500",
  "호전": "bg-blue-500",
  "변화없음": "bg-gray-400",
  "악화": "bg-red-500",
  "추적불가": "bg-yellow-500",
};
const OUTCOME_BG: Record<string, string> = {
  "완치": "bg-green-100 text-green-700",
  "호전": "bg-blue-100 text-blue-700",
  "변화없음": "bg-gray-100 text-gray-700",
  "악화": "bg-red-100 text-red-700",
  "추적불가": "bg-yellow-100 text-yellow-700",
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="h-5 w-full bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full ${color} transition-all duration-500`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      const { data, error } = await supabase
        .from("clinical_cases")
        .select("*, profiles(name)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCases(data as ClinicalCase[]);
      }
      setLoading(false);
    };
    init();
  }, [router]);

  // Search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.toLowerCase();
    return cases.filter(
      (c) =>
        c.chief_complaint?.toLowerCase().includes(q) ||
        c.prescription?.toLowerCase().includes(q) ||
        c.pattern_identification?.toLowerCase().includes(q) ||
        c.case_number?.toLowerCase().includes(q) ||
        c.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [cases, search]);

  // Stats
  const total = cases.length;

  const outcomeCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of OUTCOME_LABELS) map[o] = 0;
    cases.forEach((c) => {
      if (c.outcome && map[c.outcome] !== undefined) map[c.outcome]++;
    });
    return map;
  }, [cases]);
  const maxOutcome = Math.max(...Object.values(outcomeCounts), 1);

  const genderCounts = useMemo(() => {
    const map = { "남": 0, "여": 0 };
    cases.forEach((c) => {
      if (c.gender === "남" || c.gender === "여") map[c.gender]++;
    });
    return map;
  }, [cases]);

  const ageCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      if (c.age_group) map[c.age_group] = (map[c.age_group] || 0) + 1;
    });
    return Object.entries(map).sort(
      (a, b) => parseInt(a[0]) - parseInt(b[0])
    );
  }, [cases]);
  const maxAge = Math.max(...ageCounts.map(([, v]) => v), 1);

  const topPrescriptions = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      if (c.prescription) {
        const name = c.prescription.trim();
        map[name] = (map[name] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [cases]);
  const maxRx = topPrescriptions.length > 0 ? topPrescriptions[0][1] : 1;

  const topPatterns = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      if (c.pattern_identification) {
        const name = c.pattern_identification.trim();
        map[name] = (map[name] || 0) + 1;
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [cases]);
  const maxPat = topPatterns.length > 0 ? topPatterns[0][1] : 1;

  const topTags = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      c.tags?.forEach((t) => {
        map[t] = (map[t] || 0) + 1;
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [cases]);

  const monthlyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    cases.forEach((c) => {
      const month = c.created_at?.slice(0, 7); // YYYY-MM
      if (month) map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [cases]);
  const maxMonth = Math.max(...monthlyCounts.map(([, v]) => v), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-gray-600"
          >
            ← 대시보드
          </button>
          <div>
            <h1 className="text-2xl font-bold">통계 대시보드</h1>
            <p className="text-gray-500 text-sm">전체 임상 사례 분석</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-5 border border-gray-100 text-center">
          <p className="text-3xl font-bold text-blue-600">{total}</p>
          <p className="text-sm text-gray-500 mt-1">전체 사례</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 text-center">
          <p className="text-3xl font-bold text-green-600">
            {total > 0
              ? Math.round(
                  ((outcomeCounts["완치"] + outcomeCounts["호전"]) / total) * 100
                )
              : 0}
            %
          </p>
          <p className="text-sm text-gray-500 mt-1">호전율 (완치+호전)</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 text-center">
          <p className="text-3xl font-bold text-gray-700">
            {topPrescriptions.length > 0 ? topPrescriptions.length : 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">처방 종류</p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 text-center">
          <p className="text-3xl font-bold text-gray-700">
            {topPatterns.length > 0 ? topPatterns.length : 0}
          </p>
          <p className="text-sm text-gray-500 mt-1">변증 종류</p>
        </div>
      </div>

      {/* Two-column stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 치료 결과 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">치료 결과 분포</h2>
          <div className="space-y-3">
            {OUTCOME_LABELS.map((label) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm w-16 text-gray-600 shrink-0">{label}</span>
                <div className="flex-1">
                  <Bar
                    value={outcomeCounts[label]}
                    max={maxOutcome}
                    color={OUTCOME_COLORS[label]}
                  />
                </div>
                <span className="text-sm font-medium w-8 text-right text-gray-700">
                  {outcomeCounts[label]}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 성별 + 연령대 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">성별 / 연령대 분포</h2>
          {/* 성별 */}
          <div className="flex gap-4 mb-5">
            <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{genderCounts["남"]}</p>
              <p className="text-xs text-gray-500">남</p>
            </div>
            <div className="flex-1 bg-pink-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-pink-600">{genderCounts["여"]}</p>
              <p className="text-xs text-gray-500">여</p>
            </div>
          </div>
          {/* 연령대 */}
          <div className="space-y-2">
            {ageCounts.map(([label, count]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-sm w-16 text-gray-600 shrink-0">{label}</span>
                <div className="flex-1">
                  <Bar value={count} max={maxAge} color="bg-indigo-500" />
                </div>
                <span className="text-sm font-medium w-8 text-right text-gray-700">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 다빈도 처방 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">다빈도 처방 Top 10</h2>
          {topPrescriptions.length === 0 ? (
            <p className="text-sm text-gray-400">데이터 없음</p>
          ) : (
            <div className="space-y-2">
              {topPrescriptions.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-800 w-32 truncate shrink-0">
                    {name}
                  </span>
                  <div className="flex-1">
                    <Bar value={count} max={maxRx} color="bg-emerald-500" />
                  </div>
                  <span className="text-sm font-medium w-8 text-right text-gray-700">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 다빈도 변증 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">다빈도 변증 Top 10</h2>
          {topPatterns.length === 0 ? (
            <p className="text-sm text-gray-400">데이터 없음</p>
          ) : (
            <div className="space-y-2">
              {topPatterns.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-5 text-right shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-800 w-32 truncate shrink-0">
                    {name}
                  </span>
                  <div className="flex-1">
                    <Bar value={count} max={maxPat} color="bg-violet-500" />
                  </div>
                  <span className="text-sm font-medium w-8 text-right text-gray-700">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 월별 등록 추이 */}
      {monthlyCounts.length > 0 && (
        <section className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
          <h2 className="font-semibold mb-4">월별 등록 추이</h2>
          <div className="space-y-2">
            {monthlyCounts.map(([month, count]) => (
              <div key={month} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-20 shrink-0">{month}</span>
                <div className="flex-1">
                  <Bar value={count} max={maxMonth} color="bg-blue-500" />
                </div>
                <span className="text-sm font-medium w-8 text-right text-gray-700">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 태그 클라우드 */}
      {topTags.length > 0 && (
        <section className="bg-white rounded-xl p-6 border border-gray-100 mb-8">
          <h2 className="font-semibold mb-4">자주 사용된 태그</h2>
          <div className="flex flex-wrap gap-2">
            {topTags.map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setSearch(tag)}
                className="px-3 py-1.5 rounded-full text-sm border border-gray-200 text-gray-700 hover:bg-blue-50 hover:border-blue-200 transition-colors"
              >
                #{tag}
                <span className="ml-1 text-xs text-gray-400">{count}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 검색 + 사례 목록 */}
      <section className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="font-semibold text-lg">사례 검색</h2>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          placeholder="주소증, 처방, 변증, 태그로 검색..."
        />
        <p className="text-sm text-gray-400 mb-3">
          {search ? `${filtered.length}건 검색됨` : `전체 ${total}건`}
        </p>
        <div className="space-y-2">
          {filtered.slice(0, 30).map((c) => (
            <div
              key={c.id}
              className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => router.push(`/cases/${c.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-xs text-gray-400">{c.case_number}</span>
                    <span className="text-xs text-gray-400">
                      {c.age_group} {c.gender}
                    </span>
                    {c.outcome && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${OUTCOME_BG[c.outcome] || "bg-gray-100 text-gray-500"}`}
                      >
                        {c.outcome}
                      </span>
                    )}
                    {(c as any).profiles?.name && (
                      <span className="text-xs text-gray-400">
                        · {(c as any).profiles.name}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900 truncate">
                    {c.chief_complaint}
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500 mt-1">
                    {c.pattern_identification && (
                      <span>변증: {c.pattern_identification}</span>
                    )}
                    <span>처방: {c.prescription}</span>
                  </div>
                </div>
                <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </div>
          ))}
          {filtered.length > 30 && (
            <p className="text-sm text-gray-400 text-center py-3">
              상위 30건만 표시됩니다. 검색어를 입력하여 범위를 좁혀주세요.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
