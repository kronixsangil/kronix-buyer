'use client';

import { useEffect, useRef, useState } from 'react';
import styles from './CafeAdditions.module.css';

type Choice = { id: string; label: string; priceCOP: number; isActive?: boolean };
type Group = { id: string; label: string; min: number; max: number; choices: Choice[] };
type Selection = Record<string, string[]>;
export type CustomizableDrink = {
  id: string;
  name: string;
  image?: string | null;
  description?: string | null;
  priceCOP: number;
  options?: Group[];
};

const money = (amount: number) => '$ ' + amount.toLocaleString('es-CO');

export default function CafeAdditions({ drink, selection, quantity, editing, onClose, onSave }: {
  drink: CustomizableDrink;
  selection: Selection;
  quantity: number;
  editing: boolean;
  onClose: () => void;
  onSave: (selection: Selection) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const groups = drink.options ?? [];
  const [draft, setDraft] = useState<Selection>(() => Object.fromEntries(groups.map(group => [
    group.id,
    group.choices.filter(choice => choice.isActive !== false && selection[group.id]?.includes(choice.id))
      .map(choice => choice.id).slice(0, group.max),
  ])));

  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);

  const extra = groups.reduce((total, group) => total + group.choices.reduce(
    (sum, choice) => sum + (draft[group.id].includes(choice.id) ? choice.priceCOP : 0), 0), 0);
  const valid = groups.every(group => draft[group.id].length >= group.min);

  function pick(group: Group, id: string) {
    setDraft(current => {
      const selected = current[group.id];
      if (selected.includes(id)) return { ...current, [group.id]: selected.filter(choice => choice !== id) };
      if (group.max === 1) return { ...current, [group.id]: [id] };
      if (selected.length >= group.max) return current;
      return { ...current, [group.id]: [...selected, id] };
    });
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="cafe-additions-title"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === dialog.current) onClose(); }}>
      <div className={styles.layout}>
        <header className={styles.header}>
          {drink.image && <img src={drink.image} alt="" />}
          <div><h2 id="cafe-additions-title">{drink.name}</h2><span>{money(drink.priceCOP)} base</span></div>
          <button className={styles.close} type="button" aria-label="Cerrar adiciones" onClick={onClose}>×</button>
        </header>
        <div className={styles.body}>
          {drink.description && <p className={styles.description}>{drink.description}</p>}
          {groups.map(group => (
            <fieldset className={styles.group} key={group.id}>
              <legend>{groups.length === 1 ? 'Adiciones' : group.label}</legend>
              <p>{group.min ? `Elige al menos ${group.min}` : 'Opcional'}{group.max === 1 ? ' · Una opción' : ''}</p>
              {group.choices.filter(choice => choice.isActive !== false).map(choice => {
                const checked = draft[group.id].includes(choice.id);
                return <button type="button" className={styles.choice} key={choice.id}
                  aria-pressed={checked}
                  disabled={!checked && group.max !== 1 && draft[group.id].length >= group.max}
                  onClick={() => pick(group, choice.id)}>
                  <span aria-hidden="true" className={styles.mark}>{checked ? '✓' : '+'}</span>
                  <strong>{choice.label}</strong>
                  <span>{choice.priceCOP ? '+ ' + money(choice.priceCOP) : 'Incluido'}</span>
                </button>;
              })}
            </fieldset>
          ))}
        </div>
        <footer className={styles.footer}>
          <p aria-live="polite">Total de {quantity} {quantity === 1 ? 'bebida' : 'bebidas'} <strong>{money(quantity * (drink.priceCOP + extra))}</strong></p>
          <button className={styles.save} type="button" disabled={!valid} onClick={() => onSave(draft)}>
            {editing ? 'Guardar adiciones' : 'Agregar al pedido'}
          </button>
        </footer>
      </div>
    </dialog>
  );
}
