'use client'

import QRCode from 'qrcode'
import { useEffect, useState } from 'react'

export function TicketQrCode({
  code,
  size = 84,
  className = '',
}: {
  code: string
  size?: number
  className?: string
}) {
  const [dataUrl, setDataUrl] = useState<string>('')

  useEffect(() => {
    let active = true
    QRCode.toDataURL(code, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: size * 2,
      color: {
        dark: '#0b2a1d',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (active) setDataUrl(url)
      })
      .catch(() => {
        if (active) setDataUrl('')
      })

    return () => {
      active = false
    }
  }, [code, size])

  if (!dataUrl) {
    return (
      <div
        aria-label={`Loading QR code for ${code}`}
        className={`rounded-xl border border-[#dce4de] bg-white ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <img
      alt={`QR code for ticket ${code}`}
      className={`rounded-xl border border-[#dce4de] bg-white p-1 ${className}`}
      height={size}
      src={dataUrl}
      width={size}
    />
  )
}
