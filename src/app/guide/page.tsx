"use client";

import { useRouter } from "next/navigation";

const sections = [
  {
    title: "1. 대시보드 (메인 화면)",
    where: "로그인 후 첫 화면",
    features: [
      "등록된 모든 임상 사례를 최신순으로 볼 수 있습니다.",
      "각 사례 카드를 누르면 상세 페이지로 이동합니다.",
      "작성자 이름이 함께 표시되어 누가 기록했는지 확인 가능합니다.",
      "\"+ 새 사례\" 버튼으로 새로운 임상 사례를 등록할 수 있습니다.",
    ],
  },
  {
    title: "2. 새 임상 사례 등록",
    where: "대시보드 → \"+ 새 사례\"",
    features: [
      "환자의 연령대, 성별, 주소증, 진단 소견(설진/맥진/변증)을 입력합니다.",
      "처방명과 약재 상세(약재명 + 용량)를 기록합니다.",
      "복용 기간, 결과(완치/호전/변화없음/악화/추적불가), 경과 상세를 기록합니다.",
      "임상 소견, 배운 점, 태그를 추가하여 나중에 검색이 쉽도록 합니다.",
      "\"AI 조언 받기\" 버튼을 누르면 입력 중인 사례에 대해 AI가 처방 적합성, 대체 처방 등을 분석해줍니다.",
      "주소증(*)과 처방(*)은 필수 입력 항목입니다.",
    ],
  },
  {
    title: "3. 사례 상세 보기",
    where: "대시보드 → 사례 카드 클릭",
    features: [
      "등록한 사례의 모든 정보를 한눈에 확인할 수 있습니다.",
      "본인이 작성한 사례는 \"수정\" / \"삭제\" 버튼이 표시됩니다.",
      "다른 사람이 작성한 사례도 조회는 가능하지만 수정/삭제는 불가합니다.",
      "오른쪽(PC) 또는 하단(모바일)에서 AI에게 이 사례에 대해 질문할 수 있습니다.",
    ],
  },
  {
    title: "4. AI 채팅",
    where: "사례 상세 페이지 우측 / 새 사례 등록 시",
    features: [
      "사례 상세 페이지에서 해당 사례에 대해 AI에게 자유롭게 질문할 수 있습니다.",
      "예시: \"이 처방에서 白朮의 역할은?\", \"유사한 변증의 다른 처방은?\"",
      "AI는 등록된 과거 사례 중 의미적으로 유사한 사례를 자동으로 찾아 참고합니다.",
      "새 사례 등록 화면에서도 \"AI 조언 받기\"로 입력 중인 내용에 대한 분석을 받을 수 있습니다.",
      "AI 답변은 참고용이며, 최종 임상 판단은 항상 본인이 해주세요.",
    ],
  },
  {
    title: "5. 사례 수정",
    where: "사례 상세 → \"수정\" 버튼",
    features: [
      "본인이 작성한 사례의 모든 항목을 수정할 수 있습니다.",
      "수정 후 저장하면 AI 검색을 위한 데이터도 자동 갱신됩니다.",
    ],
  },
  {
    title: "6. 태그 활용 팁",
    where: "사례 등록/수정 시 태그 입력란",
    features: [
      "쉼표(,)로 구분하여 여러 태그를 입력할 수 있습니다.",
      "예시: 脾胃, 消化不良, 六君子湯",
      "한자, 한글, 영문 모두 가능합니다.",
      "태그를 잘 달아두면 나중에 사례를 분류하고 찾기 편합니다.",
    ],
  },
];

export default function GuidePage() {
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-gray-400 hover:text-gray-600"
        >
          ← 대시보드
        </button>
        <div>
          <h1 className="text-2xl font-bold">사용 가이드</h1>
          <p className="text-sm text-gray-500">醫案 앱의 기능을 알아보세요</p>
        </div>
      </div>

      {/* Quick Overview */}
      <section className="bg-blue-50 rounded-xl p-6 border border-blue-100 mb-8">
        <h2 className="font-semibold text-blue-900 mb-3">한눈에 보기</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-2xl mb-1">&#x1f4cb;</p>
            <p className="font-medium text-sm">사례 기록</p>
            <p className="text-xs text-gray-500 mt-1">
              임상 사례를 체계적으로 등록하고 관리합니다
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-2xl mb-1">&#x1f916;</p>
            <p className="font-medium text-sm">AI 분석</p>
            <p className="text-xs text-gray-500 mt-1">
              사례별 AI 조언과 유사 사례 자동 검색
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <p className="text-2xl mb-1">&#x1f91d;</p>
            <p className="font-medium text-sm">사례 공유</p>
            <p className="text-xs text-gray-500 mt-1">
              등록한 사례를 서로 열람하며 함께 연구
            </p>
          </div>
        </div>
      </section>

      {/* Detailed Sections */}
      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="bg-white rounded-xl p-6 border border-gray-100"
          >
            <h2 className="font-semibold text-gray-900 mb-1">
              {section.title}
            </h2>
            <p className="text-xs text-gray-400 mb-4">{section.where}</p>
            <ul className="space-y-2">
              {section.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 mt-0.5 shrink-0">&#x2022;</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      {/* Footer tip */}
      <div className="mt-8 mb-8 text-center">
        <p className="text-sm text-gray-400">
          궁금한 점이 있으면 사례 상세 페이지에서 AI에게 물어보세요!
        </p>
      </div>
    </div>
  );
}
