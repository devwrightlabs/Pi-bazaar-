'use client'

import { useStore } from '@/store/useStore'
import Modal from './Modal'

export default function GlobalModal() {
  const { modalOpen, modalConfig, closeModal } = useStore()

  if (!modalConfig) return null

  return (
    <Modal
      isOpen={modalOpen}
      title={modalConfig.title}
      message={modalConfig.message}
      variant={modalConfig.variant}
      onConfirm={modalConfig.onConfirm}
      onCancel={modalConfig.onCancel}
      onClose={closeModal}
    />
  )
}
