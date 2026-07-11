const { buildMockScreening, extractSkillsFromText } = require('../src/services/aiService');

describe('aiService mock provider', () => {
  test('extracts known skill keywords from text, case insensitive', () => {
    const skills = extractSkillsFromText('I have worked with Node.js, React and PostgreSQL for 3 years');
    expect(skills).toEqual(expect.arrayContaining(['node.js', 'react', 'postgresql']));
  });

  test('returns 100% fit when resume covers every JD skill', () => {
    const jd = 'Looking for someone with Node.js and Docker experience.';
    const resume = 'I have built production apps with Node.js and Docker.';
    const result = buildMockScreening(resume, jd);

    expect(result.fitScore).toBe(100);
    expect(result.skillChecklist.every((s) => s.present)).toBe(true);
    expect(result.gapAnalysis).toHaveLength(0);
    expect(result.provider).toBe('mock');
  });

  test('flags missing skills in gap analysis when resume is a partial match', () => {
    const jd = 'Need Node.js, Kubernetes and GraphQL experience.';
    const resume = 'I only know Node.js so far.';
    const result = buildMockScreening(resume, jd);

    expect(result.fitScore).toBeLessThan(100);
    const missingSkills = result.gapAnalysis.map((g) => g.skill);
    expect(missingSkills).toEqual(expect.arrayContaining(['kubernetes', 'graphql']));
  });

  test('is deterministic - same input produces same output every time (needed for repeatable cron reruns)', () => {
    const jd = 'Need React and AWS experience.';
    const resume = 'I know React well.';
    const first = buildMockScreening(resume, jd);
    const second = buildMockScreening(resume, jd);
    expect(first).toEqual(second);
  });

  test('handles a JD with no recognizable skill keywords gracefully', () => {
    const result = buildMockScreening('some resume text', 'we need a great team player with good vibes');
    expect(result.skillChecklist).toHaveLength(0);
    expect(result.fitSummary).toMatch(/manual review/);
  });
});
