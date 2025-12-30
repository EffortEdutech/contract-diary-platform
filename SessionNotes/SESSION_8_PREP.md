# 🚀 SESSION 8 PREPARATION GUIDE - PHOTO UPLOAD MODULE

**Bismillah! Ready for Phase 3B - Photo Upload Module!**

**Date:** January 1, 2026  
**Focus:** Photo Upload & Gallery for Daily Diaries  
**Estimated Duration:** 2-3 hours  
**Complexity:** Medium

---

## 📋 SESSION 8 OBJECTIVES

### **Primary Goals:**
1. Set up Supabase Storage for photos
2. Create photo upload component
3. Build photo gallery with lightbox
4. Integrate photos with daily diaries
5. Test complete upload/view flow

### **Secondary Goals:**
1. Image compression before upload
2. File validation (size, type)
3. Photo metadata tracking
4. Delete photos (draft only)

### **Success Criteria:**
- ✅ Users can upload photos to diaries
- ✅ Photos display in gallery
- ✅ Photos stored securely in Supabase
- ✅ Only draft diaries allow photo management
- ✅ RLS policies protect photo access

---

## 🎯 PHASE 3B OVERVIEW

### **What We're Building:**

**Photo Upload System for Daily Diaries**
- Visual documentation of site progress
- CIPAA evidence (photos are critical proof)
- Before/after comparison capability
- Timestamped proof of work

**Key Features:**
1. **Upload Component**
   - Drag & drop interface
   - Multiple file selection
   - Image preview before upload
   - Progress indicator

2. **Photo Gallery**
   - Grid layout with thumbnails
   - Lightbox for full-size viewing
   - Swipe navigation
   - Download original images

3. **Photo Management**
   - Add photos to diary entries
   - Photo descriptions/captions
   - Delete photos (draft diaries only)
   - Reorder photos

4. **Storage & Security**
   - Supabase Storage integration
   - RLS policies for photo access
   - Organized folder structure
   - Automatic URL generation

---

## 🗄️ DATABASE SCHEMA ADDITIONS

### **New Table: diary_photos**

```sql
CREATE TABLE diary_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diary_id UUID NOT NULL REFERENCES work_diaries(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  caption TEXT,
  display_order INTEGER DEFAULT 0,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_diary_photos_diary_id ON diary_photos(diary_id);
CREATE INDEX idx_diary_photos_uploaded_by ON diary_photos(uploaded_by);
CREATE INDEX idx_diary_photos_display_order ON diary_photos(diary_id, display_order);

-- RLS Policies
ALTER TABLE diary_photos ENABLE ROW LEVEL SECURITY;

-- Users can view photos for diaries they can view
CREATE POLICY "Users can view diary photos"
ON diary_photos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM work_diaries
    WHERE work_diaries.id = diary_photos.diary_id
    -- User can view the diary (existing diary RLS applies)
  )
);

-- Users can upload photos to their draft diaries
CREATE POLICY "Users can upload photos to draft diaries"
ON diary_photos FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM work_diaries
    WHERE work_diaries.id = diary_photos.diary_id
    AND work_diaries.created_by = auth.uid()
    AND work_diaries.status = 'draft'
  )
  AND uploaded_by = auth.uid()
);

-- Users can update their own photos on draft diaries
CREATE POLICY "Users can update own photos on draft diaries"
ON diary_photos FOR UPDATE
USING (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_diaries
    WHERE work_diaries.id = diary_photos.diary_id
    AND work_diaries.status = 'draft'
  )
);

-- Users can delete their own photos from draft diaries
CREATE POLICY "Users can delete own photos from draft diaries"
ON diary_photos FOR DELETE
USING (
  uploaded_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM work_diaries
    WHERE work_diaries.id = diary_photos.diary_id
    AND work_diaries.status = 'draft'
  )
);
```

---

## 📦 SUPABASE STORAGE SETUP

### **Storage Bucket: diary-photos**

```javascript
// Create bucket (one-time setup)
const { data, error } = await supabase
  .storage
  .createBucket('diary-photos', {
    public: false, // Private by default
    fileSizeLimit: 5242880 // 5MB limit
  });

// Storage RLS Policy
// Users can upload to their own diary folders
CREATE POLICY "Users can upload to own diary photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'diary-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

// Users can view photos for diaries they have access to
CREATE POLICY "Users can view accessible diary photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'diary-photos'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM work_diaries wd
      WHERE wd.id::text = (storage.foldername(name))[2]
      -- User has access to the diary
    )
  )
);
```

