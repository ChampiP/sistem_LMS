export function isEmail(value: unknown) {
  if (typeof value !== 'string') return false;
  // basic email regex
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}

export function validatePassword(value: unknown) {
  if (typeof value !== 'string') return { valid: false, error: 'Password must be a string' };
  if (value.length < 6) return { valid: false, error: 'Password must be at least 6 characters' };
  return { valid: true };
}

export function ensureNonEmptyString(v: unknown, fieldName = 'field') {
  if (typeof v !== 'string' || v.trim().length === 0) return { valid: false, error: `${fieldName} is required` };
  return { valid: true };
}

export function validateQuizPayload(body: any) {
  const errors: string[] = [];
  if (!body || typeof body !== 'object') {
    errors.push('Body must be an object');
    return { valid: false, errors };
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) errors.push('title is required');
  if (!body.courseId || typeof body.courseId !== 'string') errors.push('courseId is required');
  if (body.timeLimit != null && (!Number.isFinite(Number(body.timeLimit)) || Number(body.timeLimit) < 0)) errors.push('timeLimit must be a non-negative number');
  if (body.maxAttempts != null && (!Number.isFinite(Number(body.maxAttempts)) || Number(body.maxAttempts) < 0)) errors.push('maxAttempts must be a non-negative number');

  const questions = body.questions;
  if (!Array.isArray(questions) || questions.length === 0) {
    errors.push('At least one question is required');
  } else {
    questions.forEach((q: any, qi: number) => {
      if (!q || typeof q.text !== 'string' || q.text.trim().length === 0) errors.push(`Question ${qi + 1}: text is required`);
      if (!Array.isArray(q.options) || q.options.length < 2) errors.push(`Question ${qi + 1}: at least two options are required`);
      else {
        const hasCorrect = q.options.some((o: any) => !!o.isCorrect);
        if (!hasCorrect) errors.push(`Question ${qi + 1}: at least one option must be marked as correct`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

export function validateSubmitAgainstQuiz(quiz: any, answers: any[]) {
  const errors: string[] = [];
  if (!Array.isArray(answers)) { errors.push('Answers must be an array'); return { valid: false, errors }; }
  if (!quiz || !Array.isArray(quiz.questions)) { errors.push('Quiz questions not available'); return { valid: false, errors }; }
  if (answers.length !== quiz.questions.length) errors.push('Number of answers does not match number of questions');

  const qMap = new Map<string, Set<string>>();
  quiz.questions.forEach((q: any) => qMap.set(q.id, new Set((q.options || []).map((o: any) => o.id))));

  answers.forEach((a: any, i: number) => {
    if (!a || typeof a.questionId !== 'string' || typeof a.selectedOptionId !== 'string') {
      errors.push(`Answer ${i + 1}: invalid shape`);
      return;
    }
    const opts = qMap.get(a.questionId);
    if (!opts) errors.push(`Answer ${i + 1}: questionId not found`);
    else if (!opts.has(a.selectedOptionId)) errors.push(`Answer ${i + 1}: selected option does not belong to question`);
  });

  return { valid: errors.length === 0, errors };
}
