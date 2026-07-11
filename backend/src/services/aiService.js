
 
 // it pulls a skill list out of the JD, checks which ones show up in the
 //resume text, and builds the checklist/gap-analysis/summary from that.
 
 //actual prompt + response parse, same output shape either way.
 


const SKILL_KEYWORDS = [
  'node.js', 'node', 'express', 'nest.js', 'nestjs', 'react', 'react.js', 'next.js', 'nextjs',
  'postgresql', 'postgres', 'mongodb', 'mongo', 'aws', 's3', 'ec2', 'cloudfront', 'docker',
  'kubernetes', 'rbac', 'cron', 'openai', 'groq', 'llm', 'pdfkit', 'exceljs', 'redis',
  'graphql', 'kafka', 'rabbitmq', 'jwt', 'typescript', 'javascript', 'microservices', 'ci/cd',
];

function extractSkillsFromText(text) {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => lower.includes(skill));
}

function buildMockScreening(resumeText, jdText) {
  const jdSkills = [...new Set(extractSkillsFromText(jdText))];
  const resumeSkills = new Set(extractSkillsFromText(resumeText));

  const checklist = jdSkills.map((skill) => ({
    skill,
    present: resumeSkills.has(skill),
  }));

  const matched = checklist.filter((c) => c.present);
  const missing = checklist.filter((c) => !c.present);

  const fitScore = jdSkills.length === 0 ? 50 : Math.round((matched.length / jdSkills.length) * 100);

  const gapAnalysis = missing.map((m) => ({
    skill: m.skill,
    recommendation: `resume does not mention "${m.skill}" explicitly - verify in interview or via a short take-home task before ruling the candidate out`,
  }));

  const fitSummary =
    jdSkills.length === 0
      ? 'job description did not contain any recognizable skill keywords from our taxonomy, screening confidence is low, recommend manual review.'
      : `candidate matches ${matched.length} of ${jdSkills.length} mandatory skills identified in the JD (${fitScore}% keyword-fit score). ` +
        (fitScore >= 70
          ? 'strong overall alignment, recommend moving to technical round.'
          : fitScore >= 40
          ? 'partial alignment, recommend a screening call to confirm depth on missing areas before scheduling a technical round.'
          : 'low keyword overlap, recommend manual resume review before proceeding, mock-mode scoring is keyword based and can miss transferable experience.');

  const taskSuggestion =
    missing.length > 0
      ? `suggest a focused take-home covering: ${missing.slice(0, 3).map((m) => m.skill).join(', ')} to validate the gaps found above.`
      : 'candidate covers all identified mandatory skills, suggest a system design round instead of a skills take-home.';

  return {
    fitScore,
    fitSummary,
    skillChecklist: checklist,
    gapAnalysis,
    taskSuggestion,
    provider: 'mock',
    tokensUsed: 0,
    costUsd: 0,
  };
}

async function callOpenAI(resumeText, jdText) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set, cannot use AI_MODE=openai');
  }

  const prompt = buildPrompt(resumeText, jdText);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI call failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return {
    ...parsed,
    provider: 'openai',
    tokensUsed: data.usage ? data.usage.total_tokens : 0,
    costUsd: data.usage ? estimateOpenAiCost(data.usage.total_tokens) : 0,
  };
}

async function callGroq(resumeText, jdText) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not set, cannot use AI_MODE=groq');
  }

  const prompt = buildPrompt(resumeText, jdText);

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    if (!response.ok) {
  const errText = await response.text();

  console.error("Groq Error:", errText);

  throw new Error(
    `Groq API Error (${response.status})`
  );
}
  }

  const data = await response.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return {
    ...parsed,
    provider: 'groq',
    tokensUsed: data.usage ? data.usage.total_tokens : 0,
    costUsd: 0, 
  };
}

function buildPrompt(resumeText, jdText) {
  return `You are a recruiting screening assistant. Compare the resume against the job description
and return ONLY a JSON object with this exact shape:
{
  "fitScore": <0-100 integer>,
  "fitSummary": "<2-3 sentence summary>",
  "skillChecklist": [{ "skill": "<name>", "present": <true|false> }],
  "gapAnalysis": [{ "skill": "<name>", "recommendation": "<what to do about this gap>" }],
  "taskSuggestion": "<one suggested next step, interview task or round>"
}

Job Description:
${jdText}

Resume:
${resumeText}`;
}

function estimateOpenAiCost(totalTokens) {
  // rough placeholder rate, replace with the real per-model pricing if this
  // ever goes to production. keeping it simple on purpose.
  const ratePerThousandTokens = 0.002;
  return Number(((totalTokens / 1000) * ratePerThousandTokens).toFixed(4));
}

async function generateScreeningReport(resumeText, jdText) {
  const mode = process.env.AI_MODE || 'mock';

  if (mode === 'openai') return callOpenAI(resumeText, jdText);
  if (mode === 'groq') return callGroq(resumeText, jdText);
  return buildMockScreening(resumeText, jdText);
}

module.exports = { generateScreeningReport, buildMockScreening, extractSkillsFromText };
