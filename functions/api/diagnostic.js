const REQUESTED_MODEL = 'gpt-5.5-mini';
const FALLBACK_MODEL = 'gpt-4.1-mini';
const MIN_RESUME_LENGTH = 300;
const MAX_RESUME_LENGTH = 60000;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function normalizeInput(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateDiagnosticInput(payload) {
  const targetTitle = normalizeInput(payload?.targetTitle);
  const jobPosting = normalizeInput(payload?.jobPosting);
  const resumeText = normalizeInput(payload?.resumeText);

  if (!targetTitle) {
    return { error: 'Please enter your target job title.' };
  }

  if (!resumeText) {
    return { error: 'Please paste your resume text.' };
  }

  if (resumeText.length < MIN_RESUME_LENGTH) {
    return {
      error: 'Please provide more resume detail before running the diagnostic. Paste the main sections of your resume so the review has enough context.',
    };
  }

  if (resumeText.length > MAX_RESUME_LENGTH) {
    return {
      error: 'The resume text is too long for this diagnostic. Please shorten it to the most relevant resume content and try again.',
    };
  }

  return {
    targetTitle,
    jobPosting,
    resumeText,
  };
}

function buildPrompt({ targetTitle, jobPosting, resumeText }) {
  const jobPostingContext = jobPosting
    ? `Job posting provided:\n${jobPosting}`
    : 'No job posting was provided. Base the review on the target job title only and include the required directional-review note.';

  return `You are preparing the Career Positioning Diagnostic by Hire Me Now Resumes.

Professional name: Julia Cher
Email: info@hiremenowresumes.ca
Website: https://hiremenowresumes.ca

Purpose:
Help the user understand how their resume is currently interpreted by recruiters, hiring managers, and employers in the Canadian labour market.

Tone:
Professional, calm, consultant-led, direct, and supportive. Focus on strategic interpretation and positioning clarity.

Hard boundaries:
- Do not rewrite the resume.
- Do not rewrite summary sections.
- Do not rewrite experience bullets.
- Do not create ATS keyword lists.
- Do not create cover letters.
- Do not create LinkedIn content.
- Do not generate ready-to-use application materials.
- Do not guarantee interviews, job offers, or salary outcomes.
- Do not provide copy-paste resume content.
- Do not provide implementation.
- Provide clarity, not execution.
- If examples are used, they must be conceptual only and not ready to paste into a resume.

Required diagnostic structure:
Use these exact section headings and keep the response concise but useful.

1. Important Note
Include this exact note: "This diagnostic is designed to evaluate positioning and communication strategy, not writing quality alone. Results are based on the information provided and should not be interpreted as a guarantee of hiring outcomes."
${jobPosting ? '' : 'Also include this exact note: "This review is based on the target job title only. Because resumes should be tailored to specific opportunities, conclusions should be considered directional rather than role-specific."'}

2. Initial Impression

3. Positioning Strengths

4. Alignment With Target Role

5. Potential Employer Questions

6. Untapped Positioning Opportunities

7. Strategic Risks

8. Strategic Considerations

9. Additional Support
Include this exact language in the Additional Support section:
"This diagnostic provides clarity, not execution. Effective career positioning often requires additional context, discussion, and strategic decision-making."

"If you would like personalized support developing a targeted resume, career positioning strategy, LinkedIn profile, interview preparation plan, or job search strategy, you may connect with Julia Cher at Hire Me Now Resumes."

Website:
https://hiremenowresumes.ca

Email:
info@hiremenowresumes.ca

User inputs:
Target job title:
${targetTitle}

${jobPostingContext}

Resume text:
${resumeText}`;
}

function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return '';
  }

  return data.output
    .flatMap((item) => (Array.isArray(item.content) ? item.content : []))
    .filter((content) => content.type === 'output_text' && typeof content.text === 'string')
    .map((content) => content.text)
    .join('\n')
    .trim();
}

async function callResponsesApi({ apiKey, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: prompt,
      store: false,
      max_output_tokens: 1800,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'The diagnostic service could not generate a response.');
    error.status = response.status;
    error.code = data?.error?.code;
    error.type = data?.error?.type;
    throw error;
  }

  const diagnostic = extractOutputText(data);

  if (!diagnostic) {
    throw new Error('The diagnostic service returned an empty response. Please try again.');
  }

  return diagnostic;
}

function shouldRetryWithFallback(error) {
  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toLowerCase();

  return error?.status === 400 && (code.includes('model') || message.includes('model'));
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function onRequestPost(context) {
  try {
    if (!context.env.OPENAI_API_KEY) {
      return jsonResponse({ error: 'The diagnostic service is not configured yet. Please try again later.' }, 500);
    }

    const payload = await context.request.json().catch(() => null);

    if (!payload) {
      return jsonResponse({ error: 'Please submit the diagnostic form as valid JSON.' }, 400);
    }

    const validated = validateDiagnosticInput(payload);

    if (validated.error) {
      return jsonResponse({ error: validated.error }, 400);
    }

    const prompt = buildPrompt(validated);
    let modelUsed = REQUESTED_MODEL;

    try {
      const diagnostic = await callResponsesApi({
        apiKey: context.env.OPENAI_API_KEY,
        model: REQUESTED_MODEL,
        prompt,
      });

      return jsonResponse({ diagnostic, model: modelUsed });
    } catch (error) {
      if (!shouldRetryWithFallback(error)) {
        throw error;
      }

      modelUsed = FALLBACK_MODEL;
      const diagnostic = await callResponsesApi({
        apiKey: context.env.OPENAI_API_KEY,
        model: FALLBACK_MODEL,
        prompt,
      });

      return jsonResponse({ diagnostic, model: modelUsed });
    }
  } catch (error) {
    console.error('Diagnostic generation failed:', error);

    return jsonResponse(
      {
        error: 'The diagnostic could not be generated right now. Please try again in a few minutes.',
      },
      500,
    );
  }
}

export async function onRequest(context) {
  if (context.request.method === 'OPTIONS') {
    return onRequestOptions(context);
  }

  if (context.request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed. Please submit the diagnostic form.' }, 405);
  }

  return onRequestPost(context);
}
