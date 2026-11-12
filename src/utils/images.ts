// Shared by card and portrait editors. Validate before decoding and always free the bitmap.
export async function compressImage(file: File, maxDimension = 640): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('请选择 10MB 以内的 JPG、PNG 或 WebP 图片。')
  let bitmap: ImageBitmap | undefined
  try {
    bitmap = await createImageBitmap(file)
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas unavailable')
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch { throw new Error('照片读取失败，请选择有效图片后重试。') }
  finally { bitmap?.close() }
}
