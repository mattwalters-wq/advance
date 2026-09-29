// Shared client helpers for turning dropped/picked/pasted files into chat
// attachments the tour-ai route can understand. Images and PDFs go as base64;
// everything else (Word, Excel, CSV, text, unknown) is converted to text so the
// model can always read it — "drag in anything".

export interface Attachment {
  name: string
  base64: string
  type: string
}

// Image media types the Anthropic API accepts. Anything else (HEIC, BMP,
// TIFF…) is rejected server-side with a clear error.
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const UNSUPPORTED_IMAGE_ERROR = 'Unsupported image type — please use JPG or PNG'

export function isSupportedImageType(type: string | null | undefined): boolean {
  return !!type && SUPPORTED_IMAGE_TYPES.includes(type.toLowerCase())
}

const IMAGE_EXT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp',
  heic: 'image/heic', bmp: 'image/bmp', tiff: 'image/tiff',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function textToBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)))
}

export async function fileToAttachment(file: File): Promise<Attachment> {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const isImage = file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'bmp', 'tiff'].includes(ext)

  if (isImage) {
    return { name: file.name, base64: await fileToBase64(file), type: file.type || IMAGE_EXT_TYPES[ext] || 'image/png' }
  }
  if (ext === 'pdf' || file.type === 'application/pdf') {
    return { name: file.name, base64: await fileToBase64(file), type: 'application/pdf' }
  }
  if (ext === 'xlsx' || ext === 'xls') {
    const XLSX = await import('xlsx')
    const ab = await file.arrayBuffer()
    const wb = XLSX.read(ab, { type: 'array' })
    const lines: string[] = []
    for (const sn of wb.SheetNames) {
      lines.push('Sheet: ' + sn)
      lines.push(XLSX.utils.sheet_to_csv(wb.Sheets[sn]))
    }
    return { name: file.name, base64: textToBase64(lines.join('\n\n')), type: 'text/plain' }
  }
  if (ext === 'docx' || ext === 'doc') {
    const mammoth = await import('mammoth')
    const ab = await file.arrayBuffer()
    const r = await mammoth.extractRawText({ arrayBuffer: ab })
    return { name: file.name, base64: textToBase64(r.value), type: 'text/plain' }
  }
  // text-like / unknown — best-effort read as text
  let text = ''
  try { text = await file.text() } catch {}
  return { name: file.name, base64: textToBase64(text), type: 'text/plain' }
}

// Gather files from a drop robustly — screenshots/images often arrive via
// DataTransfer.items (kind:'file') rather than .files.
export function collectFiles(dt: DataTransfer): File[] {
  const out: File[] = []
  if (dt.items && dt.items.length) {
    for (const it of Array.from(dt.items)) {
      if (it.kind === 'file') {
        const f = it.getAsFile()
        if (f) out.push(f)
      }
    }
  }
  if (out.length === 0 && dt.files && dt.files.length) {
    out.push(...Array.from(dt.files))
  }
  return out
}
