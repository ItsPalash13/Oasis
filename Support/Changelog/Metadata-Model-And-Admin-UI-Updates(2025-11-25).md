## Metadata Model and Admin UI Updates (2025-11-25)

### Summary
- Created Metadata model for storing flexible metadata with images.
- Added metadata API routes for fetching metadata by type.
- Simplified Admin panel UI by hiding Topics, Sections, Units, Levels, and Badges tabs.

### Backend Changes

#### Models
- **File**: `Backend/NodeOne/src/models/Metadata.ts`
  - New model: `IMetadata` interface and `MetadataSchema`.
  - Fields:
    - `metadataId`: Unique string identifier (indexed)
    - `metadataType`: Type/category of metadata
    - `metadataName`: Display name
    - `imageUrl`: Image URL for display
    - `description`: Optional description
    - `status`: Boolean status flag (default: true)
    - `createdAt`, `updatedAt`: Auto-managed timestamps
  - Indexes on `metadataId` and `metadataType` for faster queries.

#### Routes
- **File**: `Backend/NodeOne/src/routes/metadata.ts`
  - New endpoints:
    - `GET /api/metadata`: Get all metadata (requires auth)
    - `GET /api/metadata/:metadataType`: Get metadata filtered by type (requires auth)

- **File**: `Backend/NodeOne/src/routes/index.ts`
  - Registered: `router.use("/metadata", metadataRoutes);`

### Frontend Changes

#### Admin Panel
- **File**: `Frontend/ReactOne/src/Layouts/Admin/Admin.jsx`
  - Commented out tabs: Topics, Sections, Units, Levels, Badges
  - Active tabs remaining: Subjects, Chapters, Questions, Users, Organizations
  - Horizontal tab navigation remains functional

### Files Changed

#### Backend
- `Backend/NodeOne/src/models/Metadata.ts` (new)
- `Backend/NodeOne/src/routes/metadata.ts` (new)
- `Backend/NodeOne/src/routes/index.ts`

#### Frontend
- `Frontend/ReactOne/src/Layouts/Admin/Admin.jsx`

### Notes
- Metadata model designed to be flexible for various content types (e.g., chapter images, badges, etc.).
- Admin panel tabs can be easily re-enabled by uncommenting the relevant lines.

