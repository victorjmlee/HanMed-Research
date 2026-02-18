"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { HerbDetail } from "@/types";

const AGE_GROUPS = ["10대", "20대", "30대", "40대", "50대", "60대", "70대 이상"];
const OUTCOMES = ["완치", "호전", "변화없음", "악화", "추적불가"];

export default function NewCasePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState("");

  const [form, setForm] = useState({
    age_group: "30대",
    gender: "남" as "남" | "여",
    chief_complaint: "",
    tongue_diagnosis: "",
    pulse_diagnosis: "",
    pattern_identification: "",
    prescription: "",
    treatment_duration: "",
    outcome: "",
    outcome_notes: "",
    clinical_notes: "",
    learning_points: "",
    tags: "",
  });

  const [herbs, setHerbs] = useState<HerbDetail[]>([
    { name: "", dose: "" },
  ]);

  const updateForm = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateHerb = (index: number, field: keyof HerbDetail, value: string) => {
    setHerbs((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const addHerb = () => setHerbs((prev) => [...prev, { name: "", dose: "" }]);

  const removeHerb = (index: number) => {
    setHerbs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!form.chief_complaint || !form.prescription) {
      alert("주소증과 처방은 필수입니다.");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const herbDetails = herbs.filter((h) => h.name.trim());

    const { data, error } = await supabase.from("clinical_cases").insert({
      doctor_id: user.id,
      age_group: form.age_group,
      gender: form.gender,
      chief_complaint: form.chief_complaint,
      tongue_diagnosis: form.tongue_diagnosis || null,
      pulse_diagnosis: form.pulse_diagnosis || null,
      pattern_identification: form.pattern_identification || null,
      prescription: form.prescription,
      herb_details: herbDetails.length > 0 ? herbDetails : null,
      treatment_duration: form.treatment_duration || null,
      outcome: form.outcome || null,
      outcome_notes: form.outcome_notes || null,
      clinical_notes: form.clinical_notes || null,
      learning_points: form.learning_points || null,
      tags: tags.length > 0 ? tags : null,
    }).select("id").single();

    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      // 비동기 임베딩 생성 (실패해도 케이스 저장은 유지)
      if (data?.id) {
        fetch("/api/embed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ case_id: data.id }),
        }).catch(() => {});
      }
      router.push("/dashboard");
    }
    setLoading(false);
  };

  const handleAIAdvice = async () => {
    if (!form.chief_complaint) {
      alert("주소증을 먼저 입력해주세요.");
      return;
    }

    setAiLoading(true);
    setAiAdvice("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: `다음 임상 사례에 대해 분석하고 조언해주세요:
- 연령/성별: ${form.age_group} ${form.gender}
- 주소증: ${form.chief_complaint}
- 설진: ${form.tongue_diagnosis || "미입력"}
- 맥진: ${form.pulse_diagnosis || "미입력"}
- 변증: ${form.pattern_identification || "미입력"}
- 현재 처방: ${form.prescription || "미입력"}

처방 적합성, 대체 처방 제안, 주의사항을 알려주세요.`,
        }),
      });

      const data = await res.json();
      setAiAdvice(data.answer || data.error || "응답을 받지 못했습니다.");
    } catch {
      setAiAdvice("AI 서버 연결에 실패했습니다.");
    }

    setAiLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 뒤로
        </button>
        <h1 className="text-xl font-bold">새 임상 사례</h1>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">기본 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">연령대</label>
              <select
                value={form.age_group}
                onChange={(e) => updateForm("age_group", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {AGE_GROUPS.map((ag) => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">성별</label>
              <div className="flex gap-4 py-2">
                {(["남", "여"] as const).map((g) => (
                  <label key={g} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="gender"
                      value={g}
                      checked={form.gender === g}
                      onChange={(e) => updateForm("gender", e.target.value)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm">{g}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 주소증 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">주소증 *</h2>
          <textarea
            value={form.chief_complaint}
            onChange={(e) => updateForm("chief_complaint", e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="예: 소화불량, 식후 더부룩함, 피로"
          />
        </section>

        {/* 진단 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">진단 소견</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">설진</label>
              <input
                type="text"
                value={form.tongue_diagnosis}
                onChange={(e) => updateForm("tongue_diagnosis", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 설담백 치흔"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">맥진</label>
              <input
                type="text"
                value={form.pulse_diagnosis}
                onChange={(e) => updateForm("pulse_diagnosis", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 침세무력"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">변증</label>
              <input
                type="text"
                value={form.pattern_identification}
                onChange={(e) => updateForm("pattern_identification", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 脾胃氣虛"
              />
            </div>
          </div>
        </section>

        {/* 처방 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">처방 *</h2>
          <div className="mb-4">
            <label className="block text-sm text-gray-600 mb-1">처방명</label>
            <input
              type="text"
              value={form.prescription}
              onChange={(e) => updateForm("prescription", e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 六君子湯加味"
            />
          </div>

          <label className="block text-sm text-gray-600 mb-2">약재 상세</label>
          <div className="space-y-2">
            {herbs.map((herb, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  value={herb.name}
                  onChange={(e) => updateHerb(i, "name", e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="약재명 (예: 白朮)"
                />
                <input
                  type="text"
                  value={herb.dose}
                  onChange={(e) => updateHerb(i, "dose", e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="용량"
                />
                {herbs.length > 1 && (
                  <button
                    onClick={() => removeHerb(i)}
                    className="text-red-400 hover:text-red-600 px-2"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addHerb}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            + 약재 추가
          </button>
        </section>

        {/* 경과 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">경과</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">복용 기간</label>
              <input
                type="text"
                value={form.treatment_duration}
                onChange={(e) => updateForm("treatment_duration", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 2주"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">결과</label>
              <div className="flex flex-wrap gap-2">
                {OUTCOMES.map((o) => (
                  <button
                    key={o}
                    onClick={() => updateForm("outcome", form.outcome === o ? "" : o)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      form.outcome === o
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">경과 상세</label>
              <textarea
                value={form.outcome_notes}
                onChange={(e) => updateForm("outcome_notes", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="예: 1주 후 소화 개선, 2주 후 피로감 감소"
              />
            </div>
          </div>
        </section>

        {/* 메모 */}
        <section className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold mb-4">연구 메모</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">임상 소견</label>
              <textarea
                value={form.clinical_notes}
                onChange={(e) => updateForm("clinical_notes", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="자유롭게 기록"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">배운 점</label>
              <textarea
                value={form.learning_points}
                onChange={(e) => updateForm("learning_points", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="이 사례에서 배운 점"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">태그</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => updateForm("tags", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="쉼표로 구분 (예: 脾胃, 消化不良, 六君子湯)"
              />
            </div>
          </div>
        </section>

        {/* AI 조언 */}
        {aiAdvice && (
          <section className="bg-blue-50 rounded-xl p-6 border border-blue-100">
            <h2 className="font-semibold mb-3 text-blue-900">AI 분석 결과</h2>
            <div className="text-sm text-blue-800 whitespace-pre-wrap">
              {aiAdvice}
            </div>
          </section>
        )}

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "저장 중..." : "저장"}
          </button>
          <button
            onClick={handleAIAdvice}
            disabled={aiLoading}
            className="flex-1 py-3 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 transition-colors"
          >
            {aiLoading ? "분석 중..." : "AI 조언 받기"}
          </button>
        </div>
      </div>
    </div>
  );
}
