"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { ClinicalCase } from "@/types";

interface ChatMessage {
  role: "user" | "ai";
  content: string;
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [caseData, setCaseData] = useState<ClinicalCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [aiQuestion, setAiQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchCase = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clinical_cases")
        .select("*, profiles(name)")
        .eq("id", id)
        .single();

      if (error || !data) {
        router.replace("/dashboard");
        return;
      }
      setCaseData(data as ClinicalCase);
      setIsOwner(user?.id === data.doctor_id);
      if ((data as any).profiles?.name) {
        setAuthorName((data as any).profiles.name);
      }
      setLoading(false);
    };
    fetchCase();
  }, [id, router]);

  const handleDelete = async () => {
    const { error } = await supabase
      .from("clinical_cases")
      .delete()
      .eq("id", id);

    if (error) {
      alert("삭제 실패: " + error.message);
    } else {
      router.push("/dashboard");
    }
  };

  const handleAsk = async () => {
    if (!aiQuestion.trim() || !caseData) return;

    const question = aiQuestion;
    setAiQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", content: question }]);
    setAiLoading(true);

    try {
      const context = `현재 사례 정보:
- 연령/성별: ${caseData.age_group} ${caseData.gender}
- 주소증: ${caseData.chief_complaint}
- 설진: ${caseData.tongue_diagnosis || "미입력"}
- 맥진: ${caseData.pulse_diagnosis || "미입력"}
- 변증: ${caseData.pattern_identification || "미입력"}
- 처방: ${caseData.prescription}
- 결과: ${caseData.outcome || "미입력"}
- 경과: ${caseData.outcome_notes || "미입력"}`;

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `${context}\n\n질문: ${question}`,
        }),
      });

      const data = await res.json();
      const answer = data.answer || data.error || "응답을 받지 못했습니다.";
      setChatHistory((prev) => [...prev, { role: "ai", content: answer }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "ai", content: "AI 서버 연결에 실패했습니다." }]);
    }
    setAiLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

  if (!caseData) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 목록
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{caseData.case_number}</h1>
            {caseData.outcome && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${outcomeColor(caseData.outcome)}`}>
                {caseData.outcome}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400">
            {caseData.age_group} {caseData.gender} · {new Date(caseData.created_at).toLocaleDateString("ko-KR")}
            {authorName && <> · 작성: {authorName}</>}
          </p>
        </div>
        {isOwner && (
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/cases/${id}/edit`)}
              className="px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            >
              수정
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              삭제
            </button>
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="font-bold text-lg mb-2">사례 삭제</h3>
            <p className="text-sm text-gray-500 mb-6">
              이 임상 사례를 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-6 items-start">
        {/* Left: Case details */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* 주소증 */}
          <section className="bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">주소증</h2>
            <p className="text-gray-900">{caseData.chief_complaint}</p>
          </section>

          {/* 진단 소견 */}
          {(caseData.tongue_diagnosis || caseData.pulse_diagnosis || caseData.pattern_identification) && (
            <section className="bg-white rounded-xl p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">진단 소견</h2>
              <div className="space-y-2 text-sm">
                {caseData.tongue_diagnosis && (
                  <div className="flex">
                    <span className="text-gray-400 w-12">설진</span>
                    <span className="text-gray-900">{caseData.tongue_diagnosis}</span>
                  </div>
                )}
                {caseData.pulse_diagnosis && (
                  <div className="flex">
                    <span className="text-gray-400 w-12">맥진</span>
                    <span className="text-gray-900">{caseData.pulse_diagnosis}</span>
                  </div>
                )}
                {caseData.pattern_identification && (
                  <div className="flex">
                    <span className="text-gray-400 w-12">변증</span>
                    <span className="text-gray-900">{caseData.pattern_identification}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 처방 */}
          <section className="bg-white rounded-xl p-5 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">처방</h2>
            <p className="text-gray-900 font-medium">{caseData.prescription}</p>
            {caseData.herb_details && caseData.herb_details.length > 0 && (
              <div className="mt-3 space-y-1">
                {caseData.herb_details.map((herb, i) => (
                  <div key={i} className="flex text-sm text-gray-600">
                    <span className="w-24">{herb.name}</span>
                    <span>{herb.dose}</span>
                  </div>
                ))}
              </div>
            )}
            {caseData.treatment_duration && (
              <p className="text-sm text-gray-500 mt-3">
                복용 기간: {caseData.treatment_duration}
              </p>
            )}
          </section>

          {/* 경과 */}
          {caseData.outcome_notes && (
            <section className="bg-white rounded-xl p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 mb-2">경과</h2>
              <p className="text-sm text-gray-900">{caseData.outcome_notes}</p>
            </section>
          )}

          {/* 연구 메모 */}
          {(caseData.clinical_notes || caseData.learning_points) && (
            <section className="bg-white rounded-xl p-5 border border-gray-100">
              <h2 className="text-sm font-semibold text-gray-500 mb-3">연구 메모</h2>
              {caseData.clinical_notes && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-1">임상 소견</p>
                  <p className="text-sm text-gray-900">{caseData.clinical_notes}</p>
                </div>
              )}
              {caseData.learning_points && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">배운 점</p>
                  <p className="text-sm text-gray-900">{caseData.learning_points}</p>
                </div>
              )}
            </section>
          )}

          {/* 태그 */}
          {caseData.tags && caseData.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {caseData.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 bg-gray-100 text-gray-500 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Chat (sticky) */}
        <div className="w-96 shrink-0 sticky top-8 hidden lg:block">
          <section className="bg-blue-50 rounded-xl border border-blue-100 flex flex-col" style={{ height: "calc(100vh - 8rem)" }}>
            <div className="p-4 border-b border-blue-100">
              <h2 className="text-sm font-semibold text-blue-900">AI에게 물어보기</h2>
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatHistory.length === 0 && (
                <p className="text-sm text-blue-400 text-center mt-8">
                  이 사례에 대해 궁금한 점을 물어보세요
                </p>
              )}
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    msg.role === "user"
                      ? "ml-8 bg-blue-600 text-white rounded-2xl rounded-br-md p-3"
                      : "mr-4 bg-white text-blue-900 rounded-2xl rounded-bl-md p-4 border border-blue-100 whitespace-pre-wrap"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {aiLoading && (
                <div className="mr-4 bg-white text-blue-400 rounded-2xl rounded-bl-md p-4 border border-blue-100 text-sm">
                  분석 중...
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-blue-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAsk()}
                  className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="질문 입력..."
                />
                <button
                  onClick={handleAsk}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  전송
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile: AI Chat at bottom */}
      <div className="lg:hidden mt-6">
        <section className="bg-blue-50 rounded-xl p-5 border border-blue-100">
          <h2 className="text-sm font-semibold text-blue-900 mb-3">AI에게 물어보기</h2>

          {chatHistory.length > 0 && (
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              {chatHistory.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    msg.role === "user"
                      ? "ml-8 bg-blue-600 text-white rounded-2xl rounded-br-md p-3"
                      : "mr-4 bg-white text-blue-900 rounded-2xl rounded-bl-md p-4 border border-blue-100 whitespace-pre-wrap"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              {aiLoading && (
                <div className="mr-4 bg-white text-blue-400 rounded-2xl rounded-bl-md p-4 border border-blue-100 text-sm">
                  분석 중...
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !aiLoading && handleAsk()}
              className="flex-1 px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              placeholder="질문 입력..."
            />
            <button
              onClick={handleAsk}
              disabled={aiLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              전송
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
