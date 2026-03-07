# current_issues

## How to Use
This file should always contain the exact live issues in the repo right now.

For each issue, record:
- issue title
- exact error text
- affected files
- suspected cause
- status
- priority

---

## Issue Template

### Issue: [short title]
**Status:** open / in progress / resolved  
**Priority:** high / medium / low

**Exact error text**
```text
paste the exact build or runtime error here
```

**Affected files**
- `path/to/file`

**Suspected cause**
- short explanation

**Next action**
- short action item

---

## Current Live Issues
Replace this section with your real current issues.

### Issue: Example missing import
**Status:** open  
**Priority:** high

**Exact error text**
```text
Module not found: Can't resolve './ImportProgrammeCsvModal'
```

**Affected files**
- `src/components/programme/WorkProgrammePanel.jsx`

**Suspected cause**
- imported modal name does not match real file name

**Next action**
- confirm actual modal file and update import safely

### Issue: Example missing export
**Status:** open  
**Priority:** high

**Exact error text**
```text
export 'PROGRAMME_WEIGHT_MODES' was not found in '../../services/programmeService'
```

**Affected files**
- `src/components/programme/WorkProgrammePanel.jsx`
- `src/services/programmeService.js`

**Suspected cause**
- UI is importing a constant that is not exported by the service

**Next action**
- confirm actual service exports and align imports without guessing
