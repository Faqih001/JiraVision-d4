import { NextResponse } from "next/server"
import { writeFile, mkdir, access } from "fs/promises"
import { join } from "path"
import { getSession } from "@/lib/auth-actions"
import { updateUserProfile } from "@/lib/data-access"
import { constants } from "fs"
import sharp from 'sharp'

// For profile picture uploads
export async function POST(request: Request) {
  try {
    const session = await getSession()
    
    if (!session || !session.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.id
    
    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get("avatar") as File | null
    
    if (!file) {
      return NextResponse.json(
        { error: "No avatar file provided" },
        { status: 400 }
      )
    }
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload an image file (jpg, png, gif, webp)" },
        { status: 400 }
      )
    }
    
    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB" },
        { status: 400 }
      )
    }
    
    // Create a unique filename
    const bytes = new Uint8Array(8)
    crypto.getRandomValues(bytes)
    const uniqueId = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
    
    const fileExtension = file.name.split('.').pop() || 'jpg'
    const fileName = `avatar-${userId}-${uniqueId}.${fileExtension}`
    
    // Define uploads directory path
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    
    try {
      // Check if directory exists, create if it doesn't
      try {
        await access(uploadsDir, constants.F_OK).catch(async (dirError) => {
          // Directory doesn't exist, create it
          console.log("Creating uploads directory...")
          try {
            await mkdir(uploadsDir, { recursive: true })
          } catch (mkdirError) {
            console.error("Failed to create uploads directory:", mkdirError)
            throw new Error(`Failed to create uploads directory: ${mkdirError instanceof Error ? mkdirError.message : "Unknown error"}`)
          }
        })
      } catch (dirError) {
        console.error("Failed to check/create uploads directory:", dirError)
        throw new Error(`Directory access error: ${dirError instanceof Error ? dirError.message : "Unknown error"}`)
      }
      
      // Convert file to buffer
      const buffer = await file.arrayBuffer().catch(err => {
        console.error("Error reading file buffer:", err)
        throw new Error("Could not read uploaded file")
      })
      
      // Process and optimize the image with Sharp
      const filePath = join(uploadsDir, fileName)
      
      try {
        // Create a Sharp instance from the buffer
        const sharpInstance = sharp(new Uint8Array(buffer));
        
        // Get metadata to preserve aspect ratio
        const metadata = await sharpInstance.metadata();
        
        // Resize to reasonable dimensions for a profile picture (max 300x300px)
        // While preserving aspect ratio
        await sharpInstance
          .resize({
            width: Math.min(metadata.width || 300, 300),
            height: Math.min(metadata.height || 300, 300),
            fit: 'inside',
            withoutEnlargement: true
          })
          // Optimize based on file type
          .toFormat(fileExtension === 'png' ? 'png' : 'jpeg', {
            quality: 80,
            progressive: true,
            optimizeScans: true
          })
          // Write directly to file
          .toFile(filePath);
          
      } catch (sharpError) {
        console.error("Error optimizing image with Sharp:", sharpError);
        // Fallback to original file if optimization fails
        console.log("Falling back to original file without optimization");
        await writeFile(filePath, new Uint8Array(buffer));
      }
      
      // Update user profile with avatar URL
      const avatarUrl = `/uploads/${fileName}`
      const updateResult = await updateUserProfile(userId, { avatar: avatarUrl })
      
      if (!updateResult) {
        console.error("Failed to update user profile with new avatar")
        return NextResponse.json(
          { error: "Failed to update profile with new avatar" },
          { status: 500 }
        )
      }
      
      return NextResponse.json({
        success: true,
        message: "Profile picture uploaded successfully",
        avatar: avatarUrl
      })
    } catch (error) {
      console.error("Error writing file or updating profile:", error)
      // Try to get more specific error information
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        { error: `Failed to upload profile picture: ${errorMessage}` },
        { status: 500 }
      )
    }
  } catch (error) {
    // Handle top-level errors
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Failed to process avatar upload:", error)
    return NextResponse.json(
      { error: `Failed to process avatar upload: ${errorMessage}` },
      { status: 500 }
    )
  }
}
