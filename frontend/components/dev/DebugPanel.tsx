'use client'

/**
 * Debug Panel - Browser Console Monitor
 *
 * Real-time log viewing in the browser (development only)
 * Features:
 * - Live log streaming
 * - Filter by component, level, search term
 * - Export to JSON
 * - Collapsible sidebar
 * - Auto-scroll to latest logs
 *
 * Only renders in development mode
 */

import { useState, useEffect, useRef } from 'react'
import { getLogger, LogLevel, LogEntry } from '@/lib/utils/debug-logger'
import { X, Download, Trash2, Filter, ChevronRight, ChevronLeft } from 'lucide-react'

export function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filterLevel, setFilterLevel] = useState<LogLevel>(LogLevel.DEBUG)
  const [filterComponent, setFilterComponent] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [autoScroll, setAutoScroll] = useState(true)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const logger = getLogger()

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null
  }

  // Subscribe to new logs
  useEffect(() => {
    // Get initial logs
    setLogs(logger.getLogs())

    // Subscribe to updates
    const unsubscribe = logger.subscribe((entry) => {
      setLogs((prev) => [...prev, entry])
    })

    return unsubscribe
  }, [])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (log.level < filterLevel) return false
    if (filterComponent && !log.component.toLowerCase().includes(filterComponent.toLowerCase())) return false
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      return (
        log.message.toLowerCase().includes(searchLower) ||
        log.component.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.data).toLowerCase().includes(searchLower)
      )
    }
    return true
  })

  const handleDownload = () => {
    logger.downloadLogs(`zmart-debug-${Date.now()}.json`)
  }

  const handleClear = () => {
    logger.clear()
    setLogs([])
  }

  const getLevelColor = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return 'text-gray-400'
      case LogLevel.INFO: return 'text-blue-400'
      case LogLevel.WARN: return 'text-yellow-400'
      case LogLevel.ERROR: return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getLevelBg = (level: LogLevel): string => {
    switch (level) {
      case LogLevel.DEBUG: return 'bg-gray-900/50'
      case LogLevel.INFO: return 'bg-blue-900/30'
      case LogLevel.WARN: return 'bg-yellow-900/30'
      case LogLevel.ERROR: return 'bg-red-900/30'
      default: return 'bg-gray-900/50'
    }
  }

  return (
    <>
      {/* Toggle Button - Fixed position */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 z-50 bg-brand-primary hover:bg-brand-primaryHover text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 font-medium text-sm transition-all"
          title="Open Debug Panel"
        >
          <ChevronLeft className="w-4 h-4" />
          Debug Logs ({logs.length})
        </button>
      )}

      {/* Debug Panel - Sliding Sidebar */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-[600px] bg-gray-900 border-l border-gray-700 z-50 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Debug Panel</h2>
              <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                {filteredLogs.length} / {logs.length} logs
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Download Logs"
              >
                <Download className="w-4 h-4 text-gray-300" />
              </button>
              <button
                onClick={handleClear}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Clear Logs"
              >
                <Trash2 className="w-4 h-4 text-gray-300" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-700 rounded transition-colors"
                title="Close Panel"
              >
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="p-4 border-b border-gray-700 bg-gray-850 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Min Level</label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(Number(e.target.value) as LogLevel)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-brand-primary"
                >
                  <option value={LogLevel.DEBUG}>DEBUG</option>
                  <option value={LogLevel.INFO}>INFO</option>
                  <option value={LogLevel.WARN}>WARN</option>
                  <option value={LogLevel.ERROR}>ERROR</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">Component</label>
                <input
                  type="text"
                  placeholder="Filter by component..."
                  value={filterComponent}
                  onChange={(e) => setFilterComponent(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Search</label>
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded bg-gray-800 border-gray-700 text-brand-primary focus:ring-brand-primary"
              />
              Auto-scroll to latest
            </label>
          </div>

          {/* Logs Container */}
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No logs match current filters
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`p-3 border-b border-gray-800 ${getLevelBg(log.level)} hover:bg-gray-800/50 transition-colors`}
                >
                  {/* Log Header */}
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-gray-500 text-[10px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        fractionalSecondDigits: 3,
                      })}
                    </span>
                    <span className={`font-semibold whitespace-nowrap ${getLevelColor(log.level)}`}>
                      [{log.levelName}]
                    </span>
                    <span className="text-brand-primary font-semibold">[{log.component}]</span>
                  </div>

                  {/* Log Message */}
                  <div className="text-gray-200 ml-2 mb-1">{log.message}</div>

                  {/* Log Data */}
                  {log.data && (
                    <details className="ml-2">
                      <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                        Data
                      </summary>
                      <pre className="mt-1 text-gray-300 bg-gray-950 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </details>
                  )}

                  {/* Error Stack */}
                  {log.error && (
                    <details className="ml-2 mt-1">
                      <summary className="text-red-400 cursor-pointer hover:text-red-300">
                        Error Stack
                      </summary>
                      <pre className="mt-1 text-red-300 bg-gray-950 p-2 rounded overflow-x-auto text-[10px]">
                        {log.error.stack || log.error.message}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>

          {/* Footer Stats */}
          <div className="p-3 border-t border-gray-700 bg-gray-850 text-xs text-gray-400 flex justify-between">
            <span>Total: {logs.length} logs</span>
            <span>Filtered: {filteredLogs.length} logs</span>
            <span>Environment: {process.env.NODE_ENV}</span>
          </div>
        </div>
      )}
    </>
  )
}
