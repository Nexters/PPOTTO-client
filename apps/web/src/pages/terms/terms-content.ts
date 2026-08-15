export type TermCode = 'TOS' | 'PRIVACY';

export const TERMS_META: Record<TermCode, { label: string; detailTitle: string }> = {
  TOS: { label: '(필수) PPOTTO 서비스 이용약관', detailTitle: '서비스 이용약관' },
  PRIVACY: {
    label: '(필수) 개인정보 수집 및 이용 안내',
    detailTitle: '개인정보 수집 및 이용 안내',
  },
};

type TermSection = {
  chapter: string;
  articles: { title: string; body: string }[];
};

// 실제 약관 카피 확정 전 플레이스홀더. 서버는 contentUrl만 주므로 본문은 로컬에 둔다.
const PLACEHOLDER_BODY =
  '이용 약관 본문입니다. 이용 약관 본문입니다. 이용 약관 본문입니다. 이용 약관 본문입니다. 이용 약관 본문입니다. 이용 약관 본문입니다.';

export const TERMS_CONTENT: Record<TermCode, { heading: string; sections: TermSection[] }> = {
  TOS: {
    heading: 'PPOTTO 서비스 이용약관',
    sections: [
      {
        chapter: '제 1장 총칙',
        articles: [
          { title: '제 1 조 (목적)', body: PLACEHOLDER_BODY },
          { title: '제 2 조 (정의)', body: PLACEHOLDER_BODY },
        ],
      },
      {
        chapter: '제 2장 서비스 이용',
        articles: [{ title: '제 1 조 (서비스의 제공)', body: PLACEHOLDER_BODY }],
      },
    ],
  },
  PRIVACY: {
    heading: '개인정보 수집 및 이용 안내',
    sections: [
      {
        chapter: '제 1장 총칙',
        articles: [
          { title: '제 1 조 (수집 항목)', body: PLACEHOLDER_BODY },
          { title: '제 2 조 (이용 목적)', body: PLACEHOLDER_BODY },
        ],
      },
    ],
  },
};