### **Folder Structure:**
```
diary-photos/
  └── {user_id}/
      └── {diary_id}/
          └── {timestamp}_{filename}
```

**Example:**
```
diary-photos/
  └── d7335fb8-ef23-4a90-97ad-e8a88568ad1a/
      └── 550e8400-e29b-41d4-a716-446655440000/
          └── 1704067200000_site_progress.jpg
```

---

## 🛠️ TECHNICAL COMPONENTS

### **1. PhotoUpload Component**

**File:** `frontend/src/components/diary/PhotoUpload.jsx`

**Features:**
- Drag & drop zone
- File input fallback
- Multiple file selection
- Image preview thumbnails
- Upload progress bar
- File validation
- Error handling

**Key Functions:**
```javascript
handleFileSelect(files)
validateFile(file) // Check size, type
compressImage(file) // Reduce file size
uploadPhoto(file, diaryId)
```

---

### **2. PhotoGallery Component**

**File:** `frontend/src/components/diary/PhotoGallery.jsx`

**Features:**
- Grid layout (responsive)
- Thumbnail generation
- Click to view full-size
- Lightbox modal
- Swipe/arrow navigation
- Download button
- Caption display

**Key Functions:**
```javascript
loadPhotos(diaryId)
openLightbox(photoIndex)
nextPhoto()
previousPhoto()
downloadPhoto(photoId)
```

---

### **3. diaryPhotoService**

**File:** `frontend/src/services/diaryPhotoService.js`

**Functions:**
```javascript
uploadPhoto(diaryId, file, caption)
getPhotos(diaryId)
getPhotoUrl(photoId)
updatePhotoCaption(photoId, caption)
deletePhoto(photoId)
reorderPhotos(diaryId, photoIds)
```

---

## 📝 IMPLEMENTATION CHECKLIST

### **Phase 1: Database Setup (15 min)**
- [ ] Create diary_photos table
- [ ] Add RLS policies
- [ ] Create indexes
- [ ] Test with sample data

### **Phase 2: Storage Setup (15 min)**
- [ ] Create Supabase storage bucket
- [ ] Configure bucket policies
- [ ] Set up folder structure
- [ ] Test upload/download

### **Phase 3: Upload Component (45 min)**
- [ ] Create PhotoUpload component
- [ ] Implement drag & drop
- [ ] Add file validation
- [ ] Build image preview
- [ ] Connect to Supabase
- [ ] Add progress indicator
- [ ] Error handling

### **Phase 4: Gallery Component (45 min)**
- [ ] Create PhotoGallery component
- [ ] Build grid layout
- [ ] Create lightbox modal
- [ ] Add navigation
- [ ] Display captions
- [ ] Download functionality

### **Phase 5: Integration (30 min)**
- [ ] Add to DiaryForm
- [ ] Add to DiaryDetail
- [ ] Test upload flow
- [ ] Test view flow
- [ ] Test delete (draft only)

### **Phase 6: Testing (30 min)**
- [ ] Upload single photo
- [ ] Upload multiple photos
- [ ] View in gallery
- [ ] Lightbox navigation
- [ ] Caption editing
- [ ] Delete photo
- [ ] Permissions (draft vs submitted)
- [ ] File size limits
- [ ] File type validation

---

## 🎨 UI/UX DESIGN

### **Upload Area:**
```
┌─────────────────────────────────┐
│  📸 Drag & Drop Photos Here     │
│     or click to browse          │
│                                 │
│  (Max 5MB per photo)            │
└─────────────────────────────────┘
```

### **Gallery Grid:**
```
┌────┬────┬────┬────┐
│ 📷 │ 📷 │ 📷 │ 📷 │
├────┼────┼────┼────┤
│ 📷 │ 📷 │ 📷 │ 📷 │
└────┴────┴────┴────┘
```

### **Lightbox View:**
```
┌─────────────────────────────────┐
│ ← [    LARGE PHOTO    ] →      │
│                                 │
│ Caption: Site progress day 5    │
│ Date: 2025-12-31                │
│ [Download] [Close]              │
└─────────────────────────────────┘
```

---

## 🔒 SECURITY CONSIDERATIONS

### **Upload Validation:**
- File type: Only images (jpg, jpeg, png, webp)
- File size: Max 5MB per file
- Scan for malware (future enhancement)
- Sanitize file names

### **Access Control:**
- Only diary creator can upload (draft only)
- MC can view all photos for their contracts
- SC can view photos for their diaries only
- Submitted/acknowledged diaries = read-only

### **Storage Security:**
- Private bucket (not public)
- RLS policies on storage objects
- Signed URLs with expiration
- Folder structure per user/diary

