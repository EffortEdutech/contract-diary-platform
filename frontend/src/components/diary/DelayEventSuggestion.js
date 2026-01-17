// ============================================================================
// File 2: frontend/src/components/diary/DelayEventSuggestion.js
// ============================================================================

import React from 'react';

/**
 * Auto-suggests creating delay event for EOT claims
 * Triggers when:
 * - Work stoppage > 1 hour
 * - Multiple work stoppages in one day
 */
const DelayEventSuggestion = ({ 
  weatherObservations, 
  onCreateDelayEvent, 
  onDismiss 
}) => {
  // Check if we should suggest delay event
  const shouldSuggest = () => {
    // Check 1: Work stoppage > 1 hour
    const longStoppage = weatherObservations.some(
      obs => obs.work_stoppage && obs.work_stoppage_duration_minutes > 60
    );

    // Check 2: Multiple work stoppages in one day
    const multipleStoppages = weatherObservations.filter(
      obs => obs.work_stoppage
    ).length > 1;

    return longStoppage || multipleStoppages;
  };

  if (!shouldSuggest()) return null;

  // Calculate total delay
  const totalDelayMinutes = weatherObservations
    .filter(obs => obs.work_stoppage)
    .reduce((sum, obs) => sum + (obs.work_stoppage_duration_minutes || 0), 0);

  const affectedActivities = [
    ...new Set(
      weatherObservations
        .filter(obs => obs.work_stoppage)
        .flatMap(obs => obs.affected_activities || [])
    )
  ];

  return (
    <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <h4 className="font-bold text-orange-900 mb-2">
            Delay Event Suggested
          </h4>
          <p className="text-sm text-orange-800 mb-3">
            Significant weather delay detected. Would you like to create a delay 
            event for potential EOT (Extension of Time) claim?
          </p>

          <div className="bg-white rounded p-3 mb-3 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Delay:</span>
              <span className="font-semibold text-gray-900">
                {totalDelayMinutes} minutes ({(totalDelayMinutes / 60).toFixed(1)} hours)
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Stoppages:</span>
              <span className="font-semibold text-gray-900">
                {weatherObservations.filter(obs => obs.work_stoppage).length} times
              </span>
            </div>
            {affectedActivities.length > 0 && (
              <div>
                <span className="text-gray-600">Affected Activities:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {affectedActivities.map((activity, i) => (
                    <span
                      key={i}
                      className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCreateDelayEvent({
                totalDelayMinutes,
                affectedActivities,
                weatherObservations
              })}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
            >
              Create Delay Event
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm font-medium"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


export default DelayEventSuggestion;