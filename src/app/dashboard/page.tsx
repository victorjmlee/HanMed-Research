"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ClinicalCase } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const [cases, setCases] = useState<ClinicalCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }
      fetchCases();
    };
    checkAuth();
  }, [router]);

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("clinical_cases")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setCases(data as ClinicalCase[]);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const outcomeColor = (outcome: string) => {
    switch (outcome) {
      case "완치": return "bg-green-100 text-green-700";
      case "호전": return "bg-blue-100 text-blue-700";
      case "변화없음": return "bg-gray-100 text-gray-700";
      case "악화": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-500";
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">醫案</h1>
          <p className="text-gray-500 text-sm">임상 사례 라이브러리</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/cases/new")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + 새 사례
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
          >
            로그아웃
          </button>
        </div>
      </div>

      {/* Case List */}
      {loading ? (
        <p className="text-center text-gray-400 py-12">불러오는 중...</p>
      ) : cases.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400 mb-4">아직 등록된 사례가 없습니다</p>
          <button
            onClick={() => router.push("/cases/new")}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            첫 임상 사례 등록하기
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cases.map((c) => (
            <div
              key={c.id}
              className="p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
              onClick={() => router.push(`/cases/${c.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400">
                      {c.case_number}
                    </span>
                    <span className="text-xs text-gray-400">
                      {c.age_group} {c.gender}
                    </span>
                    {c.outcome && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${outcomeColor(c.outcome)}`}>
                        {c.outcome}
                      </span>
                    )}
                    {(c as any).profiles?.name && (
                      <span className="text-xs text-gray-400">
                        · 작성: {(c as any).profiles.name}
                      </span>
                    )}
                  </div>
                  <p className="font-medium text-gray-900">
                    {c.chief_complaint}
                  </p>
                  {c.pattern_identification && (
                    <p className="text-sm text-gray-500 mt-1">
                      변증: {c.pattern_identification}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">
                    처방: {c.prescription}
                  </p>
                </div>
                <span className="text-xs text-gray-400 ml-4 whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString("ko-KR")}
                </span>
              </div>
              {c.tags && c.tags.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
