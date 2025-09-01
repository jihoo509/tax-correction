import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = { runtime: 'nodejs' };

// ✨ 1. SubmitBody 타입에 UTM 필드들을 추가합니다.
type SubmitBody = {
  type: 'phone' | 'online';
  site?: string;
  name?: string;
  phone?: string;
  birth?: string;
  rrnFront?: string;
  rrnBack?: string;
  gender?: '남' | '여';

  // 경정청구 필드
  companyName?: string;
  businessNumber?: string;
  isFirstStartup?: string;
  hasPastClaim?: string;
  
  // UTM 필드
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
  first_utm?: string;
  last_utm?: string;
};

const { GH_TOKEN, GH_REPO_FULLNAME } = process.env;

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 8000) {
  const c = new AbortController();
  const id = setTimeout(() => c.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: c.signal });
  } finally {
    clearTimeout(id);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'POST only' });
  }

  const body = req.body as SubmitBody;
  const {
    type,
    site = 'unknown',
    name = '',
    companyName = '',
    gender,
    birth,
    rrnFront,
    rrnBack,
  } = body;

  if (!type || (type !== 'phone' && type !== 'online')) {
    return res.status(400).json({ ok: false, error: 'Invalid type' });
  }

  const requestKo = type === 'phone' ? '전화' : '온라인';
  
  const birth6 = type === 'phone' ? (birth || '') : (rrnFront || '');
  const rrnFull = type === 'online' && rrnFront && rrnBack ? `${rrnFront}-${rrnBack}` : '';
  const masked = rrnFull ? `${rrnFull.slice(0, 8)}******` : (birth6 ? `${birth6}-*******` : '');

  const title = `[${requestKo}] ${name}(${companyName || '사업자명 미입력'}) / ${masked}`;
  
  const labels = [`type:${type}`, `site:${site}`];

  // ✨ 2. payload 생성 방식은 이미 모든 body 데이터를 포함하므로 수정할 필요가 없습니다.
  const payload = { 
    ...body, 
    requestedAt: new Date().toISOString(),
    ua: (req.headers['user-agent'] || '').toString().slice(0, 200),
    ip: (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString(),
  };
  delete (payload as any).headers;

  const bodyMd = '```json\n' + JSON.stringify(payload, null, 2) + '\n```';

  try {
    const resp = await fetchWithTimeout(`https://api.github.com/repos/${GH_REPO_FULLNAME}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GH_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({ title, body: bodyMd, labels }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(500).json({ ok: false, error: 'GitHub error', detail: text });
    }

    const issue = await resp.json();
    return res.status(200).json({ ok: true, number: issue.number });
  } catch (e: any) {
    if (e?.name === 'AbortError') return res.status(504).json({ ok: false, error: 'Gateway Timeout from GitHub API' });
    return res.status(500).json({ ok: false, error: 'Internal Server Error', detail: e?.message || String(e) });
  }
}

