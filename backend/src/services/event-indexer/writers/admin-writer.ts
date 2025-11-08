// ============================================================
// Admin Event Writer
// ============================================================
// Purpose: Write admin events to Supabase database
// Story: Week 1, Days 3-7 - Event Indexer Implementation

import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import {
  ConfigInitializedEvent,
  ConfigUpdatedEvent,
  EmergencyPauseToggledEvent,
  WriteResult,
} from '../types/events';

export class AdminEventWriter {
  constructor(
    private supabase: SupabaseClient,
    private logger: Logger
  ) {}

  /**
   * Write ConfigInitialized event
   *
   * On-chain: Global config account created with initial parameters
   * Database: Currently no global_config table, log event only
   * Future: Create admin_events table for audit trail
   */
  async writeConfigInitialized(
    event: ConfigInitializedEvent
  ): Promise<WriteResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Processing ConfigInitialized event', {
        txSignature: event.txSignature,
        authority: event.authority,
      });

      // Log configuration values
      this.logger.info('Initial configuration', {
        proposalApprovalThreshold: event.proposalApprovalThreshold,
        minLiquidityRequired: event.minLiquidityRequired,
        platformFeePercentage: event.platformFeePercentage,
        creatorFeePercentage: event.creatorFeePercentage,
        stakerFeePercentage: event.stakerFeePercentage,
      });

      // Future: Insert into admin_events table
      // const { error: insertError } = await this.supabase
      //   .from('admin_events')
      //   .insert({
      //     event_type: 'config_initialized',
      //     tx_signature: event.txSignature,
      //     authority: event.authority,
      //     config_data: event,
      //     indexed_at: event.timestamp,
      //   });

      return {
        success: true,
        eventType: 'ConfigInitialized',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error writing ConfigInitialized event', {
        error,
        txSignature: event.txSignature,
      });

      return {
        success: false,
        eventType: 'ConfigInitialized',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Write ConfigUpdated event
   *
   * On-chain: Global config account updated with new parameters
   * Database: Log event for audit trail
   * Future: Track configuration history in admin_events table
   */
  async writeConfigUpdated(
    event: ConfigUpdatedEvent
  ): Promise<WriteResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Processing ConfigUpdated event', {
        txSignature: event.txSignature,
        authority: event.authority,
        field: event.field,
        oldValue: event.oldValue,
        newValue: event.newValue,
      });

      // Future: Insert into admin_events table
      // const { error: insertError } = await this.supabase
      //   .from('admin_events')
      //   .insert({
      //     event_type: 'config_updated',
      //     tx_signature: event.txSignature,
      //     authority: event.authority,
      //     config_data: {
      //       field: event.field,
      //       old_value: event.oldValue,
      //       new_value: event.newValue,
      //     },
      //     indexed_at: event.timestamp,
      //   });

      return {
        success: true,
        eventType: 'ConfigUpdated',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error writing ConfigUpdated event', {
        error,
        txSignature: event.txSignature,
      });

      return {
        success: false,
        eventType: 'ConfigUpdated',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Write EmergencyPauseToggled event
   *
   * On-chain: Global config is_paused flag toggled
   * Database: Update all active markets to reflect pause state
   * Impact: Blocks trading on ALL markets when paused
   */
  async writeEmergencyPauseToggled(
    event: EmergencyPauseToggledEvent
  ): Promise<WriteResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Processing EmergencyPauseToggled event', {
        txSignature: event.txSignature,
        authority: event.authority,
        isPaused: event.isPaused,
      });

      // Update all ACTIVE markets to reflect pause state
      const { error: updateError } = await this.supabase
        .from('markets')
        .update({
          is_paused: event.isPaused,
          updated_at: event.timestamp,
        })
        .eq('state', 2); // Only update ACTIVE markets (state 2)

      if (updateError) {
        throw new Error(`Failed to update markets: ${updateError.message}`);
      }

      // Future: Insert into admin_events table
      // const { error: insertError } = await this.supabase
      //   .from('admin_events')
      //   .insert({
      //     event_type: 'emergency_pause_toggled',
      //     tx_signature: event.txSignature,
      //     authority: event.authority,
      //     config_data: { is_paused: event.isPaused },
      //     indexed_at: event.timestamp,
      //   });

      this.logger.info('Emergency pause state updated', {
        isPaused: event.isPaused,
        txSignature: event.txSignature,
      });

      return {
        success: true,
        eventType: 'EmergencyPauseToggled',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      this.logger.error('Error writing EmergencyPauseToggled event', {
        error,
        txSignature: event.txSignature,
      });

      return {
        success: false,
        eventType: 'EmergencyPauseToggled',
        txSignature: event.txSignature,
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