---

## 📚 REFERENCE MATERIALS

### **Supabase Documentation:**
- Storage API: https://supabase.com/docs/guides/storage
- Storage RLS: https://supabase.com/docs/guides/storage/security/access-control
- File Upload: https://supabase.com/docs/reference/javascript/storage-from-upload

### **Libraries to Use:**
- React Dropzone: For drag & drop
- React Image Lightbox: For gallery
- Browser Image Compression: For image compression

### **Example Code:**
```javascript
// Image compression
import imageCompression from 'browser-image-compression';

const options = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true
};

const compressedFile = await imageCompression(file, options);
```

---

## 🎯 SESSION 8 FLOW

### **Start (5 min):**
1. Review Session 7 summary
2. Confirm RBAC working
3. Verify BOQ navigation fixed
4. Quick status check

### **Setup (30 min):**
1. Create diary_photos table
2. Set up Supabase storage bucket
3. Configure RLS policies
4. Test basic upload/download

### **Development (90 min):**
1. Build PhotoUpload component (45 min)
2. Build PhotoGallery component (45 min)

### **Integration (30 min):**
1. Add to DiaryForm
2. Add to DiaryDetail
3. Connect everything

### **Testing (30 min):**
1. Test complete flow
2. Fix any issues
3. Verify permissions

### **Wrap-up (15 min):**
1. Update documentation
2. Create session summary
3. Plan next session

---

## 💡 TIPS FOR SUCCESS

### **Development Tips:**
1. Start with basic upload/view before adding advanced features
2. Test storage permissions early
3. Handle errors gracefully (network, size, type)
4. Use console.log to debug storage paths
5. Keep file names clean and organized

### **Common Pitfalls to Avoid:**
1. ❌ Forgetting to enable RLS on storage bucket
2. ❌ Not validating file size before upload
3. ❌ Missing error handling for network issues
4. ❌ Hardcoding storage paths (use variables)
5. ❌ Not compressing images (waste storage)

### **Testing Checklist:**
- [ ] Upload works
- [ ] View works
- [ ] Delete works (draft only)
- [ ] Permissions enforced
- [ ] Error messages clear
- [ ] Loading states shown

---

## 📦 DEPENDENCIES TO INSTALL

```bash
# Image handling
npm install browser-image-compression

# Drag & drop
npm install react-dropzone

# Lightbox gallery
npm install yet-another-react-lightbox
```

---

## 🎊 EXPECTED OUTCOMES

**By End of Session 8:**
- ✅ Photo upload working
- ✅ Photo gallery displaying
- ✅ Photos stored securely
- ✅ RLS policies protecting access
- ✅ Integration with diaries complete

**Phase 3B Completion:**
- ✅ Daily Diary module 100% complete
- ✅ Visual documentation enabled
- ✅ CIPAA evidence system ready
- ✅ User satisfaction increased

**Project Progress:**
- From: 78% (94/120 tasks)
- To: ~85% (109/120 tasks)
- Remaining: Phase 4, 5, 6

---

## 📋 PRE-SESSION CHECKLIST

**Before Starting Session 8:**
- [ ] Session 7 changes deployed
- [ ] RBAC working correctly
- [ ] BOQ navigation fixed
- [ ] Database stable
- [ ] Ready to add photos!

**Optional Prep:**
- [ ] Review Supabase storage docs
- [ ] Think about photo requirements
- [ ] Gather sample images for testing
- [ ] Review diary module structure

---

## 🚀 READY TO START!

**When You Begin Session 8:**
1. Say "Bismillah, let's start Session 8 - Photo Module!"
2. I'll load this prep guide
3. We'll do quick status check
4. Then dive straight into implementation

**Estimated Timeline:**
- Setup: 30 min
- Development: 90 min
- Integration: 30 min
- Testing: 30 min
- **Total: 3 hours**

---

## 📝 NOTES

**Remember:**
- Photo module is critical for CIPAA compliance
- Visual evidence strengthens all claims
- This completes the Daily Diary feature
- Users will love this feature!

**Keep in Mind:**
- Start simple, add features incrementally
- Test early and often
- Handle errors gracefully
- Keep storage organized
- Document as we go

---

**Alhamdulillah! Ready for tomorrow's session!** 🎉

**Session 7:** ✅ Complete - Enterprise Security Implemented  
**Session 8:** 📸 Ready - Photo Upload Module Prepared

**Rest well, Eff! See you tomorrow!** 💪🚀

**Bismillah for Session 8!** 🎊
