import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

function getSupabaseServer() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export async function POST(request: NextRequest) {
  const { case_id } = await request.json();

  if (!case_id) {
    return NextResponse.json({ error: "case_id가 필요합니다." }, { status: 400 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServer();

  // 케이스 조회
  const { data: caseData, error: fetchError } = await supabase
    .from("clinical_cases")
    .select("*")
    .eq("id", case_id)
    .single();

  if (fetchError || !caseData) {
    return NextResponse.json(
      { error: "케이스를 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  // 주요 필드를 하나의 텍스트로 합치기
  const herbText = caseData.herb_details
    ? (caseData.herb_details as Array<{ name: string; dose: string }>)
        .map((h) => `${h.name} ${h.dose}`)
        .join(", ")
    : "";

  const text = [
    `주소증: ${caseData.chief_complaint}`,
    caseData.tongue_diagnosis && `설진: ${caseData.tongue_diagnosis}`,
    caseData.pulse_diagnosis && `맥진: ${caseData.pulse_diagnosis}`,
    caseData.pattern_identification && `변증: ${caseData.pattern_identification}`,
    `처방: ${caseData.prescription}`,
    herbText && `약재: ${herbText}`,
    caseData.outcome && `결과: ${caseData.outcome}`,
    caseData.outcome_notes && `경과: ${caseData.outcome_notes}`,
    caseData.clinical_notes && `소견: ${caseData.clinical_notes}`,
    caseData.learning_points && `배운점: ${caseData.learning_points}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    // OpenAI 임베딩 생성
    const embeddingRes = await getOpenAI().embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    const embedding = embeddingRes.data[0].embedding;

    // DB에 임베딩 저장
    const { error: updateError } = await supabase
      .from("clinical_cases")
      .update({ embedding: JSON.stringify(embedding) })
      .eq("id", case_id);

    if (updateError) {
      return NextResponse.json(
        { error: "임베딩 저장 실패: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "임베딩 생성 실패";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
