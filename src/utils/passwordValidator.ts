/**
 * Password Security Policy Validator
 * Conforms to industry standard OWASP & NIST digital identity guidelines.
 */

export interface PasswordRule {
  id: string;
  label: string;
  description: string;
  passed: boolean;
}

export interface PasswordPolicyResult {
  isValid: boolean;
  score: number; // 0 to 100
  level: 'MUY_DEBIL' | 'DEBIL' | 'MEDIA' | 'FUERTE' | 'OPTIMA';
  levelLabel: string;
  colorClass: string;
  barColorClass: string;
  rules: PasswordRule[];
  errors: string[];
}

export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const pwd = password || '';

  const rules: PasswordRule[] = [
    {
      id: 'length',
      label: 'Mínimo 8 caracteres',
      description: 'Longitud mínima recomendada para evitar ataques de fuerza bruta.',
      passed: pwd.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'Al menos una mayúscula (A-Z)',
      description: 'Incluye al menos una letra mayúscula.',
      passed: /[A-Z]/.test(pwd),
    },
    {
      id: 'lowercase',
      label: 'Al menos una minúscula (a-z)',
      description: 'Incluye al menos una letra minúscula.',
      passed: /[a-z]/.test(pwd),
    },
    {
      id: 'number',
      label: 'Al menos un dígito numérico (0-9)',
      description: 'Contiene uno o más números.',
      passed: /[0-9]/.test(pwd),
    },
    {
      id: 'special',
      label: 'Al menos un carácter especial (!@#$%^&*...)',
      description: 'Añade símbolos no alfanuméricos para elevar la entropía.',
      passed: /[^A-Za-z0-9]/.test(pwd),
    },
  ];

  const passedCount = rules.filter((r) => r.passed).length;
  const errors = rules.filter((r) => !r.passed).map((r) => r.label);

  // Calculate score & level
  let score = 0;
  if (pwd.length > 0) {
    score = Math.min(100, passedCount * 20);
    // Bonus for length >= 12
    if (pwd.length >= 12 && passedCount === 5) {
      score = 100;
    }
  }

  let level: PasswordPolicyResult['level'] = 'MUY_DEBIL';
  let levelLabel = 'Muy Débil';
  let colorClass = 'text-rose-500';
  let barColorClass = 'bg-rose-500';

  if (passedCount === 0 || pwd.length === 0) {
    level = 'MUY_DEBIL';
    levelLabel = 'Sin evaluar';
    colorClass = 'text-slate-400';
    barColorClass = 'bg-slate-700';
  } else if (passedCount <= 2) {
    level = 'DEBIL';
    levelLabel = 'Débil';
    colorClass = 'text-rose-400';
    barColorClass = 'bg-rose-500';
  } else if (passedCount === 3 || passedCount === 4) {
    level = 'MEDIA';
    levelLabel = 'Aceptable / Media';
    colorClass = 'text-amber-400';
    barColorClass = 'bg-amber-500';
  } else if (passedCount === 5 && pwd.length < 12) {
    level = 'FUERTE';
    levelLabel = 'Fuerte / Segura';
    colorClass = 'text-emerald-400';
    barColorClass = 'bg-emerald-500';
  } else {
    level = 'OPTIMA';
    levelLabel = 'Excelente / Alta Entropía';
    colorClass = 'text-teal-300';
    barColorClass = 'bg-gradient-to-r from-emerald-400 to-teal-400';
  }

  // A password is valid under standard policy if it satisfies at least 4 of the 5 rules (including length)
  // or all 5 rules for strict mode
  const isValid = rules.find((r) => r.id === 'length')?.passed === true && passedCount >= 4;

  return {
    isValid,
    score,
    level,
    levelLabel,
    colorClass,
    barColorClass,
    rules,
    errors,
  };
}
