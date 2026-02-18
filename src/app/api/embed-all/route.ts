import { NextResponse } from "next/server";
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

function buildCaseText(c: Record<string, unknown>): string {
  const herbText = c.herb_details
    ? (c.herb_details as Array<{ name: string; dose: string }>)
        .map((h) => `${h.name} ${h.dose}`)
        .join(", ")
    : "";

  return [
    `주소증: ${c.chief_complaint}`,
    c.tongue_diagnosis && `설진: ${c.tongue_diagnosis}`,
    c.pulse_diagnosis && `맥진: ${c.pulse_diagnosis}`,
    c.pattern_identification && `변증: ${c.pattern_identification}`,
    `처방: ${c.prescription}`,
    herbText && `약재: ${herbText}`,
    c.outcome && `결과: ${c.outcome}`,
    c.outcome_notes && `경과: ${c.outcome_notes}`,
    c.clinical_notes && `소견: ${c.clinical_notes}`,
    c.learning_points && `배운점: ${c.learning_points}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function POST() {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const supabase = getSupabaseServer();
  const openai = getOpenAI();

  // embedding이 없는 케이스만 조회
  const { data: cases, error } = await supabase
    .from("clinical_cases")
    .select("*")
    .is("embedding", null);

  if (error) {
    return NextResponse.json(
      { error: "케이스 조회 실패: " + error.message },
      { status: 500 }
    );
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ message: "임베딩할 케이스가 없습니다.", updated: 0 });
  }

  let updated = 0;
  const errors: string[] = [];

  for (const c of cases) {
    try {
      const text = buildCaseText(c);

      const embeddingRes = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: text,
      });

      const embedding = embeddingRes.data[0].embedding;

      const { error: updateError } = await supabase
        .from("clinical_cases")
        .update({ embedding: JSON.stringify(embedding) })
        .eq("id", c.id);

      if (updateError) {
        errors.push(`${c.case_number}: ${updateError.message}`);
      } else {
        updated++;
      }
    } catch (err) {
      errors.push(
        `${c.case_number}: ${err instanceof Error ? err.message : "실패"}`
      );
    }
  }

  return NextResponse.json({
    total: cases.length,
    updated,
    errors: errors.length > 0 ? errors : undefined,
  });
}
