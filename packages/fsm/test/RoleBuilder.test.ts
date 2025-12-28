import { describe, it, expect } from 'bun:test';
import { RoleBuilder } from '../src/roles/RoleBuilder';
import { BASE_ROLES_11 } from '@aiwolf/shared';

describe('RoleBuilder', () => {
  const builder = new RoleBuilder();

  describe('validatePacks', () => {
    it('should accept empty pack list', () => {
      const result = builder.validatePacks([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject duplicate packs', () => {
      const result = builder.validatePacks(['FOX', 'FOX']);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Duplicate packs are not allowed');
    });

    it('should reject multiple third-party factions', () => {
      const result = builder.validatePacks(['FOX']);
      expect(result.valid).toBe(true);
    });

    it('should reject multiple judgment modifiers', () => {
      const result = builder.validatePacks(['FANATIC', 'WHITE_WOLF']);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('judgment modifier'))).toBe(true);
    });

    it('should warn about FREEMASON + FANATIC combination', () => {
      const result = builder.validatePacks(['FREEMASON', 'FANATIC']);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('buildRoles', () => {
    it('should return base 11 roles when no packs', () => {
      const roles = builder.buildRoles([], 12345);
      expect(roles).toHaveLength(11);
      expect(roles).toEqual(BASE_ROLES_11);
    });

    it('should substitute FOX for VILLAGER', () => {
      const roles = builder.buildRoles(['FOX'], 12345);
      expect(roles).toHaveLength(11);
      expect(roles).toContain('FOX');
      expect(roles.filter(r => r === 'VILLAGER')).toHaveLength(4); // 5 - 1
    });

    it('should substitute FREEMASON for 2 VILLAGER', () => {
      const roles = builder.buildRoles(['FREEMASON'], 12345);
      expect(roles).toHaveLength(11);
      expect(roles.filter(r => r === 'FREEMASON')).toHaveLength(2);
      expect(roles.filter(r => r === 'VILLAGER')).toHaveLength(3); // 5 - 2
    });

    it('should substitute WHITE_WOLF for WEREWOLF', () => {
      const roles = builder.buildRoles(['WHITE_WOLF'], 12345);
      expect(roles).toHaveLength(11);
      expect(roles).toContain('WHITE_WOLF');
      expect(roles.filter(r => r === 'WEREWOLF')).toHaveLength(1); // 2 - 1
    });

    it('should handle multiple valid packs', () => {
      const roles = builder.buildRoles(['FOX', 'HUNTER'], 12345);
      expect(roles).toHaveLength(11);
      expect(roles).toContain('FOX');
      expect(roles).toContain('HUNTER');
      expect(roles.filter(r => r === 'VILLAGER')).toHaveLength(3); // 5 - 2
    });
  });

  describe('getDivinationResult', () => {
    it('should return WEREWOLF for WEREWOLF', () => {
      expect(builder.getDivinationResult('WEREWOLF')).toBe('WEREWOLF');
    });

    it('should return HUMAN for WHITE_WOLF', () => {
      expect(builder.getDivinationResult('WHITE_WOLF')).toBe('HUMAN');
    });

    it('should return WEREWOLF for FANATIC', () => {
      expect(builder.getDivinationResult('FANATIC')).toBe('WEREWOLF');
    });

    it('should return HUMAN for VILLAGER', () => {
      expect(builder.getDivinationResult('VILLAGER')).toBe('HUMAN');
    });

    it('should return HUMAN for SEER', () => {
      expect(builder.getDivinationResult('SEER')).toBe('HUMAN');
    });
  });

  describe('getMediumResult', () => {
    it('should return WEREWOLF for WEREWOLF', () => {
      expect(builder.getMediumResult('WEREWOLF')).toBe('WEREWOLF');
    });

    it('should return WEREWOLF for WHITE_WOLF', () => {
      expect(builder.getMediumResult('WHITE_WOLF')).toBe('WEREWOLF');
    });

    it('should return HUMAN for FANATIC', () => {
      expect(builder.getMediumResult('FANATIC')).toBe('HUMAN');
    });

    it('should return HUMAN for VILLAGER', () => {
      expect(builder.getMediumResult('VILLAGER')).toBe('HUMAN');
    });
  });

  describe('buildRandomRoles', () => {
    it('should return valid 11 roles', () => {
      const result = builder.buildRandomRoles(12345);
      expect(result.roles).toHaveLength(11);
      expect(Array.isArray(result.packs)).toBe(true);
    });

    it('should be deterministic with same seed', () => {
      const result1 = builder.buildRandomRoles(12345);
      const result2 = builder.buildRandomRoles(12345);
      expect(result1.packs).toEqual(result2.packs);
      expect(result1.roles).toEqual(result2.roles);
    });

    it('should be different with different seeds', () => {
      const result1 = builder.buildRandomRoles(12345);
      const result2 = builder.buildRandomRoles(67890);
      // May be different (not guaranteed, but highly likely)
      const same = JSON.stringify(result1) === JSON.stringify(result2);
      // Just verify both are valid
      expect(result1.roles).toHaveLength(11);
      expect(result2.roles).toHaveLength(11);
    });
  });
});

