# Role-Based Access Control (RBAC) Structure for Construction Contract Platforms

> **Scope:** Main Contractor, Sub Contractor, Consultant, Supplier, Client, Auditor  
> **Context:** Construction contract administration (Progress Reports, VO, EOT, DLP, CIPAA-ready records)

---

## 1. Why RBAC Matters in Construction Systems

Construction platforms deal with:
- Multiple independent organizations
- Contract-specific authority
- Legal accountability (PWD 203 / PAM / CIPAA)
- Sequential workflows (submit → review → approve → lock)

A weak RBAC design causes:
- Unauthorized approvals
- Evidence integrity issues
- Disputes during Final Account / CIPAA
- Audit non-compliance

This document defines a **clean, scalable, contract-safe RBAC architecture**.

---

## 2. Core Design Principle

### Separate **WHO** from **WHAT**

| Concept | Meaning | Example |
|------|------|------|
| **Organization Type** | Business identity | Main Contractor, Consultant |
| **Role** | Authority bundle | Editor, Approver |
| **Permission** | Atomic action | progress.submit |

> ❗ Never hardcode permissions into organization types

---

## 3. Core RBAC Components (Logical Model)

### 3.1 Entities

```
User
Organization
OrganizationType
Contract
Role
Permission
```

### 3.2 Relationship Tables

```
UserOrganization
UserOrganizationRole
RolePermission
```

### 3.3 Contextual Scope

All permissions are scoped at:

```
User → Organization → Contract → Role → Permission
```

This allows:
- Same user, different authority per contract
- Clean audit trail
- Legal defensibility

---

## 4. Organization Types (WHO they are)

Organization Types **do not grant permissions**. They describe contractual position only.

### Standard Organization Types

- Main Contractor
- Sub Contractor
- Consultant
- Supplier
- Client / Employer
- Authority / Auditor (JKR, CIDB, Internal Audit)

> Permissions are always assigned via Roles, not Organization Types

---

## 5. System Roles (WHAT they can do)

Roles are **reusable across all organization types**.

### Core Roles

| Role | Description |
|----|----|
| **Owner** | Contract-level super authority |
| **Admin** | Full control within organization |
| **Editor** | Create & update records |
| **Reader** | View-only |
| **Submitter** | Can submit but not approve |
| **Reviewer** | Comment, return, flag issues |
| **Approver** | Certify / approve submissions |
| **Auditor** | Read + export only |
| **Lock Manager** | Freeze records after approval |
| **Delegated Approver** | Temporary approval authority |
| **External Viewer** | Time-limited read-only access |
| **System Bot** | Automation & scheduled actions |

---

## 6. Permission Design (Atomic Actions)

Permissions should be **small and explicit**.

### Example Permission Set

```
contract.read
contract.update
progress.create
progress.update
progress.submit
progress.approve
vo.create
vo.review
vo.approve
eot.create
eot.review
eot.approve
document.upload
document.lock
comment.add
export.pdf
export.cipaa
```

> Roles are just bundles of these permissions

---

## 7. Typical Role-to-Permission Bundles

### Editor

```
create
update
comment.add
```

### Submitter

```
submit
read
```

### Approver

```
approve
read
lock
```

### Auditor

```
read
export
```

---

## 8. Real-World Role Mapping Examples

### 8.1 Progress Report (Laporan Kemajuan Kerja)

| Organization | Role | Permissions |
|----|----|----|
| Sub Contractor | Editor | create, update |
| Sub Contractor | Submitter | submit |
| Main Contractor | Reviewer | comment, return |
| Consultant | Approver | approve, certify |
| Client | Reader | read |
| Auditor | Auditor | read, export |

---

### 8.2 Variation Order (VO)

| Organization | Role |
|----|----|
| Sub Contractor | Creator |
| Main Contractor | Editor / Submitter |
| Consultant | Technical Approver |
| Client | Financial Approver |
| Auditor | Read + Export |

> Approval is **workflow-based**, not single-role

---

### 8.3 Extension of Time (EOT)

| Organization | Role |
|----|----|
| Sub Contractor | Creator |
| Main Contractor | Reviewer |
| Consultant | Technical Approver |
| Client | Endorser |

---

### 8.4 Defect Liability Period (DLP)

| Organization | Role |
|----|----|
| Main Contractor | Editor |
| Consultant | Certifier |
| Client | Reader |

---

## 9. Record Locking & Legal Integrity

After approval:
- Records must be **locked**
- No edits allowed
- Only annotations / addenda permitted

### Lock Manager Role

- Enforces data immutability
- Critical for CIPAA & court disputes

---

## 10. Delegation & Temporary Authority

### Delegated Approver

Use case:
- Consultant on leave
- Emergency approval

Rules:
- Time-bound
- Logged
- Revocable

---

## 11. Automation & System Roles

### System Bot

- Auto-generate reports
- Deadline reminders
- Auto-lock after approval
- Submission timestamps

System Bots **must have explicit permissions**

---

## 12. CIPAA & Audit Safety Rules

Mandatory:
- Immutable approval records
- Exportable audit trail
- Time-stamped actions
- Role-bound authority

Recommended:
- Separate read vs export
- Auditor role cannot edit

---

## 13. Key Design Rules (Non-Negotiable)

✅ Never mix organization type with permissions  
✅ Scope roles per contract  
✅ Design approvals as workflows  
✅ Lock records post-approval  
✅ Maintain full audit trail  

---

## 14. Summary (TL;DR)

- Use **Organization Type** to describe position
- Use **Role** to assign authority
- Use **Permission** for atomic actions
- Scope everything at **Contract level**
- Design for **legal defensibility**, not convenience

---

**Prepared for:** Construction Contract Administration Platforms  
**Authoring Context:** PWD 203 / CIPAA-ready systems  
**Credit:** Karya oleh Darya Malak

