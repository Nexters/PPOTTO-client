export default {
  plugins: [
    {
      rules: {
        'commit-format': ({ header }) => {
          const pattern =
            /^(✨ Feat|🐛 Fix|🚑 Hotfix|🔧 Chore|🚀 Deploy|📝 Docs|💄 Style|✅ Test|♻️ Refactor|⚡️ Perf):\s.+/;
          return [pattern.test(header), '형식: gitmoji Type: 내용 (예: ✨ Feat: 기능 추가)'];
        },
      },
    },
  ],
  rules: {
    'commit-format': [2, 'always'],
  },
};
