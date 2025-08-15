// TDD - RED Phase: Write failing tests first

import { validatePassword, PasswordStrength } from './password-validation';

describe('Password Validation - TDD', () => {
  describe('validatePassword', () => {
    it('should return weak strength for passwords under 8 characters', () => {
      const result = validatePassword('abc123');
      
      expect(result.strength).toBe(PasswordStrength.WEAK);
      expect(result.score).toBeLessThan(3);
      expect(result.requirements.length).toBeGreaterThan(0);
    });

    it('should return medium strength for passwords with basic requirements', () => {
      const result = validatePassword('Password1');
      
      expect(result.strength).toBe(PasswordStrength.MEDIUM);
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.score).toBeLessThan(5);
    });

    it('should return strong strength for passwords meeting all requirements', () => {
      const result = validatePassword('StrongP@ssw0rd!');
      
      expect(result.strength).toBe(PasswordStrength.STRONG);
      expect(result.score).toBe(5);
      expect(result.requirements.every(req => req.met)).toBe(true);
    });

    it('should identify missing uppercase letters', () => {
      const result = validatePassword('password123!');
      
      const uppercaseReq = result.requirements.find(req => 
        req.text.includes('uppercase')
      );
      expect(uppercaseReq?.met).toBe(false);
    });

    it('should identify missing lowercase letters', () => {
      const result = validatePassword('PASSWORD123!');
      
      const lowercaseReq = result.requirements.find(req => 
        req.text.includes('lowercase')
      );
      expect(lowercaseReq?.met).toBe(false);
    });

    it('should identify missing numbers', () => {
      const result = validatePassword('Password!');
      
      const numberReq = result.requirements.find(req => 
        req.text.includes('number')
      );
      expect(numberReq?.met).toBe(false);
    });

    it('should identify missing special characters', () => {
      const result = validatePassword('Password123');
      
      const specialReq = result.requirements.find(req => 
        req.text.includes('special')
      );
      expect(specialReq?.met).toBe(false);
    });

    it('should provide helpful feedback messages', () => {
      const result = validatePassword('weak');
      
      expect(result.feedback).toContain('too short');
      expect(result.feedback).toContain('Add');
    });

    it('should calculate correct entropy score', () => {
      const weakResult = validatePassword('abc');
      const strongResult = validatePassword('Str0ng!P@ssw0rd#2024');
      
      expect(strongResult.entropy).toBeGreaterThan(weakResult.entropy);
      expect(strongResult.entropy).toBeGreaterThan(50); // High entropy threshold
    });
  });

  describe('Edge cases', () => {
    it('should handle empty password', () => {
      const result = validatePassword('');
      
      expect(result.strength).toBe(PasswordStrength.WEAK);
      expect(result.score).toBe(0);
      expect(result.requirements.every(req => !req.met)).toBe(true);
    });

    it('should handle very long passwords', () => {
      const longPassword = 'A'.repeat(100) + '1!';
      const result = validatePassword(longPassword);
      
      expect(result.entropy).toBeDefined();
      expect(result.strength).toBe(PasswordStrength.STRONG);
    });

    it('should handle unicode characters', () => {
      const result = validatePassword('Pässwörd123!');
      
      expect(result.strength).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
    });
  });
});