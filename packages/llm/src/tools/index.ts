import type { Tool } from '../types.js';

/**
 * Vote tool - for daytime voting
 */
export const VOTE_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'vote',
    description: 'Cast your vote for who should be executed today. You must vote for someone.',
    parameters: {
      type: 'object',
      properties: {
        target_player_id: {
          type: 'string',
          description: 'The player ID you are voting to execute',
        },
        reasoning: {
          type: 'string',
          description: 'Your reasoning for this vote (will be logged but not shown to others)',
        },
      },
      required: ['target_player_id'],
    },
  },
};

/**
 * Night action tool - for seer and knight
 */
export const NIGHT_ACTION_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'night_action',
    description: 'Perform your night action. Seer can divine, Knight can protect.',
    parameters: {
      type: 'object',
      properties: {
        action_type: {
          type: 'string',
          enum: ['divine', 'protect'],
          description: 'Type of action: divine (seer) or protect (knight)',
        },
        target_player_id: {
          type: 'string',
          description: 'The player ID to target with your action',
        },
      },
      required: ['action_type', 'target_player_id'],
    },
  },
};

/**
 * Wolf attack submission tool - for wolf leader only
 */
export const WOLF_ATTACK_TOOL: Tool = {
  type: 'function',
  function: {
    name: 'submit_wolf_attack',
    description: 'Submit the final attack decision as the wolf leader. This ends the wolf chat phase.',
    parameters: {
      type: 'object',
      properties: {
        target_player_id: {
          type: 'string',
          description: 'The player ID to attack tonight',
        },
        rationale_public: {
          type: 'string',
          description: 'The cover story/rationale you will present tomorrow to explain suspicions',
        },
        tomorrow_plan: {
          type: 'string',
          description: 'Strategy for tomorrow\'s discussion (optional)',
        },
      },
      required: ['target_player_id', 'rationale_public'],
    },
  },
};

/**
 * Get tools for a specific context
 */
export function getToolsForContext(context: 'vote' | 'night_action' | 'wolf_attack'): Tool[] {
  switch (context) {
    case 'vote':
      return [VOTE_TOOL];
    case 'night_action':
      return [NIGHT_ACTION_TOOL];
    case 'wolf_attack':
      return [WOLF_ATTACK_TOOL];
    default:
      return [];
  }
}

