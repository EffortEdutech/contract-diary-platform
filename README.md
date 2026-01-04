# contract-diary-platform
Contract Work Diary &amp; Claims Management Platform for Malaysian Construction Industry

# React Chart Hook Error – Resolution Guide

This document explains the resolution for the following runtime error encountered in the project:

> **Invalid hook call. Hooks can only be called inside of the body of a function component**  
> **Cannot read properties of null (reading 'useRef')**  
> Error originating from `ResponsiveContainer` (Recharts)

---

## 🧩 Problem Summary

When navigating to report pages such as:
- Financial Report
- BOQ Progress
- Claims Summary

The application crashed with an **Invalid Hook Call** error related to `useRef`.

Stack trace pointed to:
- `ResponsiveContainer.js`
- `ForwardRef`
- `useRef` dispatcher being `null`

---

## 🔍 Root Cause

The issue was caused by **incompatible library versions**:

- **React 19.x** (experimental / bleeding-edge)
- **react-scripts 5 (CRA)** – designed for React 16–18
- **Recharts 3.x** – not fully compatible with React 19

Although only **one React version** was installed, the combination caused the React hook dispatcher to fail internally.

---

## ✅ Final Solution (Stable & Production-Safe)

The fix was to **align all dependencies to a stable and supported stack**.

### ✔ Target Stack
- **React**: `18.2.0`
- **React DOM**: `18.2.0`
- **Recharts**: `2.15.x`
- **react-scripts**: `5.0.1`

---

## 🛠 Step-by-Step Fix

### 1️⃣ Update `frontend/package.json`

```json
{
  "dependencies": {
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "recharts": "^2.15.4"
  }
}

