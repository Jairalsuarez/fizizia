import { useState, useRef, useEffect, useCallback } from 'react'

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_SIZE_MB = 2

export function CropModal({ imageFile, onConfirm, onCancel }) {
  const canvasRef = useRef(null)
  const previewRef = useRef(null)
  const containerRef = useRef(null)
  const [image, setImage] = useState(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [cropSize, setCropSize] = useState(200)
  const blobUrlRef = useRef(null)

  useEffect(() => {
    const url = URL.createObjectURL(imageFile)
    blobUrlRef.current = url

    const img = new Image()
    img.onload = () => {
      setImage(img)
      const containerSize = Math.min(window.innerWidth - 80, 500)
      setCropSize(containerSize)
      
      const imgAspect = img.width / img.height
      if (imgAspect > 1) {
        const s = containerSize / img.height
        setScale(s)
        setPosition({ x: (containerSize - img.width * s) / 2, y: 0 })
      } else {
        const s = containerSize / img.width
        setScale(s)
        setPosition({ x: 0, y: (containerSize - img.height * s) / 2 })
      }
    }
    img.src = url

    return () => {
      setImage(null)
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [imageFile])

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !image) return
    
    const ctx = canvas.getContext('2d')
    canvas.width = cropSize
    canvas.height = cropSize

    ctx.clearRect(0, 0, cropSize, cropSize)
    ctx.drawImage(
      image,
      position.x,
      position.y,
      image.width * scale,
      image.height * scale
    )

    const preview = previewRef.current
    if (preview) {
      preview.width = 96
      preview.height = 96
      const pCtx = preview.getContext('2d')
      pCtx.clearRect(0, 0, 96, 96)
      pCtx.save()
      pCtx.beginPath()
      pCtx.arc(48, 48, 48, 0, Math.PI * 2)
      pCtx.clip()
      pCtx.drawImage(
        image,
        (position.x / cropSize) * 96,
        (position.y / cropSize) * 96,
        (image.width * scale / cropSize) * 96,
        (image.height * scale / cropSize) * 96
      )
      pCtx.restore()
    }
  }, [image, position, scale, cropSize])

  useEffect(() => {
    drawImage()
  }, [drawImage])

  const handleMouseDown = (e) => {
    setDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!dragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    })
  }

  const handleMouseUp = () => {
    setDragging(false)
  }

  const handleTouchStart = (e) => {
    const touch = e.touches[0]
    setDragging(true)
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y })
  }

  const handleTouchMove = (e) => {
    if (!dragging) return
    const touch = e.touches[0]
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    })
  }

  const handleTouchEnd = () => {
    setDragging(false)
  }

  const handleScaleChange = (e) => {
    const newScale = parseFloat(e.target.value)
    const cx = cropSize / 2
    const cy = cropSize / 2
    const newX = cx - (cx - position.x) * (newScale / scale)
    const newY = cy - (cy - position.y) * (newScale / scale)
    setScale(newScale)
    setPosition({ x: newX, y: newY })
  }

  const handleConfirm = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], imageFile.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: Date.now(),
        })
        onConfirm(file)
      }
    }, 'image/jpeg', 0.9)
  }

  const resetPosition = () => {
    if (!image) return
    if (image.width > image.height) {
      const s = cropSize / image.height
      setScale(s)
      setPosition({ x: (cropSize - image.width * s) / 2, y: 0 })
    } else {
      const s = cropSize / image.width
      setScale(s)
      setPosition({ x: 0, y: (cropSize - image.height * s) / 2 })
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg overflow-hidden">
        <div className="p-5 border-b border-dark-700 flex items-center justify-between">
          <div>
            <h3 className="text-white font-bold text-lg">Recortar foto de perfil</h3>
            <p className="text-dark-400 text-sm mt-0.5">Arrastra para mover · Usa el slider para zoom</p>
          </div>
          <button
            onClick={onCancel}
            className="cursor-pointer text-dark-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-start gap-5">
            <div
              ref={containerRef}
              className="relative rounded-xl overflow-hidden border-2 border-dark-600 flex-shrink-0 select-none"
              style={{ width: cropSize, height: cropSize, cursor: dragging ? 'grabbing' : 'grab' }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <canvas ref={canvasRef} className="block" />
              <div className="absolute inset-0 pointer-events-none" style={{
                boxShadow: 'inset 0 0 0 9999px rgba(0,0,0,0.3)',
                borderRadius: '50%',
              }} />
              <div className="absolute inset-0 pointer-events-none border-2 border-white/50 rounded-full" />
            </div>

            <div className="space-y-3 flex flex-col items-center">
              <p className="text-dark-400 text-sm font-medium">Vista previa</p>
              <div className="w-24 h-24 rounded-full border-2 border-dark-600 overflow-hidden">
                <canvas ref={previewRef} width="96" height="96" className="w-full h-full" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-dark-400 text-xs">Zoom</span>
              <button
                onClick={resetPosition}
                className="text-fizzia-400 text-xs font-medium hover:text-fizzia-300 transition-colors"
              >
                Restablecer
              </button>
            </div>
            <input
              type="range"
              min="0.3"
              max="4"
              step="0.05"
              value={scale}
              onChange={handleScaleChange}
              className="w-full accent-fizzia-500"
            />
            <div className="flex justify-between text-dark-500 text-xs">
              <span>Alejar</span>
              <span>Acercar</span>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-dark-700 flex gap-3">
          <button
            onClick={onCancel}
            className="cursor-pointer flex-1 py-3 bg-dark-800 text-white font-medium rounded-xl hover:bg-dark-700 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="cursor-pointer flex-1 py-3 bg-fizzia-500 text-white font-semibold rounded-xl hover:bg-fizzia-400 transition-all"
          >
            Usar esta foto
          </button>
        </div>
      </div>
    </div>
  )
}

export function getUploadWarning(file) {
  if (!file) return null
  if (!file.type.startsWith('image/')) {
    return 'Solo se permiten archivos de imagen (JPG, PNG, WebP)'
  }
  if (file.size > MAX_FILE_SIZE) {
    return `La imagen es muy pesada (${(file.size / (1024 * 1024)).toFixed(1)} MB). El máximo es ${MAX_SIZE_MB} MB`
  }
  return null
}

export { MAX_FILE_SIZE, MAX_SIZE_MB }
