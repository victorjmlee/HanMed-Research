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
  const { question } = await request.json();

  if (!question) {
    return NextResponse.json({ error: "질문을 입력해주세요." }, { status: 400 });
  }

  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Claude API 키가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  // RAG: 벡터 검색으로 유사 사례 검색
  let contextText = "";
  try {
    const supabase = getSupabaseServer();

    if (process.env.OPENAI_API_KEY) {
      // 질문을 임베딩으로 변환
      const embeddingRes = await getOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: question,
      });

      const queryEmbedding = embeddingRes.data[0].embedding;

      // match_cases RPC로 유사 사례 검색
      const { data: cases } = await supabase.rpc("match_cases", {
        query_embedding: JSON.stringify(queryEmbedding),
        match_threshold: 0.3,
        match_count: 10,
      });

      if (cases && cases.length > 0) {
        contextText = cases
          .map(
            (c: Record<string, string | number | null>) =>
              `[${c.case_number || "사례"}] (유사도: ${typeof c.similarity === "number" ? (c.similarity as number).toFixed(2) : c.similarity})
- 연령/성별: ${c.age_group} ${c.gender}
- 주소증: ${c.chief_complaint}
- 설진: ${c.tongue_diagnosis || "-"}
- 맥진: ${c.pulse_diagnosis || "-"}
- 변증: ${c.pattern_identification || "-"}
- 처방: ${c.prescription}
- 결과: ${c.outcome || "-"}
- 배운점: ${c.learning_points || "-"}`
          )
          .join("\n---\n");
      }
    }
  } catch {
    // 벡터 검색 실패해도 AI 답변은 진행
  }

  const systemPrompt = `당신은 한의학 임상 연구를 돕는 AI 조언자입니다.
사용자는 한의사로, 자신의 임상 사례를 익명화하여 연구 목적으로 기록하고 있습니다.

귀하의 역할:
1. 과거 임상 사례를 분석하여 패턴 발견
2. 처방의 적합성 검토
3. 유사 사례 기반 조언
4. 임상적 통찰 제공

학술적, 객관적으로 답변해주세요. 한자(漢字)를 적절히 활용하세요.
${
  contextText
    ? `\n=== 참고할 과거 임상 사례 ===\n${contextText}`
    : "\n(아직 등록된 과거 사례가 없습니다.)"
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-20250514",
        max_tokens: 2000,
        system: systemPrompt,
        messages: [{ role: "user", content: question }],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message },
        { status: response.status }
      );
    }

    return NextResponse.json({
      answer: data.content[0].text,
    });
  } catch {
    return NextResponse.json(
      { error: "Claude API 호출에 실패했습니다." },
      { status: 500 }
    );
  }
}
