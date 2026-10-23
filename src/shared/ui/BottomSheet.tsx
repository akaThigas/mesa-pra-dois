import { useEffect, useRef, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';

/** Estilos de formulário reaproveitados por todas as gavetas e telas de acesso. */
export { default as sheetStyles } from './BottomSheet.module.css';

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  /** id do título dentro da gaveta (acessibilidade) */
  labelledBy: string;
  children: ReactNode;
}

/**
 * Gaveta inferior genérica usando o <dialog> nativo:
 * foco preso dentro, Esc fecha e o fundo fica inerte, sem biblioteca.
 * Quem usa decide O CONTEÚDO; este componente só cuida do comportamento.
 */
export function BottomSheet({ open, onClose, labelledBy, children }: BottomSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.sheet}
      aria-labelledby={labelledBy}
      onClose={onClose}
      // Clique no fundo escuro (fora da gaveta) fecha.
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      {open && children}
    </dialog>
  );
}
