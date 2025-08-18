// TDD - REFACTOR Phase: Improve code quality while keeping tests green

export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong'
}

export interface PasswordRequirement {
  met: boolean;
  text: string;
}

export interface PasswordValidationResult {
  strength: PasswordStrength;
  score: number;
  requirements: PasswordRequirement[];
  feedback: string;
  entropy: number;
}

// Constants for better maintainability
const PASSWORD_PATTERNS = {
  MIN_LENGTH: 8,
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBERS: /\d/,
  SPECIAL_CHARS: /[!@#$%^&*(),.?":{}|<>]/,
} as const;

const STRENGTH_THRESHOLDS = {
  MEDIUM_SCORE: 3,
  STRONG_SCORE: 4,
  LONG_PASSWORD_LENGTH: 12,
} as const;

export function validatePassword(password: string): PasswordValidationResult {
  const requirements = buildPasswordRequirements(password);
  const score = calculateRequirementScore(requirements);
  const strength = determinePasswordStrength(score, password.length);
  const feedback = generateFeedback(password, requirements);
  const entropy = calculateEntropy(password);

  return {
    strength,
    score,
    requirements,
    feedback,
    entropy
  };
}

function buildPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      met: password.length >= PASSWORD_PATTERNS.MIN_LENGTH,
      text: 'At least 8 characters'
    },
    {
      met: PASSWORD_PATTERNS.UPPERCASE.test(password),
      text: 'One uppercase letter'
    },
    {
      met: PASSWORD_PATTERNS.LOWERCASE.test(password),
      text: 'One lowercase letter'
    },
    {
      met: PASSWORD_PATTERNS.NUMBERS.test(password),
      text: 'One number'
    }
  ];
}

function calculateRequirementScore(requirements: PasswordRequirement[]): number {
  return requirements.filter(req => req.met).length;
}

function determinePasswordStrength(score: number, length: number): PasswordStrength {
  if (score < STRENGTH_THRESHOLDS.MEDIUM_SCORE) {
    return PasswordStrength.WEAK;
  }
  
  if (score < STRENGTH_THRESHOLDS.STRONG_SCORE && length < STRENGTH_THRESHOLDS.LONG_PASSWORD_LENGTH) {
    return PasswordStrength.MEDIUM;
  }
  
  return PasswordStrength.STRONG;
}

function generateFeedback(password: string, requirements: PasswordRequirement[]): string {
  if (password.length === 0) {
    return 'Password is required';
  }
  
  if (password.length < 8) {
    return 'Password is too short. Add more characters.';
  }

  const unmetRequirements = requirements.filter(req => !req.met);
  if (unmetRequirements.length === 0) {
    return 'Strong password!';
  }

  const missing = unmetRequirements.map(req => req.text.toLowerCase()).join(', ');
  return `Add ${missing} to strengthen your password.`;
}

function calculateEntropy(password: string): number {
  if (password.length === 0) return 0;

  let poolSize = 0;

  // Estimate character pool size
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/\d/.test(password)) poolSize += 10;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) poolSize += 32;

  // Add extra pool for unicode characters
  const unicodeChars = password.match(/[^\u0020-\u007F]/g);
  if (unicodeChars) poolSize += unicodeChars.length;

  // Calculate entropy: log2(poolSize^length)
  return Math.log2(Math.pow(poolSize, password.length));
}