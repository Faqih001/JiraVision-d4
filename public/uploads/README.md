# Uploads Directory

This directory is used to store user-uploaded files, such as profile pictures.

## Usage

- User profile pictures are stored in this directory
- Images are optimized using Sharp library
- Images are converted to WebP format when supported by the user's browser for better compression
- Maximum size allowed is 2MB
- Image dimensions are resized to be no larger than 300x300 pixels while preserving aspect ratio

## Storage Handling

- Files are stored with unique identifiers to prevent collisions
- Original filenames are not preserved for security reasons
- File format: `avatar-{userId}-{uniqueId}.{extension}`

## Note

This directory must exist for the upload functionality to work properly. If it doesn't exist, the application will attempt to create it automatically.

## Security

All uploads are validated for:
- File type (only images allowed)
- File size (max 2MB)
- File content is processed with Sharp to prevent malicious files
