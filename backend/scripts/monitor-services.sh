#!/bin/bash

# Week 1 Stability Monitoring Script
# Monitors Vote Aggregator and Market Monitor for 24 hours
# Alerts on crashes, logs status every 5 minutes

MONITOR_DURATION=86400  # 24 hours in seconds
CHECK_INTERVAL=300      # 5 minutes
LOG_FILE="/Users/seman/Desktop/zmartV0.69/backend/logs/stability-monitor.log"
ALERT_FILE="/Users/seman/Desktop/zmartV0.69/backend/logs/stability-alerts.log"

# Create log files if they don't exist
touch "$LOG_FILE"
touch "$ALERT_FILE"

# Get baseline restart counts
VOTE_AGGREGATOR_BASELINE=$(pm2 jlist | jq '.[] | select(.name=="vote-aggregator") | .pm2_env.restart_time' 2>/dev/null || echo 0)
MARKET_MONITOR_BASELINE=$(pm2 jlist | jq '.[] | select(.name=="market-monitor") | .pm2_env.restart_time' 2>/dev/null || echo 0)

echo "========================================" | tee -a "$LOG_FILE"
echo "Week 1 Stability Monitor Started" | tee -a "$LOG_FILE"
echo "Start Time: $(date)" | tee -a "$LOG_FILE"
echo "Duration: 24 hours" | tee -a "$LOG_FILE"
echo "Check Interval: 5 minutes" | tee -a "$LOG_FILE"
echo "Baseline Restarts:" | tee -a "$LOG_FILE"
echo "  Vote Aggregator: $VOTE_AGGREGATOR_BASELINE" | tee -a "$LOG_FILE"
echo "  Market Monitor: $MARKET_MONITOR_BASELINE" | tee -a "$LOG_FILE"
echo "========================================" | tee -a "$LOG_FILE"

START_TIME=$(date +%s)
CHECK_COUNT=0
CRASH_COUNT=0

while true; do
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))

    # Check if 24 hours have passed
    if [ $ELAPSED -ge $MONITOR_DURATION ]; then
        echo "" | tee -a "$LOG_FILE"
        echo "========================================" | tee -a "$LOG_FILE"
        echo "24-Hour Stability Monitor Complete" | tee -a "$LOG_FILE"
        echo "End Time: $(date)" | tee -a "$LOG_FILE"
        echo "Total Checks: $CHECK_COUNT" | tee -a "$LOG_FILE"
        echo "Total Crashes Detected: $CRASH_COUNT" | tee -a "$LOG_FILE"

        if [ $CRASH_COUNT -eq 0 ]; then
            echo "✅ WEEK 1 QUALITY GATE PASSED - Services stable for 24 hours!" | tee -a "$LOG_FILE"
        else
            echo "❌ WEEK 1 QUALITY GATE FAILED - $CRASH_COUNT crashes detected" | tee -a "$LOG_FILE"
        fi
        echo "========================================" | tee -a "$LOG_FILE"
        break
    fi

    # Get current status
    PM2_STATUS=$(pm2 jlist 2>/dev/null)

    # Check Vote Aggregator
    VOTE_STATUS=$(echo "$PM2_STATUS" | jq '.[] | select(.name=="vote-aggregator") | .pm2_env.status' 2>/dev/null | tr -d '"')
    VOTE_RESTARTS=$(echo "$PM2_STATUS" | jq '.[] | select(.name=="vote-aggregator") | .pm2_env.restart_time' 2>/dev/null || echo 0)
    VOTE_UPTIME=$(echo "$PM2_STATUS" | jq '.[] | select(.name=="vote-aggregator") | .pm2_env.pm_uptime' 2>/dev/null || echo 0)

    # Check Market Monitor
    MARKET_STATUS=$(echo "$PM2_STATUS" | jq '.[] | select(.name=="market-monitor") | .pm2_env.status' 2>/dev/null | tr -d '"')
    MARKET_RESTARTS=$(echo "$PM2_STATUS" | jq '.[] | select(.name=="market-monitor") | .pm2_env.restart_time' 2>/dev/null || echo 0)
    MARKET_UPTIME=$(echo "$PM2_STATUS" | jq '.[] | select(.name=="market-monitor") | .pm2_env.pm_uptime' 2>/dev/null || echo 0)

    # Calculate uptime in minutes
    VOTE_UPTIME_MIN=$((($CURRENT_TIME - $VOTE_UPTIME / 1000) / 60))
    MARKET_UPTIME_MIN=$((($CURRENT_TIME - $MARKET_UPTIME / 1000) / 60))

    # Detect crashes (restart count increased)
    VOTE_NEW_CRASHES=$((VOTE_RESTARTS - VOTE_AGGREGATOR_BASELINE))
    MARKET_NEW_CRASHES=$((MARKET_RESTARTS - MARKET_MONITOR_BASELINE))

    if [ $VOTE_NEW_CRASHES -gt 0 ] || [ $MARKET_NEW_CRASHES -gt 0 ]; then
        CRASH_COUNT=$((CRASH_COUNT + 1))
        echo "🚨 CRASH DETECTED at $(date)" | tee -a "$ALERT_FILE"
        echo "  Vote Aggregator new crashes: $VOTE_NEW_CRASHES" | tee -a "$ALERT_FILE"
        echo "  Market Monitor new crashes: $MARKET_NEW_CRASHES" | tee -a "$ALERT_FILE"

        # Update baseline to detect future crashes
        VOTE_AGGREGATOR_BASELINE=$VOTE_RESTARTS
        MARKET_MONITOR_BASELINE=$MARKET_RESTARTS
    fi

    # Log status
    CHECK_COUNT=$((CHECK_COUNT + 1))
    HOURS_ELAPSED=$((ELAPSED / 3600))
    MINUTES_ELAPSED=$(((ELAPSED % 3600) / 60))

    echo "[Check #$CHECK_COUNT] ${HOURS_ELAPSED}h ${MINUTES_ELAPSED}m elapsed - $(date)" >> "$LOG_FILE"
    echo "  Vote Aggregator: $VOTE_STATUS, ${VOTE_UPTIME_MIN}m uptime, $VOTE_NEW_CRASHES new crashes" >> "$LOG_FILE"
    echo "  Market Monitor: $MARKET_STATUS, ${MARKET_UPTIME_MIN}m uptime, $MARKET_NEW_CRASHES new crashes" >> "$LOG_FILE"

    # Sleep until next check
    sleep $CHECK_INTERVAL
done
