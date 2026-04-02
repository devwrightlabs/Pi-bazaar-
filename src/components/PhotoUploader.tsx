'use client'

import { useState, useRef, useCallback, useId } from 'react'
import { supabase } from '@/lib/supabase'

const MAX_PHOTOS = 10
const MAX_SIZE_MB = 1
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface PhotoItem {
  id: string
  previewUrl: string
  publicUrl: string | null
  uploading: boolean
  progress: number
  error: string | null
}

interface Props {
  photos: string[] // public URLs
  onPhotosChange: (urls: string[]) => void
}

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const MAX_DIM = 1200
      let { width, height } = img
      if (width > MAX_DIM || height > MAX_DIM) {
        if (width > height) {
          height = Math.round((height * MAX_DIM) / width)
          width = MAX_DIM
        } else {
          width = Math.round((width * MAX_DIM) / height)
          height = MAX_DIM
        }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Compression failed'))
            return
          }
          // If still over 1MB, try lower quality
          if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
            canvas.toBlob(
              (smallBlob) => {
                if (!smallBlob) reject(new Error('Compression failed'))
                else resolve(smallBlob)
              },
              'image/jpeg',
              0.6
            )
          } else {
            resolve(blob)
          }
        },
        'image/jpeg',
        0.85
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Failed to load image'))
    }
    img.src = objectUrl
  })
}

export default function PhotoUploader({ photos, onPhotosChange }: Props) {
  const inputId = useId()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<PhotoItem[]>(
    photos.map((url) => ({
      id: url,
      previewUrl: url,
      publicUrl: url,
      uploading: false,
      progress: 100,
      error: null,
    }))
  )
  const [dragOver, setDragOver] = useState(false)
  const dragItem = useRef<number | null>(null)
  const dragOverItem = useRef<number | null>(null)

  const uploadFile = useCallback(
    async (file: File, itemId: string) => {
      try {
        const compressed = await compressImage(file)
        const ext = 'jpg'
      const path = `listings/${Date.now()}-${crypto.randomUUID()}.${ext}`

        setItems((prev) =>
          prev.map((p) => (p.id === itemId ? { ...p, progress: 50 } : p))
        )

        const { error } = await supabase.storage
          .from('listing-images')
          .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })

        if (error) throw error

        const { data: urlData } = supabase.storage
          .from('listing-images')
          .getPublicUrl(path)
        const publicUrl = urlData.publicUrl

        setItems((prev) => {
          const updated = prev.map((p) =>
            p.id === itemId ? { ...p, publicUrl, uploading: false, progress: 100 } : p
          )
          onPhotosChange(updated.map((p) => p.publicUrl).filter(Boolean) as string[])
          return updated
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed'
        setItems((prev) =>
          prev.map((p) => (p.id === itemId ? { ...p, uploading: false, error: msg } : p))
        )
      }
    },
    [onPhotosChange]
  )

  const addFiles = useCallback(
    (files: File[]) => {
      const valid = files.filter((f) => ACCEPTED_TYPES.includes(f.type))
      const remaining = MAX_PHOTOS - items.length
      const toAdd = valid.slice(0, remaining)

      const newItems: PhotoItem[] = toAdd.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        previewUrl: URL.createObjectURL(file),
        publicUrl: null,
        uploading: true,
        progress: 10,
        error: null,
      }))

      setItems((prev) => [...prev, ...newItems])

      // Upload with max concurrency of 3
      const CONCURRENCY = 3
      let index = 0
      const runNext = () => {
        if (index >= toAdd.length) return
        const i = index++
        void uploadFile(toAdd[i], newItems[i].id).finally(runNext)
      }
      for (let i = 0; i < Math.min(CONCURRENCY, toAdd.length); i++) {
        runNext()
      }
    },
    [items.length, uploadFile]
  )

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return
    addFiles(Array.from(fileList))
  }

  const handleRemove = (id: string) => {
    setItems((prev) => {
      const updated = prev.filter((p) => p.id !== id)
      onPhotosChange(updated.map((p) => p.publicUrl).filter(Boolean) as string[])
      return updated
    })
  }

  const handleDragStart = (index: number) => {
    dragItem.current = index
  }

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index
  }

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return
    if (dragItem.current === dragOverItem.current) return
    setItems((prev) => {
      const updated = [...prev]
      const dragged = updated.splice(dragItem.current!, 1)[0]
      updated.splice(dragOverItem.current!, 0, dragged)
      onPhotosChange(updated.map((p) => p.publicUrl).filter(Boolean) as string[])
      return updated
    })
    dragItem.current = null
    dragOverItem.current = null
  }

  const canAddMore = items.length < MAX_PHOTOS

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      {canAddMore && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center p-8 rounded-xl cursor-pointer transition-colors"
          style={{
            border: `2px dashed ${dragOver ? '#F0C040' : 'rgba(136,136,136,0.3)'}`,
            backgroundColor: dragOver ? 'rgba(240,192,64,0.05)' : 'var(--color-background)',
          }}
        >
          <span className="text-3xl mb-2"></span>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
            {dragOver ? 'Drop photos here' : 'Drag photos here or tap to browse'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-subtext)' }}>
            JPG, PNG, WEBP \u2022 Max {MAX_PHOTOS} photos \u2022 1MB each
          </p>
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {/* Thumbnail grid */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              className="relative rounded-xl overflow-hidden cursor-grab active:cursor-grabbing"
              style={{ aspectRatio: '1', backgroundColor: 'var(--color-card-bg)' }}
            >
              <img
                src={item.previewUrl}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />

              {/* Upload progress overlay */}
              {item.uploading && (
                <div className="absolute inset-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                  <div className="w-12 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.progress}%`, backgroundColor: 'var(--color-gold)' }}
                    />
                  </div>
                </div>
              )}

              {/* Error overlay */}
              {item.error && (
                <div className="absolute inset-0 flex items-center justify-center text-xs text-center p-1" style={{ backgroundColor: 'rgba(239,68,68,0.8)', color: '#fff' }}>
                  Failed
                </div>
              )}

              {/* Cover badge */}
              {index === 0 && !item.uploading && !item.error && (
                <span
                  className="absolute bottom-1 left-1 text-xs font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-gold)', color: '#000' }}
                >
                  &#9733; Cover
                </span>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemove(item.id)}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff' }}
                aria-label="Remove photo"
              >
                &#215;
              </button>
            </div>
          ))}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs" style={{ color: 'var(--color-subtext)' }}>
          {items.length}/{MAX_PHOTOS} photos \u2022 Drag to reorder \u2022 First photo is the cover
        </p>
      )}
    </div>
  )
}
