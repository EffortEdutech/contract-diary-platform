const ReportSettingsPanel = ({ settings, onToggle }) => {
  return (
    <div className="space-y-3 text-sm">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.includeSummary}
          onChange={() => onToggle('includeSummary')}
        />
        Summary
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.includeStatusChart}
          onChange={() => onToggle('includeStatusChart')}
        />
        Status Chart
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={settings.includeSections}
          onChange={() => onToggle('includeSections')}
        />
        Section Progress
      </label>

      <label className="flex items-center gap-2 opacity-50">
        <input type="checkbox" disabled />
        Item Details (PDF only)
      </label>
    </div>
  );
};

export default ReportSettingsPanel;
