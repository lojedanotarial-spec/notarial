import { useState } from "react";
import { Modal } from "../Modal";
import { Btn } from "../ui/Btn";
import { PartesEditor, guardarPartesEnCRM } from "../ui/PartesEditor";
import { useAuth } from "../../context/AuthContext";

export function ModalPartes({ partes, onApply, onClose, showRol = true, rolesContextuales }) {
  const { usuario, registroActivo } = useAuth();
  const [draft, setDraft] = useState(partes.map(p => ({ ...p })));
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    setGuardando(true);
    // Aplicar al documento siempre, independientemente del resultado del CRM
    onApply(draft);
    try {
      await guardarPartesEnCRM(draft, usuario?.registro_numero || registroActivo);
    } catch (e) {
      console.warn("Error al guardar partes en CRM:", e);
    } finally {
      setGuardando(false);
      onClose();
    }
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
      <PartesEditor partes={draft} onChange={setDraft} showRol={showRol} rolesContextuales={rolesContextuales} />
    </Modal>
  );
}
