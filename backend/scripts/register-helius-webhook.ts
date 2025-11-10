/**
 * Helius Webhook Registration Script
 *
 * Registers a webhook with Helius to receive transaction notifications
 * for our Solana program.
 *
 * Usage:
 *   npm run script:register-helius-webhook
 *
 * Environment Variables Required:
 *   - HELIUS_API_KEY
 *   - WEBHOOK_URL (your public webhook endpoint)
 *   - SOLANA_PROGRAM_ID (zmart-core program)
 *
 * @module scripts/register-helius-webhook
 */

import axios from 'axios';
import { config } from '../src/config/env';
import { logger } from '../event-indexer/src/utils/logger';

interface HeliusWebhookConfig {
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: 'enhanced' | 'raw' | 'discord';
  authHeader?: string;
}

interface HeliusWebhookResponse {
  webhookID: string;
  wallet: string;
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType: string;
  authHeader?: string;
}

/**
 * Register webhook with Helius
 */
async function registerWebhook(): Promise<void> {
  try {
    // Validate environment variables
    const heliusApiKey = process.env.HELIUS_API_KEY;
    const webhookUrl = process.env.WEBHOOK_URL;
    const programId = config.solana.programIds.core;

    if (!heliusApiKey) {
      throw new Error('HELIUS_API_KEY not set in environment');
    }

    if (!webhookUrl) {
      throw new Error('WEBHOOK_URL not set in environment (e.g., https://api.yourdomain.com/api/webhooks/helius)');
    }

    if (!programId) {
      throw new Error('SOLANA_PROGRAM_ID not configured');
    }

    logger.info('Registering Helius webhook', {
      webhookUrl,
      programId
    });

    // Webhook configuration
    const webhookConfig: HeliusWebhookConfig = {
      webhookURL: webhookUrl,
      transactionTypes: ['Any'], // All transaction types
      accountAddresses: [programId], // Filter by our program ID
      webhookType: 'enhanced', // Enhanced webhook type (includes parsed data)
      authHeader: process.env.HELIUS_WEBHOOK_SECRET // Optional: Add auth header
    };

    // Register webhook via Helius API
    const response = await axios.post<HeliusWebhookResponse>(
      `https://api.helius.xyz/v0/webhooks?api-key=${heliusApiKey}`,
      webhookConfig,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    logger.info('Webhook registered successfully', {
      webhookId: response.data.webhookID,
      webhookUrl: response.data.webhookURL,
      accountAddresses: response.data.accountAddresses
    });

    console.log('\n✅ Helius Webhook Registered Successfully\n');
    console.log(`Webhook ID: ${response.data.webhookID}`);
    console.log(`Webhook URL: ${response.data.webhookURL}`);
    console.log(`Program ID: ${programId}`);
    console.log(`Webhook Type: ${response.data.webhookType}`);
    console.log('\nAdd this to your .env file:');
    console.log(`HELIUS_WEBHOOK_ID=${response.data.webhookID}`);
    console.log('\nWebhook is now active and will receive transaction notifications.');

  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Failed to register webhook', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });

      console.error('\n❌ Failed to register webhook');
      console.error(`Status: ${error.response?.status}`);
      console.error(`Error: ${JSON.stringify(error.response?.data, null, 2)}`);

      if (error.response?.status === 401) {
        console.error('\nCheck your HELIUS_API_KEY');
      }

      if (error.response?.status === 400) {
        console.error('\nCheck your webhook configuration:');
        console.error('- WEBHOOK_URL must be a valid HTTPS URL');
        console.error('- SOLANA_PROGRAM_ID must be a valid Solana address');
      }
    } else {
      logger.error('Unexpected error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      console.error('\n❌ Unexpected error:', error);
    }

    process.exit(1);
  }
}

/**
 * List existing webhooks
 */
async function listWebhooks(): Promise<void> {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (!heliusApiKey) {
      throw new Error('HELIUS_API_KEY not set');
    }

    const response = await axios.get<HeliusWebhookResponse[]>(
      `https://api.helius.xyz/v0/webhooks?api-key=${heliusApiKey}`
    );

    console.log('\n📋 Existing Helius Webhooks:\n');

    if (response.data.length === 0) {
      console.log('No webhooks found.');
    } else {
      response.data.forEach((webhook, index) => {
        console.log(`${index + 1}. Webhook ID: ${webhook.webhookID}`);
        console.log(`   URL: ${webhook.webhookURL}`);
        console.log(`   Type: ${webhook.webhookType}`);
        console.log(`   Accounts: ${webhook.accountAddresses.join(', ')}`);
        console.log('');
      });
    }

  } catch (error) {
    logger.error('Failed to list webhooks', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('❌ Failed to list webhooks:', error);
    process.exit(1);
  }
}

/**
 * Delete webhook
 */
async function deleteWebhook(webhookId: string): Promise<void> {
  try {
    const heliusApiKey = process.env.HELIUS_API_KEY;

    if (!heliusApiKey) {
      throw new Error('HELIUS_API_KEY not set');
    }

    await axios.delete(
      `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${heliusApiKey}`
    );

    console.log(`\n✅ Webhook ${webhookId} deleted successfully\n`);

  } catch (error) {
    logger.error('Failed to delete webhook', {
      webhookId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    console.error('❌ Failed to delete webhook:', error);
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const command = process.argv[2];

  switch (command) {
    case 'register':
      await registerWebhook();
      break;

    case 'list':
      await listWebhooks();
      break;

    case 'delete':
      const webhookId = process.argv[3];
      if (!webhookId) {
        console.error('Usage: npm run script:register-helius-webhook delete <webhook-id>');
        process.exit(1);
      }
      await deleteWebhook(webhookId);
      break;

    default:
      console.log('Usage:');
      console.log('  npm run script:register-helius-webhook register  # Register new webhook');
      console.log('  npm run script:register-helius-webhook list      # List existing webhooks');
      console.log('  npm run script:register-helius-webhook delete <id>  # Delete webhook');
      process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { registerWebhook, listWebhooks, deleteWebhook };
