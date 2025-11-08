import { SupabaseClient } from '@supabase/supabase-js';
import { Logger } from 'winston';
import { ConfigInitializedEvent, ConfigUpdatedEvent, EmergencyPauseToggledEvent, WriteResult } from '../types/events';
export declare class AdminEventWriter {
    private supabase;
    private logger;
    constructor(supabase: SupabaseClient, logger: Logger);
    /**
     * Write ConfigInitialized event
     *
     * On-chain: Global config account created with initial parameters
     * Database: Currently no global_config table, log event only
     * Future: Create admin_events table for audit trail
     */
    writeConfigInitialized(event: ConfigInitializedEvent): Promise<WriteResult>;
    /**
     * Write ConfigUpdated event
     *
     * On-chain: Global config account updated with new parameters
     * Database: Log event for audit trail
     * Future: Track configuration history in admin_events table
     */
    writeConfigUpdated(event: ConfigUpdatedEvent): Promise<WriteResult>;
    /**
     * Write EmergencyPauseToggled event
     *
     * On-chain: Global config is_paused flag toggled
     * Database: Update all active markets to reflect pause state
     * Impact: Blocks trading on ALL markets when paused
     */
    writeEmergencyPauseToggled(event: EmergencyPauseToggledEvent): Promise<WriteResult>;
}
//# sourceMappingURL=admin-writer.d.ts.map