import { useState } from "react";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { PartesEditor, guardarPartesEnCRM } from "../ui/PartesEditor";
import { useAuth } from "../../context/AuthContext";

export function ModalPartes({ partes, onApply, onClose, showRol = true }) {
  const { usuario } = useAuth();
  const [draft, setDraft] = useState(partes.map(p => ({ ...p })));
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    
    setGuardando(true);
    await guardarPartesEnCRM(draft, usuario?.registro_numero);
    onApply(draft);
    setGuardando(false);
    onClose();
  }

  return (
    <Modal title="Partes comparecientes" onClose={onClose}
      footer={
        <>
          <Btn onClick={onClose}>Cancelar</Btn>
          <Btn primary onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Btn>
        </>
      }>
      <PartesEditor partes={draft} onChange={setDraft} showRol={showRol} />
    </Modal>
  );
}
