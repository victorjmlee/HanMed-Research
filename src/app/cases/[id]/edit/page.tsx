"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { HerbDetail } from "@/types";

const AGE_GROUPS = ["10대", "20대", "30대", "40대", "50대", "60대", "70대 이상"];
const OUTCOMES = ["완치", "호전", "변화없음", "악화", "추적불가"];

export default function EditCasePage() {
  const { id } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

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

  const [herbs, setHerbs] = useState<HerbDetail[]>([{ name: "", dose: "" }]);

  useEffect(() => {
    const fetchCase = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("clinical_cases")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data || user?.id !== data.doctor_id) {
        router.replace("/dashboard");
        return;
      }

      setForm({
        age_group: data.age_group || "30대",
        gender: data.gender || "남",
        chief_complaint: data.chief_complaint || "",
        tongue_diagnosis: data.tongue_diagnosis || "",
        pulse_diagnosis: data.pulse_diagnosis || "",
        pattern_identification: data.pattern_identification || "",
        prescription: data.prescription || "",
        treatment_duration: data.treatment_duration || "",
        outcome: data.outcome || "",
        outcome_notes: data.outcome_notes || "",
        clinical_notes: data.clinical_notes || "",
        learning_points: data.learning_points || "",
        tags: data.tags ? data.tags.join(", ") : "",
      });

      if (data.herb_details && data.herb_details.length > 0) {
        setHerbs(data.herb_details);
      }

      setFetching(false);
    };
    fetchCase();
  }, [id, router]);

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

    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const herbDetails = herbs.filter((h) => h.name.trim());

    const { error } = await supabase
      .from("clinical_cases")
      .update({
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
      })
      .eq("id", id);

    if (error) {
      alert("수정 실패: " + error.message);
    } else {
      // 비동기 임베딩 재생성 (실패해도 수정은 유지)
      fetch("/api/embed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: id }),
      }).catch(() => {});
      router.push(`/cases/${id}`);
    }
    setLoading(false);
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">불러오는 중...</p>
      </div>
    );
  }

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
        <h1 className="text-xl font-bold">사례 수정</h1>
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
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">맥진</label>
              <input
                type="text"
                value={form.pulse_diagnosis}
                onChange={(e) => updateForm("pulse_diagnosis", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">변증</label>
              <input
                type="text"
                value={form.pattern_identification}
                onChange={(e) => updateForm("pattern_identification", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  placeholder="약재명"
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
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">배운 점</label>
              <textarea
                value={form.learning_points}
                onChange={(e) => updateForm("learning_points", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">태그</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => updateForm("tags", e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="쉼표로 구분"
              />
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3 pb-8">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "저장 중..." : "수정 완료"}
          </button>
          <button
            onClick={() => router.back()}
            className="flex-1 py-3 bg-white text-gray-600 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
