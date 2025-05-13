# User Uploads Directory

This directory contains user-uploaded files, particularly profile pictures.

## Usage

- User profile pictures are stored in this directory
- Images are processed and optimized using Sharp library
- Images are converted to WebP format when supported by the user's browser for better compression
- Maximum size allowed is 2MB
- Image dimensions are resized to 300x300 pixels with center crop positioning
- EXIF metadata is removed for privacy and security

## Storage Handling

- Files are stored with unique identifiers to prevent collisions
- Original filenames are not preserved for security reasons
- File format: `avatar-{userId}-{uniqueId}.{extension}`
- Optimized formats: WebP (preferred), JPEG (with mozjpeg), or PNG

## Image Processing Features

- Automatic orientation correction from EXIF metadata
- Proper format conversion based on browser support
- Quality optimization (85% for WebP, 80% for JPEG/PNG)
- Progressive rendering for better perceived loading
- Metadata stripping for privacy protection
- Error tolerance with fallback to original format if processing fails

## Security Notes

- All uploaded images are processed to remove metadata and potential vulnerabilities
- Only image formats are permitted (JPG, PNG, GIF, WEBP)
- No executable content is allowed
- Server-side validation enforces file type and size limits

## Implementation Details

To add a new profile picture:

1. Call the `/api/user/avatar/upload` endpoint with a multipart form containing the image file
2. The image will be processed, optimized, and stored in this directory
3. The user's profile will be updated with the new avatar URL

To remove a profile picture:

1. Call the `/api/user/avatar/remove` endpoint
2. The file will be deleted from the filesystem
3. The user's profile will be updated to remove the avatar reference

## Note

This directory must exist for the upload functionality to work properly. If it doesn't exist, the application will attempt to create it automatically.

## Security

All uploads are validated for:

- File type (only images allowed)
- File size (max 2MB)
- File content is processed with Sharp to prevent malicious files
